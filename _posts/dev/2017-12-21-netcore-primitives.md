---
layout: post
title: "Deep-dive into .NET Core primitives: deps.json, runtimeconfig.json, and dll's"
subtitle: Examining the foundations of a .NET Core application
author: Nate
date: Dec. 21, 2017
hero:
  asset_path: /assets/images/blog/netcore_primitives.png
  width: 1788
  height: 1214
tags:
  - dotnet
---

I learned to program with gcc, C++, and vim. When I started working with C# and .NET, clicking the
"Start" button in Visual Studio was magical, but also dissatisfying.
Dissatisfying -- not because I want to write a Makefile -- but because I didn't know what "Start" did.
So, I started to dig. In this post, I'll show the most primitive tools used in .NET Core, and manually create
a .NET Core app **without the help of Visual Studio**.
If you're new to .NET Core and want to peek under the hood, this is a good post for you.
If you're already a .NET Core developer and wonder what *.deps.json or *.runtimeconfig.json files are all about,
I'll cover those, too.

I'm going to abandon the magic of Visual Studio and stick to command-line tools. To play with this yourself,
you'll need the [.NET Core 2.1 SDK](https://www.microsoft.com/net/download/). These steps were written for macOS,
but they work on Linux and Windows, too, if you adjust file paths to `C:\Program Files\dotnet\` and `dotnet.exe`.

This post is part of a series:
* Part 1 - .deps.json, runtimeconfig.json, and dll's
* [Part 2 - the shared framework][part-2]
* [Part 3 - runtimeconfig.json in depth][part-3]

[part-1]: {{ site.baseurl }}{% post_url /dev/2017-12-21-netcore-primitives %}
[part-2]: {{ site.baseurl }}{% post_url /dev/2018-08-29-netcore-primitives-2 %}
[part-3]: {{ site.baseurl }}{% post_url /dev/2019-01-12-netcore-primitives-3 %}

## The C# Compiler

The C# compiler turns \*.cs files into a \*.dll file, aka an assembly file. An assembly file is a portable
executable format which .NET Core can run on Windows, macOS, and Linux.
A ".NET Core app" is really just a collection of the \*.dll files (and a few config files.)
It can be produced using multiple programming languages like VB or F#, but C# is most commonly used.

The C# compiler can be invoked directly to produce an assembly file. The C# compiler can be found in the .NET
Core SDK and can be invoked directly like this:

```
> dotnet /usr/local/share/dotnet/sdk/2.1.3/Roslyn/bincore/csc.dll -help
```

Let's give it input. First, write this C# code into a file named "Program.cs".

```c#
/* Program.cs */
class Program
{
    static void Main(string[] args)
        => System.Console.WriteLine("Hello World!");
}
```

On the command-line, execute this command.

```sh
> dotnet \
  /usr/local/share/dotnet/sdk/2.1.3/Roslyn/bincore/csc.dll \
  -reference:/usr/local/share/dotnet/sdk/NuGetFallbackFolder/microsoft.netcore.app/2.0.0/ref/netcoreapp2.0/System.Runtime.dll \
  -reference:/usr/local/share/dotnet/sdk/NuGetFallbackFolder/microsoft.netcore.app/2.0.0/ref/netcoreapp2.0/System.Console.dll \
  -out:Program.dll \
  Program.cs
