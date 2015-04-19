'use strict';

var fs = require('fs');
var path = require('path');

function addRequestBuilder(filename) {
  if (filename === 'index.js') {
    return;
  }

  var reqName = path.basename(filename, '.js');
  var modulePath = path.join(__dirname, filename);

  exports[reqName] = require(modulePath);
}

fs.readdirSync(__dirname).forEach(addRequestBuilder);
