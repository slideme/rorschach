REPORTER = spec
SOURCES = $(wildcard lib/*.js) index.js

lint:
	jshint --config .jshintrc $(SOURCES)
	jscs --config .jscsrc $(SOURCES)

test:
	$(MAKE) lint
	mocha --require test/support/globals --reporter spec --bail --check-leaks test/

test-ci:
	$(MAKE) lint
	istanbul cover node_modules/mocha/bin/_mocha --report lcovonly -- --require test/support/globals --reporter spec --check-leaks test/

test-cov:
	echo TRAVIS_JOB_ID $(TRAVIS_JOB_ID)
	$(MAKE) lint
	istanbul cover node_modules/mocha/bin/_mocha -- --require test/support/globals --reporter dot --check-leaks test/

.PHONY: test