'use strict';

var Lock = require('./Lock');
var LockDriver = require('./LockDriver');
var util = require('util');
var READ_LOCK_NAME = 'read-';
var WRITE_LOCK_NAME = 'writ-';
var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || Math.pow(2, 53) - 1;


/*!
 * Expose ReadWriteLock
 */
module.exports = ReadWriteLock;




/**
 * Implementation of re-entrant readers-writer mutex.
 *
 * @constructor
 * @param {Rorschach} client Rorschach instance
 * @param {String} basePath Base lock path
 */
function ReadWriteLock(client, basePath) {
  var readLockDriver = new ReadLockDriver(this);

  /**
   * Write mutex.
   *
   * @type {Lock}
   */
  this.writeMutex = new Lock(client, basePath, WRITE_LOCK_NAME);


  /**
   * Read mutex.
   *
   * @type {Lock}
   */
  this.readMutex = new Lock(client, basePath, READ_LOCK_NAME, readLockDriver);
  this.readMutex.setMaxLeases(Infinity);
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
 * Lock driver which
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
ReadLockDriver.prototype.getsTheLock = function getsTheLock(list, sequenceNodeName) {
  if (this.readWriteLock.writeMutex.isOwner()) {
    return {
      hasLock: true
    };
  }

  var firstWriteIndex = MAX_SAFE_INTEGER;
  var ourIndex = MAX_SAFE_INTEGER;
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
