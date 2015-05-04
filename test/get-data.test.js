/*jshint -W030*/
/*globals create, testPath*/
'use strict';

var utils = require('../lib/utils');
var zookeeper = require('node-zookeeper-client');
var Event = zookeeper.Event;
var Exception = zookeeper.Exception;


describe('GetDataBuilder', function getDataTestSuite() {
  var client;
  var zk;
  var suitePath = '/test/getData';

  before(function beforeAll(done) {
    client = new Rorschach(ZK_STRING, {
      retryPolicy: {
        maxAttempts: 0
      }
    });
    zk = client.zk;
    client.once('connected', done);
  });

  before(function createPlayGround(done) {
    zk.mkdirp(suitePath, done);
  });

  after(function deletePlayGround(done) {
    zk.remove(suitePath, -1, done);
  });

  after(function afterAll() {
    client.close();
  });

  it('should get data', function testUsualCase(done) {
    var ourPath = testPath(suitePath, 1);
    var buf = new Buffer('test data 1');
    create(zk, ourPath, buf, afterCreate);

    function afterCreate() {
      client.getData().forPath(ourPath, afterGetData);
    }

    function afterGetData(err, data, stat) {
      assert.ifError(err);
      expect(data.toString('utf8')).to.equal(buf.toString('utf8'));
      expect(stat).to.be.ok;
      zk.remove(ourPath, -1, done);
    }
  });

  it('should get data with watcher', function testWithWatcher(done) {
    var ourPath = testPath(suitePath, 2);
    var buf = new Buffer('test data 2');

    create(zk, ourPath, buf, afterCreate);

    function afterCreate() {
      client.getData().usingWatcher(watcher).forPath(ourPath, afterGetData);
    }

    function watcher(event) {
      expect(event.getType()).to.equal(Event.NODE_DELETED);
      done();
    }

    function afterGetData(err, data, stat) {
      assert.ifError(err);
      expect(data.toString('utf8')).to.equal(buf.toString('utf8'));
      expect(stat).to.be.ok;
      zk.remove(ourPath, -1, utils.noop);
    }
  });
});
