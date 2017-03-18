---
layout: post
title: Introducing DNVM
subtitle: The .NET Core Version Manager
---

DNVM is a command-line utility for installing and managing .NET Core SDKs, runtimes, and tools.
This project aims to make it easy to install .NET Core, switch between versions, and maintain
a consistent developer environment in your projects.

To get started with dnvm, install via the command line:

```
    brew install dnvm
```

## Common commands

The best way to poke around is execute `dnvm` on the command line. This will show available sub-commands 
and command line flags.

## The `.dnvm` file

DNVM supports adding a per-project configuration file. When DNVM commands execute, they search in the current
directory and upwards for the nearest `.dnvm` file.

```yml
env: default
sdk: 1.0.0-preview4-004233
fx:
    - 1.0.3
    - 1.1.0
```

<!--## Questions

### You work for .NET Core, so is this an official Microsoft project?

No, this is a side project. I created this all on my personal laptop on personal time.

### How does this compare to the 'dnvm' used to install DNX?

This is different. .NET Core veterans may remember that beta versions of .NET Core used the 'DNX' command-line
utility, and that this also included a command-line tool called '[dnvm](https://github.com/aspnet/dnvm)'.
Although this project shares the name and some features, it is a complete reboot of the 
original, now-obsoleted 'dnvm'.-->