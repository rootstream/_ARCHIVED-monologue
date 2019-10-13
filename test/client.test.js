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

  describe('network tests', () => {
    it('should be able to connect and disconnect', async () => {
      const mc1 = new Monologue();
      const mc2 = new Monologue();

      await chai.assert.isFulfilled(Promise.all([mc1.connect(), mc2.connect()]));
      await chai.assert.isFulfilled(Promise.all([mc1.close(), mc2.close()]));
      // double close should be a noop
      await chai.assert.isFulfilled(Promise.all([mc1.close(), mc2.close()]));
    });

    it('should be able to reconnect after a disconnect', async () => {
      const mc1 = new Monologue();
      const mc2 = new Monologue();

      await chai.assert.isFulfilled(Promise.all([mc1.connect(), mc2.connect()]));
      await chai.assert.isFulfilled(Promise.all([mc1.close(), mc2.close()]));
      // attempt a reconnect
      await chai.assert.isFulfilled(Promise.all([mc1.connect(), mc2.connect()]));
      await chai.assert.isFulfilled(Promise.all([mc1.close(), mc2.close()]));
    });
  });

  describe('RPC tests', async () => {
    const mc1 = new Monologue();
    const mc2 = new Monologue();

    before(async () => {
      await chai.assert.isFulfilled(Promise.all([mc1.connect(), mc2.connect()]));
    });

    it('should be able to pass arguments in correct order', async () => {
      const callback = sinon.fake();
      const functionName = 'test1';
      const arg1Val = 'string1';
      const arg2Val = { data: 'string1' };
      const arg3Val = true;
      const retVal = { sample: 'data2' };

      mc1.on(functionName, async (arg1, arg2, arg3) => {
        callback(arg1, arg2, arg3);
        return retVal;
      });

      const ret = await mc2.call(mc1.connectionId, functionName, arg1Val, arg2Val, arg3Val);
      chai.assert.deepEqual(ret, retVal);
      chai.assert.ok(callback.calledOnce);
      chai.assert.ok(callback.calledWith(arg1Val, arg2Val, arg3Val));
    });

    after(async () => {
      await chai.assert.isFulfilled(Promise.all([mc1.close(), mc2.close()]));
    });
  });
});
