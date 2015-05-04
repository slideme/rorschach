/*jshint -W030*/
/*globals create, testPath, createPaths, deletePaths*/
'use strict';

var utils = require('../../lib/utils');
var Event = Rorschach.Event;
var Exception = Rorschach.Exception;


describe('SetDataBuilder', function setDataTestSuite() {
  var client;
  var zk;
  var suitePath = '/test/setData';

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

  it('should set data for existing node', function testUsualCase(done) {
    var ourPath = testPath(suitePath, 1);
    var buf = new Buffer('test data 1');

    create(zk, ourPath, afterCreate);

    function afterCreate() {
      client.setData().forPath(ourPath, buf, afterSetData);
    }

    function afterSetData(err, stat) {
      assert.ifError(err);
      expect(stat.version).to.equal(1);
      zk.getData(ourPath, handleResult);
    }

    function handleResult(err, data) {
      assert.ifError(err);
      expect(data.toString('utf8')).to.equal(buf.toString('utf8'));
      zk.remove(ourPath, -1, done);
    }
  });

  it('should set data for node with given version', function testWithVersion(done) {
    var ourPath = testPath(suitePath, 2);
    var buf = new Buffer('test data 2');

    create(zk, ourPath, afterCreate);

    function afterCreate() {
      setData(zk, ourPath, buf, afterRawSetData);
    }

    function afterRawSetData() {
      client.setData().withVersion(1).forPath(ourPath, buf, afterSetData);
    }

    function afterSetData(err, stat) {
      assert.ifError(err);
      expect(stat.version).to.equal(2);
      zk.remove(ourPath, -1, done);
    }
  });
});
