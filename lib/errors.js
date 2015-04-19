'use strict';

var createCustomError = require('custom-error-generator');
var errors = module.exports = {};


/**
 * Thrown in case if some operation runs out of time.
 */
errors.TimeoutError = createCustomError('TimeoutError');
