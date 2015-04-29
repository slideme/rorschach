'use strict';

describe('Rorschach', function rorschachTestSuite() {
  it('should connect and disconnect w/o problems', function testConnectClose(done) {
    var client = new Rorschach(ZK_STRING);
    client.on('connected', onConnected);

    function onConnected() {
      client.close(done);
    }
  });
});
