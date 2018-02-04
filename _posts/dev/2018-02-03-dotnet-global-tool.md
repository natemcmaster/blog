---
layout: post
title: .NET Core Global Tools and Gotchas
subtitle: Getting started with using or creating a .NET Core global tool package, and how to deal with the gotchas
date: Feb. 2, 2018
tags:
- dotnet
- nuget
---

As announced recently in the [.NET Core 2.1 Roadmap](https://blogs.msdn.microsoft.com/dotnet/2018/02/02/net-core-2-1-roadmap/),
the .NET Core 2.1.300 SDK will add a feature called ".NET Core Global Tools". This announcement contains a brief snippet of how the tools will work. As this feature is new, there are some rough edges.
In this post, I'll go over the basic design of how global CLI tool should work, some of the gotchas,
and how to make it all owrk.

For those who want to get started on code right away, checkout the project templates
in <https://github.com/natemcmaster/DotNetGlobalTool>.
You will need to [download a pre-release build](https://github.com/dotnet/versions/tree/master/build-info/dotnet/product/cli/release/2.1) of the .NET Core CLI that supports these features.

_**At the time of writing this post**, this feature is still in progress and is subject to change._

_Tip: For a real-world example of creating global tools, see <https://github.com/aspnet/DotNetTools/>, which contains
the source code for a handful of .NET Core global tools created by the ASP.NET Core team._

## Basic design

A .NET Core global tool is a special NuGet package that contains a console application.
When installing a tool, .NET Core CLI will download the package, extract it to disk, and make your console
tool available as a new command in your shell by adding to the PATH environment variable.

Users install tools by executing "dotnet install tool":

    > dotnet install tool -g awesome-tool

Once installed, the command contained in the "awesome-tool" package are on PATH.

    > awesome-tool

## Creating your own package

To simplify getting started, I've created a [project templates](https://github.com/natemcmaster/DotNetGlobalTool).

Install the templates package

    dotnet new --install "McMaster.DotNet.GlobalTool.Templates::2.1.300-preview1"

Create a new project

    dotnet new global-tool --command-name awesome-tool

Once you have this project, you can create your tool package like this:

    dotnet pack --output ./

This creates a file named `awesome-tool.1.0.0.nupkg`
You can install your package like this:

    dotnet install tool -g awesome-tool --source ./

When you are ready to share with world, upload the package to <https://nuget.org>.

## Under the hood

The NuGet package that contains a global tool must completely contain the application. Unlike project tools (aka `DotNetCliToolReference`), you produce a package by executing `dotnet publish`, and putting everything that is
in the publish output into the NuGet package.

When `dotnet install tool` executes, it...

 1. uses `dotnet restore` with [special parameters](https://github.com/dotnet/cli/pull/8414) to fetch the package.
 2. extracts the package into `%USERPROFILE%\.dotnet\toolspkgs` (Windows) or `$HOME/.dotnet/toolspkgs` (macOS/Linux).
 3. Generates an executable shim from the extract packge into `%USERPROFILE%\.dotnet\tools` or `$HOME/.dotnet/tools`

The executable shim generation is controlled by a file named `DotnetToolSettings.xml`. It's basic format looks like this.

```xml
<?xml version="1.0" encoding="utf-8" ?>
<DotNetCliTool>
  <Commands>
    <Command Name="my-command-name" EntryPoint="MyApp.dll" Runner="dotnet" />
  </Commands>
</DotNetCliTool>
```

## Gotchas

**At the time of writing this post**, this feature has some restrictions and unexpected behaviors. These may change as the feature evolves.

### Gotcha 1 - there is no uninstall (yet)

There is no uninstall after `dotnet install tool`.

I'm willing to bet this will change by RTM. But for previews, you can manually uninstall tools by deleting this files:

    (Windows)
    %USERPROFILE%\.dotnet\tools\awesome-tool.exe
    %USERPROFILE%\.dotnet\tools\awesome-tool.exe.config
    %USERPROFILE%\.dotnet\toolspkgs\awesome-tool\

    (macOS/Linux)
    $HOME/.dotnet/tools/awesome-tool
    $HOME/.dotnet/toolspkgs/awesome-tool/

### Gotcha 2 - PATH

    > dotnet install tool -g awesome-tool

    > awesome-tool
    awesome-tool: command not found
    awesome-tool : The term 'awesome-tool' is not recognized as the name of a cmdlet, function, script file, or operable program.

Global tools are installed to `%USERPROFILE%\.dotnet\tools` (Windows) or `$HOME/.dotnet/tools` (macOS/Linux). The .NET Core CLI tool makes a best effort to help you ensure this is in your PATH environment variable. However, this
can easily be broken. For instance:

 - if you have set the `DOTNET_SKIP_FIRST_TIME_EXPERIENCE` environment variable to speed up intial runs of .NET Core, then your PATH may not be updated on first use
 - **macOS**: if you install the CLI via `.tar.gz` and not `.pkg`, you'll be missing the `/etc/paths.d/dotnet-cli-tool` file that configures PATH.
 - **Linux:** you will need to edit your shell environment file. e.g. `~/.bash_profile` or `~/.zshrc`


**Workarounds**

(May require restarting your shell.)

Windows:

    setx PATH "$env:PATH;$env:USERPROFILE/.dotnet/tools"

Linux/macOS:

    echo "export PATH=\"\$PATH:\$HOME/.dotnet/tools\"" >> ~/.bash_profile

### Gotcha 3 - tools are user-specific, not machine global

The .NET Core CLI installs global tools to `$HOME/.dotnet/tools` (Linux/macOS) or `%USERPROFILE%\.dotnet\tools` (Windows).
This means you cannot install a global tool for the entire machine using `dotnet install tool --global`.
Installed tools are only available to the user who installed them.

## Package authoring and SDK

The best experience for authoring a global tool requires a .NET Core SDK version 2.1.300-preview1-008000 or newer.
This SDK provides a few simple settings that adjust package layout to match the requirements for .NET Core global tools.
You only need to add two properties to enable packing the project as a global tool.

1. PackAsTool=true
2. ToolCommandName

Example:
```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <ToolCommandName>awesome-tool</ToolCommandName>
    <PackAsTool>true</PackAsTool>
    <OutputType>Exe</OutputType>
    <TargetFramework>netcoreapp2.0</TargetFramework>
  </PropertyGroup>

</Project>
```

**Tip:** Until .NET Core 2.1 is released, you may warnings when calling `dotnet pack` on this project. To workaround this, add the following:

```xml
<PropertyGroup>
  <NETCorePlatformsImplicitPackageVersion>2.0.1</NETCorePlatformsImplicitPackageVersion>
</PropertyGroup>
```

I recommend this for now as it will also prevent an install error for users that would look like this:

    error NU1102: Unable to find package Microsoft.NETCore.Platforms with version (>= 2.1.0-preview1-26202-03)

## Deep-dive: package requirements

There are some very specific requirements for CLI global tools. The SDK takes care of most of these for you
when you specify PackAsTool=true.

If you cannot yet upgrade to a nightly build of the .NET Core SDK but want to try this out, you can workaround these restrictions. The templates package [McMaster.DotNet.GlobalTool.Templates, version 2.1.300-preview-build7](https://www.nuget.org/packages/McMaster.DotNet.GlobalTool.Templates/2.1.300-preview1-build7)
contains a template that workarounds this for older SDKs.

    dotnet new --install "McMaster.DotNet.GlobalTool.Templates::2.1.300-preview1-build7"

### Publish output into pack

As mentioned above, the tools package must contain all your apps dependencies.
This can be collected into one place by using `dotnet publish`.
By default, `dotnet pack` only contains the output of `dotnet build`.
This output does not normally contain third-party assemblies, static files, and the `DotnetToolSettings.xml` file,
which is why you need to publish, not just build.

Early version of the SDK don't support packing global tools. You can workaround this by chaining
publish before dotnet-pack, and using a .nuspec file.

```xml
  <!-- In .csproj file -->
  <PropertyGroup>
    <NuspecFile>globaltool.nuspec</NuspecFile>
  </PropertyGroup>

  <ItemGroup>
    <Content Include="DotnetToolSettings.xml" CopyToPublishDirectory="PreserveNewest" />
  </ItemGroup>

  <Target Name="PackGlobalTool" BeforeTargets="GenerateNuspec" DependsOnTargets="Publish">
    <PropertyGroup>
      <NuspecProperties>
        publishDir=$(PublishDir);
      </NuspecProperties>
    </PropertyGroup>
  </Target>
```
```xml
<!-- In your .nuspec file -->
<package xmlns="http://schemas.microsoft.com/packaging/2012/06/nuspec.xsd">
  <!-- ... -->
  <files>
    <file src="$publishdir$" target="tools/netcoreapp2.0/any/" />
  </files>
</package>
```

### Error NU1202 and "Microsoft.NETCore.Platforms"

A global tool package must specify a dependency to "Microsoft.NETCore.Platforms". This is required because
dotnet-install-tool does some magic stuff. Ask me about this in the comments if you want me to explain. Without this dependency, the package will fail to install with

```
 error NU1202: Package is not compatible with netcoreapp2.1 (.NETCoreApp,Version=v2.1) / win10-x64.
```

To workaround, add this to your nuspec:

```xml
<package xmlns="http://schemas.microsoft.com/packaging/2012/06/nuspec.xsd">
  <metadata>
    <!-- ... -->
    <dependencies>
      <dependency id="Microsoft.NETCore.Platforms" version="2.0.1" />
    </dependencies>
  </metadata>
  <!-- ... -->
</package>
```

See [this GitHub issue](https://github.com/dotnet/cli/issues/8418) for details.

### Restrictions on DotnetToolSettings.xml

The schema for this file looks like this:

```xml
<DotNetCliTool>
  <Commands>
    <Command Name="$name" EntryPoint="$file" Runner="$runner" />
  </Commands>
</DotNetCliTool>
```

Lots of restrictions here:

  - The file must exist in the NuGet package under `tools/$targetframework/$runtimeidentifier/`. If your application is portable to all platforms, use `any` as the `$runtimeidentifier`. Example: `tools/netcoreapp2.0/any/DotnetToolSettings.xml`

  - You may only specify one `DotnetToolSettings.xml` file per package.

  - You may only specify one `<Command>` per `DotnetToolSettings.xml` file.

  - The only allowed value for `Runner` is `"dotnet"`.

  - The value for `EntryPoint` must be a `.dll` file that sits next to `DotnetToolSettings.xml` in the package.

### Error NU1212 and package type

Installation may fail with this error

    error NU1212: Invalid project-package combination for awesome-tool 1.0.0. DotnetToolReference project style can only contain references of the DotnetTool type

What this means is that dotnet-install-tool is currently restricted to only installing a .NET Core package that has specific metadata. That metadata can be defined in your nuspec file and must be set as follows:

```xml
<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://schemas.microsoft.com/packaging/2012/06/nuspec.xsd">
  <metadata>
    <!-- ... -->
    <packageTypes>
      <packageType name="DotnetTool" />
    </packageTypes>
    <!-- ... -->
  </metadata>
</package>
```

### Dependencies

You must redistribute any of your dependencies in your tools package. Dependencies define in the `<dependencies>` metadata of your NuGet package are not
honored by dotnet-install-tool.

## Wrapping up

This is an awesome feature. Super happy the .NET Core CLI team is working on it. Can't wait to see what people make.
