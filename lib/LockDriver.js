'use strict';


/**
 * Expose
 */
module.exports = LockDriver;




/**
 * Lock driver provides utility functions for {@link Lock}
 *
 * @constructor
 */
function LockDriver() {
}




/**
 * Fix node name before comparing strings (sequence numbers)
 *
 * @protected
 * @param {String} nodeName Name of lock node
 * @param {String} lockName Name of lock
 * @returns {String}
 */
LockDriver.prototype.fixForSorting = function(nodeName, lockName) {
  var idx = nodeName.lastIndexOf(lockName);

  if (idx === -1) {
    return nodeName;
  }

  idx += lockName.length;

  if (idx <= nodeName.length) {
    return nodeName.substring(idx);
  }

  return nodeName;
};




/**
 * Giving a list of lock nodes determine if lock is acquired
 *
 * @public
 * @param {Array.<String>} list List of lock nodes
 * @param {String} nodeName Our lock node name
 * @param {Number} maxLeases Refer to {@link Lock#setMaxLeases}
 * @returns {Object} Check result
 */
LockDriver.prototype.getsTheLock = function(list, nodeName, maxLeases) {
  var idx = list.indexOf(nodeName);
  var result = {};

  if (idx === -1) {
    var errMsg = 'Lock node ' + nodeName + ' is not among lock nodes list';
    result.error = Error(errMsg);
  }

  result.hasLock = idx < maxLeases;

  if (!result.hasLock) {
    result.watchPath = list[idx - maxLeases];
  }

  return result;
};




/**
 * Sort lock nodes by sequence number
 *
 * @public
 * @param {Array.<String>} list List with lock node names
 * @param {String} lockName Name of lock
 * @returns {Array.<String>} Sorted nodes list
 */
LockDriver.prototype.sortChildren = function(list, lockName) {
  var self = this;

  function comparator(nodeA, nodeB) {
    var seqNumA = self.fixForSorting(nodeA, lockName);
    var seqNumB = self.fixForSorting(nodeB, lockName);
    return seqNumA - seqNumB;
  }

  return list.sort(comparator);
};
