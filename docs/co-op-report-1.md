---
title: "Co-op report 1"
draft: false
---

# Co-op Report 1
*This page exists for satisfying the requirement for the University of Guelph's co-op program requirements for the 2023
summer term*

## TL;DR
I really enjoyed my time at Distributive, the most enjoyable aspect of computer science is solving problems, and at
Distributive, there were no shortage of interesting problems.

I solved a few of them, learned many things in the process.

## Context
I worked at Distributive, a small start up in Kingston, ON that aims to bring cheap, secure and private compute to
everybody by utilizing the most versatile compute platform in existence---web browsers.

Users may decide to run a native application, called a (native) worker, later on if they are satisfied with the product
and wish to have a more dedicated way to contribute compute.

One of our aim is to provide great support for JavaScript. To start using our project in JavaScript is trivial while
providing great performance improvements. WASM is supported and will be more ergonomic to use in the future.

We have a grand vision for the future, and we're slowly marching towards it.

## What did I do?
In short, I implemented a transparent WebGPU usage tracking subsystem, allowing the business case of using browsers for
GPGPU, such as AI inferencing. In addition, I aided with general bug fixing, CI improvements, and others.

### WebGPU Tracking
Implementing the system was some of the most enjoyable moments in my life. The problem involved concurrency, causality
analysis and language lawyering.

To protect business interests, I will not provide the exact details.

When my supervisor approached me describing the problem, I became immediately hooked. The problem looked so enticing,
combining many interests of me. If all worthy problems fight back, this problem was worth every penny.

To approach the problem, I was instructed to read the WebGPU spec in full. That decision was a valuable one as it
provided my the knowledge to confidently proclaim if something would or would not work.

The advice of if you wish to truly understand something, you should eventually read the spec in full can be said to the
one of the most valuable things I learned.

Initially, it seemed trivial, yet every simple and elegant solution was also wrong. It was under an artificial deadline
that I had an eureka moment and come up with a solution after working out the details. The final work proved that my
initial idea were indeed functional, it just needed to make some amendments. Without seeing the journey and various
setbacks, solution looked simple, which I think is a high praise.

### Bugs, CIs and Databases
Another major milestone I achieved is that discovered a few concurrency issues related to databases in components and
tests.

Reading up documentations about the database, thinking over a few lines of code regarding its semantics might sound dull
to some, but I could not ask for anything better for my brain obsessed with concurrency. Stay Hungry, Stay Foolish

I had the great fortune of interacting with an operations guy and an old school unix guy (who knew each other). From
them, I gained many insights and knowledge about CS in general. Including but not limited to:

1. bridge networks
2. non-trivial shell scripting
3. TLS and PKI
4. Name servers
5. mDNS

A cynic would say these are not immediately related to the core responsibility of a software developer, and they would
be right. Yet this is a shortsighted way of looking at things. A believe a software developer should not treat the
machine in front of them as magic. Knowing the process behind operations and services provides you with perspectives and
insights in CS in general.

I dislike mono-cultures, unless something is mathematically proven to be optimal, we should remain open about different
ways to doing things. Knowing what is your machine doing and what it can do provides you with insights.

### Kubernetes
A person at Distributive hosted Kubernetes workshop on most Fridays. Those workshops gave me many food for thoughts
about cloud, hardware, programmatic intents and CS in general.

Combined with my then current interest of consensus algorithms, I developed an interest about one component used in k8s
deployments---`etcd`.

`etcd` can be thought as a small replicated database for storing information that you need consent, such as service
configs, hence the name, following the tradition of where unix programs store their configs.

In truth, etcd can also be used for other purposes, such as distributed locks and a general consensus mechanism, in this
respect, it's not very different than its predecessor, Apache ZooKeeper.

Due to my forever fascination of doing things with more than one machines, I ended up looking into the algorithms used
for consensus, and read papers about ZooKeeper Atomic Broadcast (ZAB), Raft, and the famous Paxos.

While those knowledge did not provide immediate benefit, it brought on confidence in my ability to independently
research. If one wishes to escape the infamous meme of new framework/library every x weeks, one must gain higher level
knowledge about the goals and intent of each libraries. If one does not enjoy learning, one will become obsolete in the
CS profession quickly.

Hence, "Stay hungry, stay foolish".

## Dynamic Language or Not
Having the requirement of needing to run in the browser, you cannot escape JavaScript. In the past, I always deemed
JavaScript as a necessary evil since it was the only thing that browsers accepted. Hence I never gave much thought into
using JS for "serious" development.

The entire Distributive codebase is in JS, from front end to back end. After 4 months of working with "serious" JS, I
must confess that I still feel comfortable in it.

There is a certain warmth in a compiler shouting at me, telling me what mistakes I've made. The usefulness of their
shouting is dependent on the language design. For some languages such as Java, compile time errors often don't have you
much insight into design. Whereas in other languages such as Rust (my favorite language by far), compile time errors
often reveal deep issues in the design and I have to think deeply about how to resolve the root issue.

In JS, I felt like I was constantly treading on eggshells since weak type system allowed a great deal of flexibility,
static analysis could not provide much information. Every single character you type seems to "work", only to blow up at
run time. Often, I felt what I wrote did its job just to find out moments later that it missed edge cases.

### Just TDD You Say
One can say you need to write tests and use tests to guide your development, maybe even TDD. But I was never fully
onboard with TDD. While tests are absolutely necessary, they do not provide the same type of guarantee as a good
strongly typed system.

Tests only reveal what you decide to test, which is often limited to what you can think of and experience. Whereas a
type system is continuous checking process where systematic checking is performed. It's equivalent to formally proving a
theorem versus using a lot of test cases. A proof can be thought of checking every single possible case, while test by
case cannot guarantee the validity in all cases.

## Conclusion
Learning is pleasurable, cherish these moments.
