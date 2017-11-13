---
layout: post
title: Docker + dotnet-watch
subtitle: How to setup your ASP.NET Core project to build in a Docker container using dotnet-watch to auto-restart the server
tags:
  - aspnetcore
  - dotnetcore
  - docker
date: Nov. 13, 2017
---

It's still in pre-release, but I [made a change to dotnet-watch recently](https://github.com/aspnet/DotNetTools/pull/347) that will make it much easier to setup
a local developer environment to use Docker and dotnet-watch for local development. The post below shows you
how to setup your project to use this.

## Background

`dotnet watch` is a command line utility that watches files and can re-run dotnet commands when files in your
project change. It can be used along with `dotnet test`, `dotnet run`, and others to make it easy to quickly
iterate.

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

This is a **pre-release build**. It's not on NuGet.org yet, so you'll also need this. Add a file named `NuGet.config`
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

## Change the location of obj/ and bin/

One of the most common problems with making Docker and Visual Studio (Code) work well is that the files in the
obj/ and bin/ folders need to be different inside and outside the docker container. If they overlap, you'll
get errors like "Version for package 'Microsoft.DotNet.Watcher.Tools' could not be resolve".

To resolve this, we will move the location of the obj/ and bin/ folder to **sit next to the project directory,
not inside it.**

Add a file named `Directory.Build.props` to your project with these contents:

```xml
<Project>
  <PropertyGroup>
    <BaseIntermediateOutputPath>$(MSBuildThisFileDirectory)../obj/</BaseIntermediateOutputPath>
    <BaseOutputPath>$(MSBuildThisFileDirectory)../bin/</BaseOutputPath>
  </PropertyGroup>
</Project>
```

## Add a dockerfile

Add a file named `Dockerfile` to your project folder with these contents:

```Dockerfile
FROM microsoft/aspnetcore-build:2.0.2

# Required inside Docker, otherwise file-change events may not trigger
ENV DOTNET_USE_POLLING_FILE_WATCHER 1
WORKDIR /app

# By copying these into the image when building the image, we don't have to re-run restore everytime we launch
# the image
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
    For macOS and Linux users in Bash, run
    ```sh
docker run --rm -it -p 5000:80 -v $(pwd):/app my-server
    ```
    For Windows users in PowerShell, run
    ```ps1
docker run --rm -it -p $(Get-Location):/app my-server
    ```

#### What do those flags mean?

`--rm` - the container is automatically removed when you stop it.

`-it` - pipes console output back to you instead of launching in detached mode.

`-p 5000:80` - maps port 5000 on your host machine to port 80 of the container

`-v $(pwd):/app` - volume mounts the project directory into the app folder `/app` so file changes made locally are immediately available in the Docker container


## Issues?

If this doesn't work, let me know. Open an issue on <https://github.com/aspnet/DotNetTools> and tag me, @natemcmaster.