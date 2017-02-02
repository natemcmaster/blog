---
layout: post
title: Part 2 - Caveats of project.json to MSBuild conversion
subtitle: To convert is to change form, function, or beliefs. There will lots of this.
date: Feb. 1, 2017
---

This upgrade is not only a matter changing JSON vs XML: it’s about learning and using a fundamentally 
different technology, MSBuild. Regardless of how big or small your .NET Core project is, you are likely to 
run into some subtle, big, and bewildering changes to how your build system as you convert.
Here is a collection of obvious and not-so-obvious caveats to the MSBuild conversion process. 

This is a follow up to 
**[Project.json to MSBuild conversion guide]({{ site.baseurl }}{% post_url /dev/2017-01-19-project-json-to-csproj %})**

# No project.json in VS 2017

And also, no .NET Core csproj for VS 2015. This means you **must** upgrade to csproj to build .NET Core projects in VS 2017,
and you **must not** upgrade to csproj if you only have VS 2015.

Also, even on command-line only (shout-out to MacBook .NET devs), you can't reference csproj &lt;=&gt; project.json.

**On the bright side :partly_sunny:**

VS Code rocks. With the C# extension (as of 1.6.0), you can do either project.json or csproj.

# global.json is not completely dead

.NET Core CLI RC3 and newer still support "global.json".

**The Caveat :warning:**

The CLI only uses one property, sdk > version.

```json
{
    "sdk": { "version": "1.0.0-rc3-004350" }
}
```

The "projects" property is ignored.

# .NET Core CLI tools

Most .NET Core CLI tools in existence require project.json. 

**The Caveat :warning:** At the time of writing, only a handful have been ported to support csproj.
All of them will still install, but they won't work correctly.

Before:

```json
{
    "tools": {
        "Microsoft.DotNet.Watcher.Tools": "1.0.0-preview2-final",
        "Microsoft.AspNetCore.Server.IISIntegration.Tools": "1.0.0-preview2-final"
    }
}
```

After:

```xml
<!-- works :) -->
<DotNetCliToolReference Include="Microsoft.DotNet.Watcher.Tools" Version="1.0.0" />

<!-- doesn't :( -->
<DotNetCliToolReference Include="Microsoft.AspNetCore.Server.IISIntegration.Tools" Version="1.0.0-preview2-final" />
```

### Side note: about Microsoft.AspNetCore.Server.IISIntegration.Tools...

