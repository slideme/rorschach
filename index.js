'use strict';

var builders = require('./lib/builders');
var Errors = require('./lib/errors');
var EventEmitter = require('events').EventEmitter;
var Lock = require('./lib/Lock');
var LockDriver = require('./lib/LockDriver');
var ReadWriteLock = require('./lib/ReadWriteLock');
var util = require('util');
var utils = require('./lib/utils');
var zookeeper = require('node-zookeeper-client');
var State = zookeeper.State;


/*!
 * Expose Rorschach
 */
module.exports = Rorschach;




/**
 * Create instance.
 *
 * @constructor
 * @extends {events.EventEmitter}
 * @param {String} connectionString ZooKeeper connection string.
 * @param {Object} [zkOptions] ZooKeeper client options.
 */
function Rorschach(connectionString, zkOptions) {
  EventEmitter.call(this);

  var self = this;
  var zk = zookeeper.createClient(connectionString, zkOptions || {});
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


Rorschach.Errors = Errors;
Rorschach.Lock = Lock;
Rorschach.LockDriver = LockDriver;
Rorschach.ReadWriteLock = ReadWriteLock;
Rorschach.SortingLockDriver = ReadWriteLock.SortingLockDriver;
Rorschach.ReadLockDriver = ReadWriteLock.ReadLockDriver;
