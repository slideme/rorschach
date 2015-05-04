'use strict';

var Exception = require('node-zookeeper-client').Exception;
var utils = require('../utils');


/*!
 * Expose
 */
module.exports = SetDataBuilder;




/**
 * Set data operation builder.
 *
 * @constructor
 * @param {Rorschach} client Rorschach instance
 */
function SetDataBuilder(client) {
  this.client = client;
  this.version = -1;
}




/**
 * Execute setData().
 *
 * @public
 * @param {String} path Node path
 * @param {Buffer} data Node data to set
 * @param {Function} callback Callback function: <code>(err, stat)</code>
 */
SetDataBuilder.prototype.forPath = function forPath(path, data, callback) {
  var client = this.client;
  var zk = client.zk;
  var version = this.version;

  client.retryLoop(exec, callback);

  function exec(cb) {
    zk.setData(path, data, version, cb);
  }
};




/**
 * Set node version.
 *
 * @public
 * @param {Number} version
 * @returns {SetDataBuilder}
 */
SetDataBuilder.prototype.withVersion = function withVersion(version) {
  assert.equal(typeof version, 'number', 'Number expected');
  this.version = version;
  return this;
};
