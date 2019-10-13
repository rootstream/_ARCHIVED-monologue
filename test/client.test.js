'use strict';

const chai = require('chai');
const sinon = require('sinon');
const chaiAP = require('chai-as-promised');
const Promise = require('bluebird');

const Monologue = require('../index');

chai.use(chaiAP);

describe('Monologue client tests', () => {
  it('should always pass', () => {
    chai.assert.isTrue(true);
  });

  it('should be able to connect and disconnect', async () => {
    const mc1 = new Monologue();
    const mc2 = new Monologue();

    await chai.assert.isFulfilled(Promise.all([mc1.connect(), mc2.connect()]));
    await chai.assert.isFulfilled(Promise.all([mc1.close(), mc2.close()]));
  });

  it('should be able to perform basic RPC', async () => {
    const callback = sinon.fake();

    const mc1 = new Monologue();
    const mc2 = new Monologue();

    await chai.assert.isFulfilled(Promise.all([mc1.connect(), mc2.connect()]));

    mc1.on('sample-method', async arg1 => {
      callback(arg1);
      return 'data';
    });

    const ret = await mc2.call(mc1.connectionId, 'sample-method', 'arg1');
    chai.assert.equal(ret, 'data');
    chai.assert.ok(callback.calledOnce);
    chai.assert.ok(callback.calledWith('arg1'));

    await Promise.all([mc1.close(), mc2.close()]);
  });
});
