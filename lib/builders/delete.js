'use strict';

var Exception = require('node-zookeeper-client').Exception;
var utils = require('../utils');


/*!
 * Expose
 */
module.exports = DeleteBuilder;




/**
 * Delete operation builder
 *
 * @constructor
 * @param {Rorschach} client Rorschach instance
 */
function DeleteBuilder(client) {
  this.client = client;
  this.isGuaranteed = false;
  this.deleteChildren = false;
  this.version = -1;
}




/**
 * If delete operation receives `NOT_EMPTY` error then make an attempt to delete
 * child nodes.
 *
 * @public
 * @returns {DeleteBuilder}
 */
DeleteBuilder.prototype.deleteChildrenIfNeeded = function deleteChildrenIfNeeded() {
  this.deleteChildren = true;
  return this;
};




/**
 * Execute delete.
 *
 * @public
 * @param {String} path Node path
 * @param {Function} callback Callback function: <code>(err)</code>
 */
DeleteBuilder.prototype.forPath = function forPath(path, callback) {
  var self = this;

  performDelete(this, path, afterDelete);

  function afterDelete(err) {
    if (!err) {
      callback();
    }
    else if (err.getCode() === Exception.NOT_EMPTY && self.deleteChildren) {
      utils.deleteChildren(self.client.zk, path, true, callback);
    }
    else {
      callback(err);
    }
  }
};




/**
 * Mark delete op. as guaranteed.
 *
 * @public
 * @returns {DeleteBuilder}
 */
DeleteBuilder.prototype.guaranteed = function guaranteed() {
  this.isGuaranteed = true;
  return this;
};




function performDelete(builder, path, callback) {
  var zk = builder.client.zk;

  function execRemove() {
    zk.remove(path, builder.version, handleResult);
  }

  function handleResult(err) {
    if (!err) {
      callback();
    }
    else if (builder.isGuaranteed && utils.isRetryable(err)) {
      setImmediate(execRemove);
    }
    else {
      callback(err);
    }
  }

  execRemove();
}




/**
 * Set node version to delete.
 *
 * @public
 * @param {Number} version
 * @returns {DeleteBuilder}
 */
DeleteBuilder.prototype.withVersion = function withVersion(version) {
  this.version = version;
  return this;
};
