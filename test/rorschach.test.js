'use strict';

var Exception = Rorschach.Exception;
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

  it('should close client without issues #1', function testClose(done) {
    var client = new Rorschach(ZK_STRING);
    client.on('connected', onConnected);

    function onConnected() {
      client.close(done);
    }
  });

  it('should close client without issues #2', function testCloseWithoutConnect() {
    var client = new Rorschach(ZK_STRING);
    client.close();
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

  it('should emit \'error\' event when operation fails', function testEventError() {
    var client = new Rorschach('0.1.2.3:2181');
    var error;

    client.on('error', onerror);
    client.getData().forPath('/missing/path/on/missing/server', onerror);

    function onerror(err) {
      if (error) {
        expect(error).to.equal(err);
      }
      else {
        error = err;
      }
    }

    try {
      client.close();
    }
    catch (ex) {
      // do nothing
    }
  });

  it('should not reconnect if client is marked as closed', function testNoReconnect(done) {
    var client = new Rorschach(ZK_STRING);
    client.close();
    client.emit('disconnected');
    done();
  });

  it('should not reconnect if no error was found', function testNoErrorNoReconnect(done) {
    var client = new Rorschach(ZK_STRING);
    client.on('connected', onConnected);

    function onConnected() {
      client.zk.close();
      done();
    }
  });

  it('should reconnect in case of error', function testReconnect(done) {
    var client = new Rorschach(ZK_STRING);
    client.on('connected', onConnected);

    function onConnected() {
      client.zk.emit('expired');
      client.zk.emit('disconnected');
      client.on('reconnected', afterReconnect);
    }

    function afterReconnect() {
      client.close(done);
    }
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
