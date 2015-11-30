'use strict';

var Exception = require('node-zookeeper-client').Exception;
var ExecutionError = require('../errors').ExecutionError;
var utils = require('../utils');


/*!
 * Expose
 */
module.exports = SetACLBuilder;




/**
 * Set ACL operation builder.
 *
 * @constructor
 * @param {Rorschach} client Rorschach instance
 */
function SetACLBuilder(client) {
  this.client = client;
  this.version = -1;
}




/**
 * Execute setACL().
 *
 * @public
 * @param {String} path Node path
 * @param {Array.<ACL>} acls ACLs
 * @param {Function} callback Callback function: <code>(err, stat)</code>
 */
SetACLBuilder.prototype.forPath = function forPath(path, acls, callback) {
  var client = this.client;
  var zk = client.zk;
  var version = this.version;

  client.retryLoop(exec, callback);

  function exec(cb) {
    zk.setACL(path, acls, version, handleResult);

    function handleResult(err, stat) {
      if (err) {
        err = new ExecutionError('setACL', [path, acls, version], err);
        cb(err);
      }
      else {
        cb(null, stat);
      }
    }
  }
};




/**
 * Set node ACL version (number of changes of ACL).
 *
 * It's not the same as node version (number of data changes).
 *
 * @public
 * @param {Number} version
 * @returns {SetACLBuilder}
 */
SetACLBuilder.prototype.withVersion = function withVersion(version) {
  this.version = version;
  return this;
};
