'use strict';

var utils = require('../utils');
var uuid = require('uuid');
var zk = require('node-zookeeper-client');
var ACL = zk.ACL;
var CreateMode = zk.CreateMode;
var Exception = zk.Exception;


/*!
 * Expose
 */
module.exports = CreateBuilder;




/**
 * Create operation builder
 *
 * @constructor
 * @param {Rorschach} client Rorschach instance
 */
function CreateBuilder(client) {
  /**
   * @type {Rorschach}
   */
  this.client = client;
}




/**
 *
 * @const
 * @private
 * @static
 * @type {string}
 */
CreateBuilder.PROTECTED_PREFIX = '_r_';




/**
 * Default ACLs.
 *
 * @private
 * @type {Array.<ACL>}
 */
CreateBuilder.prototype.acls = ACL.OPEN_ACL_UNSAFE;




/**
 * Do not create parent nodes by default assuming they already exist.
 *
 * @private
 * @type {boolean}
 */
CreateBuilder.prototype.createParents = false;




/**
 * Default create mode.
 *
 * @private
 * @type {number}
 */
CreateBuilder.prototype.mode = CreateMode.PERSISTENT;




/**
 * Default protection mode.
 *
 * @private
 * @type {Boolean}
 */
CreateBuilder.prototype.protection = false;




/**
 * Get final path
 *
 * @param {CreateBuilder} builder
 * @param {String} path
 */
function adjustPath(builder, path) {
  if (builder.protection) {
    var pathAndNode = utils.pathAndNode(path);
    var nodeName = getProtectedPrefix(builder.protectedId) + pathAndNode.node;
    path = utils.join(pathAndNode.path, nodeName);
  }
  return path;
}




/**
 * If path create operation will receive `NO_NODE` error then builder will make
 * an attempt to create parent nodes.
 *
 * @public
 * @returns {CreateBuilder}
 */
CreateBuilder.prototype.creatingParentsIfNeeded = function creatingParentsIfNeeded() {
  this.createParents = true;
  return this;
};




/**
 * @see https://curator.apache.org/apidocs/org/apache/curator/framework/api/CreateBuilder.html#withProtection--
 */
function findAndDeleteProtectedNode(builder, path, protectedId, callback) {
  var pathAndNode = utils.pathAndNode(path);
  var client = builder.client;
  var zk = client.zk;

  zk.getChildren(pathAndNode.path, handleResult);

  function handleResult(err, children) {
    if (children) {
      var nodePath = findNode(children, pathAndNode.path, protectedId);
      if (nodePath) {
        client.delete().guaranteed().forPath(nodePath, callback);
      }
      else {
        callback();
      }
    }
    else if (err.getCode() === Exception.CONNECTION_LOSS) {
      setImmediate(findAndDeleteProtectedNode, builder, path, protectedId,
        callback);
    }
    else {
      callback(err);
    }
  }
}




/**
 * Find znode among children list with given prefix.
 *
 * @param {Array.<String>} children
 * @param {String} path
 * @param {String} protectedId
 * @returns {String|null}
 */
function findNode(children, path, protectedId) {
  var prefix = getProtectedPrefix(protectedId);
  var i = 0;
  var node;
  while ((node = children[i++])) {
    if (node.indexOf(prefix) === 0) {
      return utils.join(path, node);
    }
  }
  return null;
}




/**
 * Try to find protected node with same `protectedId`.
 *
 * @param {CreateBuilder} builder Builder instance
 * @param {String} path Desired path
 * @param {Function} callback Callback function: <code>(err, nodePath)</code>
 */
function findProtectedNode(builder, path, callback) {
  var zk = builder.client.zk;
  var pathAndNode = utils.pathAndNode(path);
  zk.getChildren(pathAndNode.path, afterCheck);

  function afterCheck(err, children) {
    if (err && err.getCode() === Exception.NO_NODE) {
      callback();
    }
    else if (err) {
      callback(err);
    }
    else if (children.length) {
      var result = findNode(children, pathAndNode.path, builder.protectedId);
      callback(null, result);
    }
    else {
      callback();
    }
  }
}




/**
 * Execute create op.
 *
 * @public
 * @param {String} path Path to znode
 * @param {Buffer} [data=null] ZNode data to set
 * @param {Function} callback Callback function: <code>(err, path)</code>
 */
CreateBuilder.prototype.forPath = function forPath(path, data, callback) {
  if (arguments.length === 2) {
    callback = data;
    data = null;
  }

  var adjustedPath = adjustPath(this, path);
  var self = this;

  performCreate(this, adjustedPath, data, afterCreate);

  function afterCreate(err, nodePath) {
    if (nodePath) {
      callback(null, nodePath);
    }
    else if ((err.getCode() === Exception.CONNECTION_LOSS || !err.getCode) &&
      self.protectedId) {

      var protectedId = self.protectedId;
      self.protectedId = uuid.v4();

      findAndDeleteProtectedNode(self, adjustedPath, protectedId, afterDelete);
    }
    else {
      callback(err);
    }

    function afterDelete(deleteErr) {
      callback(deleteErr || err);
    }
  }


};




/**
 * Return prefix for protected znodes.
 *
 * @param {String} protectedId
 * @returns {string}
 */
function getProtectedPrefix(protectedId) {
  return CreateBuilder.PROTECTED_PREFIX + protectedId + '-';
}




/**
 * Create node and it's parents if needed.
 *
 * @param {CreateBuilder} builder
 * @param {String} path Node path
 * @param {Buffer} data Node data
 * @param {Function} callback Callback function: <code>(err)</code>
 */
function performCreate(builder, path, data, callback) {
  var client = builder.client;
  var zk = client.zk;
  var firstTime = true;

  client.retryLoop(exec, callback);

  function exec(cb) {
    if (firstTime && builder.protection) {
      findProtectedNode(builder, path, createIfNotExist);
    }
    else {
      createIfNotExist();
    }

    firstTime = false;

    function createIfNotExist(err, nodePath) {
      if (err) {
        return cb(err);
      }
      else if (nodePath) {
        return cb(null, nodePath);
      }

      zk.create(path, data, builder.acls, builder.mode, afterCreate);
    }

    function afterCreate(err, nodePath) {
      if (nodePath) {
        cb(null, nodePath);
      }
      else if (err.getCode() === Exception.NO_NODE && builder.createParents) {
        utils.mkdirs(zk, path, false, null, createIfNotExist);
      }
      else {
        cb(err);
      }
    }
  }
}




/**
 * Set ACLs.
 *
 * @public
 * @param {Array.<ACL>} acls
 * @returns {CreateBuilder}
 */
CreateBuilder.prototype.withACL = function withACL(acls) {
  this.acls = acls;
  return this;
};




/**
 * Set create mode.
 *
 * @public
 * @param {Number} mode CreateMode
 * @returns {CreateBuilder}
 */
CreateBuilder.prototype.withMode = function withMode(mode) {
  this.mode = mode;
  return this;
};




/**
 * See <a href="https://curator.apache.org/apidocs/org/apache/curator/framework/api/CreateBuilder.html#withProtection--">this</a> page for explanation.
 *
 * @public
 * @returns {CreateBuilder}
 */
CreateBuilder.prototype.withProtection = function withProtection() {
  this.protection = true;
  this.protectedId = uuid.v4();
  return this;
};
