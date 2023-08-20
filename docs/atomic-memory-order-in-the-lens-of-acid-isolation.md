# I am a title!

# WARNING
Atomic memory ordering is easy to get wrong. I am not an expert in this field, this should not be used as a reference.
If you actually want to write lock-free data structures, please actually understand what each of them do.

## Forward
Atomic memory ordering is not very intuitive and from my own experience, some people get exposed to them when they are
in their early years of programming where everything low level seemed cool before they have any experience in 
distributed systems. So they have very little parallel to draw experience from.

However, if you have experience in some SQL, in particular, the isolation levels, and distributed systems, atomic memory
ordering has many parallels. You can easily understand them by using your knowledge about isolation levels!

## A in ACID
If you have read or listened to the definition of ACID, many of them will be quick to tell you the atomicity of ACID is
not the same as the atomicity of atomic in concurrent programming and concurrency control is **I**solation in ACID. They
come from *very* good intentions but technically speaking, the atomicity in ACID is the same as the atomicity in
concurrent programming.

Atomicity in ACID is about transactions either committing or aborting, they cannot exist in some limbo state where some
operations are committed while others don't. It's all or nothing. Or as Martin Kleppmann puts it, atomicity is better
thought as abortability.

Not this says nothing about if the changes can be _seen_ by other transactions. That falls under isolation.

## Atomicity in concurrent programming
We actually don't have a well eastern definition of atomicity in concurrent programming. Hence, people are very cautious
about saying A in ACID is the same as the A in concurrent programming. But I shall provide the informal definition that
most people think of when they say "atomic integers".

> An atomic operation is an operation that appears to be instantaneous from the perspective of all other threads. No
> other thread can read the "intermediate" state of the atomic operation.

Note this says nothing about if the change can be _seen_ by other threads. For that, you need to look at atomic memory
ordering. Viola, we have a parallel to isolation levels! The A in ACID and atomicity in concurrency is the same 
atomicity if that's your mental model/definition.

## Isolations Levels
Isolations are a mess in SQL, a lot of popular databases don't implement them correctly (yes including MySQL, Oracle,
MS SQL and more). Therefore, I will define each levels here, in general, assume they behave in what Postgres does, 
except for "Read Uncommitted" which is the same as "Read Committed" in Postgres.

Note that different isolation levels only guarantees you protection from certain anomalies, it does not mean they cannot
provide stronger guarantees. For example, an implementation "Read Committed" that provides "Repeatable Read" guarantees
is still a valid implementation of "Read Committed".

### Read Uncommitted
In Read Uncommitted, transactions can see the changes made by other transactions before they are committed. In other 
words there is no isolation. Hence, why almost no SQL databases actually strictly implement like this---it's useless.

In short, dirty reads are allowed.

### Read Committed
In Read Committed, transactions can only see the changes made by other transactions after they are committed. It does
not guarantee that all writes from the writing transaction are visible to other transactions. Reading only partial or
inconsistent data is allowed. If you read the same row twice, you may get different results (non-repeatable read).

In short, no dirty reads are allowed. Technically it also prevents overwriting uncommitted data (dirty write) but that's
not a very useful guarantee.

### Repeatable Read
In Repeatable Read, in addition to Read Committed, transactions are guaranteed to see the same data if they read the
same row twice. Reads are repeatable.

Technically, Postgres implements _Snapshot Isolation_ with Multi Version Concurrency Control (MVCC), which still 
conforms to the requirements, but it doesn't block the writing transaction as much as Repeatable Read implemented in 
MySQL (which is technically Monotonic Atomic View).

### Serializable
All transactions appear to be executed in a serial order. This is the strongest isolation level. Note it doesn't say 
about which serial order. The DB can choose any serial order it wants, as long as it's serializable.

## Atomic Memory Ordering
If you read the literature about atomic memory ordering, you will read about how they are about how the CPU is allowed
to reorder instructions. Memory ordering technically enforces "happens-before" relationship between instructions. 
However, from the side of the programmer, what you actually care about is can your reads be seen by other threads and
are your reads recent enough to perform actions.

We shall use the memory orderings defined in the C++ memory model (except for consume), which is also used by languages 
like Rust and Swift.

### Relaxed
Relaxed memory ordering is the weakest memory ordering. It does not guarantee any ordering between threads, but it does
guarantee writes and reads to the *same* variable within one *thread* is the same order as they appear in source code.
You can think of it as SQL execution is not allowed to reorder statements within a transaction.

Due to the different execution order of threads, the value of a variable can change between reads. Just like Read 
Uncommitted, although the concept of "rollback" does not exist in concurrent programming, once you write, it can be 
observed by other threads.

And just like Read Uncommitted, it's the most performant of all memory orderings. As it allows the greatest amount of
reordering.

### Acquire/Release
Acquire/Release memory ordering is the second weakest memory ordering. Acquire only exists on reads and Release only
exists on writes.

A Release ordering on a write to a variable guarantees that all operation to that variable before the write is visible
to another thread doing a read with Acquire ordering on the same variable.

An Acquire ordering on a read to a variable guarantees that all operation to that variable before the Release write will
be visible to the thread doing the read.

Since you must use both Acquire and Release to observe the changes from another thread. They are talked about together.

You can think of Release as a "commit" and Acquire as a "start transaction", where the transaction is running in
"Read Committed", hence if you keep reading the same variable, you may get different results if other threads are 
modifying the variable.

### Sequentially Consistent
Sequentially Consistent memory ordering is the strongest memory ordering. It includes all the guarantees of acquire
ordering (for loads) and release ordering (for stores), and also guarantees a globally consistent order of operations
(https://marabos.nl/atomics/memory-ordering.html).

This is basically "Serializable" in SQL. Each *individual* operation is run in a serial order (they will observe the 
latest reads and writes will be visible to other threads). Moreover, a sequence of operations on the same variable will
effectively form a little block of "transaction" that is run in Serializable level of isolation.

## Locking (Mutex on *both* reads and writes)
Locking is not a memory ordering, but you might wonder if there is an isolation level that corresponds to locking. 

The answer is no because locking has an even stronger guarantee than Serializable. If you always lock both for reads and
writes, you actually form a linearizable level of ordering guarantee, which is stronger than Serializable.

Just like linearizable in distributed systems, locking on all reads and writes is expensive as you effectively
destroyed all parallelism. At which point, you should really ask yourself, why are you even using threads in the first
place?

## Pattern Matching Brain on Stuff that Shouldn't be Pattern Matched
Memory orderings need to exist because it's much faster to just read from cache rather than going to main memory. The
main memory is still the source of truth (just like Single Leader Replication where main memory is the leader). Due to
cache coherency guarantees, reads to cache need to be updated when stale, meaning if you want to observe the write, you
need to wait for the changes to travel all the way from the memory to cache. But if you don't care, then the reading
instruction can be executed first, giving you the false view that nothing has changed (if you think everything is always
running in parallel), just like Asynchronous vs Synchronous Replication.

