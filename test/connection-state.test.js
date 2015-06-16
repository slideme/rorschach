/*jshint -W030*/
/*jshint -W064*/
'use strict';

var ConnectionState = Rorschach.ConnectionState;


describe('ConnectionState', function connectionStateTestSuite() {
  describe('#isConnected', function isConnectedTestSuite() {
    it('should return true for CONNECTED, RECONNECTED, READ_ONLY', function testTrue() {
      expect(ConnectionState.CONNECTED.isConnected()).to.be.true;
      expect(ConnectionState.RECONNECTED.isConnected()).to.be.true;
      expect(ConnectionState.READ_ONLY.isConnected()).to.be.true;
    });

    it('should return false for SUSPENDED, LOST', function testFalse() {
      expect(ConnectionState.SUSPENDED.isConnected()).to.be.false;
      expect(ConnectionState.LOST.isConnected()).to.be.false;
    });

    it('should return correct value for arbitrary state', function testArbitrary() {
      expect(ConnectionState(-1, true).isConnected()).to.be.true;
      expect(ConnectionState(-2, false).isConnected()).to.be.false;
    });
  });

  describe('#toString()', function toStringTestSuite() {
    it('should return string representation', function testUsualCase() {
      expect(ConnectionState.CONNECTED.toString()).to.equal('CONNECTED[0]');
      expect(String(ConnectionState.CONNECTED)).to.equal('CONNECTED[0]');
    });

    it('should return correct value for arbitrary state', function testArbitrary() {
      expect(ConnectionState(-1, 'WHATEVER', true).toString()).to.equal('WHATEVER[-1]');
      expect(String(ConnectionState(-1, 'WHATEVER', true))).to.equal('WHATEVER[-1]');
    });
  });

  describe('#valueOf', function valueOfTestSuite() {
    it('should return state numeric Id', function testUsualCase() {
      expect(ConnectionState.CONNECTED.valueOf()).to.be.a('number');
    });

    it('should return correct value for arbitrary state', function testArbitrary() {
      expect(ConnectionState(-1, true).valueOf()).to.equal(-1);
    });
  });
});
