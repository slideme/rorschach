'use strict';

var fs = require('fs');
var path = require('path');
var builders = module.exports = {};

fs.readdirSync(__dirname).forEach(requireBuilder);

function requireBuilder(filename) {
  if (filename === 'index.js') {
    return;
  }

  var modulePath = path.join(__dirname, filename);
  var module = require(modulePath);
  builders[module.name] = module;
}
