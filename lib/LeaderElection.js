'use strict';

var ConnectionState = require('./ConnectionState');
var EventEmitter = require('events').EventEmitter;
var LockDriver = require('./LockDriver');
var util = require('util');
var utils = require('./utils');
var zk = require('node-zookeeper-client');
var CreateMode = zk.CreateMode;
var Event = zk.Event;
var Exception = zk.Exception;
var LOCK_NAME = 'election-';
var driver = new LockDriver();


util.inherits(LeaderElection, EventEmitter);
module.exports = LeaderElection;




/**
 * @enum {number}
 */
var State = {
  LATENT: 0,
  STARTED: 1,
  CLOSED: 2
};
LeaderElection.State = State;




/**
 * Leader election participant.
 *
 * @constructor
 * @extends {EventEmitter}
 * @param {Rorschach} client Rorschach instance
 * @param {String} path Election path
 * @param {String} id Participant id
 */
function LeaderElection(client, path, id) {
  EventEmitter.call(this);

  /**
   * Ref. to client.
   *
   * @type {Rorschach}
   */
  this.client = client;


  /**
   * ZooKeeper path where participants' nodes exist.
   *
   * @type {String}
   */
  this.path = path;


  /**
   * Id of participant. It's kept in node.
   *
   * @type {String}
   */
  this.id = id;


  /**
   * Leadership state
   *
   * @type {Boolean}
   */
  this.isLeader = false;


  /**
   * Initial state.
   *
   * @type {State}
   */
  this.state = State.LATENT;
}




function checkLeadership(election, children, callback) {
  var nodeName = utils.pathAndNode(election.ourPath).node;
  var sortedChildren = driver.sortChildren(children, LOCK_NAME);
  var index = sortedChildren.indexOf(nodeName);
  if (index === -1) {
    reset(election, done);
  }
  else if (index === 0) {
    setLeadership(election, true);
  }
  else {
    var watchPath = sortedChildren[index - 1];
    var path = utils.join(election.path, watchPath);
    election.client.getData().usingWatcher(watcher).forPath(path, handleResult);
  }

  callback();

  function watcher(event) {
    if (election.state === State.STARTED &&
      event.getType() === Event.NODE_DELETED && election.ourPath) {
      getChildren(election, done);
    }
  }

  function handleResult(err) {
    if (err && election.state === State.STARTED &&
      err.getCode() === Exception.NO_NODE) {
      reset(election, done);
    }
  }

  function done(err) {
    if (err) {
      election.emit('error', err);
    }
  }
}




function getChildren(election, callback) {
  election.client.getChildren().forPath(election.path, handleResult);

  function handleResult(err, children) {
    if (err) {
      callback(err);
    }
    else {
      checkLeadership(election, children, callback);
    }
  }
}




/**
 * Handle connection state change.
 *
 * @param {LeaderElection} election
 * @param {ConnectionState} state
 */
function handleStateChange(election, state) {
  if (state === ConnectionState.RECONNECTED) {
    reset(election, afterReset);
  }
  else if (state === ConnectionState.SUSPENDED ||
    state === ConnectionState.LOST) {
    setLeadership(election, false);
  }

  function afterReset(err) {
    if (err) {
      election.emit('error', err);
      setLeadership(election, false);
    }
  }
}




/**
 * Check if our node is leader.
 *
 * @returns {Boolean}
 */
LeaderElection.prototype.hasLeadership = function hasLeadership() {
  return this.state === State.STARTED && this.isLeader;
};




/**
 *
 * @param {LeaderElection} election
 * @param {Function} callback
 */
function reset(election, callback) {
  setLeadership(election, false);
  setNode(election, null, createNode);

  function createNode(err) {
    if (err) {
      return callback(err);
    }

    var path = utils.join(election.path, LOCK_NAME);
    var createBuilder = election.client.create();
    createBuilder.creatingParentsIfNeeded();
    createBuilder.withProtection();
    createBuilder.withMode(CreateMode.EPHEMERAL_SEQUENTIAL);
    createBuilder.forPath(path, new Buffer(election.id), afterCreate);
  }

  function afterCreate(err, ourPath) {
    if (err) {
      return callback(err);
    }

    setNode(election, ourPath, afterSetNode);
  }

  function afterSetNode(err) {
    if (err) {
      return callback(err);
    }

    if (election.state === State.CLOSED) {
      setNode(election, null, callback);
    }
    else {
      getChildren(election, callback);
    }
  }
}




function setLeadership(election, isLeader) {
  var wasLeader = election.isLeader;
  election.isLeader = isLeader;

  if (wasLeader && !isLeader) {
    election.emit('notLeader');
  }
  else if (!wasLeader && isLeader) {
    election.emit('isLeader');
  }
}




function setNode(election, path, callback) {
  var oldPath = election.ourPath;
  election.ourPath = path;
  if (oldPath) {
    election.client.delete().guaranteed().forPath(oldPath, callback);
  }
  else {
    callback();
  }
}




/**
 * Start taking part in election process.
 *
 * @param {Function} callback Callback function: <code>(err)</code>
 */
LeaderElection.prototype.start = function start(callback) {
  if (this.state !== State.LATENT) {
    return callback(new Error('Can\'t be started more than once'));
  }
  else {
    this.state = State.STARTED;
  }

  var self = this;

  function onStateChange(state) {
    handleStateChange(self, state);
  }

  this.stateChangeListener = onStateChange;
  this.client.on('connectionStateChanged', onStateChange);

  reset(this, callback);
};




/**
 * Leave the game for youngz.
 *
 * @param {Function} callback Callback function: <code>(err)</code>
 */
LeaderElection.prototype.stop = function stop(callback) {
  var self = this;

  if (this.state !== State.STARTED) {
    return callback(new Error('Already stopped or never started'));
  }
  else {
    this.state = State.CLOSED;
  }

  setNode(this, null, afterSetNode);

  function afterSetNode(err) {
    self.client.removeListener('connectionStateChanged',
      self.stateChangeListener);

    if (err) {
      return callback(err);
    }

    setLeadership(self, false);
    callback();
  }
};
