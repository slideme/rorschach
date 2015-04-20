'use strict';

var requestBuilders = require('./lib/requests');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var utils = require('./lib/utils');
var zookeeper = require('node-zookeeper-client');
var State = zookeeper.State;
//var slice = Array.prototype.slice;


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
 * Return Delete builder.
 *
 * @public
 * @returns {Object} Delete builder instance
 */
Rorschach.prototype.delete = function deleteBuilder() {
  return requestBuilders.delete(this);
};




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
 * Check if client is connected to ZK instance
 *
 * @public
 * @returns {Boolean}
 */
/*Rorschach.prototype.isConnected = function() {
  return this.zk.getState() === zookeeper.State.CONNECTED;
};*/




/**
 * Call ZooKeeper client method only when connected
 *
 * @private
 * @param {String} methodName ZooKeeper method name
 * @param {...*} args Method arguments
 */
/*Rorschach.prototype.whenConnected = function(methodName, args) {
  var zk = this.zk;
  args = slice.call(arguments, 1);

  if (this.isConnected()) {
    zk[methodName].apply(zk, args);
  }
  else {
    this.once('connected', onConnected);
  }

  function onConnected() {
    zk[methodName].apply(zk, args);
  }
};*/


Rorschach.Errors = require('./lib/errors');
Rorschach.Lock = require('./lib/Lock');
Rorschach.ReadWriteLock = require('./lib/ReadWriteLock');
Rorschach.LockDriver = require('./lib/LockDriver');
