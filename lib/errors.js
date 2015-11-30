'use strict';

var util = require('util');
var slice = [].slice;
var errors = module.exports = {};


function executionErrorMessage(op, args, error) {
  var fmt = 'Error performing %s with arguments %s: %s';
  args = util.inspect(args).split(/\s*\n\s*/).join(' ').trim();
  return util.format(fmt, op, args, error.message);
}


/**
 * @param {String} operation
 * @param {Array} args
 * @param {Error} error
 */
function ExecutionError(operation, args, error) {
  this.name = this.constructor.name;
  this.message = executionErrorMessage(operation, args, error);
  this.operation = operation;
  this.operationArgs = args;

  Error.captureStackTrace(this, this.constructor);

  var ourStack = this.stack;
  Object.defineProperty(this, 'stack', {
    get: function get() {
      return ourStack + '\n' + error.stack;
    }
  });

  Object.defineProperty(this, 'original', {
    enumerable: false,
    get: function getOriginalError() {
      return error;
    }
  });

  if (typeof error.getCode === 'function') {
    Object.defineProperty(this, 'getCode', {
      enumerable: false,
      value: function getCode() {
        return error.getCode();
      }
    });
  }
}
util.inherits(ExecutionError, Error);
errors.ExecutionError = ExecutionError;


function TimeoutError() {
  var args = slice.call(arguments, 0);
  var message = util.format.apply(null, args);

  this.name = this.constructor.name;
  this.message = message;

  Error.captureStackTrace(this, this.constructor);
}
util.inherits(TimeoutError, Error);
errors.TimeoutError = TimeoutError;
