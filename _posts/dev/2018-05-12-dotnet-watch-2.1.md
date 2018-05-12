---
layout: post
title: dotnet watch 2.1
subtitle: It's now a built-in command and it works inside Docker.
date: May 12, 2018, 1:00 AM
tags:
- dotnet
- nuget
---

[.NET Core 2.1 RC1](https://blogs.msdn.microsoft.com/dotnet/2018/05/07/announcing-net-core-2-1-rc-1/)
was released this week.
This is the first supported version of the .NET Core CLI which ships `dotnet watch` as a built-in command.
In addition to changing how this tool ships, dotnet-watch 2.1 has a few improvements that make it
the best version yet.

[Download the .NET Core CLI 2.1 here](https://aka.ms/DotNetCore21).

### `dotnet watch` from anywhere

In earlier versions of .NET Core, you had to add a `<DotNetCliToolReference>` into each .csproj file
in order to use `dotnet watch`. And you could only invoke it from the project directory.

No more! You can remove your DotNetCliToolReference's to Microsoft.DotNet.Watcher.Tools and still execute `dotnet watch` on any MSBuild project.

```
$ dotnet watch --project subFolder/ run
```

### Supports custom `obj/` folder locations

Until 2.1, you could not customize the location of your `obj/` folder if you wanted to use `dotnet watch`.
This was fixed in 2.1, so you can organize your MSBuild outputs however you want and still use this tool.

```xml
<BaseIntermediateOutputPath>$(MSBuildProjectDirectory)../../obj/</BaseIntermediateOutputPath>
```

### Perf improvements

This release contains a bunch of perf improvements which makes dotnet watch capable of relaunching
your app faster than ever. For small projects, this shaves 2-3 seconds off the wait time for your app to restart. On large projects, it can save 30 seconds or more.

[Read more about these performance improvements](https://blogs.msdn.microsoft.com/dotnet/2018/04/11/announcing-net-core-2-1-preview-2/).

### Support for running in Docker

`dotnet watch` should work better now for those building inside Docker containers.

To make this work well with your IDE, create a file in your project folder named `Directory.Build.props`,
and put these contents inside:

```xml
<Project>

  <PropertyGroup>
    <DefaultItemExcludes>$(DefaultItemExcludes);$(MSBuildProjectDirectory)/obj/**/*</DefaultItemExcludes>
    <DefaultItemExcludes>$(DefaultItemExcludes);$(MSBuildProjectDirectory)/bin/**/*</DefaultItemExcludes>
  </PropertyGroup>

  <PropertyGroup Condition="'$(DOTNET_RUNNING_IN_CONTAINER)' == 'true'">
    <BaseIntermediateOutputPath>$(MSBuildProjectDirectory)/obj/container/</BaseIntermediateOutputPath>
    <BaseOutputPath>$(MSBuildProjectDirectory)/bin/container/</BaseOutputPath>
  </PropertyGroup>

  <PropertyGroup Condition="'$(DOTNET_RUNNING_IN_CONTAINER)' != 'true'">
    <BaseIntermediateOutputPath>$(MSBuildProjectDirectory)/obj/local/</BaseIntermediateOutputPath>
    <BaseOutputPath>$(MSBuildProjectDirectory)/bin/local/</BaseOutputPath>
  </PropertyGroup>

</Project>
```
