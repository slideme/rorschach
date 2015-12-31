'use strict';

var LockDriver = Rorschach.LockDriver;
var ReadWriteLock = Rorschach.ReadWriteLock;

function randomFromRange(min, max) {
  var delta = Math.round((max - min) * Math.random());
  return min + delta;
}


describe('ReadWriteLock', function readWriteLockTestSuite() {
  var client;

  before(function beforeAll(done) {
    client = new Rorschach(ZK_STRING);
    client.once('connected', done);
  });

  after(function deletePlayGround(done) {
    client.delete().deleteChildrenIfNeeded().forPath('/test/rw-lock', done);
  });

  after(function afterAll() {
    client.close();
  });

  it('should instantiate w/o problems', function testInitialize() {
    var lock = new ReadWriteLock(client, '/test/rw-lock/1');
    expect(lock.readMutex).to.be.ok;
    expect(lock.readMutex.maxLeases).to.eql(Infinity);
    expect(lock.writeMutex).to.be.ok;
    expect(lock.writeMutex.maxLeases).to.eql(1);
  });

  it('should acquire read lock', function testAcquireReadLock(done) {
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

  it('should acquire write lock', function testAcquireWriteLock(done) {
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

  it('should allow write-to-read lock downgrading', function testDowngrading(done) {
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

  it('should allow infinite number of readers', function testInfiniteReaders(done) {
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

  it('should allow only one writer', function testOnlyOneWriter(done) {
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

  describe('SortingLockDriver', function sortingLockDriverTestSuite() {
    var driver = new ReadWriteLock.SortingLockDriver();

    it('should fix read-lock node name', function testFixForSortingReadLock() {
      var number = '0000000001';
      var nodeName = ReadWriteLock.READ_LOCK_NAME + number;
      var ret = driver.fixForSorting(nodeName);
      expect(ret).to.eql(number);
    });

    it('should fix write-lock node name', function testFixForSortingWriteLock() {
      var number = '0000000002';
      var nodeName = ReadWriteLock.WRITE_LOCK_NAME + number;
      var ret = driver.fixForSorting(nodeName);
      expect(ret).to.eql(number);
    });
  });

  describe('ReadLockDriver', function readLockDriverTestSuite() {
    var readLock = new ReadWriteLock(client, '/test/rw-lock/7').readLock();

    it('should return error if node is not in list', function testErrorGetsTheLock() {
      var nodes = ['read-1', 'read-2', 'read-3', 'read-4'];
      var node = 'read-5';
      var ret = readLock.driver.getsTheLock(nodes, node);
      var err = LockDriver.validateNodeIndex(node, -1);
      expect(ret.error).to.eql(err);
    });
  });
});
