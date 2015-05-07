'use strict';

var async = require('async');
var testUtils = module.exports = {};


testUtils.create = function create(zk, path, data, callback) {
  if (arguments.length === 3) {
    callback = data;
    data = null;
  }

  zk.mkdirp(path, data, afterCreate);

  function afterCreate(err, nodePath) {
    assert.ifError(err);

    callback(nodePath);
  }
};


testUtils.createPaths = function createPaths(zk, paths, cb) {
  async.eachSeries(paths, createPath, cb);

  function createPath(path, cb) {
    zk.create(path, afterCreate);

    function afterCreate(err) {
      if (err && err.getCode() !== Rorschach.Exception.NODE_EXISTS) {
        cb(err);
      }
      else {
        cb();
      }
    }
  }
};


testUtils.deletePaths = function deletePaths(zk, paths, cb) {
  async.eachSeries(paths, deletePath, cb);

  function deletePath(path, cb) {
    zk.remove(path, -1, afterCreate);

    function afterCreate(err) {
      if (err && err.getCode() !== Rorschach.Exception.NO_NODE) {
        cb(err);
      }
      else {
        cb();
      }
    }
  }
};


testUtils.exists = function exists(zk, path, callback) {
  zk.exists(path, handleResult);

  function handleResult(err, stat) {
    assert.ifError(err);

    callback(stat);
  }
};


testUtils.getChildren = function getChildren(zk, path, callback) {
  zk.getChildren(path, handleResult);

  function handleResult(err, children) {
    assert.ifError(err);

    callback(children);
  }
};


testUtils.setData = function setData(zk, path, data, callback) {
  zk.setData(path, data, handleResult);

  function handleResult(err, stat) {
    assert.ifError(err);

    callback(stat);
  }
};


testUtils.testPath = function testPath(root, num) {
  return root + '/' + num;
};