'use strict';

var LockDriver = require('./LockDriver');
var TimeoutError = require('./errors').TimeoutError;
var utils = require('./utils');
var zookeeper = require('node-zookeeper-client');
var CreateMode = zookeeper.CreateMode;
var Event = zookeeper.Event;
var Exception = zookeeper.Exception;


/*!
 * Expose Lock class
 */
module.exports = Lock;




/**
 * Distributed lock implementation
 *
 * @constructor
 * @param {Rorschach} client Rorschach instance
 * @param {String} basePath Base lock path
 * @param {String} [lockName] Ephemeral node name
 * @param {LockDriver} [lockDriver=new LockDriver()] Lock utilities
 */
function Lock(client, basePath, lockName, lockDriver) {
  if (lockName instanceof LockDriver) {
    lockDriver = lockName;
    lockName = null;
  }
  if (!lockName) {
    lockName = Lock.LOCK_NAME;
  }
  if (!lockDriver) {
    lockDriver = new LockDriver();
  }


  /**
   * Keep ref to client as all the low-level operations are done through it.
   *
   * @type {Rorschach}
   */
  this.client = client;


  /**
   * Base path should be valid ZooKeeper path.
   *
   * @type {String}
   */
  this.basePath = basePath;


  /**
   * Node name.
   *
   * @type {String}
   */
  this.lockName = lockName;


  /**
   * Lock driver.
   *
   * @type {LockDriver}
   */
  this.driver = lockDriver;


  /**
   * Sequence node name (set when acquired).
   *
   * @type {String}
   */
  this.lockPath;


  /**
   * Number of max leases.
   *
   * @type {Number}
   */
  this.maxLeases = 1;


  /**
   * Number of acquires.
   *
   * @type {Number}
   */
  this.acquires = 0;
}




/**
 * Default lock node name.
 *
 * @const
 * @static
 * @type {String}
 */
Lock.LOCK_NAME = 'lock-';




/**
 * Acquire a lock.
 *
 * @public
 * @param {Number} [timeout] Time to wait for (milliseconds).
 * @param {Function} callback Callback function: <code>(err)</code>
 */
Lock.prototype.acquire = function acquire(timeout, callback) {
  if (arguments.length === 1) {
    callback = timeout;
    timeout = -1;
  }

  if (this.acquires > 0) {
    this.acquires++;
    return callback();
  }

  var self = this;

  attemptLock(this, timeout, afterLock);

  function afterLock(err, lockPath) {
    if (err) {
      return callback(err);
    }

    self.acquires++;
    self.lockPath = lockPath;

    callback();
  }
};




/**
 * Attempt to acquire a lock.
 *
 * @private
 * @param {Lock} lock Instance
 * @param {Number} timeout Timeout
 * @param {Function} callback Callback function: <code>(err, lockPath)</code>
 */
