---
layout: post
title: Project.json to MSBuild conversion guide
date: Jan. 19, 2017
---

If you been given the unenviable task of migrating your .NET Core project from 'project.json'
to MSBuild (csproj), you are likely to find your muscle memory disrupted and the
documentation lacking. Automated upgrades in Visual Studio and .NET Core CLI may
auto-generate a csproj file for you, but they won't tell you how to do things you
already know how to do in project.json. Here is the most exhaustive list I can create
of all the project.json knobs as they exist in Microsoft.NET.Sdk.

**See also: [Part 2 - Caveats of project.json to MSBuild conversion]({{ site.baseurl }}{% post_url /dev/2017-02-01-project-json-to-csproj-part2 %})**

Missing something? Post your question in comment section below and I will update this post.

# dotnet migrate

[.NET Core CLI RC3 Downloads](https://github.com/dotnet/core/blob/master/release-notes/rc3-download.md)

(As of January 2017) the latest .NET Core CLI is the RC3 release.
This is required to use the MSBuild-based .NET Core SDK.
The RC3 version of dotnet includes a new command, `dotnet migrate`. This command will attempt
to automatically convert all _project.json_ projects to MSBuild.

For help on usage, execute `dotnet migrate --help`.

Tip: if you get an error, "No executable found matching command "dotnet-migrate"", check that:

1. If you have a global.json file in the current or parent directires, ensure it does not set the
   "sdk" version set to an older version.
1. The RC3 version is installed. Run `dotnet --info` to see which version you are using.

## Visual Studio 2017 RC

[Visual Studio 2017 RC Downloads](https://www.visualstudio.com/vs/visual-studio-2017-rc/)

The same auto-upgrade feature of dotnet-migrate is available in Visual Studio 2017.
When attempting to open a Visual Studio
solution that has "xproj" projects in it, VS will convert from project.json to the new MSBuild format.
(xproj was a VS wrapper for project.json).

# csproj

The new format, *.csproj, is an XML based format. Below are examples of how to 
configure a .NET Core, .NET Standard, or .NET Framework project using the new Microsoft.NET.Sdk. 

For all examples below, assume the XML is inside this root node:

```xml
<Project Sdk="Microsoft.NET.Sdk" ToolsVersion="15.0">
</Project>
```

# Common top-level properties

## name
```json
{
  "name": "MyProjectName"
}
```

Not supported. In csproj, this is determined by the filename, e.g. `MyProjectName.csproj`.

## version
```json
{
  "version": "1.0.0-alpha-*"
}
```

```xml
<PropertyGroup>
  <VersionPrefix>1.0.0</VersionPrefix>
  <VersionSuffix>alpha</VersionSuffix>
</PropertyGroup>
```

You can also use `Version`, but this may override version settings during packaging.

```xml
<PropertyGroup>
  <Version>1.0.0-alpha</Version>
</PropertyGroup>
```

## Other common root-level options
```json
{
  "authors": [ "Anne", "Bob" ],
  "company": "Contoso",
  "language": "en-US",
  "title": "My library",
  "description": "This is my library.\r\nAnd it's really great!",
  "copyright": "Nugetizer 3000",
  "userSecretsId": "xyz123"
}
```

```xml
<PropertyGroup>
  <Authors>Anne;Bob<Authors>
  <Company>Contoso<Company>
  <NeutralLanguage>en-US</NeutralLanguage>
  <AssemblyTitle>My library</AssemblyTitle>
  <Description>This is my library.
And it's really great!</Description>
  <Copyright>Nugetizer 3000</Copyright>
  <UserSecretsId>xyz123</UserSecretsId>
</PropertyGroup>
```

# frameworks

## One frameworks
```json
{
  "frameworks": {
    "netcoreapp1.0": {}
  }
}
```

```xml
<PropertyGroup>
  <TargetFramework>netcoreapp1.0</TargetFramework>
</PropertyGroup>
```

## Multiple frameworks
```json
{
  "frameworks": {
    "netcoreapp1.0": {},
    "net451": {}
  }
}
```

```xml
<PropertyGroup>
  <TargetFrameworks>netcoreapp1.0;net451</TargetFrameworks>
</PropertyGroup>
```

# dependencies

NB: If the dependency is a **project**, not a package the format is different. See
the section below on [dependency types](#dependency-type)

## Top-level
```json
{
  "dependencies": {
    "Microsoft.AspNetCore": "1.1.0"
  }
}
```

```xml
<ItemGroup>
  <PackageReference Include="Microsoft.AspNetCore" Version="1.1.0" />
</ItemGroup>
```

## Per-framework
```json
{
  "framework": {
    "net451": {
      "dependencies": {
        "System.Collections.Immutable": "1.3.1"
      }
    },
    "netstandard1.5": {
      "dependencies": {
        "Newtonsoft.Json": "9.0.1"
      }
    }
  }
}
```

```xml
<ItemGroup Condition="'$(TargetFramework)'=='net451'">
  <PackageReference Include="System.Collections.Immutable" Version="1.3.1" />
</ItemGroup>

<ItemGroup Condition="'$(TargetFramework)'=='netstandard1.5'">
  <PackageReference Include="Newtonsoft.Json" Version="9.0.1" />
</ItemGroup>
```

## imports
```json
{
  "dependencies": {
    "YamlDotNet": "4.0.1-pre309"
  },
  "frameworks": {
    "netcoreapp1.0": {
      "imports": [
        "dnxcore50",
        "dotnet"
      ]
    }
  }
}
```

```xml
<PropertyGroup>
  <PackageTargetFallback>dnxcore50;dotnet</PackageTargetFallback>
</PropertyGroup>
<ItemGroup>
  <PackageReference Include="YamlDotNet" Version="4.0.1-pre309" />
</ItemGroup>
```

## dependency type

### type: project
```json
{
  "dependencies": {
    "MyOtherProject": "1.0.0-*",
    "AnotherProject": {
      "type": "project"
    }
  }
}
```

```xml
<ItemGroup>
  <ProjectReference Include="..\MyOtherProject\MyOtherProject.csproj" />
  <ProjectReference Include="..\AnotherProject\AnotherProject.csproj" />
</ItemGroup>
```

NB: this will break the way that `dotnet pack --version-suffix $suffix` determines the 
dependency version of a project reference.


### type: build
```json
{
  "dependencies": {
    "Microsoft.EntityFrameworkCore.Design": {
      "version": "1.1.0",
      "type": "build"
    }
  }
}
```

```xml
<ItemGroup>
  <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="1.1.0" PrivateAssets="All" />
</ItemGroup>
```

### type: platform
```json
{
  "dependencies": {
    "Microsoft.NETCore.App": {
      "version": "1.1.0",
      "type": "platform"
    }
  }
}
```

There is no equivalent in csproj. Microsoft.NET.Sdk automagically knows about Microsoft.NETCore.App.

# runtimes
```json
{
  "runtimes": {
    "win7-x64": {},
    "osx.10.11-x64": {},
    "ubuntu.16.04-x64": {}
  }
}
```

```xml
<PropertyGroup>
  <RuntimeIdentifiers>win7-x64;osx.10-11-x64;ubuntu.16.04-x64</RuntimeIdentifiers>
</PropertyGroup>
```

## Standalone apps (self-contained deployment)
In project.json, defining a 'runtimes' section mean the app was standalone during
build and publish.
In MSBuild, all projects are 'portable' during build, but can be published as
standalone.

```
dotnet publish --framework netcoreapp1.0 /p:RuntimeIdentifier=osx.10.11-x64
```

# tools
```json
{
  "tools": {
    "Microsoft.EntityFrameworkCore.Tools.DotNet": "1.0.0-*"
  }
}
```

```xml
<ItemGroup>
  <DotNetCliToolReference Include="Microsoft.EntityFrameworkCore.Tools.DotNet" Version="1.0.0" />
</ItemGroup>
```

NB: "imports" on tools are no longer supported in csproj. Tools that need imports will not work with
the new Microsoft.NET.Sdk.

# buildOptions

See also [Files](#files).

## emitEntryPoint
```json
{
  "buildOptions": {
    "emitEntryPoint": true
  }
}
```

```xml
<PropertyGroup>
  <OutputType>Exe</OutputType>
</PropertyGroup>
```

```json
{
  "buildOptions": {
    "emitEntryPoint": false
  }
}
```

```xml
<PropertyGroup>
  <OutputType>Library</OutputType>
  <!-- or, omit altogether. It defaults to 'Library' -->
</PropertyGroup>
```

## keyFile
This one gets special mention because it expands to three properties in MSBuild.

```json
{
  "buildOptions": {
    "keyFile": "MyKey.snk"
  }
}
```

```xml
<PropertyGroup>
  <AssemblyOriginatorKeyFile>MyKey.snk</AssemblyOriginatorKeyFile>
  <SignAssembly>true</SignAssembly>
  <PublicSign Condition="'$(OS)' != 'Windows_NT'">true</PublicSign>
</PropertyGroup>
```

## Other common build options

```json
{
  "buildOptions": {
    "warningsAsErrors": true,
    "nowarn": ["CS0168", "CS0219"],
    "xmlDoc": true,
    "preserveCompilationContext": true,
    "outputName": "Different.AssemblyName",
    "debugType": "portable",
    "allowUnsafe": true,
    "define": ["TEST", "OTHERCONDITION"]
  }
}
```

```xml
<PropertyGroup>
  <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  <NoWarn>$(NoWarn);CS0168;CS0219</NoWarn>
  <GenerateDocumentationFile>true</GenerateDocumentationFile>
  <PreserveCompliationContext>true</PreserveCompliationContext>
  <AssemblyName>Different.AssemblyName</AssemblyName>
  <DebugType>portable</DebugType>
  <AllowUnsafeBlocks>true</AllowUnsafeBlocks>
  <DefineConstants>$(DefineConstants);TEST;OTHERCONDITION</DefineConstants>
</PropertyGroup>
```

# packOptions

See also [Files](#files).

## Common pack options
```json
{
  "packOptions": {
    "summary": "A bundle of cats",
    "tags": ["hyperscale", "cats"],
    "owners": [ "Nate", "Jenna" ],
    "releaseNotes": "Version 1.0",
    "iconUrl": "https://icons.com/awesomeness.png",
    "projectUrl": "https://github.com/natemcmaster",
    "licenseUrl": "https://www.apache.org/licenses/LICENSE-2.0",
    "requireLicenseAcceptance": false,
    "repository": {
      "type": "git",
      "url": "https://github.com/natemcmaster/natemcmaster.github.io"
    }
  }
}
```

```xml
<PropertyGroup>
  <Summary>A bundle of cats</Summary>
  <PackageTags>hyperscale;cats</PackageTags>
  <PackageReleaseNotes>Version 1.0</PackageReleaseNotes>
  <PackageIconUrl>https://icons.com/awesomeness.png</PackageIconUrl>
  <PackageProjectUrl>https://github.com/natemcmaster</PackageProjectUrl>
  <PackageLicenseUrl>https://www.apache.org/licenses/LICENSE-2.0</PackageLicenseUrl>
  <PackageRequireLicenseAcceptance>false</PackageRequireLicenseAcceptance>
  <RepositoryType>git</RepositoryType>
  <RepositoryUrl>https://github.com/natemcmaster/natemcmaster.github.io</RepositoryUrl>
  <!-- regrettably, 'owners' does not translate to MSBuild. -->
</PropertyGroup>
```


# scripts

```json
{
  "scripts": {
    "precompile": "generateCode.cmd",
    "postpublish": [ "obfuscate.cmd", "removeTempFiles.cmd" ]
  }
}
```

Their equivalent in MSBuild are targets.

```xml
<Target Name="MyPreCompileTarget" BeforeTargets="Build">
  <Exec Command="generateCode.cmd" />
</Target>

<Target Name="MyPostCompileTarget" AfterTargets="Publish">
  <Exec Command="obfuscate.cmd" />
  <Exec Command="removeTempFiles.cmd" />
</Target>
```


# runtimeOptions

```json
{
  "runtimeOptions": {
    "configProperties": {
      "System.GC.Server": true
    }
  }
}
```

All settings in this group should be placed into a file in the project folder called
`runtimeconfig.template.json`, with options lifted to root object.

```json
{
  "configProperties": {
    "System.GC.Server": true
  }
}
```

# shared
```json
{
  "shared": "shared/**/*.cs"
}
```

Not supported in csproj. You must instead create a 'contentFiles' package. See <https://docs.nuget.org> for more info.

# files

In project.json, build and pack could be extended to compile and embed from different folders.
In MSBuild, this is done using items. Here is a common conversion:

```json
{
  "buildOptions": {
    "compile": {
      "copyToOutput": "notes.txt",
      "include": "../Shared/*.cs",
      "exclude": "../Shared/Not/*.cs"
    },
    "embed": {
      "include": "../Shared/*.resx"
    }
  },
  "packOptions": {
    "include": "Views/",
    "mappings": {
      "some/path/in/project.txt": "in/package.txt"
    }
  },
  "publishOptions": {
    "include": [
      "files/",
      "publishnotes.txt"
    ]
  }
}
```

```xml
<ItemGroup>
  <Compile Include="..\Shared\*.cs" Exclude="..\Shared\Not\*.cs" />
  <EmbeddedResource Include="..\Shared\*.resx" />
  <Content Include="Views\**\*" PackagePath="%(Identity)" />
  <None Include="some/path/in/project.txt" Pack="true" PackagePath="in/package.txt" />
  
  <None Include="notes.txt" CopyToOutputDirectory="Always" />
  <!-- CopyToOutputDirectory = { Always, PreserveNewest, Never } -->

  <Content Include="files\**\*" CopyToPublishDirectory="PreserveNewest" />
  <None Include="publishnotes.txt" CopyToPublishDirectory="Always" />
  <!-- CopyToPublishDirectory = { Always, PreserveNewest, Never } -->
</ItemGroup>
```

NB: many of default globbing patterns are added automatically by Microsoft.NET.Sdk
and Microsoft.NET.Sdk.Web. 

All MSBuild ItemGroup's support 'Include', 'Exclude', and 'Remove'.

Package layout inside the nupkg can be modified with `PackagePath="path"`.

Except for "Content", most item groups require explicitly adding `Pack="true"` to 
be included in the package. By default, this will be but in the 'content' folder
in a package. `PackagePath="%(Identity)"` is a short way of setting package path
to the project-relative file path.

# testRunner

## xunit

```json
{
  "testRunner": "xunit",
  "dependencies": {
    "dotnet-test-xunit": "<any>"
  }
}
```

```xml
<ItemGroup>
  <PackageReference Include="Microsoft.NET.Test.Sdk" Version="15.0.0-*" />
  <PackageReference Include="xunit" Version="2.2.0-*" />
  <PackageReference Include="xunit.runner.visualstudio" Version="2.2.0-*" />
</ItemGroup>
```

## mstest

```json
{
  "testRunner": "mstest",
  "dependencies": {
    "dotnet-test-mstest": "<any>"
  }
}
```

```xml
<ItemGroup>
  <PackageReference Include="Microsoft.NET.Test.Sdk" Version="15.0.0-*" />
  <PackageReference Include="MSTest.TestAdapter" Version="1.0.0-*" />
  <PackageReference Include="MSTest.TestFramework" Version="1.0.0-*" />
</ItemGroup>
```

For more details, checkout
**[Part 2 - Caveats of project.json to MSBuild conversion]({{ site.baseurl }}{% post_url /dev/2017-02-01-project-json-to-csproj-part2 %})**