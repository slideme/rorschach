'use strict';

var Exception = require('node-zookeeper-client').Exception;
var utils = require('../utils');


/*!
 * Expose
 */
module.exports = GetChildrenBuilder;




/**
 * Get data operation builder.
 *
 * @constructor
 * @param {Rorschach} client Rorschach instance
 */
function GetChildrenBuilder(client) {
  this.client = client;
  this.watcher = null;
}




/**
 * Execute getChildren().
 *
 * @public
 * @param {String} path Node path
 * @param {Function} callback Callback function: <code>(err, data, stat)</code>
 */
GetChildrenBuilder.prototype.forPath = function forPath(path, callback) {
  var client = this.client;
  var zk = client.zk;
  var watcher = this.watcher;

  client.retryLoop(exec, callback);

  function exec(cb) {
    if (watcher) {
      zk.getChildren(path, watcher, cb);
    }
    else {
      zk.getChildren(path, cb);
    }
  }
};




/**
 * Add watcher to operation request.
 *
 * @public
 * @param {Function} watcher Watch function: <code>(event)</code>
 * @returns {GetChildrenBuilder}
 */
GetChildrenBuilder.prototype.usingWatcher = function usingWatcher(watcher) {
  assert.equal(typeof watcher, 'function', 'Function expected');
  this.watcher = watcher;
  return this;
};
