---
layout: post
title: Bundling .NET build tools in NuGet
subtitle: How to share your console app via NuGet and MSBuild
date: Nov. 11, 2017
tags:
  - msbuild
  - nuget
  - dotnet
---

If you are looking for a way to share a build tool among several .NET Framework or .NET Core projects,
NuGet is an excellent way to distribute it. Starting with Visual Studio 2017, NuGet comes "batteries included"
with Microsoft.NET.Sdk (typically for .NET Standard and Core) projects, and can be made to work with
"classic" .NET Framework projects too. Most of the time, NuGet packages are used to distribute shared runtime libraries
that are referenced by the project, but NuGet packages can be used for build tools too.
By adding a `<PackageReference>` line to your \*.csproj files, you can ensure that the tool is available, and
you can even automatically wire it up into the build.

Figuring out how to glue these pieces together is the tricky bit, so in the sections below, I've created some instructions for how to build a sample project. The focus of these steps is how to tie it all together, but not how to actually write MSBuild or a console tool.

## Goal

Let's say we want a build tool that will generate TypeScript files to match your C#. We want to have many projects that can use the tool like this.

```xml
<!-- MyCompany.Web.csproj -->
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>netcoreapp2.0</TargetFramework>
    <RootNamespace>MyCompany.Web</RootNamespace>
  </PropertyGroup>
  <ItemGroup>
    <Folder Include="wwwroot/ts-gen/" />

    <PackageReference Include="MyTypescriptGenerator" Version="1.0.0" />
  </ItemGroup>
</Project>
```

When executing `dotnet build`, all C# classes in the `MyCompany.Web.Typescript` namespace will get a \*.ts file generated into `wwwroot/ts-gen/`.

## Step 1 - build the tool as a console app

For this example, let's say we want a build tool that will generate TypeScript files to match your C#. As an additional requirement, let's make sure this tool works cross-platform, which means we will have both a .NET Framework and a .NET Core version
of this console tool.

Its usage will look like this:

```sh
# .NET Core projects
dotnet ts-gen.dll <ASSEMBLY_FILE> <OUTPUT_DIR> [--namespace <NAMESPACE>]
# .NET Framework projects
ts-gen.exe <ASSEMBLY_FILE> <OUTPUT_DIR> [--namespace <NAMESPACE>]
```

For the sake of this blog, I won't actually provide an implementation, but assume it is a console application that is build from a project like this.

```xml
<!-- MyTypescriptGenerator.csproj -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>exe</OutputType>
    <AssemblyName>ts-gen</AssemblyName>
    <TargetFrameworks>netcoreapp2.0;net46</TargetFrameworks>
  </PropertyGroup>
</Project>
```

## Step 2 - write an MSBuild target to invoke the tool

To wire this build tool into a compilation step of another project, you'll need a little MSBuild glue code. For this target, we will assume that a compiled version of our console tool will sit next to this targets file in this folder structure.

```
+ GenerateTypescript.targets
- net46/
  + ts-gen.exe
  + ts-gen.exe.config
- netcoreapp2.0/
  + ts-gen.dll
  + ts-gen.deps.json
  + ts-gen.runtimeconfig.json
```

A target that invokes the tool could look like this:

```xml
<!-- GenerateTypescript.targets -->
<Project>
  <PropertyGroup>
    <TsGenFileExe Condition="'$(TargetFrameworkIdentifier)' == '.NETFramework'">"$(MSBuildThisFileDirectory)/net46/ts-gen.exe"</TsGenFileExe>
    <TsGenFileExe Condition="'$(TargetFrameworkIdentifier)' == '.NETCoreApp' OR '$(TargetFrameworkIdentifier)' == '.NETStandard'">dotnet "$(MSBuildThisFileDirectory)/netcoreapp2.0/ts-gen.dll"</TsGenFileExe>
    <TypescriptOutput>"$(MSBuildProjectDir)/wwwroot/ts-gen/"</TypescriptOutput>
    <NamespaceFilter>$(RootNamespace).Typescript</NamespaceFilter>
  </PropertyGroup>

  <Target Name="GenerateTypescript" AfterTargets="CoreCompile">
    <Exec Command="$(TsGenFileExe) $(TargetPathWithTargetPlatformMoniker) $(TypescriptOutput) --namespace $(NamespaceFilter)" />
  </Target>
</Project>
```

## Step 3 - define your nuget package layout

NuGet relies on conventions to understand how files within the package should be used.
To tap into these conventions, our package will have the following layout

```
- lib/
  - netstandard1.0/
    + _._
  - net45/
    + _._

- build/
  - netstandard1.0/
    + MyTypescriptGenerator.targets
  - net45/
    + MyTypescriptGenerator.targets

- tools/
  + GenerateTypescript.targets
  - net46/
    + ts-gen.exe
    + ts-gen.exe.config
  - netcoreapp2.0/
    + ts-gen.dll
    + ts-gen.deps.json
    + ts-gen.runtimeconfig.json
```

### The lib folder and placeholder file ( \_.\_ )

As stated above, our goal is to support .NET Standard and .NET Framework projects.
By adding these two files -- `lib/netstandard1.0/_._` and `lib/net45/_._` -- we have instructed NuGet to treat this package as compatible with .NETStandard1.0 and .NETFramework4.5 and any other framework compatible with these, such as .NET Core. The `_._` file is known as the "NuGet placeholder file" and is just an empty text file.

### The build folder and the .targets file

NuGet will automatically import the `build/*/(package id).targets` file is imported into projects by using the same `TargetFramework` compatibility rules that guide the `lib/` folder.

