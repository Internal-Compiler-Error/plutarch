---
title: "Linux executables are not `ET_EXEC`"
date:  2024-11-04T21:52:00UTC
draft: false
---

# Linux executables are not `ET_EXEC`
Many think for an ELF to be an executable, its type must be `ET_EXEC`, this is false.

## TL;DR:
Almost all Linux executables are dynamically linked against `glibc` and compiled with
`-fPIE`, they have type `ET_DYN` despite being executable.

---

### One way implication
An ELF having type `ET_EXEC` implies it's an executable, but the converse is false.

By default, `gcc` on modern Linux links to `glibc` dynamically and enables `-fPIE`
(Position-Independent Executable) since [version 6.2](https://gcc.gnu.org/gcc-6/changes.html). The
result has `DT_DYN` while being an executable.

```c
// main.c
#include <stdio.h>

int main() {
    printf("Hello World\n");
}
```

```bash
gcc main.c -o main
readelf -h ./main
```

outputs:
```
ELF Header:
  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00
  Class:                             ELF64
  Data:                              2's complement, little endian
  Version:                           1 (current)
  OS/ABI:                            UNIX - System V
  ABI Version:                       0
  Type:                              DYN (Position-Independent Executable file)
  Machine:                           Advanced Micro Devices X86-64
  Version:                           0x1
  Entry point address:               0x1040
  Start of program headers:          64 (bytes into file)
  Start of section headers:          13520 (bytes into file)
  Flags:                             0x0
  Size of this header:               64 (bytes)
  Size of program headers:           56 (bytes)
  Number of program headers:         13
  Size of section headers:           64 (bytes)
  Number of section headers:         30
  Section header string table index: 29
```

## PIE implies DYN
To support [ASLR](https://en.wikipedia.org/wiki/Address_space_layout_randomization), you must
compile with `-fPIE` or `-fPIC`. After all, the entire purpose of ASLR is to place your instructions
at a random address, if the executable must be run at a particular offset, ASLR can't work by
definition.

### PIE doesn't imply static linking
If you want want to avoid taking on a versioned dependency on `glibc`, you can compile with
```bash
gcc -static-pic main.c -o main
```

The ELF type is still `ET_DYN`
```bash
readelf -h ./main
```
```
ELF Header:
  Magic:   7f 45 4c 46 02 01 01 03 00 00 00 00 00 00 00 00
  Class:                             ELF64
  Data:                              2's complement, little endian
  Version:                           1 (current)
  OS/ABI:                            UNIX - GNU
  ABI Version:                       0
  Type:                              DYN (Position-Independent Executable file)
  Machine:                           Advanced Micro Devices X86-64
  Version:                           0x1
  Entry point address:               0x77e0
  Start of program headers:          64 (bytes into file)
  Start of section headers:          806312 (bytes into file)
  Flags:                             0x0
  Size of this header:               64 (bytes)
  Size of program headers:           56 (bytes)
  Number of program headers:         12
  Size of section headers:           64 (bytes)
  Number of section headers:         34
  Section header string table index: 33
```
but it's statically linked

```bash
ldd ./main
```
```
        statically linked
```

## ET_EXEC is bad actually
To actually obtain an ELF with `DT_EXEC`, you have to compile without PIE.
```bash
gcc -static main.c -o main
```
```
readelf -h ./main
```

```
ELF Header:
  Magic:   7f 45 4c 46 02 01 01 03 00 00 00 00 00 00 00 00
  Class:                             ELF64
  Data:                              2's complement, little endian
  Version:                           1 (current)
  OS/ABI:                            UNIX - GNU
  ABI Version:                       0
  Type:                              EXEC (Executable file)
  Machine:                           Advanced Micro Devices X86-64
  Version:                           0x1
  Entry point address:               0x401720
  Start of program headers:          64 (bytes into file)
  Start of section headers:          769304 (bytes into file)
  Flags:                             0x0
  Size of this header:               64 (bytes)
  Size of program headers:           56 (bytes)
  Number of program headers:         10
  Size of section headers:           64 (bytes)
  Number of section headers:         28
  Section header string table index: 27
```
As mentioned earlier, you can't utilize ASLR when the code is not position independent.


## glibc static linking is not what you think it is
It's a well known fact that `glibc` doesn't like being statically linked, in particular, any
functions related to [NSS](https://en.wikipedia.org/wiki/Name_Service_Switch), which importantly
handles domain resolution/DNS, *cannot* be entirely statically linked.

**shameless plug: for more reasons why DNS on Linux is bad, see my other [blog](./modern-linux-dns-mess.md).**

Suppose a file `nss.c` calls to
[`getaddrinfo(3)`](https://www.man7.org/linux/man-pages/man3/getaddrinfo.3.html), compiling it with
`-static`, you will get the following warnings.

```
warning: Using 'getaddrinfo' in statically linked applications requires at runtime the shared libraries from the glibc version used for linking
```

While `readelf -h ./nss` might tell you it's an EXEC
```
ELF Header:
  Magic:   7f 45 4c 46 02 01 01 03 00 00 00 00 00 00 00 00
  Class:                             ELF64
  Data:                              2's complement, little endian
  Version:                           1 (current)
  OS/ABI:                            UNIX - GNU
  ABI Version:                       0
  Type:                              EXEC (Executable file)
  Machine:                           Advanced Micro Devices X86-64
  Version:                           0x1
  Entry point address:               0x401a80
  Start of program headers:          64 (bytes into file)
  Start of section headers:          1012760 (bytes into file)
  Flags:                             0x0
  Size of this header:               64 (bytes)
  Size of program headers:           56 (bytes)
  Number of program headers:         10
  Size of section headers:           64 (bytes)
  Number of section headers:         28
  Section header string table index: 27
```

and `file ./nss` and `ldd ./nss` might seen to imply it doesn't need any runtime component,
```
nss: ELF 64-bit LSB executable, x86-64, version 1 (GNU/Linux), statically linked, BuildID[sha1]=15a59367bfed4d9f1b6f4d0efdd71d51ef3bac76, for GNU/Linux 4.4.0, not stripped
```
```
        not a dynamic executable
```

running it with
```
strace -e trace=openat nss <whatever args>
```
reveals that if you don't have the component at runtime, it won't work

```
openat(AT_FDCWD, "/etc/nsswitch.conf", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/etc/host.conf", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/etc/resolv.conf", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/usr/lib/libnss_mymachines.so.2", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/usr/lib/libcap.so.2", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/usr/lib/libgcc_s.so.1", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/usr/lib/libc.so.6", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/usr/lib/ld-linux-x86-64.so.2", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/run/systemd/machines/google.ca", O_RDONLY|O_CLOEXEC) = -1 ENOENT (No such file or directory)
openat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/usr/lib/libnss_mdns_minimal.so.2", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/usr/lib/libnss_resolve.so.2", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/usr/lib/libm.so.6", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/etc/gai.conf", O_RDONLY|O_CLOEXEC) = 3
```

Hence, whether an ELF is `ET_EXEC` or `ET_DYN` tells you little about whether it's statically linked
or not, and it tells you little about it's an executable or not. It should not be relied one.

## Can an ELF be both a library and an executable?
Yes! Two major examples, `/usr/lib/libc.so.6` and `/usr/lib/ld-linux-x86-64.so.2` are mostly used as
dynamic libraries but can be executed directly.

```
liangw@RAM-dump ~/d/tmp> /usr/lib/libc.so.6
GNU C Library (GNU libc) stable release version 2.40.
Copyright (C) 2024 Free Software Foundation, Inc.
This is free software; see the source for copying conditions.
There is NO warranty; not even for MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE.
Compiled by GNU CC version 14.2.1 20240805.
libc ABIs: UNIQUE IFUNC ABSOLUTE
Minimum supported kernel: 4.4.0
For bug reporting instructions, please see:
<https://gitlab.archlinux.org/archlinux/packaging/packages/glibc/-/issues>.
liangw@RAM-dump ~/d/tmp> /usr/lib/ld-linux-x86-64.so.2
/usr/lib/ld-linux-x86-64.so.2: missing program name
Try '/usr/lib/ld-linux-x86-64.so.2 --help' for more information.
```

In a future blog, I'll show you how this is done. You can even have a `.so` that has a `main()`
function while still usable as a library.
<!--
vim: tw=100
-->
