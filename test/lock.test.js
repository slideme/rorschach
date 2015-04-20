'use strict';

var util = require('util');
var Lock = Rorschach.Lock;
var LockDriver = Rorschach.LockDriver;


function StubLockDriver() {
  LockDriver.call(this);
}
util.inherits(StubLockDriver, LockDriver);


function generateLocks(client, basePath, maxNumber) {
  var locksNum = Math.ceil(maxNumber * Math.random());
  var i = 0;
  var locks = [];
  while (i < locksNum) {
    locks.push(new Lock(client, basePath));
    i++;
  }
  return locks;
}


describe('Lock', function() {
  var client;

  before(function(done) {
    client = new Rorschach(ZK_STRING);
    client.once('connected', done);
  });

  after(function(done) {
    client.close(done);
  });

  it('should instantiate with 2 arguments', function() {
    var lock = new Lock(client, '/lock');
    assert.strictEqual(lock.driver.constructor, LockDriver);
    assert.equal(lock.lockName, Lock.LOCK_NAME);
  });

  it('should instantiate with 3 arguments: last is lock name', function() {
    var lockName = 'foo-';
    var lock = new Lock(client, '/lock', lockName);
    assert.strictEqual(lock.driver.constructor, LockDriver);
    assert.equal(lock.lockName, lockName);
  });

  it('should instantiate with 3 arguments: last is lock driver', function() {
    var lockDriver = new StubLockDriver();
    var lock = new Lock(client, '/lock', lockDriver);
    assert.strictEqual(lock.driver.constructor, StubLockDriver);
    assert.equal(lock.lockName, Lock.LOCK_NAME);
  });

  it('should instantiate with 4 arguments', function() {
    var lockName = 'bar-';
    var lockDriver = new StubLockDriver();
    var lock = new Lock(client, '/lock', lockName, lockDriver);
    assert.strictEqual(lock.driver.constructor, StubLockDriver);
    assert.equal(lock.lockName, lockName);
  });

  it('should acquire & release lock', function(done) {
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

  it('should acquire lock when maxLeases is set to 2', function(done) {
    var lock1 = new Lock(client, '/test/lock/2');
    var lock2 = new Lock(client, '/test/lock/2').setMaxLeases(2);
    var count = 2;
    lock1.acquire(firstAcquired);

    function firstAcquired(err) {
      assert.ifError(err);
      assert(lock1.isOwner());

      lock2.acquire(secondAcquired);
    }

    function secondAcquired(err) {
      assert.ifError(err);
      assert(lock2.isOwner());
      lock1.release(afterRelease);
      lock2.release(afterRelease);
    }

    function afterRelease(err) {
      assert.ifError(err);

      if (!--count) {
        done();
      }
    }
  });

  it('should acquire only when lock is released by holder', function(done) {
    var lock1 = new Lock(client, '/test/lock/3');
    var lock2 = new Lock(client, '/test/lock/3');
    lock1.acquire(afterFirstAcquired);

    function afterFirstAcquired(err) {
      assert.ifError(err);
      assert(lock1.isOwner());
      assert(!lock2.isOwner());

      lock2.acquire(afterSecondAcquired);
      lock1.release(afterFirstReleased);
    }

    function afterFirstReleased(err) {
      assert.ifError(err);
    }

    function afterSecondAcquired(err) {
      assert.ifError(err);
      assert(!lock1.isOwner());
      assert(lock2.isOwner());
      lock2.release(done);
    }
  });

  it('should re-enter already acquired lock', function(done) {
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

  it('should error if release() is called too often', function(done) {
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

  it('should acquire lock with timeout', function(done) {
    var lock = new Lock(client, '/test/lock/7');

    lock.acquire(1000, afterAcquire);

    function afterAcquire(err) {
      assert.ifError(err);
      assert(lock.isOwner());
      lock.release(done);
    }
  });

  it('should return error when acquire() timed out', function(done) {
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
});