By the way, it's important the file is named `$PackageId$.targets`. NuGet will ignore other files.

These files are a little bit of "glue". NuGet and MSBuild will automatically add `<Import>`'s from the consumer project to this file in your package, wherever it ends up on disk. These files can be identical and should look like this:

```xml
<!-- MyTypescriptGenerator.targets -->
<Project>
  <Import Project="$(MSBuildThisFileDirectory)/../../tools/GenerateTypescript.targets" />
</Project>
```

### nuspec

To wrap the tool and target into a package, we'll need to write a custom nuspec file
to package it altogether. The `$publishdir$` is treated as a variable that must be passed in during the packaging step.

Add a nuspec file to your project folder that looks like this:

```xml
<!-- ts-gen.nuspec -->
<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://schemas.microsoft.com/packaging/2012/06/nuspec.xsd">
  <metadata>
    <id>MyTypescriptGenerator</id>
    <version>1.0.0</version>
    <authors>Nate McMaster</authors>
  </metadata>
  <files>
    <file src="_._" target="lib/netstandard1.0/" />
    <file src="_._" target="lib/net45/" />
    <file src="MyTypescriptGenerator.targets" target="build/netstandard1.0/MyTypescriptGenerator.targets" />
    <file src="MyTypescriptGenerator.targets" target="build/net45/MyTypescriptGenerator.targets" />

    <file src="$publishdir$\net46\**\*" target="tools/net46/" />
    <file src="$publishdir$\netcoreapp2.0\**\*" target="tools/netcoreapp2.0/" />
  </files>
</package>
```

## Step 4 - package it

Let's go back to the \*.csproj file used to create `ts-gen.exe`. In order to make `dotnet pack` or `msbuild.exe /t:Pack` work correctly, we'll need to add settings to control how the `/t:Pack` target works.

To make sure our console tool works correctly, we need to first call `/t:Publish` to gather all files required to run the console tool on its own. We can chain `/t:Publish` in before `/t:Pack` by using `BeforeTargets`.

Note: due to quirks in MSBuild and NuGet, we'll actually use `BeforeTargets="GenerateNuspec"` not `BeforeTargets="Pack"`. See [NuGet.Build.Tasks.Pack.Library/Pack.targets](https://github.com/NuGet/NuGet.Client/blob/4.3.0.4202/src/NuGet.Core/NuGet.Build.Tasks.Pack.Library/Pack.targets) to see what's going on under the hood.

```xml
<!-- MyTypescriptGenerator.csproj -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>exe</OutputType>
    <AssemblyName>ts-gen</AssemblyName>
    <TargetFrameworks>netcoreapp2.0;net46</TargetFrameworks>
  </PropertyGroup>

  <!-- Pack settings -->
  <PropertyGroup>
    <NoPackageAnalysis>true</NoPackageAnalysis>
    <NuspecFile>ts-gen.nuspec</NuspecFile>
    <IntermediatePackDir>bin/$(Configuration)/publish/</IntermediatePackDir>
    <PublishDir>$(IntermediatePackDir)$(TargetFramework)/</PublishDir>
    <NuspecProperties>publishDir=$(IntermediatePackDir)</NuspecProperties>
  </PropertyGroup>

  <!-- Executes /t:Publish for all target frameworks before packing-->
  <Target Name="PublishAll" BeforeTargets="GenerateNuspec">
    <ItemGroup>
      <_TargetFramework Include="$(TargetFrameworks)" />
    </ItemGroup>
    <MSBuild Projects="$(MSBuildProjectFullPath)" Targets="Publish" Properties="TargetFramework=%(_TargetFramework.Identity)" />
  </Target>

</Project>
```

## Step 5 - pack

To build and package the target, you can use `dotnet pack` or `MSBuild.exe /t:Pack`.

```
dotnet pack MyTypescriptGenerator.csproj --output ./ --configuration Release
```

## Step 6 - install

Now that you have a \*.nupkg file, you can upload it NuGet.org or your own feed. Users can install
this task as a package reference.

```xml
<ItemGroup>
  <PackageReference Include="MyTypescriptGenerator" Version="1.0.0" />
</ItemGroup>
```

### What happens when you install

When a user executes NuGet restore, it will download and extract the package to the global NuGet
cache.

```
%USERPROFILE%\.nuget\packages\MyTypescriptGenerator\1.0.0\
```

It will also generate a file in `obj/$(MSBuildProject).nuget.g.targets` which is automatically included
in your csproj. This file will contain this line:

```xml
<Import Project="$(NuGetPackageRoot)mytypescriptgenerator/1.0.0/build/netstandard1.0/MyTypescriptGenerator.targets" />
```

When a user loads the project, your task will automatically load your \*.targets files from the NuGet
cache.

When a user executes `dotnet build`, MSBuild will also execute the target `/t:GenerateTypescript` because we added `AfterTargets="CoreCompile"` in our targets file.

# Next steps

Obviously, this is just a sample. There are a lot of other pieces to figure out. If you're looking for resources on using MSBuild, NuGet, or writing console tools, check out these resources.

 - [NuGet pack and restore as MSBuild targets](https://docs.microsoft.com/en-us/nuget/schema/msbuild-targets)
 - [Shipping a cross-platform MSBuild task in a NuGet package]({{ site.baseurl }}{% post_url /dev/2017-07-05-msbuild-task-in-nuget %})
 - A class library for writing console tools: [McMaster.Extensions.CommandLineUtils](https://github.com/natemcmaster/CommandLineUtils/)
