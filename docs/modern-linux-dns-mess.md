---
title: "DNS on Modern Linux is a Mess"
date:  2024-06-01T20:52:00UTC
draft: true
---

# DNS on Modern Linux is a Mess

There are at least three ways to perform a DNS query, and they all suck in their unique ways.

## `getaddrinfo(3)`
The `getaddrinfo(3)` family of library calls are the POSIX compliant way to perform a DNS query. Note that while they
are provided by the system libc (typically glibc), they are _not_ system calls. Meaning they don't have a system call
number and thus cannot be performed via assembly inlining, you have to link against the libc.

The issue of `getaddrinfo(3)` is that it is blocking. This is surprising to some as most languages choose to expose DNS
queries as asynchronous operations since it may have to send network requests to a nameserver. Typically, a pool of
threads is maintained by the language runtime or library to perform these blocking calls, maintaining these resources is
non zero.

Although, `getaddrinfo(3)` take into effect of your system configs, including but not limited to
- `/etc/hosts`
- `/etc/nsswitch.conf`
- `/etc/resolv.conf`

This is a double edge sword, as an user this gives me freedom, as a software developer it means I lose control over how
the resolution is exactly done. And I don't even wanna get into the can of worms of DNSSEC, DNS-over-TLS,
DNS-over-HTTPS, etc.

## Hand Rolling DNS Queries
If `getaddrinfo(3)` gives power to the users, this way gives maximum power to the software developers. If you don't
trust the users config, just hand roll the queries yourself! Of course, most people don't actually form the packets and
sent to a nameserver themselves but use another userspace library.

The downside of this is often they ignore system configs entirely (which sometimes is the point of hand rolling), so as
an user you can't easily override resolution for some names. Whether the operation is exposed as blocking or
non-blocking is technically orthogonal as you can choose, but at least it's possible to do this without blocking.

## dbus interface
If you are on a modern Linux system and systemd-resolved is configured, you can use the `org.freedesktop.resolve1`
interface provided by it. It can perform DNSSEC, mDNS, LLMNR, etc (subject to user config). It is also non-blocking.

The downside is that this a dubs interface, which comes with all the complexity of D-Bus. If you're not knees deep into
the Linux ecosystem, you probably don't even know what dbus is. In addition, systemd-resolved is not configured for all
distros due to some people hating all things systemd related (despite this has very little to do with systemd as a
service manager and in theory can be used without `systemctl`).

An example of how it can be done is here can be found on
[freedesktop](https://wiki.freedesktop.org/www/Software/systemd/writing-resolver-clients/).

## Why are we in this mess?
There are two views to DNS resolution. If you are not a system admin, you most likely view networking as you connecting
to the rest of the world so you probably can't stand the idea that two machines resolving the same name to two different
addresses. In this view, allowing users to mess with the records is a bad idea and you probably want the latest and
greatest.

If you're a system admin, then you mostly think of name resolution as a property local to a LAN, it merely happens that
many LANs form ASes, and ASes form the thing people call internet. As you control the machines and the (local) network,
you feel you should have certain control over how resolution is done. Thus, you probably dislike DNS-over-TLS,
DNS-over-HTTPS, mDNS, etc that give end users more control over how resolution is done.

## Why do DNS at all?
Of course, for many cloud native architectures, service discovery is often not done via DNS but rather a coordinated
database/service such as zookeeper or etcd to prevent inconsistent configurations. I believe they also solve the issue
of DNS standards and implementation fossilization by simply not doing DNS at all.

## Final Words
I think the nameserver abstraction has been abused too much. When I go on `https://google.com` I don't think of
accessing the machine of `google.com` using the `https` protocol, despite that was what the original design was. I think
of as I'm accessing the `https` hosted on the name `google.com`, I don't care if it's a single machine, multiple
machines, or not a single real persistent machine and it's served by ephemeral FaaS, S3 buckets, etc.

When I see Pual Vixie (who contributed significantly to DNS according to wikipedia) write about [What DNS Is
Not](https://cacm.acm.org/practice/what-dns-is-not/), I feel they are hopelessly out of touch. Once an invention is
public, it's no longer yours. What people do with it, you have no way of controlling.
