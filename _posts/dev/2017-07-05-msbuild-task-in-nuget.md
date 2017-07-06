---
layout: post
title: Shipping a cross-platform MSBuild task in a NuGet package
date: 2017-07-05 21:30:00 PDT
tags:
  - dotnet
  - nuget
  - msbuild
---

MSBuild allows users to write and register their own tasks. Tasks, unlike targets, can be written in
C# and can perform build operations that would be impossible to write in MSBuild's XML dialect. 
In this post, I'm going walk through the key pieces of how to write an MSBuild task that works on both
the .NET Core command line and in Visual Studio, and then how to bundle that task into a NuGet package
so the task can be shared and installed automatically into projects.

**TL;DR** sample code for a cross-platform MSBuild task that installs via NuGet is available here:
<https://github.com/natemcmaster/msbuild-tasks>.

# Primer

If you are not clear on terms such as tasks, targets, properties, or runtimes, I'd recommend you first
check out the dozens of docs and other blogs that explain these concepts. I'd recommend starting
with the [MSBuild Concepts](https://docs.microsoft.com/en-us/visualstudio/msbuild/msbuild-concepts) article.

## Foundations: MSBuild.exe vs 'dotnet msbuild'

Before we go too far, you must first understand the different between "full" MSBuild (the one that
powers Visual Studio) and "portable" MSBuild, or the one bundled in the .NET Core Command Line.

### Full MSBuild

This version of MSBuild usually lives inside Visual Studio. 
e.g. `C:\Program Files (x86)\Microsoft Visual Studio\2017\Community\MSBuild\Bin\MSBuild.exe`.

Characteristics:

 - Runs on .NET Framework.
 - Windows only.
 - Visual Studio uses this when you execute "Build" on your solution or project.
 - Supports the widest range of project types.

### dotnet msbuild

 This version of MSBuild is bundled in the .NET Core Command Line.
 e.g. `C:\Program Files\dotnet\sdk\1.0.4\MSBuild.dll`. This version runs when
 you execute `dotnet restore`, `dotnet build`, or `dotnet test`. These are just command-line sugar
 for `dotnet msbuild /target:Restore`, `dotnet msbuild /clp:Summary`, and `dotnet msbuild /target:VSTest`.

 Characteristics:

  - Runs on .NET Core.
  - Available on Windows, macOS, and Linux.
  - Visual Studio does not directly invoke this version of MSBuild.
  - Currently only supports projects that build using Microsoft.NET.Sdk.

# Step 1 - write the task

An MSBuild task can be implemented in C#. MSBuild can load and run any public class that implements
`Microsoft.Build.Framework.ITask`. You can compile against this API by referencing the NuGet package
[Microsoft.Build.Framework](https://nuget.org/packages/Microsoft.Build.Framework).

There are also helpful abstract classes available by referencing
[Microsoft.Build.Utilities.Core](https://nuget.org/packages/Microsoft.Build.Utilities.Core).

```xml
<!-- GreetingTasks.csproj -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFrameworks>netstandard1.6;net46</TargetFrameworks>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.Build.Framework" Version="15.1.1012" />
    <PackageReference Include="Microsoft.Build.Utilities.Core" Version="15.1.1012" />
  </ItemGroup>
</Project>
```

In this example, I'm using `Microsoft.Build.Utilities.Task` to implement `ITask`. This base class
provides an API for accessing the MSBuild logger.

```c#
// SayHello.cs
using Microsoft.Build.Framework;

namespace MSBuildTasks
{
    public class SayHello : Microsoft.Build.Utilities.Task
    {
        public override bool Execute()
        {
            Log.LogMessage(MessageImportance.High, "Aloha");
            return true;
        }
    }
}
```

You can compile this project with two commands:

```
dotnet restore GreetingTasks.csproj
dotnet build GreetingTasks.csproj
```

# Step 2 - use the task

The assembly compiled in step 1 contains the `SayHello` task. To use this in MSBuild, 
you must first explicitly register the task by name, then invoke the task from a target.

Create a new project file `test.proj` in your project folder with the contents below. The `UsingTask`
line registers the task with MSBuild, and the target `Build` invokes the
`SayHello` task.

```xml
<!-- test.proj -->
<Project DefaultTargets="Build">
  <UsingTask TaskName="MSBuildTasks.SayHello" AssemblyFile=".\bin\Debug\netstandard1.6\GreetingTasks.dll" />
  <Target Name="Build">
    <SayHello />
  </Target>
</Project>
```

> **Pro-tip:** if you haven't noticed already, I always use `\` as directory separators. MSBuild will
normalize these on Linux and macOS to `/`.

On command line, execute this command (notice it is "msbuild", not "build".)
```
dotnet msbuild test.proj
```

This should display a console message, "Aloha".

# Step 3 - vary the task assembly based on MSBuild runtime type

## The problem

As explained above in [Primer](#primer), MSBuild can run on
.NET Framework or .NET Core. In step 2, we used `dotnet msbuild` and the netstandard1.6 task assembly.
But this won't work if we use `MSBuild.exe`.

To see this blow up for yourself, using the code from step 2 and try this: 

1. open the Developer Command Prompt for VS 2017 or (add MSBuild.exe to your path)
2. execute `MSBuild.exe test.proj`

> error MSB4018: The "SayHello" task failed unexpectedly.
System.IO.FileNotFoundException: Could not load file or assembly 'System.Runtime, Version=4.1.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a' or one of its dependencies. The system cannot find the file specified.
File name: 'System.Runtime, Version=4.1.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a'
  at MSBuildTasks.SayHello.Execute()

The problem, of course, is that `bin/Debug/netstandard1.6/GreetingTasks.dll` is compiled for
.NET Standard 1.6. MSBuild.exe runs on .NET Framework, which is not compatible with .NET Standard 1.6.

To fix this error, you could change the `UsingTask` line to use the net46 assembly instead.
```xml
<UsingTask TaskName="MSBuildTasks.SayHello" AssemblyFile=".\bin\Debug\net46\GreetingTasks.dll" />
```

This would make MSBuild.exe work, but then the reverse problem happens with `dotnet msbuild`.

## The solution

You can vary which task assembly loads based on MSBuild's runtime type using the pre-defined property `MSBuildRuntimeType`. In `dotnet msbuild`, its value will be `Core`
and in `MSBuild.exe` it will be `Full`.

Here is one way to use that property to vary the assembly path:

```xml
<!-- test.proj -->
<Project DefaultTargets="Build">

  <PropertyGroup>
    <TaskAssembly Condition=" '$(MSBuildRuntimeType)' == 'Core'">.\bin\Debug\netstandard1.6\GreetingTasks.dll</TaskAssembly>
    <TaskAssembly Condition=" '$(MSBuildRuntimeType)' != 'Core'">.\bin\Debug\net46\GreetingTasks.dll</TaskAssembly>
  </PropertyGroup>

  <UsingTask TaskName="MSBuildTasks.SayHello" AssemblyFile="$(TaskAssembly)" />

  <Target Name="Build">
    <SayHello />
  </Target>
</Project>
```

Now, both `dotnet msbuild test.proj` and `MSBuild.exe test.proj` will work.

# Step 4 - shipping your task in a NuGet package

## Package layout 
Our final sample NuGet package will have the following layout:

```
- GreetingTasks.nupkg
    - build/
        + GreetingTasks.props
    - buildMultiTargeting/
        + GreetingTasks.props
    - tasks/
        - netstandard1.6/
            + GreetingTasks.dll
        - net46/
            + GreetingTasks.dll
```

NuGet will automatically import the `build/GreetingTasks.props` file is imported into projects when 
the project has a single `TargetFramework`. It will import `buildMultiTargeting/GreetingTasks.props`
when the project has multiple `TargetFrameworks`.

Also, we've put the assemblies in `tasks/` instead of `lib/`. If there were in `lib/`, NuGet would
automatically add a compile-time reference to these assemblies. We don't really want developers
writing code that depends on our task, so we'll hide these files in `tasks/` which is a non-standard
NuGet folder.

## The MSBuild files

The contents of `build/GreetingTasks.props` will look similar to the code we added in `test.proj`.

```xml
<!-- build/GreetingTasks.props -->
<Project TreatAsLocalProperty="TaskFolder;TaskAssembly">

  <PropertyGroup>
    <TaskFolder Condition=" '$(MSBuildRuntimeType)' == 'Core' ">netstandard1.6</TaskFolder>
    <TaskFolder Condition=" '$(MSBuildRuntimeType)' != 'Core' ">net46</TaskFolder>
    <TaskAssembly>$(MSBuildThisFileDirectory)..\tasks\$(TaskFolder)\GreetingTasks.dll</TaskAssembly>
  </PropertyGroup>

  <UsingTask TaskName="MSBuildTasks.SayHello" AssemblyFile="$(TaskAssembly)" />
</Project>
```

> **Pro-tip:** it's good to use `TreatAsLocalProperty` if you using common names like `TaskFolder`.
It isolates your file from the rest of the project's settings.

To avoid duplicating content, the `buildMultiTargeting/GreetingTasks.props` only needs to contain an
Import.

```xml
<!-- buildMultiTargeting/GreetingTasks.props -->
<Project>
  <Import Project="..\build\GreetingTasks.props" />
</Project>
```

## csproj

To acheive this layout using the csproj, we will change our `GreetingTasks.csproj` to look like this.

```xml
<!-- GreetingTasks.csproj -->
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFrameworks>netstandard1.6;net46</TargetFrameworks>
    <!-- Suppresses the warnings about the package not having assemblies in lib/*/.dll.-->
    <NoPackageAnalysis>true</NoPackageAnalysis>
    <!-- Change the default location where NuGet will put the build output -->
    <BuildOutputTargetFolder>tasks</BuildOutputTargetFolder>
  </PropertyGroup>

  <ItemGroup>
    <!-- pack the props files -->
    <Content Include="build\GreetingTasks.props" PackagePath="build\" />
    <Content Include="buildMultiTargeting\GreetingTasks.props" PackagePath="buildMultiTargeting\" />
  </ItemGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.Build.Framework" Version="15.1.1012" />
    <PackageReference Include="Microsoft.Build.Utilities.Core" Version="15.1.1012" />
    <!-- marks all packages as 'local only' so they don't end up in the nuspec -->
    <PackageReference Update="@(PackageReference)" PrivateAssets="All" />
  </ItemGroup>

</Project>
```

> **Pro-tip**: set `PrivateAssets="All"` on the PackageReferences. Otherwise, these will be added
to your package's list of dependencies. These packages are not required when your task is installed;
they are only used when you compile your project.

## Pack

To build and package the target, you can use `dotnet pack` or `MSBuild /t:Pack`.

```
dotnet pack GreetingTasks.csproj --output ./ --configuration Release
```

# Closing

I've posted the fully-working as a GitHub repository here: 
<https://github.com/natemcmaster/msbuild-tasks>.

If you want to see a "real world" example of a project that uses this approach, checkout the 
following projects:

 - [Yarn.MSBuild](https://github.com/natemcmaster/yarn.msbuild)
 - [BuildBundlerMinifier](https://github.com/madskristensen/BundlerMinifier), specifically 
   [these files](https://github.com/madskristensen/BundlerMinifier/tree/master/src/BundlerMinifier).
