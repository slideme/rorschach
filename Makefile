REPORTER = spec
SOURCES = $(wildcard lib/*.js) $(wildcard test/*.js) index.js

lint:
	eslint $(SOURCES)
	jscs --config .jscsrc $(SOURCES)

test:
	$(MAKE) lint
	mocha --require test/support/globals --reporter spec --bail --check-leaks --recursive test/

test-ci:
	$(MAKE) lint
	istanbul cover node_modules/mocha/bin/_mocha --report lcovonly -- --require test/support/globals --reporter spec --check-leaks --recursive test/

test-cov:
	echo TRAVIS_JOB_ID $(TRAVIS_JOB_ID)
	$(MAKE) lint
	istanbul cover node_modules/mocha/bin/_mocha -- --require test/support/globals --reporter dot --check-leaks --recursive test/

.PHONY: test
