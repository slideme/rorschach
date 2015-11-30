/*jshint -W030*/
'use strict';

var testUtils = require('../support/utils');
var Exception = Rorschach.Exception;
var create = testUtils.create;
var exists = testUtils.exists;
var utils = require('../../lib/utils');
var setData = testUtils.setData;


describe('DeleteBuilder', function deleteTestSuite() {
  var client;
  var zk;

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
    zk.mkdirp('/test/delete', done);
  });

  after(function deletePlayGround(done) {
    utils.deleteChildren(zk, '/test/delete', true, done);
  });

  after(function afterAll() {
    client.close();
  });

  it('should delete node', function testUsualCase(done) {
    var ourPath = '/test/delete/1';
    create(zk, ourPath, afterCreate);

    function afterCreate() {
      client.delete().forPath(ourPath, afterDelete);
    }

    function afterDelete(err) {
      assert.ifError(err);
      exists(zk, ourPath, handleExistsResult);
    }

    function handleExistsResult(stat) {
      expect(stat).to.not.exist;
      done();
    }
  });

  it('should delete node guaranteed', function testGuaranteed(done) {
    var ourPath = '/test/delete/2';

    create(zk, ourPath, afterCreate);

    var stub = sinon.stub(zk, 'remove', removeStub);
    var stubCallsCounter = 0;

    function removeStub(path, version, callback) {
      if (++stubCallsCounter > 2) {
        stub.restore();
        zk.remove(path, version, callback);
      }
      else {
        callback(new Exception(Exception.CONNECTION_LOSS, 'Stub error', Error));
      }
    }

    function afterCreate() {
      client.delete().guaranteed().forPath(ourPath, afterDelete);
    }

    function afterDelete(err) {
      assert.ifError(err);
      exists(zk, ourPath, handleExistsResult);
    }

    function handleExistsResult(stat) {
      expect(stat).to.not.exist;
      done();
    }
  });

  it('should delete node and children nodes if needed', function testDeleteChildren(done) {
    var ourPath = '/test/utils/3';
    var childPath = '/foo/bar';

    create(zk, ourPath + childPath, afterCreate);

    function afterCreate() {
      client.delete().deleteChildrenIfNeeded().forPath(ourPath, afterDelete);
    }

    function afterDelete(err) {
      assert.ifError(err);
      exists(zk, ourPath, handleExistsResult);
    }

    function handleExistsResult(stat) {
      expect(stat).to.not.exist;
      done();
    }
  });

  it('should delete node with given version', function testDeleteWithVersion(done) {
    var ourPath = '/test/utils/4';

    create(zk, ourPath, afterCreate);

    function afterCreate() {
      setData(zk, ourPath, new Buffer('new data'), afterSetData);
    }

    function afterSetData(stat) {
      expect(stat.version).to.eql(1);

      client.delete().withVersion(1).forPath(ourPath, afterDelete);
    }

    function afterDelete(err) {
      assert.ifError(err);
      exists(zk, ourPath, handleExistsResult);
    }

    function handleExistsResult(stat) {
      expect(stat).to.not.exist;
      done();
    }
  });

  it('should return NO_NODE if node does not exist', function testErrorNoNode(done) {
    var ourPath = '/test/delete/5';

    client.delete().forPath(ourPath, afterDelete);

    function afterDelete(err) {
      expect(err).to.be.instanceOf(Rorschach.Errors.ExecutionError);
      expect(err.getCode()).to.eql(Exception.NO_NODE);
      done();
    }
  });

  it('should return BAD_VERSION if wrong version was specified', function testErrorVersion(done) {
    var ourPath = '/test/delete/6';
    create(zk, ourPath, afterCreate);

    function afterCreate() {
      client.delete().withVersion(2).forPath(ourPath, afterDelete);
    }

    function afterDelete(err) {
      expect(err).to.be.instanceOf(Rorschach.Errors.ExecutionError);
      expect(err.getCode()).to.eql(Exception.BAD_VERSION);
      done();
    }
  });
});
