'use strict';

var assert = require('assert');
var Exception = require('node-zookeeper-client').Exception;
var ExecutionError = require('../errors').ExecutionError;
var utils = require('../utils');


/*!
 * Expose
 */
module.exports = ExistsBuilder;




/**
 * Exists operation builder.
 *
 * @constructor
 * @param {Rorschach} client Rorschach instance
 */
function ExistsBuilder(client) {
  this.client = client;
  this.watcher = null;
}




/**
 * Execute exists().
 *
 * @public
 * @param {String} path Node path
 * @param {Function} callback Callback function: <code>(err, exists, stat)</code>
 */
ExistsBuilder.prototype.forPath = function forPath(path, callback) {
  var client = this.client;
  var zk = client.zk;
  var watcher = this.watcher;

  client.retryLoop(exec, callback);

  function exec(cb) {
    if (watcher) {
      zk.exists(path, watcher, handleResult);
    }
    else {
      zk.exists(path, handleResult);
    }

    function handleResult(err, stat) {
      if (err) {
        err = new ExecutionError('exists', [path, watcher], err);
        cb(err);
      }
      else {
        cb(null, stat !== null, stat);
      }
    }
  }
};




/**
 * Add watcher to operation request.
 *
 * @public
 * @param {Function} watcher Watch function: <code>(event)</code>
 * @returns {ExistsBuilder}
 */
ExistsBuilder.prototype.usingWatcher = function usingWatcher(watcher) {
  assert.equal(typeof watcher, 'function', 'Function expected');
  this.watcher = watcher;
  return this;
};
