---
layout: post
title: Part 3 - Testing - Project.json to MSBuild conversion guide
subtitle: "My test projects don't pass anymore!"
date: Feb. 10, 2017
---

Regardless of how big or small your project.json project is, you are likely to run into some subtle
and, perhaps, mildly bewildering changes in .NET Core SDK, the CLI, in testing, etc. Here is a collection
of not-so-obvious caveats to your project.json to MSBuild conversion process.

This is a follow up to 
**[Project.json to MSBuild conversion guide]({{ site.baseurl }}{% post_url /dev/2017-01-19-project-json-to-csproj })**

# dotnet-test

This is the most fundamentally different aspect of the new Microsoft.NET.Sdk. I covered the specific
changes required to your csproj in **[Part 1]({{ site.baseurl }}{% post_url /dev/2017-01-19-project-json-to-csproj })**.
The NuGet packages you reference are not the only piece that changes, however. The whole command line syntax, logging experience,
and debugging setup are different.

## Command-line syntax (xunit)


**Filtering tests by method name**

In project.json
```
dotnet test -method Full.Namespace.ClassName.MethodName
```

With MSBuild
```
dotnet test -- Full.Namespace.ClassName.MethodName
```