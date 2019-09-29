'use strict';

const _ = require('lodash');
const rc = require('rc');
const once = require('./once');
const debug = require('debug')('monologue');
const assert = require('assert');
const uniqid = require('uniqid');
const Promise = require('bluebird');
const WebSocket = require('ws');
const { EventEmitter2 } = require('eventemitter2');

class MonologueClient extends EventEmitter2 {
  constructor(opts) {
    super({ wildcard: true, maxListeners: getConfig().config.listeners });
    this._id = uniqid('client');
    this._opts = _.defaultsDeep(opts, getConfig().config);
    this._callbacks = [];
    this._connected = false;
    this._connectionId = '';
    debug('a new client is created. id=%s opts=%o', this._id, this._opts);

    this.connect = once(this._doConnect.bind(this), { reentrant: true });
    this.close = once(this._doClose.bind(this), { reentrant: true });
  }

  get connectionId() {
    return this._connectionId;
  }

  async _doConnect() {
    assert.ok(!this._connected);
    debug('connecting to websocket endpoint: %s', this._opts.endpoint);
    this._ws = new WebSocket(this._opts.endpoint);
    this._ws.once('close', this.close);
    this._ws.once('error', this.close);
    await new Promise(resolve => {
      this._ws.once('open', () => {
        debug('connection is open for %s - sending the ID message', this._id);
        const token = uniqid(this._id);
        this._ws.send(JSON.stringify({ action: 'loopback', payload: { token } }));
        this._ws.once('message', data => {
          debug('ID message received for %s:%s', this._id, data);
          const { to, from, payload } = JSON.parse(data);
          assert.ok(_.get(payload, 'token') === token);
          assert.ok(to === from);
          this._connectionId = to;
          this._connected = true;
          this._ws.on('message', this._messageLoop.bind(this));
          this.emit('connect');
          resolve();
        });
      });
    }).timeout(+this._opts.timeout);
  }

  async _messageLoop(what) {
    debug('message received for %s:%s', this._id, what);
    const { to, from, payload } = JSON.parse(what);
    assert.ok(to === this._connectionId);

    const type = _.get(payload, 'type', '');
    const token = _.get(payload, 'token', 'invalid');

    if (type === 'REQ') {
      const name = _.get(payload, 'name', '');
      const args = _.get(payload, 'args', []);
      const fn = _.first(this.listeners(name));
      assert.ok(_.isFunction(fn));
      const ret = await fn.apply(null, args);
      this._ws.send(JSON.stringify({ to: from, action: 'sendmessage', payload: { token, ret, type: 'ACK' } }));
    } else if (type === 'ACK') {
      assert.ok(this._callbacks[token]);
      const ret = _.get(payload, 'ret');
      this._callbacks[token](ret);
      delete this._callbacks[token];
    } else {
      debug('invalid message type: %s', type);
      assert.ok(false);
    }
  }

  async call(to, name, ...args) {
    assert.ok(this._connected);
    const token = uniqid(this._id);
    this._ws.send(JSON.stringify({ to, action: 'sendmessage', payload: { token, name, args, type: 'REQ' } }));
    return await new Promise(resolve => {
      this._callbacks[token] = resolve;
    })
      .timeout(this._opts.timeout)
      .catch(err => {
        debug('call with token %s expired without a response: %o', token, err);
        delete this._callbacks[token];
      });
  }

  async _doClose() {
    assert.ok(this._connected);
    this._ws.close();
    this._connected = false;
    this._connectionId = '';
  }
}

const DEFAULT_CONFIG = {
  config: { endpoint: '', timeout: 5000, listeners: 100 },
};
const USER_CONFIG = rc('monologue', DEFAULT_CONFIG);
const CONFIG = _.assign({}, DEFAULT_CONFIG, USER_CONFIG);
const getConfig = () => CONFIG;

Promise.config({ cancellation: true });
module.exports = MonologueClient;
