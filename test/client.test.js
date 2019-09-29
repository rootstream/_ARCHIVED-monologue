'use strict';

const once = require('../once');
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
    const callback = sinon.fake();

    const mc1 = new Monologue();
    await mc1.connect();

    const mc2 = new Monologue();
    await mc2.connect();

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

  it('should call an async function only once', async () => {
    const callback = sinon.fake();
    const returns = { test: 'data' };
    const error = new Error('test');

    async function incrementor() {
      await Promise.delay(50);
      callback();
      // to check returns
      if (callback.calledTwice) return returns;
      if (callback.calledThrice) throw error;
    }

    const incrementOnce = once(incrementor);
    // firing two of these at the same time should only call one of them
    await chai.assert.isFulfilled(Promise.all([incrementOnce(), incrementOnce()]));
    chai.assert.isTrue(callback.calledOnce);
    // calling it again should not work since it's not marked reentrant
    await chai.assert.isFulfilled(incrementOnce());
    chai.assert.isTrue(callback.calledOnce);
    callback.resetHistory();

    const incrementOnceRE = once(incrementor, { reentrant: true });
    // firing two of these at the same time should only call one of them
    await chai.assert.isFulfilled(Promise.all([incrementOnceRE(), incrementOnceRE()]));
    chai.assert.isTrue(callback.calledOnce);
    // calling it again should work since it's marked reentrant
    const data = await chai.assert.isFulfilled(incrementOnceRE());
    chai.assert.isTrue(callback.calledTwice);
    chai.assert.deepEqual(data, returns);
    // test error propagation
    await chai.assert.isRejected(incrementOnceRE());
    chai.assert.isTrue(callback.calledThrice);
    callback.resetHistory();
  });
});
