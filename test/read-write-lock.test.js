//jshint -W030
'use strict';

var ReadWriteLock = Rorschach.ReadWriteLock;

function randomFromRange(min, max) {
  var delta = Math.round((max - min) * Math.random());
  return min + delta;
}


describe('ReadWriteLock', function() {
  var client;

  before(function(done) {
    client = new Rorschach(ZK_STRING);
    client.once('connected', done);
  });

  after(function(done) {
    client.close(done);
  });

  it('should instantiate w/o problems', function() {
    var lock = new ReadWriteLock(client, '/test/rw-lock/1');
    expect(lock.readMutex).to.be.ok;
    expect(lock.readMutex.maxLeases).to.eql(Infinity);
    expect(lock.writeMutex).to.be.ok;
    expect(lock.writeMutex.maxLeases).to.eql(1);
  });

  it('should acquire read lock', function(done) {
    var lock = new ReadWriteLock(client, '/test/rw-lock/2');
    var readMutex = lock.readLock();
    readMutex.acquire(afterReadAcquire);

    function afterReadAcquire(err) {
      assert.ifError(err);
      expect(readMutex.isOwner()).to.be.true;
      expect(readMutex.lockPath).to.be.a('string');

      readMutex.release(done);
    }
  });

  it('should acquire write lock', function(done) {
    var lock = new ReadWriteLock(client, '/test/rw-lock/3');
    var writeMutex = lock.writeLock();
    writeMutex.acquire(afterWriteAcquire);

    function afterWriteAcquire(err) {
      assert.ifError(err);
      expect(writeMutex.isOwner()).to.be.true;
      expect(writeMutex.lockPath).to.be.a('string');

      writeMutex.release(done);
    }
  });

  it('should allow write-to-read lock downgrading', function(done) {
    var lock = new ReadWriteLock(client, '/test/rw-lock/4');
    var readMutex = lock.readLock();
    var writeMutex = lock.writeLock();
    writeMutex.acquire(afterWriteAcquire);

    function afterWriteAcquire(err) {
      assert.ifError(err);

      readMutex.acquire(afterReadAcquire);
    }

    function afterReadAcquire(err) {
      assert.ifError(err);
      expect(readMutex.isOwner()).to.be.true;

      readMutex.release(afterReadRelease);
    }

    function afterReadRelease(err) {
      assert.ifError(err);

      writeMutex.release(done);
    }
  });

  it('should allow infinite number of readers', function(done) {
    this.timeout(10000);

    var count = randomFromRange(50, 100);
    var locks = genLocks(count);
    var acquires = 0;

    function genLocks(count) {
      var out = new Array(count);

      while (count--) {
        out[count] = new ReadWriteLock(client, '/test/rw-lock/5').readLock();
      }

      return out;
    }

    locks.forEach(acquire);

    function acquire(lock) {
      lock.acquire(afterAcquire);

      function afterAcquire(err) {
        assert.ifError(err);
        expect(lock.isOwner()).to.be.true;

        if (++acquires === count) {
          locks.forEach(release);
        }
      }
    }

    function release(lock) {
      lock.release(afterRelease);

      function afterRelease(err) {
        assert.ifError(err);

        if (!--acquires) {
          done();
        }
      }
    }
  });

  it('should allow only one writer', function(done) {
    var writeLock = new ReadWriteLock(client, '/test/rw-lock/6').writeLock();
    var readLock = new ReadWriteLock(client, '/test/rw-lock/6').readLock();

    writeLock.acquire(afterWriteAcquire);

    function afterWriteAcquire(err) {
      assert.ifError(err);
      expect(writeLock.isOwner()).to.be.true;

      readLock.acquire(afterReadAcquire);
      setTimeout(releaseWriteLock, 100);
    }

    function releaseWriteLock() {
      writeLock.release(afterWriteRelease);
    }

    function afterWriteRelease(err) {
      assert.ifError(err);
    }

    function afterReadAcquire(err) {
      assert.ifError(err);
      expect(readLock.isOwner()).to.be.true;
      expect(writeLock.isOwner()).to.be.false;
      readLock.release(done);
    }
  });
});
