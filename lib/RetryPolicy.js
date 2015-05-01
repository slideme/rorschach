'use strict';

var Exception = require('node-zookeeper-client').Exception;


/*!
 * Expose
 */
module.exports = RetryPolicy;




/**
 * Retry policy controls behavior of Rorschach in case of errors.
 *
 * @constructor
 * @param {Object} [options] Options:
 * @param {Number} options.maxAttempts Max number of attempts
 * @param {Array.<String>|Function} options.codes Error codes or error validation function
 */
function RetryPolicy(options) {
  options = options || {};

  if (typeof options.maxAttempts === 'number') {
    this.maxAttempts = options.maxAttempts;
  }
  else {
    this.maxAttempts = RetryPolicy.DEFAULT_MAX_ATTEMPTS;
  }

  if (typeof options.codes === 'function') {
    this.isRetryable = options.codes;
  }
  else {
    this.codes = options.codes || RetryPolicy.DEFAULT_RETRYABLE_ERRORS;
  }
}




/**
 * Default number of operation attempts.
 *
 * @static
 * @const
 * @type {Number}
 */
RetryPolicy.DEFAULT_MAX_ATTEMPTS = 3;




/**
 * Default codes of errors allowing re-try in case of no. of attempts < maxAttempts.
 *
 * @static
 * @const
 * @type {Array.<Number>}
 */
RetryPolicy.DEFAULT_RETRYABLE_ERRORS = [
  Exception.CONNECTION_LOSS,
  Exception.OPERATION_TIMEOUT,
  Exception.SESSION_EXPIRED
];




/**
 * Check if error is retryable.
 *
 * @public
 * @param {Error|Exception} err ZooKeeper client error
 * @returns {Boolean}
 */
RetryPolicy.prototype.isRetryable = function isRetryable(err) {
  if (typeof err.getCode !== 'function') {
    return false;
  }

  var code = err.getCode();
  return this.codes.indexOf(code) !== -1;
};
