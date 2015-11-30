/*jshint -W030*/
'use strict';

var CreateBuilder = require('../../../lib/builders/create');
var testPath = require('../../support/utils').testPath;
var ConnectionState = Rorschach.ConnectionState;
var LeaderElection = Rorschach.LeaderElection;
var Exception = Rorschach.Exception;


describe('LeaderElection', function leaderElectionTestSuite() {
  var client;
  var sandbox;
  var suitePath = '/test/leader-election';

  before(function beforeAll(done) {
    client = new Rorschach(ZK_STRING);
    client.once('connected', done);
  });

  beforeEach(function createSandbox() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function destroySandbox() {
    sandbox.restore();
  });

  after(function deletePlayGround(done) {
    client.delete().deleteChildrenIfNeeded().forPath(suitePath, done);
  });

  after(function afterAll() {
    client.close();
  });

  it('should become a leader if alone participating', function testAloneLeader(done) {
    var ourPath = testPath(suitePath, 1);
    var participant = new LeaderElection(client, ourPath, 'foo');
    participant.on('isLeader', isLeader);
    participant.start(afterStart);

    function isLeader() {
      expect(participant.hasLeadership()).to.be.true;
      participant.stop(done);
    }

    function afterStart(err) {
      assert.ifError(err);
    }
  });

  it('should become a leader once other leader quits', function testLeaderAfterLeader(done) {
    var ourPath = testPath(suitePath, 5);
    var foo = new LeaderElection(client, ourPath, 'foo');
    var bar = new LeaderElection(client, ourPath, 'bar');

    foo.start(afterFooStarted);

    function afterFooStarted(err) {
      assert.ifError(err);
      bar.on('isLeader', barLeaderListener);
      bar.start(afterBarStarted);
    }

    function afterBarStarted(err) {
      assert.ifError(err);
      foo.stop(afterFooStopped);
    }

    function barLeaderListener() {
      expect(bar.hasLeadership()).to.be.true;
      bar.stop(done);
    }

    function afterFooStopped(err) {
      assert.ifError(err);
    }
  });

  it('should become a leader if previous node is deleted before checkLeadership()', function testDeleteBeforeCheckLeadership(done) {
    var ourPath = testPath(suitePath, 7);
    var foo = new LeaderElection(client, ourPath, 'foo');
    var bar = new LeaderElection(client, ourPath, 'bar');
    var stub;
    foo.start(afterFooStarted);
    foo.on('isLeader', fooLeaderListener);

    function getDataStub(path, watch, callback) {
      foo.stop(afterFooStopped);

      function afterFooStopped(err) {
        assert.ifError(err);
        stub.restore();
        client.zk.getData(path, watch, callback);
      }
    }

    function fooLeaderListener() {
      stub = sandbox.stub(client.zk, 'getData', getDataStub);
      bar.on('isLeader', barLeaderListener);
      bar.start(afterBarStarted);
    }

    function afterFooStarted(err) {
      assert.ifError(err);
    }

    function afterBarStarted(err) {
      assert.ifError(err);
    }

    function barLeaderListener() {
      expect(bar.hasLeadership()).to.be.true;
      bar.stop(done);
    }
  });

  it('should loose leadership if connection is lost', function testLooseLeadership(done) {
    var ourPath = testPath(suitePath, 15);
    var participant = new LeaderElection(client, ourPath, 'foo');
    var eventsNeeded = 2;

    participant.start(afterStart);
    participant.once('isLeader', leaderListener);

    function afterStart(err) {
      assert.ifError(err);
    }

    function leaderListener() {
      participant.on('notLeader', notLeaderListener);
      client.emit('connectionStateChanged', ConnectionState.SUSPENDED);
      participant.isLeader = true;
      client.emit('connectionStateChanged', ConnectionState.LOST);
    }

    function notLeaderListener() {
      if (!--eventsNeeded) {
        participant.stop(done);
      }
    }
  });

  it('should call reset after reconnected', function testResetAfterReconnect(done) {
    var ourPath = testPath(suitePath, 14);
    var participant = new LeaderElection(client, ourPath, 'foo');
    var bar = new LeaderElection(client, ourPath, 'bar');
    var stub;
    var resetCalled = false;
    var eventsNeeded = 2;

    participant.start(afterStart);
    participant.on('isLeader', leaderListener);

    function afterStart(err) {
      assert.ifError(err);
    }

    function leaderListener() {
      if (!--eventsNeeded) {
        expect(resetCalled).to.be.true;
        participant.stop(done);
        return;
      }

      stub = sandbox.stub(client.zk, 'remove', removeStub);
      client.emit('connectionStateChanged', ConnectionState.RECONNECTED);
    }

    function removeStub(path, version, callback) {
      resetCalled = true;
      stub.restore();
      participant.isLeader = false;
      client.zk.remove(path, version, callback);
    }
  });

  it('should loose leadership if after reconnect reset() fails', function testLooseLeadershipAfterReconnect(done) {
    var ourPath = testPath(suitePath, 16);
    var participant = new LeaderElection(client, ourPath, 'foo');
    var bar = new LeaderElection(client, ourPath, 'bar');
    var funnyError = new Exception(Exception.NO_NODE, 'Funny error', Error);
    var stub;
    var gotError = false;

    participant.start(afterStart);
    participant.on('isLeader', leaderListener);
    participant.once('error', trackError);

    function afterStart(err) {
      assert.ifError(err);
    }

    function leaderListener() {
      stub = sandbox.stub(client.zk, 'remove', removeStub);
      client.emit('connectionStateChanged', ConnectionState.RECONNECTED);
    }

    function removeStub(path, version, callback) {
      stub.restore();
      participant.isLeader = true;
      participant.once('notLeader', notLeaderListener);
      callback(funnyError);
    }

    function trackError(err) {
      gotError = true;
    }

    function notLeaderListener() {
      expect(gotError).to.be.true;
      participant.stop(done);
    }
  });

  it('should react only on RECONNECTED, SUSPENDED and LOST connection states', function testIgnoreConnectionStates(done) {
    var ourPath = testPath(suitePath, 17);
    var participant = new LeaderElection(client, ourPath, 'foo');
    participant.start(afterStart);
    participant.once('isLeader', leaderListener);

    function afterStart(err) {
      assert.ifError(err);
    }

    function leaderListener() {
      client.emit('connectionStateChanged', ConnectionState.CONNECTED);
      client.emit('connectionStateChanged', ConnectionState.READ_ONLY);
      participant.stop(done);
    }
  });

  it('should not allow calling start() more than once', function testAlreadyStartedError(done) {
    var ourPath = testPath(suitePath, 2);
    var participant = new LeaderElection(client, ourPath, 'foo');
    participant.start(afterFirstStart);
    participant.start(afterSecondStart);

    function afterFirstStart(err) {
      assert.ifError(err);
    }

    function afterSecondStart(err) {
      expect(err).to.be.ok;
      expect(err.message).be.equal('Can\'t be started more than once');
      participant.stop(done);
    }
  });

  it('should not allow stopping of not-started participant', function testNeverStartedError(done) {
    var ourPath = testPath(suitePath, 3);
    var participant = new LeaderElection(client, ourPath, 'foo');
    participant.stop(afterStop);

    function afterStop(err) {
      expect(err).to.be.ok;
      expect(err.message).be.equal('Already stopped or never started');
      done();
    }
  });

  it('should not allow stopping of already stopped participant', function testAlreadyStoppedError(done) {
    var ourPath = testPath(suitePath, 4);
    var participant = new LeaderElection(client, ourPath, 'foo');
    participant.start(afterStart);

    function afterStart(err) {
      assert.ifError(err);
      participant.stop(afterStop);
    }

    function afterStop(err) {
      assert.ifError(err);
      participant.stop(afterSecondStop);
    }

    function afterSecondStop(err) {
      expect(err).to.be.ok;
      expect(err.message).be.equal('Already stopped or never started');
      done();
    }
  });

  it('should react correctly when setNode() fails', function testSetNodeError(done) {
    var ourPath = testPath(suitePath, 6);
    var participant = new LeaderElection(client, ourPath, 'foo');
    var stub = sandbox.stub(client.zk, 'remove', removeStub);
    var funnyError = new Exception(Exception.NO_NODE, 'Funny error', Error);
    participant.start(afterStart);

    function removeStub(path, version, callback) {
      callback(funnyError);
    }

    function afterStart(err) {
      assert.ifError(err);
      participant.stop(afterStop);
    }

    function afterStop(err) {
      expect(err.original).to.equal(funnyError);
      stub.restore();
      done();
    }
  });

  it('should react only on deletion of watched node', function testDeleteBeforeCheckLeadership(done) {
    var ourPath = testPath(suitePath, 8);
    var foo = new LeaderElection(client, ourPath, 'foo');
    var bar = new LeaderElection(client, ourPath, 'bar');
    var stubGetData = sandbox.stub(client.zk, 'getData', getDataStub);
    var stubGetChildren;
    var getChildrenCalled = false;

    function getDataStub(path, watch, callback) {
      stubGetChildren = sandbox.stub(client.zk, 'getChildren', getChildrenStub);
      var wrappingWatch = function wrappingWatch(evt) {
        watch(evt);
        watchCalled();
      };
      stubGetData.restore();
      client.zk.getData(path, wrappingWatch, callback);
    }

    function getChildrenStub(path, callback) {
      getChildrenCalled = true;
      stubGetChildren.restore();
      client.zk.getChildren(path, callback);
    }

    startOneAfterAnother(foo, bar, afterBothStarted);

    function afterBothStarted(err) {
      assert.ifError(err);
      client.setData().forPath(foo.ourPath, new Buffer('not foo'), afterSetData);
    }

    function afterSetData(err) {
      assert.ifError(err);
    }

    function watchCalled() {
      expect(getChildrenCalled).to.be.false;
      stopOneAfterAnother(foo, bar, done);
    }
  });

  it('should reset node if not found among children', function testNotInChildren(done) {
    var ourPath = testPath(suitePath, 11);
    var participant = new LeaderElection(client, ourPath, 'foo');
    var stubChildren = sandbox.stub(client.zk, 'getChildren', getChildrenStub);
    var resetCalled = false;
    var stubDelete;

    participant.once('isLeader', leaderListener);
    participant.start(afterStarted);

    function getChildrenStub(path, callback) {
      if (!stubDelete) {
        stubDelete = sandbox.stub(client.zk, 'remove', removeStub);
      }

      callback(null, []);
    }

    function removeStub(path, version, callback) {
      stubDelete.restore();
      stubChildren.restore();
      resetCalled = true;
      client.zk.remove(path, version, callback);
    }

    function afterStarted(err) {
      assert.ifError(err);
    }

    function leaderListener() {
      participant.stop(done);
    }
  });

  it('should emit error when reset() fails', function testResetEmitError(done) {
    var ourPath = testPath(suitePath, 9);
    var foo = new LeaderElection(client, ourPath, 'foo');
    var bar = new LeaderElection(client, ourPath, 'bar');
    bar.once('error', trackError);
    var stubGetData = sandbox.stub(client.zk, 'getData', getDataStub);
    var stubDelete;
    var funnyError = new Exception(Exception.NO_NODE, 'Funny error', Error);

    startOneAfterAnother(foo, bar, afterBothStarted);

    function trackError(err) {
      expect(err.original).to.equal(funnyError);
      bar.stop(done);
    }

    function afterBothStarted(err) {
      assert.ifError(err);
    }

    function getDataStub(path, watch, callback) {
      client.delete().forPath(foo.ourPath, afterDelete);

      function afterDelete(err) {
        assert.ifError(err);

        stubDelete = sandbox.stub(client.zk, 'remove', removeStub);
        stubGetData.restore();
        client.zk.getData(path, watch, callback);
      }
    }

    function removeStub(path, version, callback) {
      stubDelete.restore();
      callback(funnyError);
    }
  });

  it('should emit error when getChildren() fails', function testResetEmitError(done) {
    var ourPath = testPath(suitePath, 10);
    var foo = new LeaderElection(client, ourPath, 'foo');
    var bar = new LeaderElection(client, ourPath, 'bar');
    var funnyError = new Exception(Exception.NO_NODE, 'Funny error', Error);
    var stub;

    bar.once('error', trackError);
    startOneAfterAnother(foo, bar, afterBothStarted);

    function trackError(err) {
      expect(err.original).to.equal(funnyError);
      bar.stop(done);
    }

    function getChildrenStub(path, callback) {
      callback(funnyError);
      stub.restore();
    }

    function afterBothStarted(err) {
      assert.ifError(err);
      stub = sandbox.stub(client.zk, 'getChildren', getChildrenStub);
      foo.stop(afterFooStopped);
    }

    function afterFooStopped(err) {
      assert.ifError(err);
    }
  });

  it('should return error when reset() fails to create node', function testCreateFailError(done) {
    var ourPath = testPath(suitePath, 12);
    var participant = new LeaderElection(client, ourPath, 'foo');
    var stub = sandbox.stub(CreateBuilder.prototype, 'forPath', forPathStub);
    var funnyError = new Exception(Exception.NO_NODE, 'Funny error', Error);

    participant.start(afterStart);

    function forPathStub(path, data, callback) {
      stub.restore();
      callback(funnyError);
    }

    function afterStart(err) {
      expect(err).to.equal(funnyError);
      done();
    }
  });

  it('should return error when reset() fails to delete node', function testCreateFailError(done) {
    var ourPath = testPath(suitePath, 13);
    var participant = new LeaderElection(client, ourPath, 'foo');
    var stubCreate = sandbox.stub(CreateBuilder.prototype, 'forPath', forPathStub);

    participant.start(afterStart);

    function forPathStub(path, data, callback) {
      stubCreate.restore();
      participant.ourPath = '/wow/lol/you/kidding/man';
      //jshint -W040
      this.forPath(path, data, callback);
    }

    function afterStart(err) {
      expect(err).to.be.ok;
      expect(err.original.getCode()).to.equal(Exception.NO_NODE);
      participant.stop(done);
    }
  });

  function startOneAfterAnother(a, b, callback) {
    a.once('isLeader', startB);
    a.start(afterAStarted);

    function afterAStarted(err) {
      assert.ifError(err);
    }

    function startB() {
      b.start(afterBStarted);
    }

    function afterBStarted(err) {
      assert.ifError(err);
      callback();
    }
  }

  function stopOneAfterAnother(a, b, callback) {
    a.stop(afterAStopped);

    function afterAStopped(err) {
      assert.ifError(err);
      b.stop(afterBStopped);
    }

    function afterBStopped(err) {
      assert.ifError(err);
      callback();
    }
  }
});
