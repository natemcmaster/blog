---
layout: post
title: Hacking ASP.NET 5 and Mono
subtitle: Tricks to help you develop ASP.NET 5 applications on OS X and Linux
---

## Use the MONO_OPTIONS variable to pass runtime flags to mono

This is useful if you need to alter the way DNX bootstraps mono. Here are some useful examples.

### Find out which version of Mono DNX is using

Execute `MONO_OPTIONS=--version dnx`

### Debug and get a more detailed stack trace
Execute `MONO_OPTIONS=--debug dnx . run`

## Change the mono runtime

If you have multiple versions of mono installed, it may be useful to change which version mono is using. 
DNX will first look within the runtime folder for an executable mono. If not, it will use the system default.
You can override the system default mono by adding a symbolic link into the runtime folder.

For example, I have a custom build of mono in my home directory, but also have a system installation of Mono (so I can use Xamarin Studio).

To override, follow these steps.

1. Naviate to the folder containing DNX. ``dirname `which dnx` ``
2. Add a symbolic link. For example, `ln -s /Users/nmcmaster/dev/mono-src/bin/mono ./`

Now DNX will use `/Users/nmcmaster/dev/mono-src/bin/mono` instead of `/usr/bin/mono`
