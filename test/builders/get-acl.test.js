/*jshint -W030*/
'use strict';

var testUtils = require('../support/utils');
var utils = require('../../lib/utils');
var Exception = Rorschach.Exception;
var create = testUtils.create;
var testPath = testUtils.testPath;


describe('GetACLBuilder', function getACLTestSuite() {
  var client;
  var zk;
  var suitePath = '/test/getACL';

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

    create(zk, ourPath, afterCreate);

    function afterCreate() {
      client.getACL().forPath(ourPath, afterGetACL);
    }

    function afterGetACL(err, acls, stat) {
      assert.ifError(err);
      expect(acls).to.eql(Rorschach.ACL.OPEN_ACL_UNSAFE);
      expect(stat).to.be.ok;
      zk.remove(ourPath, -1, done);
    }
  });

  it('should get error for non-existing node', function testErrorNoNode(done) {
    var ourPath = testPath(suitePath, 2);
    client.getACL().forPath(ourPath, afterGetACL);

    function afterGetACL(err) {
      expect(err).to.be.instanceOf(Rorschach.Errors.ExecutionError);
      expect(err.getCode()).to.equal(Exception.NO_NODE);
      done();
    }
  });
});
