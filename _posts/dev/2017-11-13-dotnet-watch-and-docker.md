---
layout: post
title: Docker + dotnet-watch
subtitle: How to setup your ASP.NET Core project with Docker and dotnet-watch, without making it impossible to use VS Code or Visual Studio
tags:
  - aspnetcore
  - dotnet
  - docker
hero:
  asset_path: /assets/images/blog/dotnet_watch_and_docker.png
  width: 1587
  height: 419
date: Nov. 13, 2017
---

I made [a change to dotnet-watch recently](https://github.com/aspnet/DotNetTools/pull/347) that will make it much easier to setup Docker + dotnet-watch in your ASP.NET Core project, without causing Visual Studio to crash and burn.
In current versions of dotnet-watch, there have been issues getting it to work with Docker, and it required some ugly workarounds.
Even then, it was hard to keep Docker, dotnet-watch, and Visual Studio happy. Either Docker or Visual Studio would complain about issues with NuGet caches, duplicate attributes, etc.
The next version of dotnet-watch removes the need for those ugly workarounds.
This version isn't available yet on NuGet.org, but you can still give it a test run today with ASP.NET Core 2.0.0 projects.
The post below shows you
how to setup your project to do this today using a nightly build of dotnet-watch.

## Background

`dotnet watch` is a command line utility that watches files and can re-run dotnet commands when files in your
project change. It can be used along with `dotnet test`, `dotnet run`, and any other dotnet command.

.NET Core is available in a Docker image. Docker containers allow you to sandbox your application and run it
in an environment similar or identical to a production environment. If you're unfamiliar with it, think of Docker
as a mini-virtual machine.

## Install dotnet-watch

At the moment, dotnet-watch installs using NuGet and `DotNetCliToolReference`. Open your \*.csproj file and edit
it to contain this.

```xml
  <ItemGroup>
    <DotNetCliToolReference Include="Microsoft.DotNet.Watcher.Tools" Version="2.1.0-preview1-27567" />
  </ItemGroup>
```

This is a **pre-release build**. It's not on NuGet.org yet, so you'll need to get it from the ASP.NET Core nightly feed. Add a file named `NuGet.config`
to your project directory with these contents.

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <add key="aspnetcore-nightly" value="https://dotnet.myget.org/F/aspnetcore-dev/api/v3/index.json" />
    <add key="NuGet" value="https://api.nuget.org/v3/index.json" />
  </packageSources>
</configuration>
```

## Change the location of  the obj/ and bin/ folders

One of the most common problems with making Docker and Visual Studio (Code) work well is that the files in the
`obj/` and `bin/` folders need to be different inside and outside the Docker container. If they overlap, you'll
get errors, including "Version for package 'Microsoft.DotNet.Watcher.Tools' could not be resolve", issues with the runtime store, and  more.

To resolve this, we will move the location of the `obj/` and `bin/` folders to **sit next to the project directory**,
not inside it.

Add a file named `Directory.Build.props` to your project with these contents:

```xml
<Project>
  <PropertyGroup>
    <BaseIntermediateOutputPath>$(MSBuildProjectDirectory)/../obj/</BaseIntermediateOutputPath>
    <BaseOutputPath>$(MSBuildProjectDirectory)/../bin/</BaseOutputPath>
  </PropertyGroup>
</Project>
```

:warning: Make sure to delete you existing `obj/` and `bin/` folders after you change this, otherwise you'll get a warning like

> /code/obj/Debug/netcoreapp2.0/web.AssemblyInfo.cs(10,12): error CS0579: Duplicate 'System.Reflection.AssemblyCompanyAttribute' attribute [/code/app/web.csproj]

## Add a dockerfile

Add a file named `Dockerfile` to your project folder with these contents:

```Dockerfile
FROM microsoft/aspnetcore-build:2.0

# Required inside Docker, otherwise file-change events may not trigger
ENV DOTNET_USE_POLLING_FILE_WATCHER 1

# Set a working dir at least 2 deep. The output and intermediate output folders will be /code/obj and /code/bin
WORKDIR /code/app

# By copying these into the image when building it, we don't have to re-run restore everytime we launch a new container
COPY web.csproj .
COPY NuGet.config .
COPY Directory.Build.props .
RUN dotnet restore

# This will build and launch the server in a loop, restarting whenever a *.cs file changes
ENTRYPOINT dotnet watch run --no-restore
```

## Launch it

Open a command line to your project folder and use the following commands.

1. Build your Docker image
    ```
    docker build ./ -t my-server
    ```
2. Start your Docker container.
    For macOS and Linux users in Bash, and Windows users in Powershell, run
    ```sh
    docker run --rm -it -p 5000:80 -v "$(pwd):/code/app" my-server
    ```

#### What do those flags mean?

`--rm` - the container is automatically removed when you stop it.

`-it` - pipes console output back to you instead of launching in detached mode.

`-p 5000:80` - maps port 5000 on your host machine to port 80 of the container

`-v "$(pwd):/code/app"` - volume mounts the project directory into the app folder `/code/app` so file changes made locally are immediately available in the Docker container

**You might also consider adding:**

`-e ASPNETCORE_ENVIRONMENT=Development` - changes the default environment from  `Production` to `Development`

#### Pro-tip: user secrets + Docker

If you use user secrets to configure your app, you can make these secrets available inside your container like this:

For Windows users in Powershell, run
```sh
docker run --rm -it -p 5000:80 -v "$(pwd):/code/app" -v "${env:APPDATA}/Microsoft/UserSecrets:/root/.microsoft/usersecrets/" -e ASPNETCORE_ENVIRONMENT=Development my-server
```

For macOS and Linux users, run
```sh
docker run --rm -it -p 5000:80 -v "$(pwd):/code/app" -v "$HOME/.microsoft/usersecrets:/root/.microsoft/usersecrets/" -e ASPNETCORE_ENVIRONMENT=Development my-server
```

This mounts the location where user secrets are stored on the host into the container.

Also, by default, UserSecrets is only loaded in "Development", not "Production" environments.

## Issues?

If this doesn't work, let me know. Open an issue on <https://github.com/aspnet/DotNetTools> and tag me, @natemcmaster.
