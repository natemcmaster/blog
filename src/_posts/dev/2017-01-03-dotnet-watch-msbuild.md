---
layout: post
title: .NET Core command-line file watcher (dotnet watch) for MSBuild
subtitle: Basic usage and pro-tips for using dotnet-watch with MSBuild
date: 2017-01-03 10:52 PM
hero:
    asset_path: blog/dotnet-watch-preview.png
    width: 296
    height: 75
---

The most recent preview ([1.0.0-msbuild2-final](https://www.nuget.org/packages/Microsoft.DotNet.Watcher.Tools/1.0.0-msbuild2-final))
of `dotnet-watch` supports MSBuild projects, and is the most configurable, extensible version of the tool, yet.
`dotnet-watch` is a file watcher for `dotnet` that restarts the specified application when changes in the source code are detected.
This tool has been available since the days of DNX with support for *project.json*.
`dotnet-watch` for MSBuild adds new features that were not available in the *project.json* versions.

See also: <https://github.com/aspnet/DotNetTools/> for more documentation and to report issues.

# Basic usage

## How To Install

### Visual Studio 2017 RC

*Note: soon, the NuGet GUI will be able to install this package, but is broken in the most recent RC.*

1. Open your .NET Core project in VS 2017 RC.
2. Right click on the project in *Solution Explorer*.
3. Select "Edit (YourProject).csproj".
4. Continue with next section

### Visual Studio Code or command-line users

Add `Microsoft.DotNet.Watcher.Tools` as a `DotNetCliToolReference` to your project by adding this to the csproj file.

```xml
  <ItemGroup>
    <DotNetCliToolReference Include="Microsoft.DotNet.Watcher.Tools" Version="1.0.0-msbuild2-final" />
  </ItemGroup>
```

### How To Use

On command line, change directories (`cd C:\dev\MyApp`) into the directory containing your project. Then execute `dotnet watch`. 
This will show detailed help information and some examples.

To make dotnet-watch do something, add `watch` between `dotnet` and the command arguments that you want to execute.

For example, if you want to repeatedly run tests, execute `dotnet watch test`. Or, if you want to recompile and launch
your website when a C# file changes, run `dotnet watch run`. All `dotnet blah` verbs are supported. (In theory, you could 
even run `dotnet watch watch watch run`....but I don't recommend it.)

# What's new

dotnet-watch can be configured with settings in the MSBuild project file being watched.

## Customize which files are watched

By default, dotnet-watch will track all `**/*.cs`, `*.csproj`, and `**/*.resx` files for changes. 
Well, kinda. The truth is a little more technical: the default is actually everything in the **Compile** and **EmbeddedResource** item groups,
plus any file added to the **MSBuildProjectFiles** list....but for most projects, this means all C# files.

More items can be added to the watchlist by editing the csproj file. Items can be added individually, or by using glob patterns.

```xml
<ItemGroup>
    <!-- extends watching group to include *.js files -->
    <Watch Include="**\*.js" Exclude="node_modules\**\*;**\*.js.map;obj\**\*;bin\**\*" />
</ItemGroup>
```

## Opt-out of defaults

dotnet-watch can be configured to ignore its default settings. To ignore specific
files, add the `Watch="false"` attribute an item's definition in the csproj file.

Example:

```xml
<ItemGroup>
    <!-- exclude Generated.cs from dotnet-watch -->
    <Compile Include="Generated.cs" Watch="false" />

    <!-- exclude Strings.resx from dotnet-watch -->
    <EmbeddedResource Include="Strings.resx" Watch="false" />

    <!-- exclude changes in this referenced project -->
    <ProjectReference Include="..\ClassLibrary1\ClassLibrary1.csproj" Watch="false" />
</ItemGroup>
```

# For MSBuild ninja's

## The 'watch' build

When dotnet-watch reads a *.csproj to find which files it should watch,
it actually executes the MSBuild project. It calls a target named `GenerateWatchList` 
in the project. When this target runs, dotnet-watch will set the property `DotNetWatchBuild=true`.
This is similar to how Visual Studio and VS Code execute the csproj with `DesignTimeBuild=true`
to discover files, NuGet references, etc.

## Custom 'watch projects'

dotnet-watch is not restricted to C# projects. You can create custom 'watch' projects to do your bidding.

### Example: watch multiple test projects

Example: let's say you have the following project layout:

```
test/
    UnitTests/UnitTests.csproj
    IntegrationTests/IntegrationTests.csproj
```

If you wanted to watch multiple projects, and execute tests on all, you create file like this
in `test/watch.proj`:

```xml
<Project ToolsVersion="15.0">

    <ItemGroup>
        <TestProjects Include="**\*.csproj" />
        <Watch Include="**\*.cs" />
    </ItemGroup>

    <Target Name="Test">
        <MSBuild Targets="VSTest" Projects="@(TestProjects)" />
    </Target>

    <ItemGroup>
        <DotNetCliToolReference Include="Microsoft.DotNet.Watcher.Tools" Version="1.0.0-msbuild3-final" />
    </ItemGroup>

    <Import Project="$(MSBuildExtensionsPath)\Microsoft.Common.targets"/>

</Project>
```

Then execute

```
cd test\
dotnet restore watch.proj
dotnet watch msbuild /t:Test
```

This will watch all test projects, and execute VSTest when any file changes.