```

Explaining the arguments:

 - `dotnet` - the C# compiler is itself a .NET Core application, so we must launch it by using `dotnet`.
 - `/usr/local/share/dotnet/sdk/2.1.3/Roslyn/bincore/csc.dll` - the path to the C# compiler. This is found in `C:\Program Files\dotnet\` on Windows.
 - `-reference` args pointing to `System.Runtime.dll` and `System.Console.dll` - these are like "header" files. They provide the compiler with information about "System.Object" and "System.Console".
 - `-out:Program.dll` - the output file name. The `.dll` extension is a .NET Core convention, not a requirement. If not specified, the compiler will produce a file named `Program.exe`. On Windows, this would be a little misleading becase you can't double-click `Program.exe`, so in .NET Core we always use `.dll`.
 - `Program.cs` - the path to your C# file

References allow your code to use types defined by others. .NET Core defines thousands of types that you
can use, like `List<T>`, `Integer`, and `HttpClient`, but you have to tell the compiler
where to find these. If you were to drop the `-reference` arguments, the compiler would fail with:

```
Program.cs(1,11): error CS0518: Predefined type 'System.Object' is not defined or imported
Program.cs(3,26): error CS0518: Predefined type 'System.String' is not defined or imported
Program.cs(3,16): error CS0518: Predefined type 'System.Void' is not defined or imported
```

The path in the sample is `/usr/local/share/dotnet/sdk/NuGetFallbackFolder/microsoft.netcore.app`. This happens
to come from the [Microsoft.NETCore.App](https://nuget.org/packages/Microsoft.NETCore.App) NuGet package, but we'll get to that later.

## runtimeconfig.json

The runtimeconfig.json file is required for .NET Core applications. The terms "runtime", "shared framework", or
"platform" are often used interchangeably, but they typically mean the same thing when talking about .NET Core.
This JSON file configures options for the runtime.

If you have the assembly file from the last step, you could attempt to run it on command-line by calling
`dotnet`. Without a runtimeconfig.json file, this will fail with.

```
> dotnet Program.dll
A fatal error was encountered. The library 'libhostpolicy.dylib' required to execute the application was not found in '/Users/nmcmaster/code/'.
```

In English, this means that .NET Core could not find some of the required pieces of .NET Core used to execute
the `Program.dll` file. To resolve this, create a file named `Program.runtimeconfig.json` with these contents:

```json
{
  "runtimeOptions": {
    "framework": {
      "name": "Microsoft.NETCore.App",
      "version": "2.0.0"
    }
  }
}
```

These options instruct dotnet to use the Microsoft.NETCore.App 2.0.0 shared framework. This framework is the most
common one used, but others exist, such as Microsoft.AspNetCore.App.
Unlike .NET Framework, which is machine-wide, there may be multiple .NET Core shared frameworks installed on a machine.
`dotnet` will read the JSON file and look in `/usr/local/share/dotnet/shared/$FrameworkName/$Version/` for
the required files to run the application.

> Aside: if a higher patch version of Microsoft.NETCore.App is installed, such as `shared/Microsoft.NETCore.App/2.0.4/`,
dotnet will automatically pick the higher version.

Now, execute `dotnet Program.dll`.

```
> dotnet Program.dll
Hello world!
```

## Packages

Packages provide a way to share code between projects, teams, and organizations. .NET assemblies are bundled
into \*.nupkg files, which are just ZIP archive files with an XML file (.nuspec) that contains metadata about the package.

The most popular package for .NET is called JSON.NET, aka Newtonsoft.Json. It provides API for JSON parsing/serialization.
We can acquire this package from NuGet.org and extract it to disk.

```sh
# Bash
mkdir -p ./packages/Newtonsoft.Json/10.0.3/
curl -L https://www.nuget.org/api/v2/package/Newtonsoft.Json/10.0.3 | tar -xf - -C ./packages/Newtonsoft.Json/10.0.3/
```

```powershell
# Windows (powershell)
mkdir ./packages/Newtonsoft.Json/10.0.3/
Invoke-WebRequest https://www.nuget.org/api/v2/package/Newtonsoft.Json/10.0.3 -OutFile Newtonsoft.Json.10.0.3.zip
Expand-Archive Newtonsoft.Json.10.0.3.zip -D ./packages/Newtonsoft.Json/10.0.3/
```

To demo its use, we'll update the sample from the previous step to print our message as a JSON object.

```c#
class Program
{
    static void Main(string[] args)
      => System.Console.WriteLine(
          Newtonsoft.Json.JsonConvert.SerializeObject(new { greeting = "Hello World!" }));
}
```

Add more references to the compiler arguments to gain access to Newtonsoft.Json APIs.

```sh
> dotnet /usr/local/share/dotnet/sdk/2.1.3/Roslyn/bincore/csc.dll \
    -reference:/usr/local/share/dotnet/sdk/NuGetFallbackFolder/microsoft.netcore.app/2.0.0/ref/netcoreapp2.0/System.Runtime.dll \
    -reference:/usr/local/share/dotnet/sdk/NuGetFallbackFolder/microsoft.netcore.app/2.0.0/ref/netcoreapp2.0/System.Console.dll \
    -reference:/usr/local/share/dotnet/sdk/NuGetFallbackFolder/microsoft.netcore.app/2.0.0/ref/netcoreapp2.0/System.Collections.dll \
    -reference:./packages/Newtonsoft.Json/10.0.3/lib/netstandard1.3/Newtonsoft.Json.dll \
    -out:Program.dll \
    Program.cs
