# Changelog

## 0.1.0

* Added `Rorschach#create()` and implemented `CreateBuilder`;
* Modified `Rorschach#delete()` and implemented `DeleteBuilder`;
* Fixed `Lock#acquire()` issue which caused calling of callback twice and more times;
* Fixed `ReadLockDriver#getsTheLock()` index validation issue;
* Added more tests for full code coverage.

## 0.0.3

* Fixed `ReadWriteLock#writeMutex` lock driver issue <s>[#1](https://github.com/slideme/rorschach/pull/1)</s>.

## 0.0.2

* Added `#isOwner()` and `#destroy([callback])` to `Lock` class.
* Implemented `ReadWriteLock` class (similar to [`InterProcessReadWriteLock`](http://curator.apache.org/curator-recipes/shared-reentrant-read-write-lock.html)).

## 0.0.1

* Added `Rorschach` and `Lock` (clone of [`InterProcessMutex`](http://curator.apache.org/curator-recipes/shared-reentrant-lock.html) from Curator) classes to provide basic locking functionality.
