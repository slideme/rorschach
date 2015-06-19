/*jshint -W030*/
'use strict';

var testPath = require('../../support/utils').testPath;
var util = require('util');
var Lock = Rorschach.Lock;
var LockDriver = Rorschach.LockDriver;
var Exception = Rorschach.Exception;


function StubLockDriver() {
  LockDriver.call(this);
}
util.inherits(StubLockDriver, LockDriver);


describe('Lock', function lockTestSuite() {
  var client;
  var sandbox;
  var suitePath = '/test/lock';

  before(function beforeAll(done) {
    client = new Rorschach(ZK_STRING);
    client.once('connected', done);
  });

  beforeEach(function createSandbox() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function destroySandbox() {
    sandbox.restore();
  });

  after(function deletePlayGround(done) {
    client.delete().deleteChildrenIfNeeded().forPath('/test/lock', done);
  });

  after(function afterAll() {
    client.close();
  });

  it('should instantiate with 2 arguments', function testInit2Args() {
    var lock = new Lock(client, '/lock');
    assert.strictEqual(lock.driver.constructor, LockDriver);
    assert.equal(lock.lockName, Lock.LOCK_NAME);
  });

  it('should instantiate with 3 arguments: last is lock name', function testInit3Args1() {
    var lockName = 'foo-';
    var lock = new Lock(client, '/lock', lockName);
    assert.strictEqual(lock.driver.constructor, LockDriver);
    assert.equal(lock.lockName, lockName);
  });

  it('should instantiate with 3 arguments: last is lock driver', function testInit3Args2() {
    var lockDriver = new StubLockDriver();
    var lock = new Lock(client, '/lock', lockDriver);
    assert.strictEqual(lock.driver.constructor, StubLockDriver);
    assert.equal(lock.lockName, Lock.LOCK_NAME);
  });

  it('should instantiate with 4 arguments', function testInit4Args() {
    var lockName = 'bar-';
    var lockDriver = new StubLockDriver();
    var lock = new Lock(client, '/lock', lockName, lockDriver);
    assert.strictEqual(lock.driver.constructor, StubLockDriver);
    assert.equal(lock.lockName, lockName);
  });

  it('should acquire & release lock', function testUsualCase(done) {
    var lock = new Lock(client, '/test/lock/1');
    lock.acquire(afterAcquire);

    function afterAcquire(err) {
      assert.ifError(err);
      assert(lock.isOwner());
      lock.release(afterRelease);
    }

    function afterRelease(err) {
      assert.ifError(err);
      assert(!lock.isOwner());
      done();
    }
  });

  it('should acquire lock when maxLeases is set to 2', function testMaxLeases(done) {
    var lock1 = new Lock(client, '/test/lock/2');
    var lock2 = new Lock(client, '/test/lock/2').setMaxLeases(2);
    lock1.acquire(firstAcquired);

    function firstAcquired(err) {
      assert.ifError(err);
      assert(lock1.isOwner());

      lock2.acquire(secondAcquired);
    }

    function secondAcquired(err) {
      assert.ifError(err);
      assert(lock2.isOwner());
      lock1.release();
      lock2.release(afterRelease);
    }

    function afterRelease(err) {
      assert.ifError(err);
      done();
    }
  });

  it('should acquire only when lock is released by holder', function testAcquireAfterRelease(done) {
    var lock1 = new Lock(client, '/test/lock/3');
    var lock2 = new Lock(client, '/test/lock/3');
    var stub = sandbox.stub(client.zk, 'getData', getDataStub);
    lock1.acquire(afterFirstAcquired);

    function getDataStub(path, watch, callback) {
      stub.restore();
      client.zk.getData(path, watch, handleGetDataResult);

      function handleGetDataResult(err) {
        if (err) {
          callback(err);
        }
        else {
          lock1.release(callback);
        }
      }
    }

    function afterFirstAcquired(err) {
      assert.ifError(err);
      assert(lock1.isOwner());
      assert(!lock2.isOwner());

      lock2.acquire(afterSecondAcquired);
    }

    function afterSecondAcquired(err) {
      assert.ifError(err);
      assert(!lock1.isOwner());
      assert(lock2.isOwner());
      lock2.release(done);
    }
  });

  it('should re-enter already acquired lock', function testReenterAcquired(done) {
    var lock = new Lock(client, '/test/lock/6');
    assert(!lock.acquires);

    lock.acquire(afterFirstAcquire);

    function afterFirstAcquire(err) {
      assert.ifError(err);
      assert(lock.isOwner());

      lock.acquire(afterSecondAcquire);
    }

    function afterSecondAcquire(err) {
      assert.ifError(err);
      assert(lock.acquires, 2);
      assert(lock.isOwner());

      lock.release(afterFirstRelease);
    }

    function afterFirstRelease(err) {
      assert.ifError(err);
      assert(lock.acquires, 1);
      assert(lock.isOwner());

      lock.release(afterSecondRelease);
    }

    function afterSecondRelease(err) {
      assert.ifError(err);
      assert(!lock.isOwner());

      done();
    }
  });

  it('should error if release() is called too often', function testErrorReleaseTooOften(done) {
    var lock = new Lock(client, '/test/lock/7');

    lock.acquire(afterFirstAcquire);

    function afterFirstAcquire(err) {
      assert.ifError(err);
      lock.release(afterFirstRelease);
    }

    function afterFirstRelease(err) {
      assert.ifError(err);
      lock.release(afterSecondRelease);
    }

    function afterSecondRelease(err) {
      expect(err).to.exist;
      expect(err.message).to.eql('Lock count has got negative for: /test/lock/7');
      done();
    }
  });

  it('should acquire lock with timeout', function testTimeout(done) {
    var lock = new Lock(client, '/test/lock/7');

    lock.acquire(1000, afterAcquire);

    function afterAcquire(err) {
      assert.ifError(err);
      assert(lock.isOwner());
      lock.release(done);
    }
  });

  it('should return error when acquire() timed out', function testErrorTimeout(done) {
    var lock1 = new Lock(client, '/test/lock/8');
    var lock2 = new Lock(client, '/test/lock/8');

    lock1.acquire(afterFirstAcquire);
    lock2.acquire(500, afterSecondAcquire);

    function afterFirstAcquire(err) {
      assert.ifError(err);
      assert(lock1.isOwner());
    }

    function afterSecondAcquire(err) {
      expect(err).to.exist;
      expect(err).to.be.an.instanceof(Rorschach.Errors.TimeoutError);
      assert(!lock2.isOwner());
      lock1.release(done);
    }
  });

  it('should set timer only once', function testErrorTimeoutOnce(done) {
    var ourPath = testPath(suitePath, 17);
    var lock1 = new Lock(client, ourPath);
    var lock2 = new Lock(client, ourPath);
    var stub;
    var noNodeError = new Exception(Exception.NO_NODE, 'Stub error', Error);

    lock1.acquire(afterFirstAcquire);

    function afterFirstAcquire(err) {
      assert.ifError(err);
      stub = sandbox.stub(client.zk, 'getData', getDataStub);
      lock2.acquire(500, afterSecondAcquire);
    }

    function getDataStub(path, watch, callback) {
      stub.restore();
      client.zk.getData(path, watch, afterGetData);

      function afterGetData(err) {
        assert.ifError(err);
        callback(noNodeError);
      }
    }

    function afterSecondAcquire(err) {
      stub.restore();
      expect(err).to.exist;
      expect(err).to.be.an.instanceof(Rorschach.Errors.TimeoutError);
      assert(!lock2.isOwner());
      lock1.release(done);
    }
  });

  it('should pass create error to callback', function testErrorCreate(done) {
    var basePath = '/test/lock/9';
    var lock = new Lock(client, basePath);
    var stub = sandbox.stub(client.zk, 'create');
    var err = new Exception(Exception.CONNECTION_LOSS, 'Stub error', Error);
    stub.withArgs(basePath + '/' + Lock.LOCK_NAME).callsArgWith(4, err);

    function afterAcquire(acquireError) {
      stub.restore();
      expect(acquireError).to.equal(err);
      done();
    }

    lock.acquire(1000, afterAcquire);
  });

  it('should pass getChildren error to callback', function testErrorGetChildren(done) {
    var basePath = '/test/lock/10';
    var lock = new Lock(client, basePath);
    var stub = sandbox.stub(client.zk, 'getChildren');
    var err = new Exception(Exception.CONNECTION_LOSS, 'Stub error', Error);
    stub.withArgs(basePath).callsArgWith(1, err);

    function afterAcquire(acquireError) {
      stub.restore();
      expect(acquireError).to.equal(err);
      done();
    }

    lock.acquire(afterAcquire);
  });

  it('should pass LockDriver#getsTheLock() error to callback', function testErrorGetsTheLock(done) {
    var basePath = '/test/lock/11';
    var lock = new Lock(client, basePath);
    var nodeName = Lock.LOCK_NAME + '0000000000';
    var stub = sandbox.stub(lock.driver, 'getsTheLock');
    var err = LockDriver.validateNodeIndex(nodeName, -1);
    stub.withArgs([nodeName]).returns({
      error: err
    });

    function afterAcquire(acquireError) {
      stub.restore();
      expect(acquireError).to.equal(err);
      done();
    }

    lock.acquire(afterAcquire);
  });

  it('should pass destroy() error to callback', function testErrorDestroy(done) {
    var basePath = '/test/lock/12';
    var lock = new Lock(client, basePath);
    var destroy = lock.destroy;
    var stub = sandbox.stub(lock, 'destroy', destroyStub);
    var err = new Exception(Exception.NO_NODE, 'Stub error', Error);

    function destroyStub(callback) {
      destroy.call(lock, afterRealDestroy);

      function afterRealDestroy(destroyError) {
        if (destroyError) {
          callback(destroyError);
        }
        else {
          callback(err);
        }
      }
    }

    lock.acquire(afterFirstAcquire);

    function afterFirstAcquire(err) {
      assert.ifError(err);
      lock.destroy(afterDestroy);
    }

    function afterDestroy(destroyError) {
      expect(destroyError).to.equal(err);
      lock.acquire(afterSecondAcquire);
    }

    function afterSecondAcquire(err) {
      assert.ifError(err);
      lock.release(afterRelease);
    }

    function afterRelease(releaseError) {
      expect(releaseError).to.equal(err);
      stub.restore();
      done();
    }
  });

  it('should pass getData error to callback', function testErrorGetData(done) {
    var basePath = '/test/lock/13';
    var lock1 = new Lock(client, basePath);
    var lock2 = new Lock(client, basePath);
    var stub = sandbox.stub(client.zk, 'getData', getDataStub);
    var err = new Exception(Exception.NODE_EXISTS, 'Stub error', Error);

    function getDataStub(path, watch, callback) {
      stub.restore();
      client.zk.getData(path, watch, afterRealGetData);

      function afterRealGetData(error) {
        if (error) {
          callback(error);
        }
        else {
          callback(err);
        }
      }
    }

    lock1.acquire(afterFirstAcquire);

    function afterFirstAcquire(err) {
      assert.ifError(err);

      lock2.acquire(afterSecondAcquire);
    }

    function afterSecondAcquire(acquireErr) {
      expect(acquireErr).to.equal(err);
      lock1.release(done);
    }
  });

  it('should return delete error instead of acquire error if it happens', function testErrorDeleteNode(done) {
    var ourPath = testPath(suitePath, 16);
    var lock = new Lock(client, ourPath);
    var stubGetChildren = sandbox.stub(client.zk, 'getChildren');
    var getChildrenError = new Exception(Exception.NOT_EMPTY, 'getChildren() error', TypeError);
    stubGetChildren.callsArgWith(1, getChildrenError);
    var stubRemove = sandbox.stub(client.zk, 'remove', removeStub);
    var removeError = new Exception(Exception.NO_NODE, 'remove() error', TypeError);

    lock.acquire(afterAcquire);

    function removeStub(path, version, callback) {
      stubGetChildren.restore();
      stubRemove.restore();

      // to clear nodes
      client.zk.remove(path, version, afterRealDelete);

      function afterRealDelete(err) {
        if (err) {
          callback(err);
        }
        else {
          callback(removeError);
        }
      }
    }

    function afterAcquire(err) {
      expect(err.message).to.equal(removeError.message);
      expect(err.getCode()).to.equal(removeError.getCode());
      done();
    }
  });

  it('should try acquire if watched node deleted before getData()', function testGetData(done) {
    var basePath = '/test/lock/14';
    var stub = sandbox.stub(client.zk, 'getData', getDataStub);
    var lock1 = new Lock(client, basePath);
    var lock2 = new Lock(client, basePath);

    lock1.acquire(afterFirstAcquire);

    function getDataStub(path, watch, callback) {
      lock1.release(afterRelease);

      function afterRelease(err) {
        assert.ifError(err);
        stub.restore();
        client.zk.getData(path, watch, callback);
      }
    }

    function afterFirstAcquire(err) {
      assert.ifError(err);
      lock2.acquire(afterSecondAcquire);
    }

    function afterSecondAcquire(err) {
      assert.ifError(err);
      expect(lock2.isOwner()).to.be.true;
      lock2.release(done);
    }
  });

  it('should make only one acquire attempt #1', function testZeroTimeout(done) {
    var ourPath = testPath(suitePath, 15);
    var lock = new Lock(client, ourPath);
    lock.acquire(0, afterAcquire);

    function afterAcquire(err) {
      assert.ifError(err);
      done();
    }
  });

  it('should make only one acquire attempt #2', function testZeroTimeout(done) {
    var ourPath = testPath(suitePath, 16);
    var lock1 = new Lock(client, ourPath);
    var lock2 = new Lock(client, ourPath);
    lock1.acquire(0, afterFirstAcquire);

    function afterFirstAcquire(err) {
      assert.ifError(err);
      lock2.acquire(0, afterSecondAcquire);
    }

    function afterSecondAcquire(err) {
      expect(err).to.exist;
      expect(err).to.be.an.instanceof(Rorschach.Errors.TimeoutError);
      lock1.release(done);
    }
  });
});
