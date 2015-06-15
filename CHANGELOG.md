# Changelog

## 0.5.0

* Implemented `LeaderElection` class;
* Implemented `ConnectionState` and changed behavior of `connectionStateChanged` event of `Rorschach`;
* Added contents to API.

## 0.4.1

* Fixed ZooKeeper client error handling behavior;
* Fixed `Rorschach.Utils.deleteChildren()` behavior in case of `NO_NODE` exceptions;
* Exposed `Rorschach.Utils`.

## 0.4.0

* Added `Rorschach#getACL()` and implemented `GetACLBuilder` ([#11](https://github.com/slideme/rorschach/issues/11));
* Added `Rorschach#setACL()` and implemented `SetACLBuilder` ([#12](https://github.com/slideme/rorschach/issues/12));
* Modify Lock to be able to return immediately if first acquire attempt fails ([#14](https://github.com/slideme/rorschach/issues/14));
* Add missing `require('assert')` in operation builders ([#15](https://github.com/slideme/rorschach/issues/15)).

## 0.3.0

* Added `Rorschach#getData()` and implemented `GetDataBuilder`;
* Added references to [node-zookeeper-client](https://github.com/alexguan/node-zookeeper-client) `ACL`, `CreateMode`, `Event`, `Exception`, `Id`, `Permission`, `State` as `Rorschach` static fields;
* Added `error` event to provide better transparency of underlying ZooKeeper client activity;
* Added `Rorschach#getChildren()` and implemented `GetChildrenBuilder`;
* Added `Rorschach#exists()` and implemented `ExistsBuilder` ([#6](https://github.com/slideme/rorschach/issues/6));
* Added `Rorschach#setData()` and implemented `SetDataBuilder` ([#7](https://github.com/slideme/rorschach/issues/7));
* Fixed `Lock` bug when `#acquire()` callback gets called twice ([#5](https://github.com/slideme/rorschach/issues/5)).

## 0.2.0

* Implemented `RetryPolicy` to control Rorschach behavior in case of operational errors;
* Added `Rorschach#retryLoop()` to gain more control over performed operations.

## 0.1.0

* Added `Rorschach#create()` and implemented `CreateBuilder`;
* Modified `Rorschach#delete()` and implemented `DeleteBuilder`;
* Fixed `Lock#acquire()` issue which caused calling of callback twice and more times;
* Fixed `ReadLockDriver#getsTheLock()` index validation issue;
* Added more tests for full code coverage;
* Added example code to [README.md](README.md).

## 0.0.3

* Fixed `ReadWriteLock#writeMutex` lock driver issue <s>[#1](https://github.com/slideme/rorschach/pull/1)</s>.

## 0.0.2

* Added `#isOwner()` and `#destroy([callback])` to `Lock` class.
* Implemented `ReadWriteLock` class (similar to [`InterProcessReadWriteLock`](http://curator.apache.org/curator-recipes/shared-reentrant-read-write-lock.html)).

## 0.0.1

* Added `Rorschach` and `Lock` (clone of [`InterProcessMutex`](http://curator.apache.org/curator-recipes/shared-reentrant-lock.html) from Curator) classes to provide basic locking functionality.
