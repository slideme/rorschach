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

  var self = this;
  var zk = zookeeper.createClient(connectionString, options.zookeeper || {});
  zk.on('state', handleStateChange);
  zk.connect();

  this.zk = zk;
  this.state = State.CONNECTING;

  function handleStateChange(state) {
    self.state = state;

    self.emit('connectionStateChanged', state);

    if (state === State.SYNC_CONNECTED) {
      self.emit('connected');
    }
  }
}
util.inherits(Rorschach, EventEmitter);




/**
 * Close connection to ZooKeeper.
 *
 * @public
 * @param {Function} [callback] Callback function
 */
Rorschach.prototype.close = function close(callback) {
  if (typeof callback === 'function') {
    this.zk.on('disconnected', callback);
  }
  this.zk.close();
};




/**
 * Instantiate `CreateBuilder`.
 *
 * @public
 * @returns {CreateBuilder} Builder instance
 */
Rorschach.prototype.create = function createBuilder() {
  return new builders.CreateBuilder(this);
};




/**
 * Instantiate `DeleteBuilder`.
 *
 * @public
 * @returns {DeleteBuilder} Builder instance
 */
Rorschach.prototype.delete = function deleteBuilder() {
  return new builders.DeleteBuilder(this);
};




/**
 * Execute some procedure in retryable loop.
 *
 * @param {Function} job Function expecting <code>callback(err)</code> as only argument
 * @param {Function} callback Callback function
 */
Rorschach.prototype.retryLoop = function retryLoop(job, callback) {
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
    else if (attempts >= policy.maxAttempts) {
      callback(err);
    }
    else if (!policy.isRetryable(err)) {
      callback(err);
    }
    else {
      exec();
    }
  }

  exec();
};


Rorschach.Errors = Errors;
Rorschach.Lock = Lock;
Rorschach.LockDriver = LockDriver;
Rorschach.ReadWriteLock = ReadWriteLock;
Rorschach.SortingLockDriver = ReadWriteLock.SortingLockDriver;
Rorschach.ReadLockDriver = ReadWriteLock.ReadLockDriver;
Rorschach.RetryPolicy = RetryPolicy;