```

> Aside: it should be obvious why we needed `-reference:Newtonsoft.Json.dll`, but why did we need `System.Collections.dll`? This is required because because we used an anonymous type, `new { greeting }`.
Under the hood, the C# compiler generated a `.Equals` method on this anonymous type that invokes
`System.Collections.Generic.EqualityComparer<T>`, which is defined in `System.Collections.dll`.

The compiler should succeed, though with a few warnings.
```
Program.cs(4,35): warning CS1701: Assuming assembly reference 'System.Runtime, Version=4.0.20.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a' used by 'Newtonsoft.Json' matches identity 'System.Runtime, Version=4.2.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a' of 'System.Runtime', you may need to supply runtime policy
```

This means that when the author of `Newtonsoft.Json` created `Newtonsoft.Json.dll`, he compiled
it against `System.Runtime.dll` that was `Version=4.0.20.0`. But the `System.Runtime.dll` file we provided is newer, `Version=4.2.0.0`. The compiler is warning because there could be issues when you run the application if there
were big changes between `4.0.20.0` and `4.2.0.0`. Fortunately, these changes are all backwards compatible, so
Newtonsoft.Json will work just fine. We can suppress this warning by adding `-nowarn:CS1701`.

```sh
> dotnet /usr/local/share/dotnet/sdk/2.1.3/Roslyn/bincore/csc.dll \
    -reference:/usr/local/share/dotnet/sdk/NuGetFallbackFolder/microsoft.netcore.app/2.0.0/ref/netcoreapp2.0/System.Runtime.dll \
    -reference:/usr/local/share/dotnet/sdk/NuGetFallbackFolder/microsoft.netcore.app/2.0.0/ref/netcoreapp2.0/System.Console.dll \
    -reference:/usr/local/share/dotnet/sdk/NuGetFallbackFolder/microsoft.netcore.app/2.0.0/ref/netcoreapp2.0/System.Collections.dll \
    -reference:./packages/Newtonsoft.Json/10.0.3/lib/netstandard1.3/Newtonsoft.Json.dll \
    -nowarn:CS1701 \
    -out:Program.dll \
    Program.cs
