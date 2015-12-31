'use strict';

var testUtils = require('../support/utils');
var utils = require('../../lib/utils');
var Exception = Rorschach.Exception;
var ACL = Rorschach.ACL;
var create = testUtils.create;
var setACL = testUtils.setACL;
var testPath = testUtils.testPath;


describe('SetACLBuilder', function setACLTestSuite() {
  var client;
  var zk;
  var suitePath = '/test/setACL';

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

  it('should set acl without problems', function testUsualCase(done) {
    var ourPath = testPath(suitePath, 1);
    var newACL = ACL.READ_ACL_UNSAFE;

    create(zk, ourPath, afterCreate);

    function afterCreate() {
      client.setACL().forPath(ourPath, newACL, afterSetACL);
    }

    function afterSetACL(err, stat) {
      assert.ifError(err);
      expect(stat).to.be.ok;
      zk.getACL(ourPath, checkACL);
    }

    function checkACL(err, acls) {
      assert.ifError(err);
      expect(acls).to.eql(newACL);
      zk.remove(ourPath, -1, done);
    }
  });

  it('should set acl with version', function testWithVersion(done) {
    var ourPath = testPath(suitePath, 2);
    var newACL = ACL.READ_ACL_UNSAFE;

    create(zk, ourPath, afterCreate);

    function afterCreate() {
      setACL(zk, ourPath, ACL.OPEN_ACL_UNSAFE, afterSetData);
    }

    function afterSetData(stat) {
      client.setACL().withVersion(1).forPath(ourPath, newACL, afterSetACL);
    }

    function afterSetACL(err, stat) {
      assert.ifError(err);
      expect(stat).to.be.ok;
      zk.getACL(ourPath, checkACL);
    }

    function checkACL(err, acls) {
      assert.ifError(err);
      expect(acls).to.eql(newACL);
      zk.remove(ourPath, -1, done);
    }
  });

  it('should return error for non-existing node', function testErrorMissingNode(done) {
    var ourPath = testPath(suitePath, 3);
    var newACL = ACL.READ_ACL_UNSAFE;

    client.setACL().forPath(ourPath, newACL, afterSetACL);

    function afterSetACL(err, stat) {
      expect(err).to.be.instanceOf(Rorschach.Errors.ExecutionError);
      expect(err.getCode()).to.equal(Exception.NO_NODE);
      done();
    }
  });

  it('should return error for wrong aversion', function testErrorWrongAversion(done) {
    var ourPath = testPath(suitePath, 4);
    var newACL = ACL.READ_ACL_UNSAFE;

    create(zk, ourPath, afterCreate);

    function afterCreate() {
      client.setACL().withVersion(2).forPath(ourPath, newACL, afterSetACL);
    }

    function afterSetACL(err) {
      expect(err).to.be.instanceOf(Rorschach.Errors.ExecutionError);
      expect(err.getCode()).to.equal(Exception.BAD_VERSION);
      zk.remove(ourPath, -1, done);
    }
  });
});
