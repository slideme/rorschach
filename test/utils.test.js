/*jshint -W030*/
'use strict';

var zookeeper = require('node-zookeeper-client');
var utils = require('../lib/utils');
var Exception = Rorschach.Exception;


describe('Utils', function utilsTestSuite() {
  var zk;

  before(function beforeAll(done) {
    zk = zookeeper.createClient(ZK_STRING);
    zk.connect();
    zk.once('connected', done);
  });

  before(function createPlayGround(done) {
    zk.mkdirp('/test/utils', done);
  });

  after(function deletePlayGround(done) {
    zk.remove('/test/utils', done);
  });

  after(function afterAll() {
    zk.close();
  });

  describe('deleteChildren()', function deleteChildrenTestSuite() {
    it('should delete children of given path', function testUsualCase(done) {
      var ourPath = '/test/utils/1';
      var childrenPath = '/foo/bar/baz/qux';

      create(zk, ourPath + childrenPath, afterCreate);

      function afterCreate() {
        utils.deleteChildren(zk, ourPath, false, afterDelete);
      }

      function afterDelete(err) {
        assert.ifError(err);

        getChildren(zk, ourPath, handleChildren);
      }

      function handleChildren(children) {
        expect(children.length).to.eql(0);

        zk.remove(ourPath, done);
      }
    });

    it('should delete children and node itself if specified', function testDeleteSelf(done) {
      var ourPath = '/test/utils/2';
      var childrenPath = '/foo/bar';

      create(zk, ourPath + childrenPath, afterCreate);

      function afterCreate() {
        utils.deleteChildren(zk, ourPath, true, afterDelete);
      }

      function afterDelete(err) {
        assert.ifError(err);

        exists(zk, ourPath, handleExists);
      }

      function handleExists(stat) {
        expect(stat).to.be.not.ok;
        done();
      }
    });

    it('should handle case with 3 arguments correctly', function test3Args(done) {
      var ourPath = '/test/utils/3';
      var childrenPath = '/foo/bar';

      create(zk, ourPath + childrenPath, afterCreatePath);

      function afterCreatePath() {
        utils.deleteChildren(zk, ourPath, afterDelete);
      }

      function afterDelete(err) {
        assert.ifError(err);
        exists(zk, ourPath, existsCallback);
      }

      function existsCallback(stat) {
        expect(stat).to.be.ok;
        zk.remove(ourPath, done);
      }
    });

    it('should return error for non-existing node', function testErrorNonExisting(done) {
      utils.deleteChildren(zk, '/test/utils/non-existing', afterDelete);

      function afterDelete(err) {
        expect(err).to.be.ok;
        expect(err.getCode()).to.eql(Exception.NO_NODE);
        done();
      }
    });

    it('should delegate error correctly', function testErrorDelegate(done) {
      var ourPath = '/test/utils/5';
      var children = ['foo'];
      var errMsg = 'Stub error';

      var stub = sinon.stub(zk, 'getChildren');
      stub.withArgs(ourPath).callsArgWith(1, null, children);
      stub.withArgs(ourPath + '/foo').callsArgWith(1, new Error(errMsg));

      utils.deleteChildren(zk, ourPath, afterDelete);

      function afterDelete(err) {
        expect(err).to.be.ok;
        expect(err.message).to.eql('Stub error');
        stub.restore();
        done();
      }
    });
  });

  describe('isRetryable()', function isRetryableTestSuite() {
    it('should return false for usual errors', function testNonZKErrors() {
      var ret = utils.isRetryable(new Error('Usual error'));
      expect(ret).to.be.false;
    });

    it('should return true for CONNECTION_LOSS, OPERATION_TIMEOUT and SESSION_EXPIRED', function testUsualCase() {
      var ret = utils.isRetryable(new Exception(Exception.CONNECTION_LOSS, 'test', Function));
      expect(ret).to.be.true;
      ret = utils.isRetryable(new Exception(Exception.OPERATION_TIMEOUT, 'test', Function));
      expect(ret).to.be.true;
      ret = utils.isRetryable(new Exception(Exception.SESSION_EXPIRED, 'test', Function));
      expect(ret).to.be.true;
    });
  });

  describe('join()', function joinTestSuite() {
    it('should return / in case of no arguments', function testNoArgs() {
      var ret = utils.join();
      expect(ret).to.eql('/');
    });

    it('should join paths correctly', function testUsualCase() {
      var ret = utils.join('/foo', '/bar');
      expect(ret).to.eql('/foo/bar');
    });

    it('should join paths without separator', function testNoSeparator() {
      var ret = utils.join('foo', 'bar');
      expect(ret).to.eql('/foo/bar');
    });

    it('should join paths without separator', function testOnlySeparator() {
      var ret = utils.join('/', 'foo');
      expect(ret).to.eql('/foo');
    });

    it('should trim path', function testTrimPath() {
      var ret = utils.join('/foo', 'bar/');
      expect(ret).to.eql('/foo/bar');
    });

    it('should join whatever paths', function testJoinHell() {
      var ret = utils.join('/', '/foo/', '/bar', 'baz/', 'qux');
      expect(ret).to.eql('/foo/bar/baz/qux');
    });

    it('should throw error if non-string arguments passed', function testValidateArgs() {
      expect(function passNonStringArgs() {
        utils.join(1, true, null, undefined);
      }).to.throw(TypeError);
    });
  });

  describe('mkdirs()', function mkdirsTestSuite() {
    it('should create paths', function testUsualCase(done) {
      var testPath = '/test/utils/6';
      var path = testPath + '/foo';
      var lastNode = '/bar';

      utils.mkdirs(zk, path + lastNode, false, null, afterMkdirs);

      function afterMkdirs(err) {
        assert.ifError(err);
        exists(zk, path, handleExistsResult);
      }

      function handleExistsResult(stat) {
        expect(stat).to.be.ok;
        exists(zk, path + lastNode, handleLastNodeExistsResult);
      }

      function handleLastNodeExistsResult(stat) {
        expect(stat).to.be.not.ok;
        utils.deleteChildren(zk, '/test/utils/6', true, done);
      }
    });

    it('should create paths including last node', function testLastNode(done) {
      var testPath = '/test/utils/7';
      var path = testPath + '/foo';
      var lastNode = '/bar';

      utils.mkdirs(zk, path + lastNode, true, null, afterMkdirs);

      function afterMkdirs(err) {
        assert.ifError(err);
        exists(zk, path + lastNode, handleExistsResult);
      }

      function handleExistsResult(stat) {
        expect(stat).to.be.ok;
        utils.deleteChildren(zk, testPath, true, done);
      }
    });

    it('should delegate errors correctly', function testErrorDelegate(done) {
      var ourPath = '/test/utils/8/foo';
      var errMsg = 'Stub error';
      var err = new Exception(Exception.CONNECTION_LOSS, errMsg, TypeError);

      var stub = sinon.stub(zk, 'exists');
      stub.withArgs('/test').callsArgWith(1, err);

      utils.mkdirs(zk, ourPath, true, null, afterMkdirs);

      function afterMkdirs(err) {
        expect(err).to.equal(err);
        stub.restore();
        done();
      }
    });

    it('should delegate errors correctly', function testErrorDelegate2(done) {
      var testPath = '/test/utils/9';
      var ourPath = testPath + '/foo';
      var errMsg = 'Stub error';
      var err = new Exception(Exception.CONNECTION_LOSS, errMsg, TypeError);
      var stub = sinon.stub(zk, 'create');

      stub.withArgs(testPath).callsArgWith(3, err);

      utils.mkdirs(zk, ourPath, true, null, afterMkdirs);

      function afterMkdirs(err) {
        expect(err).to.equal(err);
        stub.restore();
        done();
      }
    });
  });

  describe('pathAndNode()', function pathAndNodeTestSuite() {
    it('should split path w/o separator into / and node name', function testRootPath() {
      var ret = utils.pathAndNode('/foo');
      expect(ret.path).to.eql('/');
      expect(ret.node).to.eql('foo');
    });

    it('should split root path into / and node name', function testRootPath() {
      var ret = utils.pathAndNode('bar');
      expect(ret.path).to.eql('/');
      expect(ret.node).to.eql('bar');
    });

    it('should split path into parent and node name', function testUsualCase() {
      var ret = utils.pathAndNode('/foo/bar/baz');
      expect(ret.path).to.eql('/foo/bar');
      expect(ret.node).to.eql('baz');
    });
  });
});
