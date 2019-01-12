---
layout: post
title: "Deep-dive into .NET Core primitives, part 2: the shared framework"
subtitle: A closer look at Microsoft.AspNetCore.App and common pitfalls
author: Nate
date: Aug. 29, 2018
hero:
  asset_path: /assets/images/blog/netcore_primitives_2.png
  width: 936
  height: 744
tags:
- dotnet
- aspnetcore
---

Shared frameworks have been an essential part of .NET Core since 1.0.
ASP.NET Core shipped as a shared framework for the first time in 2.1.
You may not have noticed if things are working smoothly, but there have been
[some][bump1] [bumps][bump2] and [ongoing discussion][bump3] about its design.
In this post, I will dive deep into the shared frameworks and talk about some common developer pitfalls.

[bump1]: https://github.com/aspnet/AspNetCore/issues/3241
[bump2]: https://github.com/aspnet/Universe/issues/1180
[bump3]: https://github.com/aspnet/AspNetCore/issues/3292
[download]: https://aka.ms/dotnet-download

This post is part of a series:
* [Part 1 - .deps.json, runtimeconfig.json, and dll's][part-1]
* Part 2 - the shared framework
* [Part 3 - runtimeconfig.json in depth][part-3]

[part-1]: {{ site.baseurl }}{% post_url /dev/2017-12-21-netcore-primitives %}
[part-2]: {{ site.baseurl }}{% post_url /dev/2018-08-29-netcore-primitives-2 %}
[part-3]: {{ site.baseurl }}{% post_url /dev/2019-01-12-netcore-primitives-3 %}

# The Basics

.NET Core apps run in one of two modes: framework-dependent or self-contained. On my MacBook, a
minimal *self-contained* ASP.NET Core application is 93 **MB** and has 350 files.
By contrast, a minimal framework-dependent app is 239 **KB** and has 5 files.

You can produce both kinds of apps with these command line instructions.

```
dotnet new web
dotnet publish --runtime osx-x64 --output bin/self_contained_app/
dotnet publish --output bin/framework_dependent_app/
```

![Screenshot comparing file size of framework dependent and self-contained](/assets/images/blog/netcore_primitives_fdd_vs_scd.png)

[deployment-doc]: https://docs.microsoft.com/en-us/dotnet/core/deploying/

When the app runs, it is functionally equivalent in both modes. So why are there
different modes? As [the docs explain well][deployment-doc]:

 > framework-dependent deployment relies on the presence of a shared system-wide version of .NET Core.... [A] self-contained deployment doesn't rely on the presence of shared components on the target system. All components...are included with the application.

[This document][deployment-doc] does a great job of explaining the advantages of each mode.

# The shared framework

To put it simply, a .NET Core shared framework is a folder of assemblies (\*.dll files) that are not in the application folder. These assemblies version and release together.
This folder is one part of the "shared system-wide version of .NET Core", and is usually found in `C:/Program Files/dotnet/shared`.

When you run `dotnet.exe WebApp1.dll`, the **.NET Core host** must

  1. discover the names and versions of your app dependencies
  2. find those dependencies in common locations.

These dependencies are found in a variety locations, including, but not limited to, the shared frameworks.
In a previous post, I briefly explained how the [deps.json and runtimeconfig.json files][part-1] configure the host's behavior. See that post for more details.

The .NET Core host reads the \*.runtimeconfig.json file to determine which shared framework(s) to load. Its contents
may look like this:
```json
{
  "runtimeOptions": {
    "framework": {
      "name": "Microsoft.AspNetCore.App",
      "version": "2.1.1"
    }
  }
}
```

The **shared framework name** is just that - a name. By convention, this name ends in ".App", but it could
be anything, like "FooBananaShark".

The **shared framework version** represents the _minimum_ version. The .NET Core host will never run on
a lower version, but it may try to run on a higher one.

### Which shared frameworks do I have installed?

Run `dotnet --list-runtimes`. It will show the names, versions, and locations of shared frameworks.

### Comparing Microsoft.NETCore.App, AspNetCore.App, and AspNetCore.All

As of .NET Core 2.2, there are three shared frameworks.

Framework name | Description
:--------------|:------------------------------
Microsoft.NETCore.App | The base runtime. It supports things like `System.Object`, `List<T>`, `string`, memory management, file and network IO, threading, etc.
Microsoft.AspNetCore.App | The default web runtime. It imports Microsoft.NETCore.App, and adds API to build an HTTP server using Kestrel, Mvc, SignalR, Razor, and parts of EF Core.
Microsoft.AspNetCore.All | Integrations with third-party stuff. It imports Microsoft.AspNetCore.App. It adds support for EF Core + SQLite, extensions that use Redis, config from Azure Key Vault, and more. (Will be [deprecated in 3.0.][deprecate-announcement])

[deprecate-announcement]: https://github.com/aspnet/Announcements/issues/314

### Relationship to the NuGet package

The .NET Core SDK generates the `runtimeconfig.json` file. In .NET Core 1 and 2, it uses two pieces
from the project configuration to determine what goes in the framework section of the file:

1. the `MicrosoftNETPlatformLibrary` property. [By default](https://github.com/dotnet/sdk/blob/v2.1.300/src/Tasks/Microsoft.NET.Build.Tasks/targets/Microsoft.NET.Sdk.targets#L501-L516) this is set to `"Microsoft.NETCore.App"` for all .NET Core projects.
2. NuGet restore results, which must include a package by the same name.

The .NET Core SDK [adds an **implicit package reference** to Microsoft.NETCore.App](https://github.com/dotnet/sdk/blob/v2.1.300/src/Tasks/Microsoft.NET.Build.Tasks/targets/Microsoft.NET.Sdk.DefaultItems.props#L49) to all projects. ASP.NET Core [overrides the default by setting](https://github.com/aspnet/Universe/blob/2.1.3/src/Microsoft.AspNetCore.App/build/netcoreapp2.1/Microsoft.AspNetCore.App.targets#L10) `MicrosoftNETPlatformLibrary` to `"Microsoft.AspNetCore.App"`.

The NuGet package, however, **does not provide the shared framework**.
I repeat, the NuGet package **does not provide the shared framework**. (I'll repeat once more below.)
The NuGet package only provides a set of APIs used by the compiler and a few other SDK bits.
The shared framework files come from runtime installers found on <https://aka.ms/dotnet-download>, or bundled
in Visual Studio, Docker images, and some Azure services.

### Version roll-forward

As mentioned above, runtimeconfig.json is a *minimum* version. The *actual* version used depends on a rollforward
policy [documented in great detail by Microsoft](https://docs.microsoft.com/en-us/dotnet/core/versions/selection#framework-dependent-apps-roll-forward).
The most common way this applies is:

* If an app minimum version is 2.1.0, the highest 2.1.\* version will be loaded.

I'll go into this file in more details. See [.NET Core Primitives part 3][part-3].

### Layered shared frameworks

_This feature was added in .NET Core 2.1._

Shared frameworks can depend on other shared frameworks. This was introduced
to support ASP.NET Core which converted from [a package runtime store](https://docs.microsoft.com/en-us/dotnet/core/deploying/runtime-store) to a shared framework.

For example, if you look inside the `$DOTNET_ROOT/shared/Microsoft.AspNetCore.All/$version/` folder, you will see
a `Microsoft.AspNetCore.All.runtimeconfig.json` file.

```
$ cat /usr/local/share/dotnet/shared/Microsoft.AspNetCore.All/2.1.2/Microsoft.AspNetCore.All.runtimeconfig.json
{
  "runtimeOptions": {
    "tfm": "netcoreapp2.1",
    "framework": {
      "name": "Microsoft.AspNetCore.App",
      "version": "2.1.2"
    }
  }
}
```

### Multi-level lookup

_This feature was added in .NET Core 2.0._

The host will probe several locations to find a suitable shared framework. It starts by looking in the
**dotnet root**, which is the directory containing the `dotnet` executable. This can also be overridden
by setting the `DOTNET_ROOT` environment variable to a folder path. The first location probed is:

    $DOTNET_ROOT/shared/$name/$version

If a folder is not there, it will attempt to look in pre-defined global locations using  **multi-level lookup**.
This can be turned off by setting the environment variable `DOTNET_MULTILEVEL_LOOKUP=0`.
The default global locations are:

OS      | Location
--------|-----------------
Windows | `C:\Program Files\dotnet` (64-bit processes) <br> `C:\Program Files (x86)\dotnet` (32-bit processes) ([See in the source code](https://github.com/dotnet/core-setup/blob/v2.1.3/src/corehost/common/pal.windows.cpp#L203-L210))
macOS   |`/usr/local/share/dotnet` ([source code](https://github.com/dotnet/core-setup/blob/v2.1.3/src/corehost/common/pal.unix.cpp#L195))
Unix    | `/usr/share/dotnet` ([source code](https://github.com/dotnet/core-setup/blob/v2.1.3/src/corehost/common/pal.unix.cpp#L197))

The host will probe for directories in:

    $GLOBAL_DOTNET_ROOT/shared/$name/$version

### ReadyToRun

The assemblies in the shared frameworks are pre-optimized with [a tool called `crossgen`][crossgen]. This produces
["ReadyToRun" versions][readytorun] of .dll's which are optimized for specific operating systems and CPU architectures.
The primary performance gain is that this reduces the amount of time the JIT spends preparing code on startup.

[readytorun]: https://github.com/dotnet/coreclr/blob/v2.1.3/Documentation/botr/readytorun-overview.md
[crossgen]: https://github.com/dotnet/coreclr/blob/v2.1.3/Documentation/building/crossgen.md

# Pitfalls

I think every .NET Core developer has fallen into one of these pitfalls at some point. I'll attempt to explain
how this happens.

### `HTTP Error 502.5 Process Failure`

![Screenshot of HTTP 502.5 error](/assets/images/blog/netcore_primitives_ancm.png)

By far the most common pitfall when hosting ASP.NET Core in IIS or running on Azure Web Services.
This typically happens after a developer upgraded a project, or when an app is deployed to a machine which hasn't
been updated recently. The real error is often that a shared framework cannot be found, and the .NET Core application cannot start without it. When dotnet fails to launch the app, IIS issues the HTTP 502.5 error, but does not
surface the internal error message.

### "The specified framework was not found"

```
It was not possible to find any compatible framework version
The specified framework 'Microsoft.AspNetCore.App', version '2.1.3' was not found.
  - Check application dependencies and target a framework version installed at:
      /usr/local/share/dotnet/
  - Installing .NET Core prerequisites might help resolve this problem:
      http://go.microsoft.com/fwlink/?LinkID=798306&clcid=0x409
  - The .NET Core framework and SDK can be installed from:
      https://aka.ms/dotnet-download
  - The following versions are installed:
      2.1.1 at [/usr/local/share/dotnet/shared/Microsoft.AspNetCore.App]
      2.1.2 at [/usr/local/share/dotnet/shared/Microsoft.AspNetCore.App]
```

This error is often found lurking behind HTTP 502.5 errors or Visual Studio Test Explorer failures.

This happens when the runtimeconfig.json file specifies a framework name and version, and the host
cannot find an appropriate version using the [multi-level lookup](#multi-level-lookup) and
[rollforward policies](#version-roll-forward), as explained above.

### Updating the NuGet package for Microsoft.AspNetCore.App

The NuGet package for Microsoft.AspNetCore.App does not provide the shared framework.
It only provides the APIs used by the C#/F# compiler and a few SDK bits. You must download and install the
shared framework separately. See <https://aka.ms/dotnet-download>.

Also, because of [rollforward policies](#version-roll-forward), you don't need to update the NuGet package version to get your app to run on a new shared framework version.

It was probably a design mistake on the part of the ASP.NET Core team (which I'm on) to represent the shared framework as a NuGet package in the project file.
The packages which represent shared frameworks are not normal packages. Unlike most packages, they are not
self-sufficient. It is reasonable to expect that when a project uses a `<PackageReference>`,
NuGet is able to install everything needed, and frustrating that these special packages
deviate from the pattern. [Various proposals](https://github.com/aspnet/AspNetCore/issues/3307)
have been made to fix this. I'm hopeful one will land soon-ish.

### `<PackageReference Include="Microsoft.AspNetCore.App" />`

New project templates and docs for ASP.NET Core 2.1 showed users that they only needed to have this line in their project.

```xml
<PackageReference Include="Microsoft.AspNetCore.App" />
```

All other `<PackageReference>`'s must include a `Version` attribute. The version-less package ref
only works if the project begins with `<Project Sdk="Microsoft.NET.Sdk.Web">`, and only works for the `Microsoft.AspNetCore.{App, All}` packages. The Web SDK will
 automatically pick a version of these packages based on other valeus in the project, like `<TargetFramework>`
 and `<RuntimeIdentifier>`.

This magic does not work if you specify a version on the package reference element,
or if you're not using the Web SDK. It's hard to recommend a good solution because
the best approach depends on your level of understanding and the project type.

### Publish trimming

When you run `dotnet publish` to create a framework-dependent app, the SDK uses the NuGet restore
result to determine which assemblies should be in the publish folder. Some will be copied from NuGet packages, and others are not because they are expected to be in the shared frameworks.

This can easily go wrong because ASP.NET Core is available as a shared framework _and_ as NuGet packages.
The trimming attempts to do some graph math to examine transitive dependencies, upgrades, etc., and pick
the right files accordingly.

Take for example this project:

```xml
<PackageReference Include="Microsoft.AspNetCore.App" Version="2.1.1" />
<PackageReference Include="Microsoft.AspNetCore.Mvc" Version="2.1.9" />
```

MVC is actually part of Microsoft.AspNetCore.App, but when `dotnet publish` runs, it sees that your project
has decided to **upgrade** "Microsoft.AspNetCore.Mvc.dll" to a version which is higher than what
Microsoft.AspNetCore.App 2.1.1 includes, so it will put Mvc.dll into your publish folder.

This is less than ideal because your application grows in size and you don't get a ReadyToRun optimized version
of Microsoft.AspNetCore.Mvc.dll. This can happen unintentionally if you get upgraded transitively through
a ProjectReference of via a third-party dependencies.

### Confusing the target framework moniker with the shared framework

It's easy to think that `"netcoreapp2.0" == "Microsoft.NETCore.App, v2.0.0"`. This is not true.
A target framework moniker (aka TFM) is specified in a project using the `<TargetFramework>` element.
"netcoreapp2.0" is meant to be a human-friendly way to express which version of .NET Core you would like to use.

The pitfall of a TFM is that it is too short. It cannot express things like multiple shared frameworks,
patch-specific versioning, version rollforward, output type, and self-contained vs framework-dependent deployment.
The SDK will attempt to *infer* many of these settings from the TFM, but it cannot infer everything.

So, more accurately, `"netcoreapp2.0" implies "Microsoft.NETCore.App, at least v2.0.0"`.

### Confusing project settings

The final pitfall I will mention is about project settings. There are many, and the terminology and setting names don't always line up. It's a confusing set of terms, so this one isn't your fault if you get them mixed up.

Below, I've listed some common project settings and what they actually mean.

```xml
<PropertyGroup>
  <TargetFramework>netcoreapp2.1</TargetFramework>
  <!--
    Actual meaning:
      * The API set version to use when resolving compilation references from NuGet packages.
  -->

  <TargetFrameworks>netcoreapp2.1;net471</TargetFrameworks>
  <!--
    Actual meaning:
      * Compile for two different API version sets. This does not represent multi-layered shared frameworks.
  -->

  <MicrosoftNETPlatformLibrary>Microsoft.AspNetCore.App</MicrosoftNETPlatformLibrary>
  <!--
    Actual meaning:
      * The name of the top-most shared framework
  -->

  <RuntimeFrameworkVersion>2.1.2</RuntimeFrameworkVersion>
  <!--
    Actual meaning:
      * version of the implicit package reference to Microsoft.NETCore.App which then becomes
        the _minimum_ shared framework version.
  -->

  <RuntimeIdentifier>win-x64</RuntimeIdentifier>
  <!--
    Actual meaning:
      * Operating system kind + CPU architecture
  -->

  <RuntimeIdentifiers>win-x64;win-x86</RuntimeIdentifiers>
  <!--
    Actual meaning:
      * A list of operating systems and CPU architectures which this project _might_ run on.
        You still have to select one by setting RuntimeIdentifier.
  -->

</PropertyGroup>

<ItemGroup>

  <PackageReference Include="Microsoft.AspNetCore.App" Version="2.1.2" />
  <!--
    Actual meaning:
      * Use the Microsoft.AspNetCore.App shared framework.
      * Minimum version = 2.1.2
  -->

  <PackageReference Include="Microsoft.AspNetCore.Mvc" Version="2.1.2" />
  <!--
    Actual meaning:
      * Use the Microsoft.AspNetCore.Mvc package.
      * Exact version = 2.1.2
  -->

  <FrameworkReference Include="Microsoft.AspNetCore.App" />
  <!--
    Actual meaning:
      * Use the Microsoft.AspNetCore.App shared framework.
    (This is new and unreleased...see https://github.com/dotnet/sdk/pull/2486)
  -->

</ItemGroup>
```

# Closing

The shared framework is an optional feature of .NET Core, and I think it's a reasonable default for most users despite the pitfalls. I still think it's good for .NET Core developers to understand what goes on under the hood, and hopefully this was a good overview of the shared frameworks feature. I tried to link to official docs and guidance
where possible so you can find more info. If you have more questions, leave a comment below.

### More info

 - Packages, metapackages and frameworks: <https://docs.microsoft.com/en-us/dotnet/core/packages>
 - .NET Core application deployment: <https://docs.microsoft.com/en-us/dotnet/core/deploying/>. Especially read the part about "Framework-dependent deployments (FDD)"
 - Specs on runtimeconfig.json and deps.json:
 <https://github.com/dotnet/cli/blob/v2.1.400/Documentation/specs/runtime-configuration-file.md>
 - The implementation of the shared framework lookup: <https://github.com/dotnet/core-setup/blob/v2.1.3/src/corehost/cli/fxr/fx_muxer.cpp#L464>