I was the one [who deleted Microsoft.AspNetCore.Server.IISIntegration.Tools](https://github.com/aspnet/IISIntegration/pull/259).
Don't worry, you don't need it in MSBuild.
Its functionality is replaced by using 'Microsoft.NET.Sdk.Web'.

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
</Project>
```

# dotnet-test-xunit

The new "dotnet-test" is fundamentally different, and dotnet-test-xunit is dead.

After converting several dozen repos, I have found that mostly things still work, with a few exceptions.

**CI test reporting**

dotnet-test-xunit automatically lit up tests on AppVeyor.com and TeamCity.

To replace this, you must instead call `dotnet test --logger:trx`. This produces an XML file.
Here's how various CI's handle .trx files.

- [AppVeyor - uploading xml files](https://www.appveyor.com/docs/running-tests/#uploading-xml-test-results)
- [TeamCity - xml report processing](https://confluence.jetbrains.com/display/TCD9/XML+Report+Processing)
- VSTS - use ["VSTS Publish Test Results Task"](https://www.visualstudio.com/en-us/docs/build/steps/test/publish-test-results) 

**Filtering tests by trait**

Can't be done, as far as I know.

**Working directory (RC3 only, should be fixed for RTM)**

The working directory of .NET Core tests is not the project directory. Any test that relies on
`Directory.GetCurrentDirectory()` (even implicitly as in `File.ReadAllText("log.txt")`) will fail
after upgrading. You can work around it by using `System.AppContext.BaseDirectory`, which is the 
"bin/Debug/netcoreapp1.0/" folder. On .NET Framework, use `AppDomain.CurrentDomain.BaseDirectory`. 

**AppDomains**

Most tests using `AppDomain.CreateDomain` will fail unless you also specify `AppDomainSetup.ApplicationBase`.
It's still unclear if this is a side effect of the working directory issue, but basically


# The re-architected build system

The new .NET Core SDK is fundamentally re-architected. 
If you primarily use "dotnet restore" and "dotnet build", you may not notice this at first.

With project.json, "dotnet.exe" was the foundation of how a project was compiled and run.
With the new SDK, the "csproj" flavor, the foundation is now MSBuild. Many "dotnet" subcommands
are command-line sugar for MSBuild equivalents.

Examples of equivalent commands:

```
dotnet restore
dotnet msbuild /nologo /t:Restore
```

```
dotnet build --framework netcoreapp1.0 --verbosity detailed
dotnet msbuild /nologo /t:Build /p:TargetFramework=netcoreapp1.0 /verbosity:detailed
```

```
dotnet test --no-build
dotnet msbuild /nologo /t:VSTest /p:VSTestNoBuild=true 
```

Notice I said "most". Not all. "dotnet-migrate" and "dotnet-add" to name a few are not simply
MSBuild-sugar.

**The Caveat :warning:**

These commands allow you to mix **dotnet.exe** and **MSBuild.exe** command line flags by
adding dotnet-cli flags first and MSBuild flags last.

For example, these are also equivalent
```
dotnet build --framework netcoreapp1.0
dotnet build /p:TargetFramework=netcoreapp1.0
```


# Visual Studio vs "dotnet.exe"

With project.json projects, Visual Studio 2015 used so start a new shell execute of "dotnet.exe"

    Visual Studio Build => C:\Program Files\dotnet\dotnet.exe

Installing a new version of dotnet.exe was just a matter up updating what was inside C:\Program Files\dotnet\.

**The Caveat 1 :warning:**

Visual Studio 2017 does _not_ shell execute dotnet.exe. 

    Visual Studio Build => C:\Program Files (x86)\Microsoft Visual Studio\2017\Enterprise\MSBuild\15.0\Bin\MSBuild.exe

VS 2017 has and entire duplicate of the MSBuild targets. You must upgrade _both_ places to get updates.

    C:\Program Files\dotnet\sdk\1.0.0-rc3-004350\Microsoft.CSharp.targets
    C:\Program Files (x86)\Microsoft Visual Studio\2017\Enterprise\MSBuild\15.0\Bin\Microsoft.CSharp.targets

**On the bright side :partly_sunny:**

This means you don't need dotnet.exe to build things.

From the Visual Studio Developer Command Prompt, these are *usually equivalent

```
dotnet build
dotnet msbuild /t:Build
MSBuild.exe /t:Build
```

**The Caveat 2 :warning:**

I said *usually. If you install a download a new version of dotnet.exe, Visual Studio will not use it. You must also
update Visual Studio to get updates.


# MSBuild.exe vs dotnet msbuild

**This one is all Caveat :warning:**

dotnet-msbuild and MSBuild.exe may look the same, but they are not.

## Built-in targets

They do not have the same set of build-in targets.

MSBuild.exe can build Xamarin, UWP, TypeScript, Docker projects, (classic) .NET Framework,
:drumroll: Microsoft.NET.Sdk projects.

dotnet msbuild (for now) can only build Microsoft.NET.Sdk projects.

## Under-the-hood runtime

dotnet msbuild runs on .NET Core, MSBuild.exe runs on .NET Framework

This has big implications for those writing MSBuild tasks. To make your task work in both places,
you must cross-compile for task assembly or target netstandard1.3.

It also means that it is possible to hit a bug building with "dotnet.exe", but it will work fine with MSBuild.exe



# Changes in dotnet command line syntax

Here are just a few examples of changes to dotnet commands.

## Recursive dotnet-restore

In preview 2, executing "dotnet restore" used to recursively search for any file in all subdirectories
named 'project.json'.

**The Caveat :warning:**

dotnet restore only searches the current directory for a file ending in *.sln or *.*proj
and restores that.

**On the bright side :partly_sunny:**

dotnet restore will include the transitive closure of all projects referenced from your 
solution or project file. That didn't work with project.json.

## Globs

In preview 2, some commands, like dotnet-build supported globs.

    dotnet build src/*/project.json

**The Caveat :warning:**

You can only call 'dotnet build' on one file. 

    dotnet build App.csproj
    dotnet build Project.sln

**On the bright side :partly_sunny:**

dotnet build supports solution files.

## Global verbose flag

In preview 2, you could prepend `--verbose` to all subcommands.

    dotnet --verbose subcommand

**The Caveat :warning:**

This flag no longer works and will cause an error.

**On the bright side :partly_sunny:**

There are all many levels of verbosity.

    dotnet build --verbosity (value)     
    Allowed values are: q[uiet] m[inimal] n[ormal] d[etailed] diag[nostic]

## dotnet-test

In preview 2, test frameworks, like dotnet-test-xunit, controlled dotnet-test syntax.

    dotnet test -method NameSpace.Class.Method

**The Caveat :warning:**

Now, all test framework must use the same syntax which is determined by VSTest...and IMO it's not as easy to use.

    dotnet test --filter FullyQualifiedName=NameSpace.Class.Method

# Conclusion

This upgrade is not just a matter of JSON vs XML. It's really about MSBuild.

MSBuild is an 'old' technology (i.e. invented before I went to college). This means
it is a veteran, fully-featured build technology.
It is the backbone of Visual Studio.
It has features project.json never had, such as file logging, parallel builds, incremental builds,
and distributing custom-build steps via NuGet.

**The Caveat**

It may be old, but it's probably new to you. 

Don't worry, you'll pick it up. Cheers,

Nate.