function attemptLock(lock, timeout, callback) {
  var lockPath;
  var sequenceNodeName;
  var timerId = null;
  var start = Date.now();

  createNode(lock, afterCreate);

  function afterCreate(err, nodePath) {
    if (err) {
      return exit(err);
    }

    lockPath = nodePath;

    sequenceNodeName = nodePath.substring(lock.basePath.length + 1);

    getSortedChildren(lock, afterGetChildren);
  }

  function afterGetChildren(err, list) {
    if (exited()) {
      return;
    }
    if (err) {
      return exit(err);
    }

    var result = lock.driver.getsTheLock(list, sequenceNodeName,
      lock.maxLeases);

    if (result.error) {
      return exit(result.error);
    }
    else if (result.hasLock) {
      return exit(null, lockPath);
    }

    var watchPath = utils.join(lock.basePath, result.watchPath);

    lock.client
      .getData()
      .usingWatcher(watcher)
      .forPath(watchPath, afterGetData);

    setTimer();
  }

  function afterGetData(err) {
    if (exited() || !err) {
      return;
    }

    if (err.getCode() === Exception.NO_NODE) {
      getSortedChildren(lock, afterGetChildren);
    }
    else {
      exit(err);
    }
  }

  function watcher(event) {
    if (!exited() && event.getType() === Event.NODE_DELETED) {
      getSortedChildren(lock, afterGetChildren);
    }
  }

  function setTimer() {
    if (timerId) {
      return;
    }

    if (timeout >= 0) {
      timeout -= Date.now() - start;

      if (timeout <= 0) {
        return sayBye();
      }

      timerId = setTimeout(sayBye, timeout);
    }
  }

  function sayBye() {
    exit(new TimeoutError('Could not acquire lock %s', lock.basePath));
  }

  function exit(err, path) {
    if (timerId) {
      clearTimeout(timerId);
      timerId = -1;
    }

    var cb = callback;
    callback = null;

    if (!err) {
      cb(null, path);
    }
    else if (lockPath) {
      deleteNode(lock, lockPath, proceed);
    }
    else {
      cb(err);
    }

    function proceed(deleteError) {
      if (deleteError) {
        cb(deleteError);
      }
      else {
        cb(err);
      }
    }
  }

  function exited() {
    return !callback;
  }
}




/**
 * Create lock node.
 *
 * @private
 * @param {Lock} lock Lock instance
 * @param {Function} callback Callback function: `(err, nodePath)`
 */
function createNode(lock, callback) {
  var nodePath = utils.join(lock.basePath, lock.lockName);
  var client = lock.client;

  client
    .create()
    .creatingParentsIfNeeded()
    .withMode(CreateMode.EPHEMERAL_SEQUENTIAL)
    .forPath(nodePath, callback);
}




/**
 * Guaranteed node deletion.
 *
 * @private
 * @param {Lock} lock Lock instance
 * @param {String} lockPath
 * @param {Function} [callback] Callback function: `(err)`
 */
function deleteNode(lock, lockPath, callback) {
  lock.client
    .delete()
    .guaranteed()
    .forPath(lockPath, callback);
}




/**
 * Destroy lock i.e. remove node and set acquires counter to zero.
 *
 * @public
 * @param {Function} [callback] Optional callback function
 */
Lock.prototype.destroy = function destroy(callback) {
  var lockPath = this.lockPath;
  if (this.acquires) {
    this.acquires = 0;
  }
  delete this.lockPath;

  deleteNode(this, lockPath, callback);
};




/**
 * Get children for lock base path and sort them according to settings of {@link Lock} instance.
 *
 * @private
 * @param {Lock} lock Lock instance
 * @param {Function} callback Callback function: `(err, list)`
 */
function getSortedChildren(lock, callback) {
  lock.client
    .getChildren()
    .forPath(lock.basePath, afterGetChildren);

  function afterGetChildren(err, list) {
    if (err) {
      return callback(err);
    }

    list = lock.driver.sortChildren(list, lock.lockName);

    callback(null, list);
  }
}




/**
 * Check lock is owned by given node.
 *
 * @public
 * @returns {Boolean}
 */
Lock.prototype.isOwner = function isOwner() {
  return this.acquires > 0;
};




/**
 * Release the lock.
 *
 * @public
 * @param {Function} [callback] Callback function: `(err)`
 */
Lock.prototype.release = function release(callback) {
  callback = callback || utils.noop;

  this.acquires--;

  if (this.acquires > 0) {
    return callback();
  }
  else if (this.acquires < 0) {
    var err = new Error('Lock count has got negative for: ' + this.basePath);
    return callback(err);
  }

  this.destroy(done);

  function done(err) {
    if (err) {
      callback(err);
    }
    else {
      callback();
    }
  }
};




/**
 * Set max leases.
 *
 * @public
 * @param {Number} maxLeases Max # of participants holding the lock at one time
 * @returns {Lock} Instance is returned for chaining
 */
Lock.prototype.setMaxLeases = function setMaxLeases(maxLeases) {
  this.maxLeases = maxLeases;
  return this;
};
