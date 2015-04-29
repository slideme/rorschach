'use strict';

var async = require('async');
var zk = require('node-zookeeper-client');
var ACL = zk.ACL;
var CreateMode = zk.CreateMode;
var Exception = zk.Exception;
var utils = module.exports = {};


/**
 * @const
 * @type {Number}
 */
utils.MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;




/**
 * ZooKeeper path separator.
 *
 * @type {string}
 */
utils.sep = '/';




/**
 * Delete children for given path and maybe given znode.
 *
 * @param {Client} zk ZooKeeper client
 * @param {String} path Node path
 * @param {Boolean} [deleteSelf=false] Delete node itself
 * @param {Function} callback Callback function: <code>(err)</code>
 */
function deleteChildren(zk, path, deleteSelf, callback) {
  if (arguments.length === 3) {
    callback = deleteSelf;
    deleteSelf = false;
  }

  zk.getChildren(path, handleChildren);

  function handleChildren(err, children) {
    if (err) {
      callback(err);
    }
    else if (!children.length) {
      done();
    }
    else {
      async.each(children, deleteNode, done);
    }
  }

  function deleteNode(node, callback) {
    var nodePath = join(path, node);
    deleteChildren(zk, nodePath, true, callback);
  }

  function done(err) {
    if (err) {
      callback(err);
    }
    else if (deleteSelf) {
      zk.remove(path, -1, callback);
    }
    else {
      callback();
    }
  }
}
utils.deleteChildren = deleteChildren;




/**
 * Get sequence number from node
 *
 * @param {Exception} err
 */
function isRetryable(err) {
  var code = err.getCode && err.getCode();

  return (code === Exception.CONNECTION_LOSS ||
  code === Exception.OPERATION_TIMEOUT ||
  code === Exception.SESSION_EXPIRED/* || code === Exception.SESSION_MOVED*/);
}
utils.isRetryable = isRetryable;




/**
 * Join path parts
 *
 * @param {String...} [args] Path parts
 */
function join(args) {
  var arg;
  var i = 0;
  var path = '';

  if (arguments.length === 0) {
    return utils.sep;
  }

  while ((arg = arguments[i++])) {
    if (typeof arg !== 'string') {
      throw new TypeError('utils.join() expects string arguments');
    }

    path += utils.sep + arg;
  }

  path = path.replace(/\/+/g, utils.sep);
  if (path[path.length - 1] === utils.sep) {
    path = path.substring(0, path.length - 1);
  }
  return path;
}
utils.join = join;




/**
 *
 * @param {Client} zk ZooKeeper client
 * @param {String} path
 * @param {Boolean} makeLastNode
 * @param {Array.<ACL>} acl
 * @param {Function} callback Callback function: <code>(err)</code>
 */
function mkdirs(zk, path, makeLastNode, acl, callback) {
  var pos = 1;

  function createNextNode(err) {
    if (err && err.getCode() !== Exception.NODE_EXISTS) {
      return callback(err);
    }
    else if (pos === path.length) {
      return callback();
    }

    pos = path.indexOf(utils.sep, pos + 1);

    if (pos === -1) {
      if (!makeLastNode) {
        return callback();
      }

      pos = path.length;
    }

    var subPath = path.substring(0, pos);

    zk.exists(subPath, handleResult);

    function handleResult(err, stat) {
      if (err) {
        callback(err);
      }
      else if (stat) {
        createNextNode();
      }
      else {
        zk.create(subPath, acl || ACL.OPEN_ACL_UNSAFE, CreateMode.PERSISTENT,
          createNextNode);
      }
    }
  }

  createNextNode();
}
utils.mkdirs = mkdirs;




/**
 * The most important part of this module
 */
function noop() {
}
utils.noop = noop;




/**
 * Split base path and node name.
 *
 * @param {String} path Node path
 * @returns {{path: String, node: String}}
 */
function pathAndNode(path) {
  if (path.charAt(0) !== '/') {
    path = '/' + path;
  }
  var idx = path.lastIndexOf('/');
  var out = {};
  if (idx === 0) {
    out.path = '/';
  }
  else {
    out.path = path.substring(0, idx);
  }
  out.node = path.substring(idx + 1);

  return out;
}
utils.pathAndNode = pathAndNode;
