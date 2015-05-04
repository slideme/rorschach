
var async = require('async');
assert = require('chai').assert;
expect = require('chai').expect;
sinon = require('sinon');
Rorschach = require('../../');
ZK_STRING = process.env.ZK_STRING || '127.0.0.1:2181';


create = function create(zk, path, data, callback) {
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


createPaths = function createPaths(zk, paths, cb) {
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


deletePaths = function deletePaths(zk, paths, cb) {
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


exists = function exists(zk, path, callback) {
  zk.exists(path, handleResult);

  function handleResult(err, stat) {
    assert.ifError(err);

    callback(stat);
  }
};


getChildren = function getChildren(zk, path, callback) {
  zk.getChildren(path, handleResult);

  function handleResult(err, children) {
    assert.ifError(err);

    callback(children);
  }
};


setData = function setData(zk, path, data, callback) {
  zk.setData(path, data, handleResult);

  function handleResult(err, stat) {
    assert.ifError(err);

    callback(stat);
  }
};


testPath = function testPath(root, num) {
  return root + '/' + num;
};