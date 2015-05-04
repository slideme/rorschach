/*jshint -W030*/
/*globals create, testPath, createPaths, deletePaths*/
'use strict';

var utils = require('../../lib/utils');
var zookeeper = require('node-zookeeper-client');
var Event = zookeeper.Event;


describe('GetChildrenBuilder', function getDataTestSuite() {
  var client;
  var zk;
  var suitePath = '/test/getChildren';

  before(beforeAll);
  before(createPlayGround);
  after(deletePlayGround);
  after(afterAll);

  function beforeAll(done) {
    client = new Rorschach(ZK_STRING, {
      retryPolicy: {
        maxAttempts: 0
      }
    });
    zk = client.zk;
    client.once('connected', done);
  }

  function createPlayGround(done) {
    zk.mkdirp(suitePath, done);
  }

  function deletePlayGround(done) {
    zk.remove(suitePath, -1, done);
  }

  function afterAll() {
    client.close();
  }

  function generatePaths(testPath, childNodes) {
    var min = 4;
    var max = 10;
    var nodes = Math.round(min + Math.random() * (max - min));
    var paths = [];
    while (nodes--) {
      var nodeName = 'child-node-' + nodes;
      childNodes.unshift(nodeName);
      paths.unshift(utils.join(testPath, nodeName));
    }

    return [testPath].concat(paths);
  }

  it('should get children', function testUsualCase(done) {
    var ourPath = testPath(suitePath, 1);
    var childNodes = [];
    var paths = generatePaths(ourPath, childNodes);

    createPaths(zk, paths, afterCreate);

    function afterCreate() {
      client.getChildren().forPath(ourPath, handleResult);
    }

    function handleResult(err, children, stat) {
      assert.ifError(err);
      expect(children.sort()).to.eql(childNodes);
      expect(stat).to.be.ok;
      deletePaths(zk, paths.reverse(), done);
    }
  });

  it('should get data with watcher', function testWithWatcher(done) {
    var ourPath = testPath(suitePath, 1);
    var childNodes = [];
    var paths = generatePaths(ourPath, childNodes);

    createPaths(zk, paths, afterCreate);

    function afterCreate() {
      client.getChildren().usingWatcher(watcher).forPath(ourPath, handleResult);
    }

    function watcher(event) {
      expect(event.getType()).to.equal(Event.NODE_CHILDREN_CHANGED);
      deletePaths(zk, paths.reverse(), done);
    }

    function handleResult(err, children, stat) {
      assert.ifError(err);
      expect(children.sort()).to.eql(childNodes);
      expect(stat).to.be.ok;
      zk.remove(paths[1], -1, utils.noop);
    }
  });
});
