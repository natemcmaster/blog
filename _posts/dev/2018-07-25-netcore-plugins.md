---
layout: post
title: .NET Core Plugins
subtitle: Introducing an API for loading .dll files (and their dependencies) as 'plugins'
date: July 25, 2018
author: Nate
tags:
- dotnet
---

I recently [published][nuget-pkg] a new package for .NET Core developers that want
to implement a plugin system. Dynamic assembly loading in .NET Core is difficult to get right. The API in this package
wrangles the complexity through a feature called 'load contexts'. In this post, I'll walk through problems that motivated the creation of this
project, and explain what the API can do. My hope is that this plugin API will let you focus more on
writing your app, and put an end to the inevitable mess of creating your own assembly loading code.

[nuget-pkg]: https://nuget.org/packages/McMaster.NETCore.Plugins

**TL;DR?**

 * the [the project source is visible on GitHub](https://github.com/natemcmaster/DotNetCorePlugins)
 * the package is on NuGet.org. [`McMaster.NETCore.Plugins`][nuget-pkg], v0.1.0.
 * a complete [code sample is available here.](https://github.com/natemcmaster/DotNetCorePlugins/tree/v0.1.0/samples/aspnetcore)


## Introducing McMaster.NETCore.Plugins

The foundation of `McMaster.NETCore.Plugins` is `AssemblyLoadContext` (more on this below). The API in `McMaster.NETCore.Plugins` ties together the understanding of how ALC works, and how `dotnet.exe` (aka corehost) reads deps.json files and runtimeconfig.json files to find dependencies. In the end,
you should be able to use this new API with just a little bit of code.

```csharp
using McMaster.NETCore.Plugins;

PluginLoader loader = PluginLoader.CreateFromAssemblyFile("./plugins/MyPlugin1.dll",
                        sharedTypes: new[] { typeof(ILogger) });
Assembly pluginDll = loader.LoadDefaultAssembly();
```

Once you have an `Assembly` object, you can use reflection to initialize and run code from the plugin.

```csharp
using System.Reflection;

// For example, you could find and invoke a static method named Start on a type named Plugin.
Type pluginType = pluginDll.GetTypes().First(t => t.Name == "Plugin");
MethodInfo startMethod = pluginType.GetMethod("Start");
startMethod.Invoke(null, new object[] { myLogger, "arg1", "arg2" });
```

The plugins API provides a solution for managing common problems with assembly loading code, such as

* finding dependencies of assemblies to load
* finding unmanaged binaries to load
* dealing with conflicts between different dependency versions
* type unification - establishing consistent type identity between plugin and host app
* isolation - keeping assemblies and their dependencies separated from each other and the host app

## Motivations: the trouble with `Assembly.LoadFrom`

If you've ever tried to use `Assembly.LoadFrom`, you may be familiar with these issues. If you're not, let
me give you a quick demo.

Let's say you want to load a new .dll file into an app. `Assembly.LoadFrom` is a tempting choice
because it will get you part of what you want.

```csharp
var pluginDll = Assembly.LoadFrom("./plugin/MyPlugin1.dll");
```

For simple plugins, it works great until...

#### Problem 1 - locating dependency assemblies

Let's say `MyPlugin1` uses JSON.NET, but the app calling Assembly.LoadFrom does not. If you try to do anything
with the `Assembly` object you get from `LoadFrom`, you'll get

> System.IO.FileNotFoundException: Could not load file or assembly 'Newtonsoft.Json, Version=11.0.0.0, Culture=neutral, PublicKeyToken=30ad4fe6b2a6aeed'. The system cannot find the file specified.

Even if you copy `Newtonsoft.Json.dll` into the same folder, .NET Core will not load it. Workarounds exist for this
problem, such as hooking into [assembly resolving events](https://docs.microsoft.com/en-us/dotnet/api/system.appdomain.assemblyresolve?view=netcore-2.1),
but these don't resolve the next set of issues.

#### Problem 2 - dependency mismatch

Let's say `MyPlugin1` uses JSON.NET 11, but the app calling `LoadFrom` used JSON.NET 10. You will _still_ run
into `System.IO.FileNotFoundException`.

You won't always get this output when dependency versions don't match. If the situation is reversed -- MyPlugin1
depends on a *lower* version of something than the app has -- you can get different errors if there were
[breaking changes](https://github.com/dotnet/corefx/blob/v2.1.0/Documentation/coding-guidelines/breaking-changes.md).
If you're lucky, these surface as `MissingMethodException` or `TypeLoadException`.
If you're unlucky, your plugin will just function in a way you don't expect because it's running on a different version of its dependency.

#### Problem 3 - side by side and race conditions

If you resolved Problem 1 with some clever workarounds, you will still have issues when you need to load multiple
plugins with mixed dependencies. The first plugin to load "wins". So, if MyPlugin1 depends on JSON.NET 1 and
MyPlugin2 depends on 11, you might get 10 or 11, but it will vary based on the order in which you called Assembly.LoadFrom.

```csharp
var pluginDll1 = Assembly.LoadFrom("./plugin/MyPlugin1/MyPlugin1.dll");
var pluginDll2 = Assembly.LoadFrom("./plugin/MyPlugin2/MyPlugin2.dll");
```

These problems may be resolvable if you know ahead of time all the plugins and you can merge them to use a same
version of common dependencies, but assuming this is not possible or reasonable, you can easily get into a situation
where plugins will break each other. And, you have to pick a version. Highest wins is not always right, and `Assembly.LoadFrom` doesn't give you a way to use multiple versions of an assembly by the same name.

#### Problem 4 - native libraries

If you need to use `[DllImport]` and `extern` to P/Invoke unmanaged code, `Assembly.LoadFrom` doesn't  work. In fact, I'm not really sure how you would do this
without AssemblyLoadContext.

## AssemblyLoadContext: the dark horse

`System.Runtime.Loader.AssemblyLoadContext`, aka ALC, provides some essential API for defining dynamic assembly loading behavior. This is one of my favorite, little-known APIs in .NET Core. This API provides:

* Assembly loading in partial isolation. You can create multiple load contexts. Each context can load independent
versions of an assembly with the same name.
* Bring-your-own-resolution. `AssemblyLoadContext` is an abstract class with some virtual base members you can override.
This allows you to implement your own resolution for dependency look up.
* `AssemblyLoadContext.LoadUnmanagedDll`. This is basically the only good way to load unmanaged binaries dynamically.

While `AssemblyLoadContext` is a great API, it's currently [lacking docs](https://docs.microsoft.com/en-us/dotnet/api/system.runtime.loader.assemblyloadcontext?view=netcore-2.1).
(It's on the [TODO](https://github.com/dotnet/docs/issues/2982) [list](https://github.com/dotnet/docs/issues/1711)). It's also fairly low-level, so you have to have a certain level
of understanding to implement a load context.
By default, ALC does not provide any resolution logic. You might expect there to be *some* sort of API in .NET Core for reading .deps.json and runtime.json files, but there isn't. This is why I called ALC a 'dark horse'. It's a really good API, but few know much about it.

## AssemblyLoadContextBuilder: build your own ALC

To make ALC easier to work with, I've written an API called [`McMaster.NETCore.Plugins.Loader.AssemblyLoadContextBuilder`](https://github.com/natemcmaster/DotNetCorePlugins/blob/v0.1.0/src/Plugins/Loader/AssemblyLoadContextBuilder.cs).
This API creates a new
AssemblyLoadContext with resolving behavior based on information from various sources. Some of the methods available on this builder include:

* `SetBaseDirectory` - This directory is used as the starting point for loading assemblies.
* `PreferLoadContextAssembly` / `PreferDefaultLoadContextAssembly` - specify, by assembly name, which assemblies should be resolved to a common version shared by every plugin and the app (the default load context), and which assemblies can use versions which are unique.
* `AddProbingPath` - additional locations for finding dependencies
* `AddAdditionalProbingPathFromRuntimeConfig` - add additional probing paths from a `runtimeconfig.json` file
* `AddManagedLibrary` - add specific details about an assembly dependency to be loaded
* `AddNativeLibrary` - add specific details about an unmanaged binary to be loaded
* `AddDependencyContext` - add managed and native libraries as described in a .deps.json file
* Finally, `.Build()` produce a new ALC. Multiple contexts can be created with the same info.

## PluginLoader: bring it all together

`McMaster.NETCore.Plugins.PluginLoader` simplifies assembly loading even more by hiding most of the details about `AssemblyLoadContextBuilder` behind a smaller API. This is the default entrypoint which should be sufficient for many plugin scenarios. It uses the ALC builder and a set of some well-known conventions to construct a rich load context.

As mentioned above, you need to first create a loader.

```csharp
PluginLoader loader = PluginLoader.CreateFromAssemblyFile(
    assemblyFile: "./plugins/MyPlugin1.dll",
    sharedTypes: new[] { typeof(ILogger) });
```

The `sharedTypes` parameter is important: this is used to define types which must exchange between the plugin and the host.
These types are used to ensure consistent type identity.

Furthermore, I've begun work to define a way to express plugin behavior through [config files](https://github.com/natemcmaster/DotNetCorePlugins/blob/v0.1.0/docs/plugin-config.md). While this is in its early stages, the vision for config files is that you can define plugin behavior externally from the app (if you want) so you can make decisions about how plugins interact with the host app or other plugins.

```csharp
PluginLoader loader = PluginLoader.CreateFromConfigFile(
    assemblyFile: "./plugins/config.xml",
    sharedTypes: new[] { typeof(ILogger) });
```

Once you have the loader, you can then use `PluginLoader.LoadDefaultAssembly()` or `LoadAssembly(AssemblyName)` to get
`System.Reflection.Assembly` objects. You can get from this object to executing code using a little bit of reflection.

## Demo

A full example of the API in action can be seen here: <https://github.com/natemcmaster/DotNetCorePlugins/tree/v0.1.0/samples/aspnetcore>.

This demo includes a fully-working ASP.NET Core app which has two plugins loaded side-by-side. The plugins use type unification to ensure the plugin can interact with the `IServiceCollection` and `IApplicationBuilder` of the host application.

## Closing

#### More reading

For more information, I recommend the following articles:

* [.NET Framework: Best Practices for Assembly Loading](https://docs.microsoft.com/en-us/dotnet/framework/deployment/best-practices-for-assembly-loading) on docs.microsoft.com. Although it doesn't apply to .NET Core, it's still a good read. Some the concepts were used when creating .NET Core.
* [Deep-dive into .NET Core primitives: deps.json, runtimeconfig.json, and dll's]({{ site.baseurl }}{% post_url /dev/2017-12-21-netcore-primitives %}). A post I wrote last year about some of the foundations of .NET Core apps.
* [Design doc: AssemblyLoadContext](https://github.com/dotnet/coreclr/blob/v2.1.0/Documentation/design-docs/assemblyloadcontext.md) - design notes from
the creators of AssemblyLoadContext


#### Why it's still experimental

In `PluginLoader`, I've done my best to imitate most of the behaviors of corehost, however, there are some gaps which I can't cover.

* Unloading - once a plugin is loaded, the files it uses are locked by the process. The only way to unload a plugin is by killing the host app. Hopefully one day, .NET Core will [implement collectible ALC's](https://github.com/dotnet/coreclr/issues/552), which will enable this feature.
* Conflict resolution - I haven't yet defined behavior yet for what to do when there are multiple sources for the same assembly. For example, what if both the shared runtime and an local copy of the same binary exist which only differ by file version? TBD.
* Perf issues - assembly loading is lazy. I haven't taken time to investigate perf, but its likely to be a bit slower than corehost, which does all its assembly conflict resolution ahead of time.

Plus, there is more work to be done on the "plugin config file" idea, API refinements, bugs to squash, etc.

I would not recommend this yet for production critical apps, but I hope to get it there. The project is open source, and I'm happy to take contributions. Give it a shot let me know what you think.
