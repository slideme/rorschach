'use strict';

var utils = require('../utils');


// TODO delete children if needed
/**
 * Delete request builder
 *
 * @param {Rorschach} client
 */
module.exports = function(client) {
  var isGuaranteed = false;
  var version = -1;
  var req = {};

  function guaranteed() {
    isGuaranteed = true;
    return req;
  }
  req.guaranteed = guaranteed;


  function forPath(path, callback) {
    client.zk.remove(path, version, handleResult);

    function handleResult(err) {
      if (!err) {
        done();
      }
      else if (isGuaranteed && utils.isRetryable(err)) {
        client.zk.remove(path, version, handleResult);
      }
      else {
        done(err);
      }
    }

    function done(err) {
      if (callback) {
        if (err) {
          callback(err);
        }
        else {
          callback();
        }
      }
    }
  }
  req.forPath = forPath;


  function withVersion(value) {
    version = value;
    return req;
  }
  req.withVersion = withVersion;


  return req;
};
