---
title: "READ COMMITTED won't save you from MySQL Gap Locks"
description: InnoDB likes to lock and there's nothing you can do about that.
outline: 'deep'
---

# READ COMMITTED won't save you from MySQL Gap Locks

### Preface

Although this blog was written with MySQL 8 in mind, I will blindly declare here that this should
broadly apply to almost all MySQL versions as this seems to be a core design decision InnoDB has
made.

I wish to thank [Franck Pachot](https://twitter.com/FranckPachot) from
[Yugabyte](https://www.yugabyte.com/) and [Emeric
HUNTER](https://twitter.com/EmericHUNT3R) from [db insider](https://db-insider.com), my
[low effort tweet](https://x.com/IntrnlCmplrErr/status/1799236750981599661)
somehow attracted the attention of them. In particular, Franck pointed me
towards more resources and led to some revisions of this blog post.

## What is A Gap Lock
Whenever you wish to select some set of rows in MySQL using a predicate involving inequality or
range in the where clause, gap locks (and all their pain) comes into play.

The MySQL community tends to use terminology unique to them rather than more general ones, in
Postgres and other databases, this is referred to as predicate locks[^1].

Consider the following query, where `id` is a primary key:
```sql
SELECT * FROM sales WHERE id <= 2000
```
Since we are using an inequality here, there could be more than one row that matches this criteria.
If we were to filter via `WHERE id = 2000`, then we will have at most one row.

Now what should happen if this were to be executed in a transaction?
```sql
start transaction;
SELECT * FROM sales WHERE id <= 2000;

-- we are here, haven't decide to commit or rollback yet
```
In MySQL 8, the default isolation level is `REPEATABLE READ`. Under MySQL's implementation, any other
concurrent transactions are prohibited from inserting any record from 0 to 2000. The act of locking
down an entire range to prevent insertions is a gap lock.

While the transaction holding up gap lock is still alive, other transactions that try to insert
into the range will be blocked on trying to acquire the lock before they can perform the insertion.

This won't cause a deadlock by itself, but when a transaction is being blocked by another one,
deadlocks are much more likely to happen.

### MySQL's Idea of `REPEATABLE READ`
The ANSI `REPEATABLE READ` can be losely undersood as it doesn't allow for ~~phantom rows~~ a read
within the same transaction at different times to return different results in addition to all the
anomalies that `READ COMMITTED` should prevent[^5]. One way to implement `REPEATABLE READ` without much
locking and blocking is to utilize MVCC version ids like Postgres. Although Postgres technically
implements Snapshot Isolation, somewhat different than the ANSI `REPEATABLE READ`[^4].

MySQL also claims its `REPEATABLE READ` is based around snapshots, so one would expect it to behave
similarly to Postgres. Rather, it seems when involving non-unique indices, InnoDB performs much more
locking than Postgres. MySQL historically has been heavily optimized for OLTP queries, and it seems
it can't do anything slightly more OLAP in nature.

__Edit (Jun. 12, 2024):__ This subsection has more subtleties than I am comfortable of stating here. I
naively expected that MySQL's claims of snapshot based `REPEATABLE READ` would have similar
behaviour to Postgres as they both claim to be MVCC based. This was the reason that prompted me to
write the [low effort tweet](https://x.com/IntrnlCmplrErr/status/1799236750981599661). Section
"Snapshot Isolation and Repeatable Read" and "Two-Phase Locking (2PL)" under chapter 7 of Martin
Klepmann's _Designing Data Intensive Applications_ provides much more nuances. Still, it baffles me
that InnoDB's behaviour looks more 2PL than MVCC.

## Gap Locks under `READ COMMITTED`
What if we are unsatisfied with the blocking performance of InnoDB, and we are
willing to accept non-repeatable reads in exchange for more concurrency?
Afterall, this is what the official
[documentation](https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html),
say about gap locks and `REPEATABLE READ`

> Gap locking can be disabled explicitly. This occurs if you change the transaction isolation level
> to `READ COMMITTED`.

But immediately after this sentence, it hides a footgun.

> <p>
> In this case, gap locking is disabled for searches and index scans and is used only for
> foreign-key constraint checking and duplicate-key checking.
> </p>
> <br>
> <p>
> There are also other effects of using the <code>READ COMMITTED</code>
> isolation level. Record locks for nonmatching rows are released after MySQL
> has evaluated the <code>WHERE</code> condition. For <code>UPDATE</code>
> statements, InnoDB does a “semi-consistent” read, such that it returns the
> latest committed version to MySQL so that MySQL can determine whether the row
> matches the WHERE condition of the <code>UPDATE</code>.
> </p>

If your intention to use `READ COMMITTED` is to avoid gap locks to increase concurrency, it won't
help you if your filtering is not guaranteed to be unique.

For an example, consider the following
```sql
create table t (
    id int not null primary key,
    x int not null,
    y int not null
);

-- notice that this index is not unique
create index t_x on t(x);

insert into t
    (id, x, y)
values
    (1, 44, 200),
    (2, 44, 300);
```

In one connection:
```sql
set session transaction isolation level read committed; -- 1
start transaction; -- 2
delete from t where id = 1; -- 5
-- have not decided to commit or rollback yet
```

While in another:
```sql
set session transaction isolation level read committed; -- 3
start transaction; -- 4
select * from t where x = 44 and y >= 400 for update; -- 6;
-- also have not deicide to commit or rollback yet
```
Where the number in the comments refer to the steps you should run them in if you want to check this
out yourself.

Step 6 will be stuck on trying to acquire the lock that step 5 held. If the deleting transaction
doesn't rollback or commit in a short time, the selecting one will warn you it's taking a long
time to acquire the locks.

This is due to the delete transaction holding up an exclusive lock on the `t_x` index, meanwhile,
the select transaction is waiting to acquire the locks on the index so it can go check if the rest
of the where clause can be matched, _even if it will just immediately release the lock once
checked_. Since the index isn't unique, InnoDB takes a lock on every rows and indices scanned.

If we commit both transactions the above combination can, and have been observed to, deadlock
despite that there are no conflicts.

## Is MySQL in the wrong here?
It's surprisingly hard to say whether MySQL should be "blamed" here. This is because 

- database vendors tend to implement [different isolation
levels](https://github.com/ept/hermitage) than what they claim
- the ANSI SQL isolation standards has been [long
critized](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/tr-95-51.pdf) for
being unclear/unhelpful, more formalized definitions
[exists](https://www.pmg.csail.mit.edu/papers/icde00.pdf) yet the wording in the ANSI spec has not
changed according to
[Jepsen](https://jepsen.io/analyses/mysql-8.0.34#ansi-sql-isolation-is-bad-actually)
- Explicit locking is not in the official ANSI SQL specification, so it's unclear how should they
interact with the isolation levels

The last point deserves some discussion. If you interpret a `FOR UPDATE` locking as _under the
current isolation level, the returned rows should be locked for exclusive use_[^2], then any amount
of blocking feels undeserved. In practice, however, the description above is more similar to `FOR
UPDATE SKIP LOCKED`, a somewhat dangerous pattern since you may lock fewer rows than you expect.

It's unclear what locking a row with stale data should mean. Postgres 16
[states](https://www.postgresql.org/docs/16/explicit-locking.html#LOCKING-ROWS) that "Within a
`REPEATABLE READ` or `SERIALIZABLE` transaction, however, an error will be thrown if a row to be
locked has changed since the transaction started". This conveniently omits `READ COMMITTED`, the
default isolation level in Postgres.

Pachot has written an
[article](https://dev.to/franckpachot/isolation-levels-part-ix-read-committed-3lll) about `READ
COMMITED` and points out [an example](https://dev.to/franckpachot/comment/2bp8n) in Postgres where
he believes an inconsistent read is present with `FOR UPDATE`. Whether you think this is fine or not
largely depends on how you think `FOR UPDATE` should work.

In MySQL, `SEARIALIZABLE` transactions are just `REPEATABLE READ` transactions with all selects
adorned with `FOR UPDATE`. Hence `FOR UPDATE` in MySQL can be seen as a mechanism to upgrade
isolation for a section of a transaction. If you think that's what the role of `FOR UPDATE` is, then
blocking is perhaps understandable. Although it's entirely possible for the example above to not
block as the modification does not affect the select, further more, no rows should match.

Postgres, however, does not utilize `FOR UPDATE` this way. Since Postgres uses Serializable Snapshot
Isolation (SSI) for `SERIALIZABLE` that monitors for unsafe configurations, it
[claims](https://www.postgresql.org/docs/current/transaction-iso.html#XACT-SERIALIZABLE) that "This
monitoring does not introduce any blocking beyond that present in repeatable read" and advises
against using explicit locks in favour of `SERIALIZABLE` transactions in general.

Pachot
[believes](https://dev.to/yugabyte/isolation-levels-part-xiii-explicit-locking-with-select-for-update-intention-4na3)[^3]
explicit locking is necessary for modern development. I think the much larger issue is nobody can
agree on what `FOR UPDATE` is supposed to accomplish, good practices in one database can become
irrelevant or even harmful in another.

Unless the database world can come together to settle on what should it do, we are forever stuck in
unportable behaviour limbo.

[^1]:   Postgres predicate locks in general do not block other transactions, it's mostly for
        detecting searialization errors. Postgres in general exhibit less blocking compared to MySQL
        with InnoDB, a future post will also demonstrate this.
[^2]:   Which is how I like to think it should be
[^3]:   And perhaps by association Yugabyte
[^4]:   See Jepsen, https://jepsen.io/analyses/mysql-8.0.34#repeatable-read
[^5]:   An early version of this post __mistakenly__ stated that repeatable reads prevents phantoms.
        I was confusing repeatable read with snapshot isolation.
