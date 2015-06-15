'use strict';

var builders = require('./lib/builders');
var Errors = require('./lib/errors');
var EventEmitter = require('events').EventEmitter;
var Lock = require('./lib/Lock');
var LockDriver = require('./lib/LockDriver');
var ReadWriteLock = require('./lib/ReadWriteLock');
var RetryPolicy = require('./lib/RetryPolicy');
var util = require('util');
var utils = require('./lib/utils');
var zookeeper = require('node-zookeeper-client');
var State = zookeeper.State;
var ConnectionState = require('./lib/ConnectionState');

var ZOOKEEPER_CLASSES = ['ACL', 'CreateMode', 'Event', 'Exception', 'Id',
  'Permission', 'State'];


/*!
 * Expose Rorschach
 */
module.exports = Rorschach;




/**
 * Create instance and connect to ZooKeeper.
 *
 * @constructor
 * @extends {events.EventEmitter}
 * @param {String} connectionString ZooKeeper connection string
 * @param {Object} [options] Options:
 * @param {Object|RetryPolicy} [options.retryPolicy] RetryPolicy instance or options
 * @param {Object} [options.zookeeper] ZooKeeper client options
 */
function Rorschach(connectionString, options) {
  EventEmitter.call(this);

  options = options || {};

  var retryPolicy = options.retryPolicy;
  if (retryPolicy instanceof RetryPolicy) {
    this.retryPolicy = retryPolicy;
  }
  else {
    this.retryPolicy = new RetryPolicy(retryPolicy);
  }

  // Initial state
  this.state = ConnectionState.LOST;

  initZooKeeper(this, connectionString, options.zookeeper);
}
util.inherits(Rorschach, EventEmitter);




/**
 * Close connection to ZooKeeper.
 *
 * @public
 * @param {Function} [callback] Callback function
 */
Rorschach.prototype.close = function close(callback) {
  this.closed = true;

  callback = callback || utils.noop;

  if (this.state.isConnected()) {
    this.zk.once('disconnected', callback);
    this.zk.close();
  }
  else {
    var self = this;
    process.nextTick(function delayedClose() {
      self.zk.close();
      callback();
    });
  }
};




/**
 * Instantiate create operation builder.
 *
 * @public
 * @returns {CreateBuilder} Builder instance
 */
Rorschach.prototype.create = function create() {
  return new builders.CreateBuilder(this);
};




/**
 * Instantiate delete operation builder.
 *
 * @public
 * @returns {DeleteBuilder} Builder instance
 */
Rorschach.prototype.delete = function deleteBuilder() {
  return new builders.DeleteBuilder(this);
};




/**
 * Instantiate exists operation builder.
 *
 * @public
 * @returns {ExistsBuilder} Builder instance
 */
Rorschach.prototype.exists = function exists() {
  return new builders.ExistsBuilder(this);
};




/**
 * Instantiate get ACL builder.
 *
 * @public
 * @returns {GetACLBuilder} Builder instance
 */
Rorschach.prototype.getACL = function getACL() {
  return new builders.GetACLBuilder(this);
};




/**
 * Instantiate get children builder.
 *
 * @public
 * @returns {GetChildrenBuilder} Builder instance
 */
Rorschach.prototype.getChildren = function getChildren() {
  return new builders.GetChildrenBuilder(this);
};




/**
 * Instantiate get data builder.
 *
 * @public
 * @returns {GetDataBuilder} Builder instance
 */
Rorschach.prototype.getData = function getData() {
  return new builders.GetDataBuilder(this);
};




/**
 * Initialize connection with ZooKeeper.
 *
 * @param {Rorschach} rorschach Rorschach instance
 * @param {String} connectionString Connection string
 * @param {Object} options ZooKeeper options.
 */
function initZooKeeper(rorschach, connectionString, options) {
  var error;
  var zk = zookeeper.createClient(connectionString, options);

  rorschach.zk = zk;

  zk.connect();
  zk.on('connected', onconnected);
  zk.on('expired', setError);
  zk.on('authenticationFailed', setError);
  zk.on('disconnected', ondisconnected);
  zk.on('state', handleStateChange);

  function onconnected() {
    error = false;
  }

  function setError() {
    error = true;
  }

  function ondisconnected() {
    if (rorschach.closed) {
      return;
    }

    if (error) {
      zk.removeListener('connected', onconnected);
      zk.removeListener('disconnected', ondisconnected);
      zk.removeListener('expired', setError);
      zk.removeListener('authenticationFailed', setError);
      zk.removeListener('state', handleStateChange);
      zk.close();

      initZooKeeper(rorschach, connectionString, options);
    }
  }

  function handleStateChange(state) {
    var newState;

    if (state === State.SYNC_CONNECTED) {
      if (!rorschach.ready) {
        rorschach.ready = true;
        rorschach.emit('connected');
        newState = ConnectionState.CONNECTED;
      }
      else {
        newState = ConnectionState.RECONNECTED;
      }
    }
    else if (state === State.CONNECTED_READ_ONLY) {
      newState = ConnectionState.READ_ONLY;
    }
    else if (state === State.EXPIRED) {
      newState = ConnectionState.LOST;
    }
    else if (state === State.DISCONNECTED) {
      newState = ConnectionState.SUSPENDED;
    }
    else {
      // AUTH_FAILED and SASL_AUTHENTICATED are not handled, yep.
      return;
    }

    rorschach.state = newState;
    rorschach.emit('connectionStateChanged', newState);
  }
}




/**
 * Execute some procedure in retryable loop.
 *
 * @private
 * @param {Function} job Function expecting <code>callback(err)</code> as only argument
 * @param {Function} callback Callback function
 */
Rorschach.prototype.retryLoop = function retryLoop(job, callback) {
  var self = this;
  var attempts = 0;
  var policy = this.retryPolicy;

  function exec() {
    ++attempts;

    try {
      job(onDone);
    }
    catch (ex) {
      setImmediate(onDone, ex);
    }
  }

  function onDone(err) {
    if (!err) {
      var args = [].slice.call(arguments, 0);
      callback.apply(null, args);
    }
    else if (attempts >= policy.maxAttempts || !policy.isRetryable(err)) {
      emitError(err);

      callback(err);
    }
    else {
      process.nextTick(exec);
    }
  }

  function emitError(err) {
    if (EventEmitter.listenerCount(self, 'error')) {
      self.emit('error', err);
    }
  }

  exec();
};




/**
 * Instantiate set ACL builder.
 *
 * @public
 * @returns {SetACLBuilder} Builder instance
 */
Rorschach.prototype.setACL = function setACL() {
  return new builders.SetACLBuilder(this);
};




/**
 * Instantiate set data builder.
 *
 * @public
 * @returns {SetDataBuilder} Builder instance
 */
Rorschach.prototype.setData = function setData() {
  return new builders.SetDataBuilder(this);
};

// Reference `node-zookeeper-client` classes & constants
ZOOKEEPER_CLASSES.forEach(function addRef(prop) {
  Rorschach[prop] = zookeeper[prop];
});


Rorschach.ConnectionState = ConnectionState;
Rorschach.Errors = Errors;
Rorschach.Lock = Lock;
Rorschach.LockDriver = LockDriver;
Rorschach.ReadWriteLock = ReadWriteLock;
Rorschach.SortingLockDriver = ReadWriteLock.SortingLockDriver;
Rorschach.ReadLockDriver = ReadWriteLock.ReadLockDriver;
Rorschach.RetryPolicy = RetryPolicy;
Rorschach.Utils = utils;
