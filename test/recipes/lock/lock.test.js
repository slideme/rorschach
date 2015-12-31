'use strict';

var testPath = require('../../support/utils').testPath;
var util = require('util');
var Lock = Rorschach.Lock;
var LockDriver = Rorschach.LockDriver;
var Event = Rorschach.Event;
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

  it('should init with 2 arguments', function init2() {
    var lock = new Lock(client, '/lock');
    assert.strictEqual(lock.driver.constructor, LockDriver);
    assert.equal(lock.lockName, Lock.LOCK_NAME);
  });

  it('should init with 3 arguments #1', function init31() {
    var lockName = 'foo-';
    var lock = new Lock(client, '/lock', lockName);
    assert.strictEqual(lock.driver.constructor, LockDriver);
    assert.equal(lock.lockName, lockName);
  });

  it('should init with 3 arguments #2', function init32() {
    var lockDriver = new StubLockDriver();
    var lock = new Lock(client, '/lock', lockDriver);
    assert.strictEqual(lock.driver.constructor, StubLockDriver);
    assert.equal(lock.lockName, Lock.LOCK_NAME);
  });

  it('should init with 4 arguments', function init4() {
    var lockName = 'bar-';
    var lockDriver = new StubLockDriver();
    var lock = new Lock(client, '/lock', lockName, lockDriver);
    assert.strictEqual(lock.driver.constructor, StubLockDriver);
    assert.equal(lock.lockName, lockName);
  });

  it('should acquire & release lock', function acquireRelease(done) {
    var ourPath = testPath(suitePath, 1);
    var lock = new Lock(client, ourPath);
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

  it('should acquire when maxLeases is 2', function maxLeases(done) {
    var ourPath = testPath(suitePath, 2);
    var lock1 = new Lock(client, ourPath);
    var lock2 = new Lock(client, ourPath).setMaxLeases(2);
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

  it('should acquire only when no other lock holds', function consistent(done) {
    var ourPath = testPath(suitePath, 3);
    var lock1 = new Lock(client, ourPath);
    var lock2 = new Lock(client, ourPath);
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

  it('should re-enter already acquired lock', function reenter(done) {
    var ourPath = testPath(suitePath, 4);
    var lock = new Lock(client, ourPath);
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

  it('should error if release() is called two often', function release(done) {
    var ourPath = testPath(suitePath, 5);
    var lock = new Lock(client, ourPath);

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
      var errMsg = 'Lock count has got negative for: ' + ourPath;
      expect(err).to.exist;
      expect(err.message).to.eql(errMsg);
      done();
    }
  });

  it('should acquire lock with timeout', function timeout(done) {
    var ourPath = testPath(suitePath, 6);
    var lock = new Lock(client, ourPath);

    lock.acquire(1000, afterAcquire);

    function afterAcquire(err) {
      assert.ifError(err);
      assert(lock.isOwner());
      lock.release(done);
    }
  });

  it('should return error when acquire() timed out', function timeoutErr(done) {
    var ourPath = testPath(suitePath, 7);
    var lock1 = new Lock(client, ourPath);
    var lock2 = new Lock(client, ourPath);

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

  it('should set timer only once', function errorTimeoutOnce(done) {
    var ourPath = testPath(suitePath, 8);
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

  it('should pass create() error to callback', function acquireErr1(done) {
    var basePath = testPath(suitePath, 9);
    var lock = new Lock(client, basePath);
    var stub = sandbox.stub(client.zk, 'create');
    var err = new Exception(Exception.CONNECTION_LOSS, 'Stub error', Error);
    stub.withArgs(basePath + '/' + Lock.LOCK_NAME).callsArgWith(4, err);

    function afterAcquire(acquireError) {
      stub.restore();
      expect(acquireError).to.be.instanceOf(Rorschach.Errors.ExecutionError);
      expect(acquireError.original).to.equal(err);
      done();
    }

    lock.acquire(1000, afterAcquire);
  });

  it('should pass getChildren() error to callback', function acquireErr2(done) {
    var basePath = testPath(suitePath, 10);
    var lock = new Lock(client, basePath);
    var stub = sandbox.stub(client.zk, 'getChildren');
    var err = new Exception(Exception.CONNECTION_LOSS, 'Stub error', Error);
    stub.withArgs(basePath).callsArgWith(1, err);

    function afterAcquire(acquireError) {
      stub.restore();
      expect(acquireError).to.be.instanceOf(Rorschach.Errors.ExecutionError);
      expect(acquireError.original).to.equal(err);
      done();
    }

    lock.acquire(afterAcquire);
  });

  it('should pass getsTheLock() error to callback', function acquireErr3(done) {
    var basePath = testPath(suitePath, 11);
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

  it('should pass destroy() error to callback', function destroyErr(done) {
    var basePath = testPath(suitePath, 12);
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

  it('should pass getData() error to callback', function acquireErr4(done) {
    var basePath = testPath(suitePath, 13);
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
      expect(acquireErr).to.be.instanceOf(Rorschach.Errors.ExecutionError);
      expect(acquireErr.original).to.equal(err);
      lock1.release(done);
    }
  });

  it('should return delete node error', function acquireErr5(done) {
    var ourPath = testPath(suitePath, 14);
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
      expect(err).to.be.instanceOf(Rorschach.Errors.ExecutionError);
      expect(err.original).to.equal(removeError);
      done();
    }
  });

  it('should acquire when getData() receives error', function acquire1(done) {
    var basePath = testPath(suitePath, 15);
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

  it('should make only one acquire attempt #1', function acquire0Timer1(done) {
    var ourPath = testPath(suitePath, 16);
    var lock = new Lock(client, ourPath);
    lock.acquire(0, afterAcquire);

    function afterAcquire(err) {
      assert.ifError(err);
      done();
    }
  });

  it('should make only one acquire attempt #2', function acquire0Timer2(done) {
    var ourPath = testPath(suitePath, 17);
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

  it('should call exit() only once #1', function watchCallbackRace(done) {
    var ourPath = testPath(suitePath, 18);
    var lock1 = new Lock(client, ourPath);
    var lock2 = new Lock(client, ourPath);
    var stubGetData;
    var getChildrenCalled = false;
    var getChildrenCallback;
    var getChildrenOriginal;

    lock1.acquire(afterAcquire);

    // Callback of 1st lock acquire creates a stub for getData() and starts
    // acquire for 2nd lock
    function afterAcquire(err) {
      assert.ifError(err);

      stubGetData = sandbox.stub(client.zk, 'getData', getDataStub);
      lock2.acquire(afterSecondAcquire);
    }

    // getData() stub simulates near-consecutive call of callback and watcher
    // leading to getChildren() called twice before any of its callbacks is
    // executed. Also getChildren() is replaced with a stub.
    function getDataStub(path, watcher, callback) {
      stubGetData.restore();
      lock1.release(callThings);

      getChildrenOriginal = client.zk.getChildren;
      client.zk.getChildren = getChildrenStub;

      function callThings(err) {
        assert.ifError(err);

        var event = new Event(Event.NODE_DELETED, 'lol', path);
        var error = new Exception(Exception.NO_NODE, 'lol', Error);
        watcher(event);
        callback(error);
      }
    }

    // getChildren() stub runs original operation with one difference: it
    // postpones calling of second callback
    function getChildrenStub(path, callback) {
      var res = [Lock.LOCK_NAME + '0000000001'];

      if (getChildrenCalled) {
        getChildrenCallback = callback.bind(null, null, res);
      }
      else {
        getChildrenCalled = true;
        setImmediate(callback, null, res);
      }
    }

    // 2nd lock acquire callback tries to executed last getChildren() callback
    function afterSecondAcquire(err) {
      assert.ifError(err);
      client.zk.getChildren = getChildrenOriginal;
      expect(getChildrenCallback).to.not.throw();
      lock2.release(afterRelease);
    }

    function afterRelease(err) {
      assert.ifError(err);
      done();
    }
  });

  it('should call exit() only once #2', function timerCallbackRace(done) {
    var ourPath = testPath(suitePath, 19);
    var lock1 = new Lock(client, ourPath);
    var lock2 = new Lock(client, ourPath);
    var stubGetData;
    var stubGetChildren;
    var getChildrenCallback;
    var clock;

    lock1.acquire(afterAcquire);

    // Callback of 1st lock acquire creates a stub for getData() and starts
    // acquire for 2nd lock with 10000ms timeout. Also Sinon.JS fake timers are
    // used to simulate later exceeding of timeout.
    function afterAcquire(err) {
      assert.ifError(err);

      clock = sinon.useFakeTimers('setTimeout');
      stubGetData = sandbox.stub(client.zk, 'getData', getDataStub);
      lock2.acquire(10000, afterSecondAcquire);
    }

    // getData() stub simulates call of callback with error leading to
    // call of getChildren(). Also it creates getChildren() stub.
    function getDataStub(path, watcher, callback) {
      stubGetData.restore();
      lock1.release(callThings);

      function callThings(err) {
        assert.ifError(err);

        var error = new Exception(Exception.NO_NODE, 'lol', Error);
        stubGetChildren = sandbox.stub(client.zk, 'getChildren',
          getChildrenStub);
        callback(error);
      }
    }

    // getChildren() stub simulates running out of time and saves its callback
    // for further execution
    function getChildrenStub(path, callback) {
      stubGetChildren.restore();
      clock.tick(10000);

      var list = [Lock.LOCK_NAME + '0000000001'];
      getChildrenCallback = callback.bind(null, null, list);
    }

    // 2nd lock acquire callback tries to execute getChildren() callback
    function afterSecondAcquire(err) {
      clock.restore();
      expect(err.name).to.equal('TimeoutError');
      expect(getChildrenCallback).to.not.throw();
      done();
    }
  });

  it('should call exit() only once #3', function timerWatcherRace(done) {
    var ourPath = testPath(suitePath, 20);
    var lock1 = new Lock(client, ourPath);
    var lock2 = new Lock(client, ourPath);
    var stubGetData;
    var stubGetChildren;
    var getChildrenCallback;
    var clock;

    lock1.acquire(afterAcquire);

    // Callback of 1st lock acquire creates a stub for getData() and starts
    // acquire for 2nd lock with 10000ms timeout. Also Sinon.JS fake timers
    // are used to simulate later exceeding of timeout.
    function afterAcquire(err) {
      assert.ifError(err);

      clock = sinon.useFakeTimers('setTimeout');
      stubGetData = sandbox.stub(client.zk, 'getData', getDataStub);
      lock2.acquire(10000, afterSecondAcquire);
    }

    // getData() stub simulates call of watcher with event leading to call of
    // getChildren(). Also it creates getChildren() stub.
    function getDataStub(path, watcher, callback) {
      stubGetData.restore();
      lock1.release(callThings);

      function callThings(err) {
        assert.ifError(err);

        var event = new Event(Event.NODE_DELETED, 'lol', path);
        stubGetChildren = sandbox.stub(client.zk, 'getChildren',
          getChildrenStub);
        watcher(event);
        callback();
      }
    }

    // getChildren() stub simulates running out of time and saves its callback
    // for further execution
    function getChildrenStub(path, callback) {
      stubGetChildren.restore();
      clock.tick(10000);

      var list = [Lock.LOCK_NAME + '0000000001'];
      getChildrenCallback = callback.bind(null, null, list);
    }

    // 2nd lock acquire callback tries to execute getChildren() callback
    function afterSecondAcquire(err) {
      clock.restore();
      expect(err.name).to.equal('TimeoutError');
      expect(getChildrenCallback).to.not.throw();
      done();
    }
  });
});
