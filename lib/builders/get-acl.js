'use strict';

var Exception = require('node-zookeeper-client').Exception;
var ExecutionError = require('../errors').ExecutionError;
var utils = require('../utils');


/*!
 * Expose
 */
module.exports = GetACLBuilder;




/**
 * Get ACL operation builder.
 *
 * @constructor
 * @param {Rorschach} client Rorschach instance
 */
function GetACLBuilder(client) {
  this.client = client;
}




/**
 * Execute getACL().
 *
 * @public
 * @param {String} path Node path
 * @param {Function} callback Callback function: <code>(err, acls, stat)</code>
 */
GetACLBuilder.prototype.forPath = function forPath(path, callback) {
  var client = this.client;
  var zk = client.zk;

  client.retryLoop(exec, callback);

  function exec(cb) {
    zk.getACL(path, handleResult);

    function handleResult(err, acls, stat) {
      if (err) {
        err = new ExecutionError('getACL', [path], err);
        cb(err);
      }
      else {
        cb(null, acls, stat);
      }
    }
  }
};
