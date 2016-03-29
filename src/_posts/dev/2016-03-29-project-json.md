---
layout: post
title: "Intro to .NET Core: project.json"
date: 2016-03-29 8:00 AM
---

.NET Core introduces a new project model. A projects is defined by JSON file named "project.json". This post will examine
some of the options available to projects.

# Official docs

To read the full spec, see <http://dotnet.github.io/docs/project-model/>.

# Project.json

*project.json* defines everything about a .NET Core project. It controls the project's platform support, references, compilation, and packaging.

The best way to get a starter template is execute `dotnet new` on the command line, or to use Visual Studio. This will create an empty project with a project.json that works for a basic library.

For more advanced features of project.json, see <http://dotnet.github.io/docs/project-model/>.

<!-- TODO block post about advanced project.json setup -->

# Multi-project setup

Many projects can be build together. This is similar to a Visual Studio "Solution".

## Without configuration

Without configuration, projects are are considered part of a solution if they are in the same file directory with each other.

{% highlight console %}

solution/
    Banana.Library
    Banana.Web

{% endhighlight %}

## With global.json

A file named *global.json* can be used to identify the location of projects

{% highlight console %}

solution/
    global.json

    src/
        Banana.Library
        Banana.Web
    test/
        Banana.Test

{% endhighlight %}
Contents of **global.json**
{% highlight json %}
{
    "projects": ["src", "test"]
}
{% endhighlight %}


# Examples

## A typical project.json for a web project
{% highlight json %}
{
    "version": "0.0.1",
    "name": "Banana.Web",

    "compilationOptions": {
        "emitEntryPoint": true,
        "keyFile": "../lib.snk"
    },

    "dependencies": {
        "Banana.Library": "0.0.1",
        "Microsoft.AspNetCore.Server.Kestrel": "1.0.0-rc2",
        "Microsoft.AspNetCore.Mvc": "1.0.0-rc2"
    },

    "frameworks": {
        "netcoreapp1.0": {
            "dependencies": {
                "Microsoft.NetCore.App": {
                    "type": "platform",
                    "version": "1.0.0-rc2"
                }
            }
        }
    },

    "tools": {
        "dotnet-razor-tooling": "1.0.0-rc2"
    }
}
{% endhighlight %}

## A typical project.json for a library
{% highlight json %}
{
    "version": "0.0.1",
    "name": "Banana.Library",

    "compilationOptions": {
        "xmlDoc": true,
        "keyFile": "../lib.snk"
    },

    "dependencies": {
        "Newtonsoft.Json": "8.0.1"
    },

    "frameworks": {
        "netstandard1.3": {
            "dependencies": {
                "NETStandard.Library": "1.0.0-rc2"
            }
        }
    },

    "scripts": {
        "prepublish": [ "gen.cmd" ]
    }
}
{% endhighlight %}
