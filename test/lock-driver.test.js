/*jshint -W030*/
'use strict';

var LockDriver = Rorschach.LockDriver;

describe('LockDriver', function lockDriverTestSuite() {
  var lockDriver = new LockDriver();
  var nodes = ['lock-1', 'lock-2', 'lock-3', 'lock-4', 'lock-5'];

  describe('validateNodeIndex()', function validateNodeIndexTestSuite() {
    it('should return nothing for index > -1', function testUsualCase() {
      var ret = LockDriver.validateNodeIndex('mynode', 1);
      expect(ret).to.not.exist;
    });

    it('should return error for index -1', function testError() {
      var ret = LockDriver.validateNodeIndex('mynode', -1);
      expect(ret).to.be.an.instanceof(Error);
    });
  });

  describe('fixForSorting()', function fixForSortingTestSuite() {
    it('should fix node name', function testUsualCase() {
      var ret = lockDriver.fixForSorting('lock-0000000001', 'lock-');
      expect(ret).to.eql('0000000001');
    });

    it('should leave node name as is if lock name is not found', function testNoLockName() {
      var ret = lockDriver.fixForSorting('read-0000000001', 'lock-');
      expect(ret).to.eql('read-0000000001');
    });
  });

  describe('getsTheLock()', function getsTheLockTestSuite() {
    it('should return error if nodeName is not among nodes', function testErrorNoNodeName() {
      var nodeName = 'read-1';
      var ret = lockDriver.getsTheLock(['lock-1', 'lock-2'], nodeName, 1);
      expect(ret.error).to.be.an.instanceof(Error);
      expect(ret.error.message).to.eql('Lock node ' + nodeName + ' is not among lock nodes list');
    });

    it('should return true if node index < max leases', function testHasLock() {
      var nodeName = 'lock-2';
      var ret = lockDriver.getsTheLock(nodes, nodeName, 2);
      expect(ret.hasLock).to.be.true;
      expect(ret.error).to.not.exist;
      expect(ret.watchPath).to.not.exist;
    });

    it('should return path to watch if node index >= max leases', function testHasNoLock() {
      var nodeName = 'lock-4';
      var ret = lockDriver.getsTheLock(nodes, nodeName, 3);
      expect(ret.hasLock).to.be.false;
      expect(ret.error).to.not.exist;
      expect(ret.watchPath).to.eql('lock-1');
    });
  });

  describe('sortChildren()', function sortChildrenTestSuite() {
    it('should sort nodes list', function testUsualCase() {
      var list = ['lock-3', 'lock-2', 'lock-5', 'lock-1', 'lock-4'];
      var ret = lockDriver.sortChildren(list, 'lock-');
      expect(ret).to.eql(nodes);
    });
  });
});
