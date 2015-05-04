
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