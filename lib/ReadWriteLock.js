'use strict';

var Lock = require('./Lock');
var LockDriver = require('./LockDriver');
var util = require('util');
var utils = require('./utils');
var READ_LOCK_NAME = 'read-';
var WRITE_LOCK_NAME = 'writ-';


/*!
 * Expose ReadWriteLock
 */
module.exports = ReadWriteLock;




/*!
 * Expose ReadLockDriver
 */
ReadWriteLock.ReadLockDriver = ReadLockDriver;




/*!
 * Expose SortingLockDriver
 */
ReadWriteLock.SortingLockDriver = SortingLockDriver;




/**
 * Implementation of re-entrant readers-writer mutex.
 *
 * @constructor
 * @param {Rorschach} client Rorschach instance
 * @param {String} basePath Base lock path
 */
function ReadWriteLock(client, basePath) {
  var readLockDriver = new ReadLockDriver(this);
  var writeLockDriver = new SortingLockDriver();


  /**
   * Read mutex.
   *
   * @type {Lock}
   */
  this.readMutex = new Lock(client, basePath, READ_LOCK_NAME, readLockDriver);
  this.readMutex.setMaxLeases(Infinity);


  /**
   * Write mutex.
   *
   * @type {Lock}
   */
  this.writeMutex = new Lock(client, basePath, WRITE_LOCK_NAME,
    writeLockDriver);
}




/**
 * Read lock node name.
 *
 * @constant
 * @type {String}
 */
ReadWriteLock.READ_LOCK_NAME = READ_LOCK_NAME;




/**
 * Write lock node name.
 *
 * @constant
 * @type {string}
 */
ReadWriteLock.WRITE_LOCK_NAME = WRITE_LOCK_NAME;




/**
 * Return read mutex.
 *
 * @returns {Lock}
 */
ReadWriteLock.prototype.readLock = function readLock() {
  return this.readMutex;
};




/**
 * Return write mutex.
 *
 * @returns {Lock}
 */
ReadWriteLock.prototype.writeLock = function writeLock() {
  return this.writeMutex;
};




/**
 * Lock driver which removes either read or write lock names from node names
 * before sorting lock nodes list.
 *
 * @constructor
 * @extends {LockDriver}
 */
function SortingLockDriver() {
}
util.inherits(SortingLockDriver, LockDriver);




/**
 * @see {@link LockDriver#fixForSorting}
 */
SortingLockDriver.prototype.fixForSorting = function fixForSorting(str) {
  str = LockDriver.prototype.fixForSorting.call(this, str, READ_LOCK_NAME);
  str = LockDriver.prototype.fixForSorting.call(this, str, WRITE_LOCK_NAME);
  return str;
};




/**
 * @constructor
 * @extends {SortingLockDriver}
 * @param {ReadWriteLock} readWriteLock
 */
function ReadLockDriver(readWriteLock) {
  this.readWriteLock = readWriteLock;
}
util.inherits(ReadLockDriver, SortingLockDriver);




/**
 * @see {@link LockDriver#getsTheLock}
 */
ReadLockDriver.prototype.getsTheLock = function getsTheLock(list,
                                                            sequenceNodeName) {
  if (this.readWriteLock.writeMutex.isOwner()) {
    return {
      hasLock: true
    };
  }

  var firstWriteIndex = utils.MAX_SAFE_INTEGER;
  var ourIndex = -1;
  var index = 0;
  var node;
  var err;
  var result = {};

  while ((node = list[index])) {
    if (node.indexOf(WRITE_LOCK_NAME) > -1) {
      firstWriteIndex = Math.min(index, firstWriteIndex);
    }
    else if (node.indexOf(sequenceNodeName) === 0) {
      ourIndex = index;
      break;
    }

    ++index;
  }

  err = LockDriver.validateNodeIndex(sequenceNodeName, ourIndex);
  if (err) {
    result.error = err;
    return result;
  }

  result.hasLock = ourIndex < firstWriteIndex;
  if (!result.hasLock) {
    result.watchPath = list[firstWriteIndex];
  }

  return result;
};
