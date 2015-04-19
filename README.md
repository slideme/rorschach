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

Return Delete builder.

__Returns__

* `Object` Delete builder instance

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

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## Roadmap

* Finalize implementation of distributed locks:
    * clone of [`InterProcessReadWriteLock`](http://curator.apache.org/curator-recipes/shared-reentrant-read-write-lock.html);
    * clone of [`InterProcessSemaphoreV2`](http://curator.apache.org/curator-recipes/shared-semaphore.html);
    * clone of [`InterProcessSemaphoreMutex`](http://curator.apache.org/curator-recipes/shared-lock.html);
    * clone of [`InterProcessMultiLock`](http://curator.apache.org/curator-recipes/multi-shared-lock.html);
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