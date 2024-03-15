---
title: "Scripting Language Import is Strictly More Powerful than Compiled Languages Imports"
date:  2024-04-07T19:38:28-04:00
draft: false
---
# Scripting Language Import is Strictly More Powerful than Compiled Languages Imports

It's often said that one of the major differences between scripting languages and compiled languages is that in
scripting languages, you don't have an explicit notion of `main` functions, you can just start writing code directly in
a file like this.

```js
console.log("Hello World!");
```

However, this fact is often forgotten in the context of imports.

When you import a script from another script such as
```js
import "./my-very-special-script.js"
```
All the code inside of your `my-very-special-script.js` will be run. This has several consequences.

Suppose you're writing a library that needs to sets up some global context in order for your functions to work, you can
put all the logic inside of one of your scripts, so people can just import the script and everything will just work:tm:.
This is how PyTorch handles the initialization. Sadly this is also why some IDEs can get confused about the import,
because the full effect isn't known until runtime.
```python
import torch
# all the context is set up from now
```

In compiled languages, this is pretty much impossible. If you need to access the runtime environment to set up some
context, then you can't store the context inside of an already initialized global variable because the value needs to be
known at compile time. The best you can reach for is having a static variable that will get initialized upon the first
call of the function. But that requires explicit checking inside of each function and I don't like it.

Commonly, it's your job to set up the context. Such as the `color-eyre` crate for Rust.
```rust
fn main() -> color-eyre::Result<()> {
    // explicitly set up the context
    color-eyre::install()?
}
```

Or in OpenSSL
```c
#include <openssl/opensslv.h>

int main(void) {
    OPENSSL_init_ssl(0, NULL);
}
```

The fundamental reason behind this is that in compiled languages, import is just instructing the compiler that the
symbols exported from the library is being used and should be linked, whereas import in scripting languages is running
an entire file. Since the script can be non-deterministic, the behaviour isn't known until you run it.

It's a blessing and a curse. However, this allows you to do some pretty neat patterns. Suppose I wanna load some configs
and the values are dependent on runtime, with scripting languages I can just import a script and let the script return a
value as the config. This is commonly seen in neovim configs with lua.

```lua
local val = require 'config'

-- in config.lua
if runtime_value() == something then
    return 1
else
    return 42
end
```

To change the config, you can just modify the file. To do this in compiled languages, you have to recompile.
