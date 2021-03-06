# Rorschach
---

  [![NPM Version](https://img.shields.io/npm/v/rorschach.svg)](https://npmjs.org/package/rorschach)
  [![License](https://img.shields.io/npm/l/rorschach.svg)](https://npmjs.org/package/rorschach)
  [![Build](https://img.shields.io/travis/slideme/rorschach.svg)](https://travis-ci.org/slideme/rorschach)
  [![Test Coverage](https://img.shields.io/coveralls/slideme/rorschach/master.svg)](https://coveralls.io/r/slideme/rorschach?branch=master)
  [![bitHound Overall Score](https://www.bithound.io/github/slideme/rorschach/badges/score.svg)](https://www.bithound.io/github/slideme/rorschach)

Rorschach is a Node.js module for high-level interaction with ZooKeeper. Currently it provides all the basic ZooKeeper operations. Refer to the [`Rorschach`](#rorschach-1) API doc below. And in a mean time more recipes will be added.

Rorschach is meant to provide functionality similar to [Apache Curator](http://curator.apache.org/). It was started as implementation of [distributed locking](http://zookeeper.apache.org/doc/r3.4.6/recipes.html#sc_recipes_Locks) recipe and most of algorithms are taken from Curator sources.

While _Curator is a ZooKeeper Keeper, Rorschach is a ZooKeeper Watchman_.

## Installation

    npm install rorschach --save

## Example

```javascript
'use strict';

var Rorschach = require('rorschach');
var zookeeper = require('node-zookeeper-client');

var ACL = Rorschach.ACL;
var CreateMode = Rorschach.CreateMode;
var Event = Rorschach.Event;

var Lock = Rorschach.Lock;
var ReadWriteLock = Rorschach.ReadWriteLock;

var client = new Rorschach('127.0.0.1:2181');

client.on('connected', doTheWork);
client.on('error', onerror);

function doTheWork() {
  client
    .create()
    .withMode(CreateMode.EPHEMERAL)
    .withACL(ACL.READ_ACL_UNSAFE)
    .forPath('/a', /*afterCreate(err, path)*/);

  client
   .create()
   .withProtection()
   .creatingParentsIfNeeded()
   .forPath('/my/cool/znode/foo/bar', /*afterCreate(err, path)*/);

  client
   .delete()
   .deleteChildrenIfNeeded()
   .guaranteed()
   .forPath('/my/cool/znode', /*afterDelete(err)*/);

  client
   .getData()
   .usingWatcher(function watcher(event) {
     if (event.getType() === Event.NODE_DELETED) {
       // handle deleted
      }
      else if (event.getType() === Event.NODE_DATA_CHANGED) {
        // handle data change
      }
      else {
        console.warn('Wow, really?');
      }
    })
    .forPath('/some/path', /*afterGetData(err, data, stat)*/);

  var lock = new Lock(client, '/my/znodes/locks/myResource');
  lock.acquire(500, function afterAcquire(err) {
    // handle error

    // do the work with `myResource`

    lock.release(/*callback(err)*/);
  });

  var rwLock = new ReadWriteLock(client, '/my/znodes/locks/anotherResource');
  rwLock.writeLock().acquire(1000, function afterWriteAcquire(err) {
    // handle error

    // update `anotherResource`

    rwLock.writeLock().release(/*callback(err)*/);
  });
}

function onerror(err) {
  console.warn('[Error: %d]: %s', err.getCode(), err.stack);
}

```

## API

* [Rorschach](#rorschach-1)
    * [Rorschach(connectionString, [options])](#rorschachconnectionstring-options)
    * [Event: 'connected'](#event-connected)
    * [Event: 'connectionStateChanged'](#event-connectionstatechanged)
    * [Event: 'error'](#event-error)
    * [#close([callback])](#void-closecallback)
    * [#create()](#createbuilder-create)
    * [#delete()](#deletebuilder-delete)
    * [#exists()](#existsbuilder-exists)
    * [#getACL()](#getaclbuilder-getacl)
    * [#getChildren()](#getchildrenbuilder-getchildren)
    * [#getData()](#getdatabuilder-getdata)
    * [#setACL()](#setaclbuilder-setacl)
    * [#setData()](#setdatabuilder-setdata)
* [ConnectionState](#connectionstate-rorschachconnectionstate)
    * [.CONNECTED](#static-connectionstate-connected)
    * [.READ_ONLY](#static-connectionstate-read_only)
    * [.RECONNECTED](#static-connectionstate-reconnected)
    * [.SUSPENDED](#static-connectionstate-suspended)
    * [.LOST](#static-connectionstate-lost)
    * [#isConnected()](#void-isconnected)
* [Utils](#utils-rorschachutils)
    * [.deleteChildren(zk, path, [deleteSelf], callback)](#static-void-deletechildrenzk-path-deleteself-callback)
    * [.join(args...)](#static-string-joinargs)
    * [.mkdirs(zk, path, makeLastNode, acl, callback)](#static-void-mkdirszk-path-makelastnode-acl-callback)
* [RetryPolicy](#retrypolicy-rorschachretrypolicy)
    * [RetryPolicy([options])](#retrypolicyoptions)
    * [.DEFAULT_MAX_ATTEMPTS](#static-const-number-default_max_attempts)
    * [.DEFAULT_RETRYABLE_ERRORS](#static-const-arraynumber-default_retryable_errors)
    * [#isRetryable(err)](#boolean-isretryableerr)
* [CreateBuilder](#createbuilder)
    * [#creatingParentsIfNeeded()](#createbuilder-creatingparentsifneeded)
    * [#forPath(path, [data], callback)](#void-forpathpath-data-callback)
    * [#withACL(acls)](#createbuilder-withaclacls)
    * [#withMode(mode)](#createbuilder-withmodemode)
    * [#withProtection()](#createbuilder-withprotection)
* [DeleteBuilder](#deletebuilder)
    * [#deleteChildrenIfNeeded()](#deletebuilder-deletechildrenifneeded)
    * [#forPath(path, callback)](#void-forpathpath-callback)
    * [#guaranteed()](#deletebuilder-guaranteed)
    * [#withVersion(version)](#deletebuilder-withversionversion)
* [ExistsBuilder](#existsbuilder)
    * [#forPath(path, callback)](#void-forpathpath-callback-1)
    * [#usingWatcher(watcher)](#existsbuilder-usingwatcherwatcher)
* [GetACLBuilder](#getaclbuilder)
    * [#forPath(path, callback)](#void-forpathpath-callback-2)
* [GetChildrenBuilder](#getchildrenbuilder)
    * [#forPath(path, callback)](#void-forpathpath-callback-3)
    * [#usingWatcher(watcher)](#getchildrenbuilder-usingwatcherwatcher)
* [GetDataBuilder](#getdatabuilder)
    * [#forPath(path, callback)](#void-forpathpath-callback-4)
    * [#usingWatcher(watcher)](#getdatabuilder-usingwatcherwatcher)
* [SetACLBuilder](#setaclbuilder)
    * [#forPath(path, acls, callback)](#void-forpathpath-acls-callback)
    * [#withVersion(version)](#setaclbuilder-withversionversion)
* [SetDataBuilder](#setdatabuilder)
    * [#forPath(path, data, callback)](#void-forpathpath-data-callback-1)
    * [#withVersion(version)](#setdatabuilder-withversionversion)
* [LeaderElection](#leaderelection-rorschachleaderelection)
    * [LeaderElection(client, path, id)](#leaderelectionclient-path-id)
    * [Event: 'error'](#event-error-1)
    * [Event: 'isLeader'](#event-isleader)
    * [Event: 'notLeader'](#event-notleader)
    * [#client](#rorschach-client)
    * [#path](#string-path)
    * [#id](#string-id)
    * [#hasLeadership()](#boolean-hasleadership)
    * [#start(callback)](#void-startcallback)
    * [#stop(callback)](#void-stopcallback)
* [Lock](#lock-rorschachlock)
    * [Lock(client, basePath, [lockName], [lockDriver])](#lockclient-basepath-lockname-lockdriver)
    * [.LOCK_NAME](#static-const-string-lock_name)
    * [#client](#rorschach-client-1)
    * [#basePath](#string-basepath)
    * [#lockName](#string-lockname)
    * [#driver](#lockdriver-driver)
    * [#lockPath](#string-lockpath)
    * [#maxLeases](#number-maxleases)
    * [#acquires](#number-acquires)
    * [#acquire([timeout], callback)](#void-acquiretimeout-callback)
    * [#destroy([callback])](#void-destroycallback)
    * [#isOwner()](#boolean-isowner)
    * [#release([callback])](#void-releasecallback)
    * [#setMaxLeases(maxLeases)](#lock-setmaxleasesmaxleases)
* [ReadWriteLock](#readwritelock-rorschachreadwritelock)
    * [ReadWriteLock(client, basePath)](#readwritelockclient-basepath)
    * [.READ_LOCK_NAME](#static-const-string-read_lock_name)
    * [.WRITE_LOCK_NAME](#static-const-string-write_lock_name)
    * [#writeMutex](#lock-writemutex)
    * [#readMutex](#lock-readmutex)
    * [#readLock()](#lock-readlock)
    * [#writeLock()](#lock-writelock)
* [ExecutionError](#executionerror-rorschacherrorsexecutionerror)
    * [#original](#error-original)
    * [#operation](#string-operation)
    * [#operationArgs](#array-operationargs)
    * [#getCode()](#number-getcode)

### Rorschach

Main class and, better to add, namespace.

For convenience, following [node-zookeeper-client](https://github.com/alexguan/node-zookeeper-client) classes & constants were referenced by `Rorschach`:

* `ACL`
* `CreateMode`
* `Event`
* `Exception`
* `Id`
* `Permission`
* `State`

So you can use them like following:

```javascript
function watcher(event) {
  if (event.getType() === Rorschach.Event.NODE_DELETED) {
     console.log('At last...');
  }
}
```

#### Rorschach(connectionString, [options])

Create instance.

__Arguments__

* connectionString `String` ZooKeeper connection string
* options `Object` Options:
    * retryPolicy `Object|RetryPolicy` RetryPolicy instance or options
    * zookeeper `Object` ZooKeeper client options

---

#### Event: `connected`

```javascript
function onConnected() { }
```

Emitted when connection to ZooKeeper server is established.

---

#### Event: `connectionStateChanged`

```javascript
function onStateChanged(state) {
  if (state === Rorschach.ConnectionState.CONNECTED || state === Rorschach.ConnectionState.RECONNECTED) {
    console.info('Let\'s rock!');
  }
  /* else if ... */
}
```

Emitted whenever ZooKeeper client connection state changes. The only argument is state which is one of `ConnectionState`s.

---

#### Event: `error`

```javascript
function onerror(err) {
  /* whatTheFussIsGoingOn(err); */
}
```

Currently, this event is emitted only when some operation fails in retry loop. It is emitted only if `error` event listener is added to `Rorschach` instance - to save user from `Unhandled 'error' event`.

---

#### void close([callback])

Close connection to ZooKeeper.

__Arguments__

* callback `function` Callback function

---

#### `CreateBuilder` create()

Instantiate create operation builder.

__Returns__

* `CreateBuilder` Builder instance

---

#### `DeleteBuilder` delete()

Instantiate delete operation builder.

__Returns__

* `DeleteBuilder` Builder instance

---

#### `ExistsBuilder` exists()

Instantiate exists operation builder.

__Returns__

* `ExistsBuilder` Builder instance

---

#### `GetACLBuilder` getACL()

Instantiate get ACL builder.

__Returns__

* `GetACLBuilder` Builder instance

---

#### `GetChildrenBuilder` getChildren()

Instantiate get children builder.

__Returns__

* `GetChildrenBuilder` Builder instance

---

#### `GetDataBuilder` getData()

Instantiate get data builder.

__Returns__

* `GetDataBuilder` Builder instance

---

#### `SetACLBuilder` setACL()

Instantiate set ACL builder.

__Returns__

* `SetACLBuilder` Builder instance

---

#### `SetDataBuilder` setData()

Instantiate set data builder.

__Returns__

* `SetDataBuilder` Builder instance

---

### ConnectionState (Rorschach.ConnectionState)

Represents high-level connection state.

#### static `ConnectionState` CONNECTED

Connected state. Emitted only once for each Rorschach instance.

---

#### static `ConnectionState` READ_ONLY

Connected in read-only mode.

---

#### static `ConnectionState` RECONNECTED

Connection was re-established.

---

#### static `ConnectionState` SUSPENDED

Connection was lost, but we're waiting to re-connect.

---

#### static `ConnectionState` LOST

Connection was lost. Bye-bye, white pony.

---

#### void isConnected()

Return "connected" state.

---

### Utils (Rorschach.Utils)

Utility functions.

#### static void deleteChildren(zk, path, [deleteSelf], callback)

Delete children for given path and maybe given znode.

__Arguments__

* zk `Client` ZooKeeper client
* path `String` Node path
* deleteSelf `Boolean` Delete node itself Default: `false`
* callback `function` Callback function: <code>(err)</code>

---

#### static `String` join(args...)

Join paths.

__Arguments__

* args `String` Paths

__Returns__

* `String`

---

#### static void mkdirs(zk, path, makeLastNode, acl, callback)

Create path and parent nodes if needed.

__Arguments__

* zk `Client` ZooKeeper client
* path `String`
* makeLastNode `Boolean`
* acl `Array.<ACL>`
* callback `function` Callback function: <code>(err)</code>

---

### RetryPolicy (Rorschach.RetryPolicy)

Retry policy controls behavior of Rorschach in case of operational errors.

#### RetryPolicy([options])

Instantiate policy.

__Arguments__

* options `Object` Options:
    * maxAttempts `Number` Max number of attempts
    * codes `Array.<String>|function` Error codes or error validation function

---

#### static const `Number` DEFAULT_MAX_ATTEMPTS

Default number of operation attempts.

---

#### static const `Array.<Number>` DEFAULT_RETRYABLE_ERRORS

Default codes of errors allowing re-try in case of no. of attempts < maxRetries.

---

#### `Boolean` isRetryable(err)

Check if error is retryable.

__Arguments__

* err `Error|Exception` ZooKeeper client error

__Returns__

* `Boolean`

---

### CreateBuilder

Create request builder.

#### `CreateBuilder` creatingParentsIfNeeded()

If path create operation will receive `NO_NODE` error then builder will make an attempt to create parent nodes.

__Returns__

* `CreateBuilder`

---

#### void forPath(path, [data], callback)

Execute create op.

__Arguments__

* path `String` Path to znode
* data `Buffer` ZNode data to set Default: `null`
* callback `function` Callback function: <code>(executionError, path)</code>

---

#### `CreateBuilder` withACL(acls)

Set ACLs.

__Arguments__

* acls `Array.<ACL>`

__Returns__

* `CreateBuilder`

---

#### `CreateBuilder` withMode(mode)

Set create mode.

__Arguments__

* mode `Number` CreateMode

__Returns__

* `CreateBuilder`

---

#### `CreateBuilder` withProtection()

See [this](https://curator.apache.org/apidocs/org/apache/curator/framework/api/CreateBuilder.html#withProtection--) page for explanation.

__Returns__

* `CreateBuilder`

---

### DeleteBuilder

Delete request builder.

#### `DeleteBuilder` deleteChildrenIfNeeded()

If delete operation receives `NOT_EMPTY` error then make an attempt to delete child nodes.

__Returns__

* `DeleteBuilder`

---

#### void forPath(path, callback)

Execute delete.

__Arguments__

* path `String` Node path
* callback `function` Callback function: <code>(err)</code>

---

#### `DeleteBuilder` guaranteed()

Mark delete op. as guaranteed.

__Returns__

* `DeleteBuilder`

---

#### `DeleteBuilder` withVersion(version)

Set node version to delete.

__Arguments__

* version `Number`

__Returns__

* `DeleteBuilder`

---

### ExistsBuilder

Exists request builder.

#### void forPath(path, callback)

Execute exists().

__Arguments__

* path `String` Node path
* callback `function` Callback function: <code>(executionError, exists, stat)</code>

---

#### `ExistsBuilder` usingWatcher(watcher)

Add watcher to operation request.

__Arguments__

* watcher `function` Watch function: <code>(event)</code>

__Returns__

* `ExistsBuilder`

---

### GetACLBuilder

Get ACL request builder.

#### void forPath(path, callback)

Execute getACL().

__Arguments__

* path `String` Node path
* callback `function` Callback function: <code>(executionError, acls, stat)</code>

---

### GetChildrenBuilder

Get children request builder.

#### void forPath(path, callback)

Execute getChildren().

__Arguments__

* path `String` Node path
* callback `function` Callback function: <code>(executionError, data, stat)</code>

---

#### `GetChildrenBuilder` usingWatcher(watcher)

Add watcher to operation request.

__Arguments__

* watcher `function` Watch function: <code>(event)</code>

__Returns__

* `GetChildrenBuilder`

---

### GetDataBuilder

Get data request builder.

#### void forPath(path, callback)

Execute getData().

__Arguments__

* path `String` Node path
* callback `function` Callback function: <code>(executionError, data, stat)</code>

---

#### `GetDataBuilder` usingWatcher(watcher)

Add watcher to operation request.

__Arguments__

* watcher `function` Watch function: <code>(event)</code>

__Returns__

* `GetDataBuilder`

---

### SetACLBuilder

Set ACL request builder.

#### void forPath(path, acls, callback)

Execute setACL().

__Arguments__

* path `String` Node path
* acls `Array.<ACL>` ACLs
* callback `function` Callback function: <code>(executionError, stat)</code>

---

#### `SetACLBuilder` withVersion(version)

Set node ACL version (number of changes of ACL).

It's not the same as node version (number of data changes).

__Arguments__

* version `Number`

__Returns__

* `SetACLBuilder`

---

### SetDataBuilder

Set data request builder.

#### void forPath(path, data, callback)

Execute setData().

__Arguments__

* path `String` Node path
* data `Buffer` Data to set
* callback `function` Callback function: <code>(executionError, stat)</code>

---

#### `SetDataBuilder` withVersion(version)

Set node version.

__Arguments__

* version `Number`

__Returns__

* `SetDataBuilder`

---

### LeaderElection (Rorschach.LeaderElection)

Leader election recipe implementation.

#### LeaderElection(client, path, id)

Leader election participant.

__Arguments__

* client `Rorschach` Rorschach instance
* path `String` Election path
* id `String` Participant id

---

#### Event: `error`

```javascript
function onerror(err) {
  // do smth. with error
}
```

Emitted when some background operation fails. You must always set listener for this event.

---

#### Event: `isLeader`

```javascript
function leaderListener() {
  // start tasks for which leader is responsible
}
```

Emitted when leadership is obtained.

---

#### Event: `notLeader`

```javascript
function notLeaderListener() {
  // stop tasks for which leader is responsible
}
```

Emitted when leadership is lost.

---

#### `Rorschach` client

Ref. to client.

---

#### `String` path

ZooKeeper path where participants' nodes exist.

---

#### `String` id

Id of participant. It's kept in node.

---

#### `Boolean` hasLeadership()

Check if our node is leader.

__Returns__

* `Boolean`

---

#### void start(callback)

Start taking part in election process.

__Arguments__

* callback `function` Callback function: <code>(err)</code>

---

#### void stop(callback)

Leave the game for youngz.

__Arguments__

* callback `function` Callback function: <code>(err)</code>

---

### Lock (Rorschach.Lock)

Distributed re-entrant lock.

#### Lock(client, basePath, [lockName], [lockDriver])

Distributed lock implementation

__Arguments__

* client `Rorschach` Rorschach instance
* basePath `String` Base lock path
* lockName `String` Ephemeral node name
* lockDriver `LockDriver` Lock utilities Default: `new LockDriver()`

---

#### static const `String` LOCK_NAME

Default lock node name.

---

#### `Rorschach` client

Keep ref to client as all the low-level operations are done through it.

---

#### `String` basePath

Base path should be valid ZooKeeper path.

---

#### `String` lockName

Node name.

---

#### `LockDriver` driver

Lock driver.

---

#### `String` lockPath

Sequence node name (set when acquired).

---

#### `Number` maxLeases

Number of max leases.

---

#### `Number` acquires

Number of acquires.

---

#### void acquire([timeout], callback)

Acquire a lock.

__Arguments__

* timeout `Number` Time to wait for (milliseconds).
* callback `function` Callback function: <code>(err)</code>

---

#### void destroy([callback])

Destroy lock i.e. remove node and set `acquires` counter to zero.

__Arguments__

* callback `function` Optional callback function

---

#### `Boolean` isOwner()

Check lock is owned by process.

__Returns__

* `Boolean`

#### void release([callback])

Release the lock.

__Arguments__

* callback `function` Callback function: `(err)`

---

#### `Lock` setMaxLeases(maxLeases)

Set max leases.

__Arguments__

* maxLeases `Number` Max # of participants holding the lock at one time

__Returns__

* `Lock` Instance is returned for chaining

---

### ReadWriteLock (Rorschach.ReadWriteLock)

[Readers-writer lock](http://en.wikipedia.org/wiki/Readers–writer_lock) implementation.

#### ReadWriteLock(client, basePath)

Initialize read and write mutexes.

__Arguments__

* client `Rorschach` Rorschach instance
* basePath `String` Base lock path

---

#### static const `String` READ_LOCK_NAME

Read lock node name.

---

#### static const `string` WRITE_LOCK_NAME

Write lock node name.

---

#### `Lock` writeMutex

Write mutex.

---

#### `Lock` readMutex

Read mutex.

---

#### `Lock` readLock()

Return read mutex.

__Returns__

* `Lock` Read lock

---

#### `Lock` writeLock()

Return write mutex.

__Returns__

* `Lock` Write lock

---

### ExecutionError (Rorschach.Errors.ExecutionError)

Error which serves a wrapper to actual ZooKeeper client error. It is returned
by operation builders in case of failure.

#### `Error` original

Original error instance.

#### `String` operation

Operation type: `create`, `remove`, etc.

#### `Array` operationArgs

Arguments passed to original ZK client method.

#### `Number` getCode()

Defined only if original error is instance of `Exception`. Returns error code of
original error.

---

## Changelog

See [CHANGELOG.md](https://github.com/slideme/rorschach/blob/master/CHANGELOG.md).

## Roadmap

* Implement service discovery
* Finalize implementation of distributed locks:
    * clone of [`InterProcessSemaphoreV2`](http://curator.apache.org/curator-recipes/shared-semaphore.html);
    * clone of [`InterProcessSemaphoreMutex`](http://curator.apache.org/curator-recipes/shared-lock.html);
    * clone of [`InterProcessMultiLock`](http://curator.apache.org/curator-recipes/multi-shared-lock.html);

## License

See [LICENSE.md](https://github.com/slideme/rorschach/blob/master/LICENSE.md).
