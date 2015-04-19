'use strict';

var Exception = require('node-zookeeper-client').Exception;


// TODO this should be configurable
/**
 * Get sequence number from node
 *
 * @param {Exception} err
 */
function isRetryable(err) {
  var code = err.getCode();

  return (code === Exception.CONNECTION_LOSS ||
  code === Exception.OPERATION_TIMEOUT ||
  code === Exception.SESSION_EXPIRED/* || code === Exception.SESSION_MOVED*/);
}
exports.isRetryable = isRetryable;




/**
 * Join path parts
 *
 * @param {String...} args Path parts
 */
function join(args) {
  var arg;
  var i = 0;
  var path = '';

  if (arguments.length === 0) {
    return '/';
  }

  while ((arg = arguments[i++])) {
    if (typeof arg !== 'string') {
      throw new TypeError('utils.join() expects string arguments');
    }

    path += '/' + arg;
  }

  path = path.replace(/\/+/g, '/');
  if (path[path.length - 1] === '/') {
    path = path.substring(0, path.length - 1);
  }
  return path;
}
exports.join = join;




/**
 * The most important part of this module
 */
function noop() {
}
exports.noop = noop;
