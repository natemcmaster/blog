---
layout: post
title: "NuGet 3: The Runtime ID Graph"
date: 2016-05-19 8:00 AM
tags:
  - nuget
  - dotnet
---

If you have ever cracked open* a NuGet package such as .NET Core's
[System.IO.Compression](https://www.nuget.org/packages/System.IO.Compression/),
you have may have noticed that the package includes a folder named "runtimes".
What is the folder and how is it used?

*It's just a zip file. Unzip it.

**TL;DR**

Here is the RC2 rid graph:
<https://github.com/dotnet/corefx/blob/v1.0.0-rc2/pkg/Microsoft.NETCore.Platforms/runtime.json>

## Background

NuGet's official documentation only comments on runtimes briefly.
See <https://docs.nuget.org/consume/projectjson-format#runtimes>. The documentation
doesn't detail how runtimes work in NuGet 3 under the hood. In this post, I'll share
some of the internal workings of NuGet 3 and "runtimes".


## What are "runtimes"?

In NuGet, "runtimes" is essential synonymous with "operating systems". Don't confuse
this with how .NET uses the word (e.g. the .NET runtime != NuGet runtimes.)

The .NET Core docs page also include an explanation of this.
<https://docs.microsoft.com/en-us/dotnet/core/rid-catalog>

## What is a RID?
Runtime identifier, or the specific moniker for a specific runtime. It usually includes name, version, and bitness.

Example: "win10-x64" is the RID for "Windows 10, 64bit".

Example 2: "win10-x64-aot" is the RID used specially for Universal Windows Platform apps
that have been compiled with .NET Native. AOT = Ahead Of Time. All UWP apps are compiled
with the .NET Native compiler before being published to the Windows Store. This special
RID was included to accommodate special changes to .NET Core itself to make it compatible
with .NET Native apps.

## What goes in the "runtimes" folder?

The runtimes folder is for operating-system specific libraries. Sometimes it is not possible
to write code that works on all operating systems. For example,
System.IO.Compression includes a library design for *nix systems and another for Windows systems.

Managed libraries can be placed in folders that follow this pattern.

```
runtimes/{rid}/lib/{tfm}/*.dll
```

Native libraries (*.dll on Windows, *.so for Linux, *.dylib for OSX) can be included as well.

```
runtimes/{rid}/native/*.(dll | so | dylib )
```

*"tfm" refers to "target framework moniker". See <https://docs.nuget.org/create/targetframeworks> for a
list of available TFMs and to determine which you should use.

## What "runtimes" are available for NuGet 3?
There is no set list of "runtimes". This list is actually generated dynamically when you restore packages.
In most cases, this list of runtimes will come from a special package called
["Microsoft.NETCore.Platforms"](https://www.nuget.org/packages?q=microsoft.netcore.platforms).

This package contains a special file named "runtime.json" which lists dozens of "runtimes". Here are just a few:

 - "fedora.23-x64"
 - "win7-x86"
 - "linuxmint.17.3"
 - "ubuntu.15.04-x64"

## What is the RID graph?

The RID graph is a list of "runtimes" that are compatible with each other. For example, in theory
a library that is compatible with Windows 7 should also be compatible with newer version.

NuGet can import compatible libraries using something called the "RID graph" or "runtime fallback graph".
This is basically a list of all RIDs .NET Core supports, and which RIDs are compatible with each other.
The graph definition can be found in the <https://github.com/dotnet/corefx/> repo.
The RC2 graph is found in this file:

<https://github.com/dotnet/corefx/blob/v1.0.0-rc2/pkg/Microsoft.NETCore.Platforms/runtime.json>

Here is a snippet from that RID graph:

```json

{
    "runtimes": {
        "base": {
        },

        "any": {
            "#import": [ "base" ]
        },

        "win": {
            "#import": [ "any" ]
        },
        "win-x86": {
            "#import": [ "win" ]
        },
        "win-x64": {
            "#import": [ "win" ]
        },

        "win7": {
            "#import": [ "win" ]
        },
        "win7-x86": {
            "#import": [ "win7", "win-x86" ]
        },
        "win7-x64": {
            "#import": [ "win7", "win-x64" ]
        }
    }
}

```

## How is the RID graph used?

NuGet will use the graph to identify what "runtimes" and libraries are compatible. If there are runtimes
present in a package, but none with a package that match the exact runtime currently being used,
it will trace the graph back to the closest compatible system. For example, the list of RID fallbacks
for Windows 7 32 bit machines are as follows:

```
win7-x86
win7
win-x86
win
any
base
```

For example, if I use a library that has a library under `runtimes/win/lib/*.dll` and I restore packages for
Windows 7, 32 bit, NuGet can trace the RID graph and will fallback to the closest, most compatible RID,
 which in this case will be "win".

## What if my library breaks on newer operating systems?

For example, what if a library that works for Windows 7 doesn't work for Windows 10?

The NuGet solution for this is to also include a library under the Windows 10 RID. This will override
the Windows 7 library. NuGet only brings in the closest matching, compatible RID.

