---
layout: post
title: MSBuild tasks with dependencies
subtitle: You could wrestle with MSBuild's task loading mechanism, or just don't.
date: Nov. 11, 2017
tags:
  - msbuild
  - nuget
  - dotnet
---

A few months ago, I wrote demos and a [blog post]({{ site.baseurl }}{% post_url /dev/2017-07-05-msbuild-task-in-nuget %}) about writing
MSBuild tasks and shipping them in a NuGet package. The most frequently asked question I've been asked
since then is "how to I make a task with external dependencies work?" i.e. "my task needs to connect to MySql, Postgres, load SQLite", or something like that. When I started writing a post to answer these questions, I intended to show you the way to make all this work.

But then, as the list of workarounds grew, I realized that my advise is probably leading down a bad road. So in response to this, I wrote
[Bundling .NET build tools in NuGet]({{ site.baseurl }}{% post_url /dev/2017-11-11-build-tools-in-nuget %}). This approach shows you how to use a regular-old console app instead of an MSBuild task to accomplish the same kinds of things.

_This is a follow up to
**[Shipping a cross-platform MSBuild task in a NuGet package]({{ site.baseurl }}{% post_url /dev/2017-07-05-msbuild-task-in-nuget %})**._


# Just don't

**TL;DR** Just don't. Use a console tool instead. MSBuild tasks have limitations. It's typically easier to write a console tool and start a new process from MSBuild using `Exec`.

# The exception

If you need access to MSBuild's object model so you have richer access to logging, items, properties, and task outputs, you will still need to write a task. But even in this case, I recommend making your task simply a wrapper for starting a new process that launches your console tool.

The [ToolTask](https://docs.microsoft.com/en-us/dotnet/api/microsoft.build.utilities.tooltask?view=netframework-4.7.1) API in MSBuild is designed for exactly this. See an example implementation here: [ToolTask implementation](https://github.com/natemcmaster/Yarn.MSBuild/blob/2813c1442403f69f66f525cf7e64e34319a3e678/src/Yarn.MSBuild/Yarn.cs).

But if you insist...

# Workarounds

MSBuild task's aren't well suited for dependencies beyond the task assembly itself. Although there is an issue open
on MSBuild to improve this (see [Microsoft/MSBuild#1312](https://github.com/Microsoft/msbuild/issues/1312)),
if you're reading this, you probably can't wait for a future version of MSBuild.

Some issues you might run into:

## Third-party dependencies and NuGet

Ideally, you would be able to put your MSBuild task in an NuGet library and let `PackageReference` do magic to ensure your dependencies are installed.

But that's not supported either. See [Microsoft/MSBuild#1755](https://github.com/Microsoft/msbuild/issues/1755).

So instead, you have to make a "fat package". This means you ship your third-party dependencies in your own nuget package. See "BuildBundlerMinifier" as an example:

 - [`<CopyLocalLockFileAssemblies>`](https://github.com/madskristensen/BundlerMinifier/blob/e66ec7c85ad6c291fcd5bf55e7f426485e2e2d38/src/BundlerMinifier/BundlerMinifier.csproj#L13-L14)
 - [Building a 'fat package'](https://github.com/madskristensen/BundlerMinifier/blob/e66ec7c85ad6c291fcd5bf55e7f426485e2e2d38/src/BundlerMinifier/BundlerMinifier.csproj#L35-L47)
 - [Discussion here](https://github.com/madskristensen/BundlerMinifier/issues/230)

## Binding redirects and version conflicts

Visual Studio and MSBuild.exe run on .NET Framework. If your assembly uses an assembly also used by MSBuild itself, you can end of with `FileNotFoundException` or `MissingMethodException` when the assembly finding fails or fails to give you the right version. Normally, this is resolved with binding redirects.
This is not supported by MSBuild.
To workaround this, you have to hook into assembly resolving hooks.

See this example: [AssemblyResolver.cs](https://github.com/dotnet/buildtools/blob/48e815d61529eeda8d1a419ae904edea9d4092aa/src/common/AssemblyResolver.cs)

## Native dependencies from tasks on .NET Framework

This is not supported by MSBuild either. See [Microsoft/MSBuild#1887](https://github.com/Microsoft/msbuild/issues/1887).

You can workaround by P/Invoking to `LoadLibraryEx` to load a library in .NET Framework. See this example: [NativeLibraryLoader.cs](https://github.com/aspnet/Microsoft.Data.Sqlite/blob/rel/1.1.1/src/Microsoft.Data.Sqlite/Utilities/NativeLibraryLoader.cs).

## Native dependencies from tasks on .NET Core

On .NET Core, you can workaround by implementing AssemblyLoadContext and overwriting `LoadUnmanagedDll`. See this example: [ContextAwareTask.cs](https://github.com/AArnott/Nerdbank.GitVersioning/blob/079d24cbca3bf0872c9a0c951920dfe0498519e6/src/MSBuildExtensionTask/ContextAwareTask.cs#L92-L107)

## Aligning versions with MSBuild

If you need a dependency that is also used in MSBuild itself, you have to align with the version they use. For example, if you want to use `System.Reflection.Metadata`, `System.Collections.Immutable`, `NuGet`, `Newtonsoft.Json`, or others, you have to use the version they provide. See example: [dependencies.props](https://github.com/aspnet/BuildTools/blob/1f3f14382764e06b7e691e5ee89d12a280249284/build/dependencies.props#L19-L29)

# Closing

My recommendation: consider making your build task a console tool instead and use `Exec` to invoke it.
For info on this approach, see [Bundling build tools in MSBuild packages]({{site.baseurl}}{% post_url /dev/2017-11-11-build-tools-in-nuget %}).

