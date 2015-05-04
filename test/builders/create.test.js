//jshint -W030
'use strict';

var CreateBuilder = require('../../lib/builders/create');
var zk = require('node-zookeeper-client');
var ACL = zk.ACL;
var CreateMode = zk.CreateMode;
var Exception = zk.Exception;


describe('CreateBuilder', function createTestSuite() {
  var client;
  var zkClient;

  before(function beforeAll(done) {
    client = new Rorschach(ZK_STRING, {
      retryPolicy: {
        maxAttempts: 0,
        codes: []
      }
    });
    zkClient = client.zk;
    client.once('connected', done);
  });

  before(function createPlayGround(done) {
    zkClient.mkdirp('/test/create', done);
  });

  after(function deletePlayGround(done) {
    client.delete().deleteChildrenIfNeeded().forPath('/test/create', done);
  });

  after(function afterAll() {
    client.close();
  });

  function generateStub(method, errors) {
    var limit = errors.length + 1;
    var counter = 0;
    var stub = sinon.stub(zkClient, method, stubFn);

    function stubFn(path, callback) {
      if (++counter === limit) {
        stub.restore();
        zkClient[method](path, callback);
      }
      else {
        callback(errors[counter - 1]);
      }
    }

    return stub;
  }

  it('should create node', function testUsualCase(done) {
    var path = '/test/create/1';
    client.create().forPath(path, afterCreate);

    function afterCreate(err, path) {
      assert.ifError(err);
      expect(path).to.eql(path);
      done();
    }
  });

  it('should create node with data', function testWithData(done) {
    var path = '/test/create/12';
    var buf = new Buffer('some data');
    client.create().forPath(path, buf, afterCreate);

    function afterCreate(err, path) {
      assert.ifError(err);
      expect(path).to.eql(path);

      zkClient.getData(path, handleGetDataResult);
    }

    function handleGetDataResult(err, data) {
      assert.ifError(err);
      expect(data.toString('utf8')).to.eql(buf.toString('utf8'));
      done();
    }
  });

  it('should create node and its parent nodes', function testWithParents(done) {
    var path = '/test/create/2/childNode';
    client.create().creatingParentsIfNeeded().forPath(path, afterCreate);

    function afterCreate(err, path) {
      assert.ifError(err);
      expect(path).to.eql(path);
      done();
    }
  });

  it('should create node with given ACL', function testWithACL(done) {
    var path = '/test/create/3';
    var ourACL = ACL.READ_ACL_UNSAFE;
    client.create().withACL(ourACL).forPath(path, afterCreate);

    function afterCreate(err, path) {
      assert.ifError(err);
      expect(path).to.eql(path);

      zkClient.getACL(path, afterGetACL);
    }

    function afterGetACL(err, acl) {
      assert.ifError(err);
      expect(acl).to.eql(ourACL);
      done();
    }
  });

  it('should create node with given mode', function testWithMode(done) {
    var path = '/test/create/4';
    client.create().withMode(CreateMode.EPHEMERAL).forPath(path, afterCreate);

    function afterCreate(err, path) {
      assert.ifError(err);
      expect(path).to.eql(path);

      zkClient.exists(path, afterExists);
    }

    function afterExists(err, stat) {
      assert.ifError(err);
      expect(stat).to.be.exist;
      expect(stat.ephemeralOwner).to.be.an.instanceof(Buffer);
      expect(stat.ephemeralOwner.length).to.eql(8);
      expect(stat.ephemeralOwner.readInt32BE(0, true)).to.be.gt(0);
      done();
    }
  });

  it('should create node with protection', function testWithProtection(done) {
    var rootPath = '/test/create/5';
    var testPath = rootPath + '/test';

    create(zkClient, rootPath, afterCreateRoot);

    function afterCreateRoot() {
      client.create().withProtection().forPath(testPath, afterCreate);
    }

    function afterCreate(err, path) {
      assert.ifError(err);
      expect(path).to.contain(CreateBuilder.PROTECTED_PREFIX);

      done();
    }
  });

  it('should create node and parents with protection', function testWithProtectionAndParents(done) {
    var rootPath = '/test/create/6';
    var testPath = rootPath + '/test';

    client.create().creatingParentsIfNeeded().withProtection().forPath(testPath, afterCreate);

    function afterCreate(err, path) {
      assert.ifError(err);
      expect(path).to.contain(CreateBuilder.PROTECTED_PREFIX);

      done();
    }
  });

  it('should return path to existing protected node if it exists', function testFindProtected(done) {
    var testPath = '/test/create/7';
    var builder = client.create();
    var ourPath;

    builder.withProtection().forPath(testPath, afterFirstCreate);

    function afterFirstCreate(err, path) {
      assert.ifError(err);

      ourPath = path;
      builder.forPath(testPath, afterSecondCreate);
    }

    function afterSecondCreate(err, path) {
      assert.ifError(err);
      expect(path).to.eql(ourPath);
      done();
    }
  });

  it('should return error if node exists', function testErrorExisting(done) {
    var path = '/test/create/1';
    client.create().forPath(path, afterCreate);

    function afterCreate(err, path) {
      expect(err.getCode()).to.eql(Exception.NODE_EXISTS);
      expect(path).to.not.exist;
      done();
    }
  });

  it('should return error if parent node does not exist', function testErrorNoParents(done) {
    var path = '/does/not/exist/1';
    client.create().forPath(path, afterCreate);

    function afterCreate(err, path) {
      expect(err.getCode()).to.eql(Exception.NO_NODE);
      expect(path).to.not.exist;
      done();
    }
  });

  it('should delegate error correctly (withProtection) #1', function testErrorDelegateProtection(done) {
    var path = '/test/create/8';
    var msg = 'Stub error';
    var code = Exception.CONNECTION_LOSS;
    var err = new Exception(code, msg, Error);

    generateStub('getChildren', [err]);

    client.create().withProtection().forPath(path, afterCreate);

    function afterCreate(err) {
      expect(err).to.equal(err);
      done();
    }
  });

  it('should delegate error correctly (withProtection) #2', function testErrorDelegateProtection2(done) {
    var path = '/test/create/9';
    var msg = 'Stub error';
    var code = Exception.CONNECTION_LOSS;
    var err = new Exception(code, msg, Error);

    generateStub('getChildren', [err, err]);

    client.create().withProtection().forPath(path, afterCreate);

    function afterCreate(err) {
      expect(err).to.equal(err);
      done();
    }
  });

  it('should delegate error correctly (withProtection) #3', function testErrorDelegateProtection3(done) {
    var path = '/test/create/10';
    var msg = 'Stub error';
    var err1 = new Exception(Exception.CONNECTION_LOSS, msg, Error);
    var err2 = new Exception(Exception.NO_NODE, msg, Error);

    generateStub('getChildren', [err1, err2]);

    client.create().withProtection().forPath(path, afterCreate);

    function afterCreate(err) {
      expect(err).to.equal(err2);
      done();
    }
  });

  it('should delete protected node if error is thrown during creation', function testDeleteExistingProtected(done) {
    var path = '/test/create/11';
    var builder = client.create();
    var stub = sinon.stub(zkClient, 'create', createStub);
    var err = new Exception(Exception.CONNECTION_LOSS, 'Stub error', Error);

    function createStub(path, data, acls, mode, callback) {
      stub.restore();

      zkClient.create(path, data, acls, mode, afterRealCreate);

      function afterRealCreate(createError) {
        if (createError) {
          callback(createError);
        }
        else {
          callback(err);
        }

      }
    }

    builder.withProtection().forPath(path, afterCreate);

    function afterCreate(createError) {
      expect(createError).to.equal(err);
      getChildren(zkClient, '/test/create', handleGetChildrenResult);
    }

    function handleGetChildrenResult(children) {
      expect(children.join(',')).to.not.contain(builder.protectedId);
      done();
    }
  });
});
