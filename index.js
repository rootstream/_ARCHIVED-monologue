'use strict';

const _ = require('lodash');
const rc = require('rc');
const once = require('@rootstream/once');
const debug = require('debug')('monologue');
const assert = require('assert');
const uniqid = require('uniqid');
const Promise = require('bluebird');
const WebSocket = require('ws');
const { EventEmitter2 } = require('eventemitter2');

class MonologueClient extends EventEmitter2 {
  constructor(opts) {
    super({ wildcard: true, maxListeners: getConfig().opts.listeners });
    this._id = uniqid('client');
    this._opts = _.defaultsDeep(opts, getConfig().opts);
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
    const silentClose = async () => {
      await this.close().catch(debug);
    };
    this._ws.once('close', silentClose);
    this._ws.once('error', silentClose);
    await new Promise(resolve => {
      this._ws.once('open', () => {
        debug('connection is open for %s - sending whoami packet', this._id);
        this._ws.send('whoami');
        this._ws.once('message', data => {
          debug('whoami packet for %s:%s', this._id, data);
          this._connectionId = data;
          this._connected = true;
          this._ws.on('message', this._messageLoop.bind(this));
          resolve();
        });
      });
    }).timeout(+this._opts.timeout);
  }

  async _messageLoop(what) {
    try {
      debug('message received for %s:%s', this._id, what);
      const { from, payload } = JSON.parse(what);
      const type = _.get(payload, 'type', '');
      const token = _.get(payload, 'data.token', 'invalid');

      if (type === 'REQ') {
        const name = _.get(payload, 'data.name', '');
        const args = _.get(payload, 'data.args', []);
        const fn = _.first(this.listeners(name));
        assert.ok(fn);
        const ret = await fn.apply(null, args);
        this._ws.send(JSON.stringify({ to: from, payload: { data: { token, ret }, type: 'ACK' } }));
      }

      if (type === 'ACK') {
        assert.ok(this._callbacks[token]);
        const ret = _.get(payload, 'data.ret');
        this._callbacks[token](ret);
        delete this._callbacks[token];
      }
    } catch (err) {
      debug('error while processing message %s: %o', what, err);
    }
  }

  async call(to, name, ...args) {
    assert.ok(this._connected);
    const token = uniqid(this._id);
    this._ws.send(JSON.stringify({ to, payload: { data: { token, name, args }, type: 'REQ' } }));
    return await new Promise(resolve => {
      this._callbacks[token] = resolve;
    })
      .timeout(+this._opts.timeout)
      .catch(err => {
        debug('call with token %s expired without a response: %o', token, err);
        delete this._callbacks[token];
        throw err; // return back to caller
      });
  }

  async _doClose() {
    assert.ok(this._connected);
    this._ws.removeAllListeners('message');
    this._ws.close();
    this._connected = false;
    this._connectionId = '';
  }
}

const DEFAULT_CONFIG = {
  opts: { endpoint: '', timeout: 5000, listeners: 20 },
};
const USER_CONFIG = rc('monologue', DEFAULT_CONFIG);
const CONFIG = _.assign({}, DEFAULT_CONFIG, USER_CONFIG);
const getConfig = () => CONFIG;

Promise.config({ cancellation: true });
module.exports = MonologueClient;
