---
layout: post
title: "MSBuild + .NET Core CLI Tools: Getting information about the project"
subtitle: Replacing project.json APIs with an MSBuild target
date: 2016-12-26 6:00 PM
hero:
    asset_path: dotnet_cli_tool_screenshot.png
    width: 558
    height: 188
---

The .NET Core CLI 1.0.0 has a feature called "project tools extensions", often called "CLI tools".
These are project-specific, command-line tools that extend the `dotnet` command with new verbs.
For example, users can install `Microsoft.DotNet.Watcher.Tools` to add the `dotnet watch` command.
This post will cover an advanced topic of how to implement these tools to get information about a 
user's project.

For a primer on how to create a tool, see 
[.NET Core command-line interface tools](https://docs.microsoft.com/en-us/dotnet/articles/core/tools/)
on docs.microsoft.com.

For a primer on MSBuild, see 
[MSBuild Concepts](https://docs.microsoft.com/en-us/visualstudio/msbuild/msbuild-concepts)
on docs.microsoft.com.

**TL;DR**
See this example: <https://gist.github.com/natemcmaster/ced86a82f5faeca2d4f81fad2fdc7c04>

# Learn by example

For the sake of this tutorial, our goal is to create a tool called `dotnet-names`. When installed,
a user can invoked `dotnet names` and the tool will list the assembly name, root namespace, and 
names of target frameworks in a given project.

Goals:

 - Tool must not require the user to add additional dependencies.
 - The tool must support MSBuild for .NET Core projects.

### Step 0. The mental migration from project.json

Tool authors with existing tools that read the `project.json` will already be familiar with the
set of APIs provided in the `Microsoft.DotNet.ProjectModel` namespace. These APIs allowed a tool
to read a project.json and discover a list of dependencies, CSharp files, target frameworks, etc.

Migrating from these APIs requires a paradigm shift. The 'project model' in the project.json world
was defined entirely by the API in `Microsoft.DotNet.ProjectModel`. In an MSBuild project, there
is no definitive description of project behavior. Instead, MSBuild relies on well-known properties and
items.

## Step 1. Find the MSBuild project

When a CLI tools begins, `Directory.GetCurrentDirectory()` will be the directory containing
the user's project file. The tool must search this directory for an MSBuild file to target.

One method for this is to search for files ending in `*.*proj`.

{% highlight csharp %}
using System.IO;
using System.Linq;

namespace DotnetNames.Tool
{
    class Program
    {
        public static int Main()
        {
            var projectFile = Directory.EnumerateFiles(
                Directory.GetCurrentDirectory(), 
                "*.*proj")
                .Where(f => !f.EndsWith(".xproj")) // ignore *.xproj files
                .FirstOrDefault();
            
            // ...
        }
    }
}
{% endhighlight %}

Another approach is to require a command line flag, such as `--project` to specified the MSBuild project file 
to be used.

(For an example of a more robust project finder, see dotnet-watch's `MsBuildProjectFinder` class.
[Source for MsBuildProjectFinder on GitHub.](https://github.com/aspnet/DotNetTools/blob/6f1057a7603d3ece343d265e484517ef950ada4f/src/Microsoft.DotNet.Watcher.Tools/Internal/MsBuildProjectFinder.cs))

## Step 2. Injecting an MSBuild target

**Background**

Most MSBuild projects (CSharp, Visual Basic), will invoke an `Import` that brings in `Microsoft.Common.targets`.
Microsoft.Common.targets provides an extensibility point for injecting targets into a file.

You can read the source code for this extensibility point in the Microsoft.Common.targets file. 
[(Source on GitHub.)](https://github.com/Microsoft/msbuild/blob/7acd48c077a4d38dcbcb3062c7ea306d10f38e5a/src/XMakeTasks/Microsoft.Common.targets#L116-L127)

{% highlight xml %}
<Import Project="$(MSBuildProjectExtensionsPath)$(MSBuildProjectFile).*.targets">
{% endhighlight %}

By default, `MSBuildProjectExtensionsPath` will be the `obj/` folder next to the MSBuild project.

(This step could also be named "abusing MSBuildProjectExtensionsPath". This extension was originally created
for package managers, like NuGet.)

Comments in the source code contain this guidance:

> Package management systems will create a file at:
  $(MSBuildProjectExtensionsPath)\$(MSBuildProjectFile).&lt;SomethingUnique&gt;.targets

> Each package management system should use a unique moniker to avoid collisions.  It is a wild-card import so the package
  management system can write out multiple files but the order of the import is alphabetic because MSBuild sorts the list.

**Using it**

To inject a target, our `dotnet-names` tool will write a file to match this glob import.

For example, if the tool is running on `Web.csproj`, the tool would create a file named
`obj/Web.csproj.dotnet-names.targets`.

{% highlight csharp %}

var targetFileName = Path.GetFileName(projectFile) + ".dotnet-names.targets";
var projectExtPath = Path.Combine(Path.GetDirectoryName(projectFile), "obj");
var targetFile = Path.Combine(projectExtPath, targetFileName);

File.WriteAllText(targetFile, @"
  <Project>
      <Target Name=""_GetDotNetNames"">
         <PropertyGroup>
            <_DotNetNamesOutput>
Assembly name: $(AssemblyName)
Root namespace: $(RootNamespace)
Target framework: $(TargetFramework)
            </_DotNetNamesOutput>
         </PropertyGroup>
         <Message Importance=""High"" Text=""$(_DotNetNamesOutput)"" />
      </Target>
  </Project>
");

{% endhighlight %}


## Step 3. Invoke the injected target

Now that the tool has injected the target into the user project, it can be invoked by creating
a new process that starts MSBuild and invokes this target.

{% highlight csharp %}
var psi = new ProcessStartInfo
{
    FileName = "dotnet",
    Arguments = $"msbuild \"{projectFile}\" /t:_GetDotNetNames /nologo"
};
var process = Process.Start(psi);
process.WaitForExit();
{% endhighlight %}

## Step 4. Get target output

The sample above created a target that produced a console message from MSBuild.
At this point, our program simply prints the output to the command line.

{% highlight text %}
$ dotnet names
  
  Assembly name: My.WebApp
  Root namespace: My.WebApp
  Target framework: netcoreapp1.0         

{% endhighlight %}

Most tools will need to something with this information beyond displaying it. As you noticed in Step 2,
the tool are creates an MSBuild target inside the user's project. This target can do anything MSBuild can do,
such as producing a file that our tool can read. 

Here is updated code for a target that will produce a file for dotnet-names to read:

{% highlight csharp %}
File.WriteAllText(targetFile, 
@"<Project>
      <Target Name=""_GetDotNetNames"">
         <ItemGroup>
            <_DotNetNamesOutput Include=""AssemblyName: $(AssemblyName)"" />
            <_DotNetNamesOutput Include=""RootNamespace: $(RootNamespace)"" />
            <_DotNetNamesOutput Include=""TargetFramework: $(TargetFramework)"" />
         </ItemGroup>
         <WriteLinesToFile File=""$(_DotNetNamesFile)"" Lines=""@(_DotNetNamesOutput)"" Overwrite=""true"" />
      </Target>
  </Project>");

var tmpFile = Path.GetTempFileName();
var psi = new ProcessStartInfo
{
    FileName = "dotnet",
    Arguments = $"msbuild \"{projectFile}\" /t:_GetDotNetNames /nologo \"/p:_DotNetNamesFile={tmpFile}\""
};
var process = Process.Start(psi);
process.WaitForExit();
if (process.ExitCode != 0)
{
    Console.Error.WriteLine("Invoking MSBuild target failed");
    return 1;
}
var lines = File.ReadAllLines(tmpFile);
{% endhighlight %}

This target will write a line to the file, one line for each item in the `_DotNetNamesOutput` item group.
From here, the tool can parse the serialized file to find information it needs.

### Altogether

See the end of this blog post for the completed app.

## Next steps
With this foundation, you can enhance the tool to gather even more information about a project.
Here are some ways to enhance the tool.

 - Invoke targets in the build chain. For example, if you want to gather information about dependencies,
   your tool might invoke the target `ResolveDependenciesDesignTime`, which can identify `PackageReferences` and `ProjectReferences`.
 - Handle multi-targeting projects. If the property `TargetFrameworks` is set, this project is using multiple
   NuGet frameworks. Your tool target may need to invoke MSBuild multiple times internally to gather full information.
 - Force a compile. Invoking the target `Build` will cause the project to compile.

## Advanced examples of this technique

See <https://github.com/aspnet/DotNetTools> and <https://github.com/aspnet/EntityFramework.Tools>
for more examples of the approach explained in this blog post. `dotnet-user-secrets`, `dotnet-ef`,
and `dotnet-watch` gather information from projects using this approach.

### Additional comments

#### Direct project evaluation

Another way to gather information about a project is to load and execute it
using MSBuild APIs. Although it may seem like the right approach, my experience with it is that
MSBuild APIs are difficult to use correctly. Using MSBuild API has enough negative consequences 
that I do not recommend it. Those negative consequences include:


 - Assembly loading issues. You must ensure your tool will likely run into issues loading all of MSBuild's dependencies.
   See <https://github.com/Microsoft/msbuild/issues/1097>.
 - Bloat. Reference MSBuild APIs means your tool effectively includes all of MSBuild and its runtime dependencies. This
   increases the disk footprint of your tool.
 - Assembly conflicts. If your tool needs to load an assembly that is also used by MSBuild or its commonly imported extensions,
   it is likely your tool will trample the SDK's version and cause assembly load errors. Common example: JSON.NET is included
   in the MSBuild SDK because NuGet references it.


But if you still wish to persue this, s simple example of this has already been implemented 
by Simone Chiaretta in his tool `dotnet-prop`. See <https://github.com/simonech/dotnet-prop>.

#### Modifying the project

This method demonstrates a read-only approach to working with a project. To manipulate a project file,
your tool will need to use the MSBuild construction APIs. This is beyond the scope of this blog post.

## Completed example

Here is the code for the completed `dotnet-names` tool.

{% gist natemcmaster/ced86a82f5faeca2d4f81fad2fdc7c04 Program.cs %}
