'use strict';

const _ = require('lodash');
const util = require('util');
const wrappy = require('wrappy');
const assert = require('assert');

/**
 * Call a function only once during its execution lifetime
 * @param {*} fn function to wrap
 * @param {{ reentrant: boolean }} reentrant whether async functions should be reentrant or not. If this is set to TRUE,
 * any function that returns a promise can be called again after its execution is finished but not during its execution.
 * @see async and reentrant version of: https://www.npmjs.com/package/once
 */
function once(fn, opts = { reentrant: false }) {
  assert.ok(_.isFunction(fn));
  const f =
    util.types.isAsyncFunction(fn) && _.get(opts, 'reentrant', false)
      ? function() {
          if (f.called) return f.value;
          f.called = true;
          return (f.value = new Promise(async (resolve, reject) => {
            try {
              const result = await fn.apply(this, arguments);
              _.isUndefined(result) ? resolve() : resolve(result);
            } catch (err) {
              reject(err);
            }
            f.called = false;
          }));
        }
      : function() {
          if (f.called) return f.value;
          f.called = true;
          return (f.value = fn.apply(this, arguments));
        };
  f.called = false;
  return f;
}

module.exports = wrappy(once);