```

## Dynamic Linking

In the previous step, we compiled a simple application that references `Newtonsoft.Json.dll`, `System.Runtime.dll`, and others.
Before adding `Newtonsoft.Json.dll`, our application worked just fine. But with the updated version, the app will fail to run.

```
> dotnet Program.dll
Unhandled Exception: System.IO.FileNotFoundException: Could not load file or assembly 'Newtonsoft.Json, Version=10.0.0.0, Culture=neutral, PublicKeyToken=30ad4fe6b2a6aeed'. The system cannot find the file specified.
```

.NET is a dynamically linked runtime. The compiler adds a reference to `Newtonsoft.Json.dll` in the
`Program.dll` assembly file , but does not duplicate its code. The .NET Core runtime expects to be able to load a
file named `Newtonsoft.Json.dll` when the application is executed. The same is true for `System.Runtime.dll`,
`System.Console.dll`, and the other `System.*` files we specified as references.

.NET Core can be configured to look for `Newtonsoft.Json.dll` in a variety of locations, but for simplicity,
we can copy this into the same directory as `Program.dll`.

```
> cp ./packages/Newtonsoft.Json/10.0.3/lib/netstandard1.3/Newtonsoft.Json.dll ./
> dotnet Program.dll
{"greeting":"Hello World!"}
```

Why didn't we need to copy `System.Runtime.dll` and others? These files were dynamically linked from the
Microsoft.NETCore.App shared framework, as explained above in [runtimeconfig.json](#runtimeconfigjson) section.

## deps.json

The `deps.json` file is a dependencies manifest. It can be used to configure dynamic linking to assemblies that
come from packages. As mentioned above, .NET Core can be configured to dynamically load assemblies from multiple locations.
These locations include:

 - App base directory (in the same folder as the entry point application, no config required)
 - Package cache folders (NuGet restore cache or NuGet fallback folders)
 - An optimized package cache or runtime packages store
 - The servicing index (rarely used. For Windows Update purposes.)
 - Shared framework (configured via runtimeconfig.json)

Among other things, the `deps.json` file defines a list of dependencies that can be dynamically linked.
Normally, this file is machine-generated, and can get really big and complicated for a real-world app.
But, it's plaintext, so we can craft it with just an editor.

Add a file named `Program.deps.json` into your project with these contents.

```json
{
  "runtimeTarget": {
    "name": ".NETCoreApp,Version=v2.0"
  },
  "targets": {
    ".NETCoreApp,Version=v2.0": {
      "Newtonsoft.Json/10.0.3": {
        "runtime": {
          "lib/netstandard1.3/Newtonsoft.Json.dll": {
            "assemblyVersion": "10.0.0.0",
            "fileVersion": "10.0.3.21018"
          }
        }
      }
    }
  },
  "libraries": {
    "Newtonsoft.Json/10.0.3": {
      "type": "package",
      "serviceable": false,
      "sha512": ""
    }
  }
}
```

To show how this works, delete the copy of `Newtonsoft.Json.dll` that we placed next to `Program.dll`. Then, run `dotnet Program.dll`

```
> rm Newtonsoft.Json.dll
> dotnet Program.dll
Error:
  An assembly specified in the application dependencies manifest (Program.deps.json) was not found:
    package: 'Newtonsoft.Json', version: '10.0.3'
    path: 'lib/netstandard1.3/Newtonsoft.Json.dll'
```

Even though the `Program.deps.json` file is present, .NET Core needs a little more info about where to probe
for aseemblies that match the deps.json file. This config can be specified in one of three ways:

1. `*.runtimeconfig.dev.json`. This is typically the best way to configure this. Add a file `Program.runtimeconfig.dev.json`
with the filepath to the package folder. This is like the `Program.runtimeconfig.json` file, but optional. It typically
contains full file paths, so it is not suitable to distribute between machines.

    ```json
    {
      "runtimeOptions": {
        "additionalProbingPaths": [
          "/Users/nmcmaster/code/packages/"
        ]
      }
    }
    ```

1. Command-line. You can manually specify where to probe for assemblies by using the `exec` command on `dotnet`,
with the `--additionalprobingpath` option. Multiple values are allowed.

    ```
    > dotnet exec --additionalprobingpath ./packages/ Program.dll
    ```

1. `*.runtimeconfig.json`. You can add a runtime option to specify new probing paths. These can be relative paths.

    ```json
    {
      "runtimeOptions": {
        "framework": {
          "name": "Microsoft.NETCore.App",
          "version": "2.0.0"
        },
        "additionalProbingPaths": [
          "./packages/"
        ]
      }
    }
    ```

# Closing

Most devs don't need to use these primitives directly. Tools like NuGet, MSBuild, and Visual Studio automatically
handle gathering references, C# files, invoking the compiler, attaching the debugger, and more.
But I think it's still useful to know what is going on under the hood. Of course, you can always go deeper.
What is actually in a \*.dll file? What's a \*.pdb file? What is crossgen and libcoreclr? I'll leave
that for another day.

# More info

 - Specs on runtimeconfig.json and deps.json: <https://github.com/dotnet/cli/blob/v2.0.0/Documentation/specs/runtime-configuration-file.md>
 - Assembly resolution and dynamic linking: <https://github.com/dotnet/cli/blob/v2.0.0/Documentation/specs/corehost.md>
