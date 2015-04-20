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

TODO

## API

### Rorschach

#### void Rorschach(connectionString, [zkOptions])

Create instance.

__Arguments__

* connectionString `String` ZooKeeper connection string.
* zkOptions `Object` ZooKeeper client options.

---

#### `Object` delete()

Return Delete Builder which provides convenient way to delete ZooKeeper nodes.

__Returns__

* `Object` Delete Builder instance

---

#### void close([callback])

Close connection to ZooKeeper.

__Arguments__

* callback `function` Callback function

---

### Lock

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

#### void Lock(client, basePath, [lockName], [lockDriver])

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

### ReadWriteLock

[Readers-writer lock](http://en.wikipedia.org/wiki/Readers–writer_lock) implementation.

#### void ReadWriteLock(client, basePath)

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
