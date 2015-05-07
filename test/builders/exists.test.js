/*jshint -W030*/
'use strict';

var testUtils = require('../support/utils');
var utils = require('../../lib/utils');
var Event = Rorschach.Event;
var Exception = Rorschach.Exception;
var create = testUtils.create;
var testPath = testUtils.testPath;


describe('ExistsBuilder', function existsTestSuite() {
  var client;
  var zk;
  var suitePath = '/test/exists';
  var sandbox;

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
    sandbox = sinon.sandbox.create();
  }

  function createPlayGround(done) {
    zk.mkdirp(suitePath, done);
  }

  function deletePlayGround(done) {
    zk.remove(suitePath, -1, done);
  }

  function afterAll() {
    sandbox.restore();
    client.close();
  }

  it('should return true for existing node', function testUsualCase(done) {
    var ourPath = testPath(suitePath, 1);

    create(zk, ourPath, afterCreate);

    function afterCreate() {
      client.exists().forPath(ourPath, handleResult);
    }

    function handleResult(err, exists, stat) {
      assert.ifError(err);
      expect(exists).to.be.true;
      expect(stat).to.be.ok;
      zk.remove(ourPath, -1, done);
    }
  });

  it('should return false for missing node', function testUsualCaseMissing(done) {
    var ourPath = testPath(suitePath, 2);

    client.exists().forPath(ourPath, handleResult);

    function handleResult(err, exists, stat) {
      assert.ifError(err);
      expect(exists).to.be.false;
      expect(stat).to.be.not.ok;
      done();
    }
  });

  it('should return result and add watcher', function testWithWatcher(done) {
    var ourPath = testPath(suitePath, 3);

    create(zk, ourPath, afterCreate);

    function afterCreate() {
      client.exists().usingWatcher(watcher).forPath(ourPath, handleResult);
    }

    function watcher(event) {
      expect(event.getType()).to.equal(Event.NODE_DELETED);
      done();
    }

    function handleResult(err, exists, stat) {
      assert.ifError(err);
      expect(exists).to.be.true;
      expect(stat).to.be.ok;
      zk.remove(ourPath, -1, utils.noop);
    }
  });

  it('should add watcher for missing node', function testWatcherMissing(done) {
    var ourPath = testPath(suitePath, 4);

    client.exists().usingWatcher(watcher).forPath(ourPath, handleResult);

    function watcher(event) {
      expect(event.getType()).to.equal(Event.NODE_CREATED);
      zk.remove(ourPath, -1, done);
    }

    function handleResult(err, exists, stat) {
      assert.ifError(err);
      expect(exists).to.be.false;
      expect(stat).to.be.not.ok;
      create(zk, ourPath, utils.noop);
    }
  });

  it('should delegate error correctly', function testError(done) {
    var ourPath = testPath(suitePath, 5) + '/very/missing';
    var stub = sandbox.stub(zk, 'exists');
    var errMsg = 'Stub error';
    var err = new Exception(Exception.CONNECTION_LOSS, errMsg, TypeError);
    stub.withArgs(ourPath).callsArgWith(1, err);

    client.exists().forPath(ourPath, handleResult);

    function handleResult(existsErr) {
      expect(existsErr).to.equal(err);
      stub.restore();
      done();
    }
  });
});
