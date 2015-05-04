/*jshint -W030*/
'use strict';

var Exception = Rorschach.Exception;
var RetryPolicy = Rorschach.RetryPolicy;


describe('RetryPolicy', function retryPolicyTestSuite() {
  it('should initialize w/o arguments', function initWithoutArgs() {
    var policy = new RetryPolicy();
    expect(policy.maxAttempts).to.eql(RetryPolicy.DEFAULT_MAX_ATTEMPTS);
    expect(policy.codes).to.equals(RetryPolicy.DEFAULT_RETRYABLE_ERRORS);
  });

  it('should initialize with maxAttempts', function testMaxAttempts() {
    var policy = new RetryPolicy({maxAttempts: 1});
    expect(policy.maxAttempts).to.eql(1);
  });

  it('should initialize with custom error codes', function testCodes() {
    var codes = [
      Exception.NO_NODE,
      Exception.NOT_EMPTY
    ];

    var policy = new RetryPolicy({codes: codes});
    expect(policy.codes).to.equal(codes);
  });

  it('should initialize with isRetryable function', function testRetryableFunction() {
    var policy = new RetryPolicy({codes: dummy});

    function dummy() {
      return true;
    }

    expect(policy.isRetryable).to.equal(dummy);
  });

  describe('isRetryable()', function isRetryableTestSuite() {
    it('should return false for non-Exception error', function testNonException() {
      var ret = new RetryPolicy().isRetryable(new Error('Stub error'));
      expect(ret).to.be.false;
    });
  });
});
