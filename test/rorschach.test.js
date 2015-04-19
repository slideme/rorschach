'use strict';

describe('Rorschach', function() {
  it('should initialize and connect', function(done) {
    var client = new Rorschach(ZK_STRING);
    client.on('connected', done);
  });

  it('should close client with callback', function(done) {
    var client = new Rorschach(ZK_STRING);
    client.on('connected', function onConnected() {
      client.close(done);
    });
  });
});
