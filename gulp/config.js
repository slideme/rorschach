'use strict';

const config = {};

/**
 * Paths used in tasks
 */
config.paths = {
  js: ['{.,gulp,lib/**,test/**}/*.js'],
  json: ['./*.json', '.jscsrc']
};

module.exports = config;
