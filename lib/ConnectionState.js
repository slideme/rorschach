/*jshint -W064*/
'use strict';


/**
 * Connection state.
 *
 * @constructor
 * @param {Number} code
 * @param {Boolean} connected
 */
function ConnectionState(code, connected) {
  if (!(this instanceof ConnectionState)) {
    return new ConnectionState(code, connected);
  }

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
ConnectionState.CONNECTED = ConnectionState(0, true);

/**
 * Connected in read-only mode.
 *
 * @static
 * @type {ConnectionState}
 */
ConnectionState.READ_ONLY = ConnectionState(1, true);

/**
 * Connection was re-established.
 *
 * @static
 * @type {ConnectionState}
 */
ConnectionState.RECONNECTED = ConnectionState(2, true);

/**
 * Connection was lost, but we're waiting to re-connect.
 *
 * @static
 * @type {ConnectionState}
 */
ConnectionState.SUSPENDED = ConnectionState(3, false);

/**
 * Connection was lost. Bye-bye, white pony.
 *
 * @static
 * @type {ConnectionState}
 */
ConnectionState.LOST = ConnectionState(4, false);


/*!
 * Expose states
 */
module.exports = ConnectionState;
