---
title: "Co-op report 3"
draft: false
---

# Co-op Report 3
*This page exists for satisfying the requirement for the University of Guelph's co-op program requirements for the 2024
Summer term*

## TL;DR
I returned to Distributive, saw the familiar people I worked with in 2023 summer again.

## What did I do?
In short, I designed and implemented a scaling strategy for our backends, provided major insights into a customer
incident, in addition to the normal development and bug fixing.

### Distributing distributive Corp.
The major project during the 2024 summer was designing and implementing a strategy to scale up the backends of
Distributive Corp. By the excellent design of the existing backend, scaling it up was simple---put all the stress into
the database and distributive the rest.

Hence, after some verification, both running in staging and via looking at code, I determined that almost all states
live in the database so the rest can be scaled easily by just spawning new instances. Therefore, the majority of the
work was building up the infrastructure of service discovery, middleware config changing, and writing up documentation.

Due to the unique design of our backend, despite the scaling strategy is far from esoteric, we did not use any existing
frameworks/packages to scale, rather, most of the infrastructure is written from scratch. Reasoning from first
principles and watching it work was immensely enjoyable.

### JS language laywering
Distributive has an unique project called [PythonMonkey](https://github.com/Distributive-Network/PythonMonkey) that
allows for JS calling Python and Python calling JS with minimal FFI overhead. Calling a language from another exposes
many subtle aspect of the language where it's usually overlooked, such as the inner workings of JS proxy objects.

While I cannot go into details of the ticket, it involved fixing the interaction of a JS object implemented as JS
proxies being called from various environments, including web, node, and PythonMonkey. The object did not behave as
expected when calling from PythonMonkey, which I was eventually able to track down via reading extensive documentation
on MDN on proxies, the ECMAScript specification, and the HTML specification.

### Cartesian joins considered harmful
While testing for one feature, I realized the backend was getting unreasonably slow when the amount of data in the
database increased. After piercing through layers of abstraction, it was realized that our ORM generated some bad SQL in
the form

```sql
select
    t0.b
from
    t t0, t t1
where
    t0.a = 'something' or t1.a = 'something else'
```
While benign on the surface, this is actually doing a sequential scan twice despite having an index on `a`! When doing
`from x a, y b`, you're actually doing a Cartesian join! In most cases, this is ok because it's immediately filtered
down using the where clause but in this case, you can't determine which arm of the `or` matches should selected as `t0`
until it's fully evaluated, hence causing the atrocious performance.

I reported the bug and worked with the ORM author to resolve this somewhat pathological case.

### WebGPU on Dawn
[Dawn](https://dawn.googlesource.com/dawn) is the chromium's implementation of WebGPU, which we use for a component. A
customer incident was encountered when the feature failed to work correctly. I was involved in the investigation into
why, and provided the insight on why the NAPI interopt didn't have the attributed we relied on.

### SQL debugging
I discovered MySQL's implementation of MVCC is very flawed in the context of `READ COMMITTED` and locking, I put my
finding into post [here](./mysql-read-commited-gap-lock.md).

## Conclusion
I said during my final standup, "there are not many places in this world where you can be a language lawyer on SQL, JS,
and WebIDL at the same time" and Distributive is a very special place. It's very likely I will come back when I
graduate.
