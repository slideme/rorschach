'use strict';

var zookeeper = require('node-zookeeper-client');
var Exception = zookeeper.Exception;
var RetryPolicy = Rorschach.RetryPolicy;


describe('Rorschach', function rorschachTestSuite() {
  function close(client, done) {
    client.on('connected', function onConnected() {
      client.close(done);
    });
  }


  it('should connect to ZooKeeper without issues', function testConnect(done) {
    var client = new Rorschach(ZK_STRING);
    client.on('connected', onConnected);

    function onConnected() {
      client.close();
      done();
    }
  });

  it('should close client without issues', function testClose(done) {
    var client = new Rorschach(ZK_STRING);
    client.on('connected', onConnected);

    function onConnected() {
      client.close(done);
    }
  });

  it('should initialize with custom retry policy', function testCustomRetryPolicy() {
    var customRetryPolicy = new RetryPolicy(10, [
      Exception.NO_NODE,
      Exception.NOT_EMPTY
    ]);
    var client = new Rorschach(ZK_STRING, {
      retryPolicy: customRetryPolicy
    });

    close(client);
  });

  describe('retryLoop()', function retryLoopTestSuite() {
    it('should catch error and validate it', function testErrorCatch() {
      var err = new Error('Stub error');
      var client = new Rorschach(ZK_STRING);
      client.retryLoop(testJob, onDone);

      function testJob() {
        throw err;
      }

      function onDone(jobError) {
        expect(jobError).to.equal(err);
        close(client);
      }
    });
  });
});
