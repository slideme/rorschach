/*jshint -W064*/
'use strict';


/**
 * Connection state.
 *
 * @constructor
 * @param {Number} code
 * @param {String} stringId
 * @param {Boolean} connected
 */
function ConnectionState(code, stringId, connected) {
  if (arguments.length === 2) {
    connected = stringId;
    stringId = 'NONAME';
  }
  if (!(this instanceof ConnectionState)) {
    return new ConnectionState(code, stringId, connected);
  }

  this.id = stringId;
  this.code = code;
  this.connected = connected;
}




/**
 * Return "connected" state.
 */
ConnectionState.prototype.isConnected = function isConnected() {
  return this.connected;
};




/**
 * Return string representation of state.
 *
 * @returns {String}
 */
ConnectionState.prototype.toString = function toString() {
  return this.id + '[' + this.code + ']';
};




/**
 * Return a code of state.
 *
 * @returns {Number}
 */
ConnectionState.prototype.valueOf = function valueOf() {
  return this.code;
};


/**
 * Connected state. Emitted only once for each Rorschach instance.
 *
 * @static
 * @type {ConnectionState}
 */
ConnectionState.CONNECTED = ConnectionState(0, 'CONNECTED', true);

/**
 * Connected in read-only mode.
 *
 * @static
 * @type {ConnectionState}
 */
ConnectionState.READ_ONLY = ConnectionState(1, 'READ_ONLY', true);

/**
 * Connection was re-established.
 *
 * @static
 * @type {ConnectionState}
 */
ConnectionState.RECONNECTED = ConnectionState(2, 'RECONNECTED', true);

/**
 * Connection was lost, but we're waiting to re-connect.
 *
 * @static
 * @type {ConnectionState}
 */
ConnectionState.SUSPENDED = ConnectionState(3, 'SUSPENDED', false);

/**
 * Connection was lost. Bye-bye, white pony.
 *
 * @static
 * @type {ConnectionState}
 */
ConnectionState.LOST = ConnectionState(4, 'LOST', false);


/*!
 * Expose states
 */
module.exports = ConnectionState;
