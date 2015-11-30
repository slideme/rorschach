'use strict';

var Exception = Rorschach.Exception;
var Errors = Rorschach.Errors;
var ExecutionError = Errors.ExecutionError;

describe('Errors', function errorsTestSuite() {
  describe('ExecutionError', function executionErrorTestSuite() {
    it('should instantiate error correctly', function testUsualCase() {
      var original = new Error('Foo bar lol troll');
      var operation = 'create';
      var args = ['/a/b/c'];
      var error = new ExecutionError(operation, args, original);
      expect(error.original).to.equal(original);
      expect(error.operation).to.equal(operation);
      expect(error.operationArgs).to.equal(args);
      expect(error.stack).to.contain(original.stack);
    });

    it('should expose getCode() if Exception provided', function testCode() {
      var original = new Exception(Exception.CONNECTION_LOSS, 'Stub', Error);
      var operation = 'create';
      var args = ['create'];
      var error = new ExecutionError(operation, args, original);
      expect(error.getCode()).to.equal(original.getCode());
    });
  });
});
