# Rorschach
---

  [![NPM Version][npm-image]][npm-url]
  [![License][license-image]][npm-url]
  [![Build][travis-image]][travis-url]
  [![Test Coverage][coveralls-image]][coveralls-url]

Rorschach is a Node.js module for high-level interaction with ZooKeeper.

Rorschach is meant to provide functionality similar to [Apache Curator](http://curator.apache.org/). It was started as implementation of [distributed locking](http://zookeeper.apache.org/doc/r3.4.6/recipes.html#sc_recipes_Locks) recipe and most of algorithms are taken from Curator sources.

Hope, in some time more APIs will be added.

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
function doTheWork() {
  client.create().withMode(CreateMode.EPHEMERAL).withACL(ACL.READ_ACL_UNSAFE).forPath('/a', /*afterCreate(err, path)*/);
  client.create().withProtection().creatingParentsIfNeeded().forPath('/my/cool/znode/foo/bar', /*afterCreate(err, path)*/);
  client.delete().deleteChildrenIfNeeded().guaranteed().forPath('/my/cool/znode', /*afterDelete(err)*/);

  client.getData().usingWatcher(function watcher(event) {
    if (event.getType() === Event.NODE_DELETED) {
      // handle deleted
    }
    else if (event.getType() === Event.NODE_DATA_CHANGED) {
      // handle data change
    }
    else {
      console.warn('Wow, really?');
    }
  }).forPath('/some/path', /*afterGetData(err, data, stat)*/);

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
```

## API

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

#### `GetDataBuilder` getData()

Instantiate get data builder.

__Returns__

* `GetDataBuilder` Builder instance

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

If path create operation will receive `NO_NODE` error then builder will make
an attempt to create parent nodes.

__Returns__

* `CreateBuilder`

---

#### void forPath(path, [data], callback)

Execute create op.

__Arguments__

* path `String` Path to znode
* data `Buffer` ZNode data to set Default: `null`
* callback `function` Callback function: <code>(err, path)</code>

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

### GetDataBuilder

Get data request builder.

#### void forPath(path, callback)

Execute getData().

__Arguments__

* path `String` Node path
* callback `function` Callback function: <code>(err, data, stat)</code>

---

#### `GetDataBuilder` usingWatcher(watcher)

Add watcher to operation request.

__Arguments__

* watcher `function` Watch function: <code>(event)</code>

__Returns__

* `GetDataBuilder`

---

### Lock (Rorschach.Lock)

Distributed re-entrant lock.

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

#### static const `String` LOCK_NAME

Default lock node name.

---

#### Lock(client, basePath, [lockName], [lockDriver])

Distributed lock implementation

__Arguments__

* client `Rorschach` Rorschach instance
* basePath `String` Base lock path
* lockName `String` Ephemeral node name
* lockDriver `LockDriver` Lock utilities Default: `new LockDriver()`

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

#### `Lock` writeMutex

Write mutex.

---

#### `Lock` readMutex

Read mutex.

---

#### static const `String` READ_LOCK_NAME

Read lock node name.

---

#### static const `string` WRITE_LOCK_NAME

Write lock node name.

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

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## Roadmap

* Finalize implementation of distributed locks:
    * clone of [`InterProcessSemaphoreV2`](http://curator.apache.org/curator-recipes/shared-semaphore.html);
    * clone of [`InterProcessSemaphoreMutex`](http://curator.apache.org/curator-recipes/shared-lock.html);
    * clone of [`InterProcessMultiLock`](http://curator.apache.org/curator-recipes/multi-shared-lock.html);
* Implement [Leader Election](zookeeper.apache.org/doc/r3.4.6/recipes.html#sc_leaderElection) recipe.
* Extend core class `Rorschach`.

## License

See [LICENSE.md](LICENSE.md).

[npm-image]: https://img.shields.io/npm/v/rorschach.svg
[npm-url]: https://npmjs.org/package/rorschach
[license-image]: https://img.shields.io/npm/l/rorschach.svg
[travis-image]: https://img.shields.io/travis/slideme/rorschach.svg
[travis-url]: https://travis-ci.org/slideme/rorschach
[coveralls-image]: https://img.shields.io/coveralls/slideme/rorschach/master.svg
[coveralls-url]: https://coveralls.io/r/slideme/rorschach?branch=master