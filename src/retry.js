const retryFn = require('promise-fn-retry');

function getRetryFn(fn, options = {}) {
  const { initialDelayTime = 1000, times = 3 } = options;

  return retryFn(fn, { initialDelayTime, times });
}

module.exports = getRetryFn;
