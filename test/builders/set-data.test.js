'use strict';

var testUtils = require('../support/utils');
var utils = require('../../lib/utils');
var Event = Rorschach.Event;
var Exception = Rorschach.Exception;
var create = testUtils.create;
var setData = testUtils.setData;
var testPath = testUtils.testPath;


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

  it('should return NO_NODE if node does not exist', function testErrorNoNode(done) {
    var ourPath = testPath(suitePath, 3);
    var buf = new Buffer('test data 3');

    client.setData().forPath(ourPath, buf, afterSetData);

    function afterSetData(err) {
      expect(err).to.be.instanceOf(Rorschach.Errors.ExecutionError);
      expect(err.getCode()).to.equal(Exception.NO_NODE);
      done();
    }
  });

  it('should return BAD_VERSION if wrong version was specified', function testErrorVersion(done) {
    var ourPath = testPath(suitePath, 4);
    var buf = new Buffer('test data 4');

    create(zk, ourPath, afterCreate);

    function afterCreate() {
      client.setData().withVersion(100500).forPath(ourPath, buf, afterSetData);
    }

    function afterSetData(err) {
      expect(err).to.be.instanceOf(Rorschach.Errors.ExecutionError);
      expect(err.getCode()).to.equal(Exception.BAD_VERSION);
      zk.remove(ourPath, -1, done);
    }
  });
});
