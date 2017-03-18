---
layout: post
title: Installing ASP.NET 5 (beta 3)
subtitle: Installing VS 2015 and the ASP.NET 5 CLI tools
date: 2015-03-14 9:10:00
---

The easiest, but slowest, way to install ASP.NET 5 is through Visual Studio 2015. 

Alternatively, you can install the command line tools by following the instructions below. These are instructions are for the **beta 3** versions of the tools as posted on [ASP.NET 5 on GitHub](https://github.com/aspnet/home). Beginning with **beta 4** these will be obsolete.

# Visual Studio 2015

Go here download a free copy of **Visual Studio 2015 CTP**.

<a class="btn btn-primary" href="https://www.visualstudio.com/downloads/visual-studio-2015-ctp-vs">Download Visual Studio 2015 CTP 6</a>

# Command Line Tools

These instructions are found in more complete form on the [ASP.NET 5 Home](https://github.com/aspnet/home) GitHub repository.


## Windows
Execute the following in *Command Prompt* (cmd.exe)


{% highlight bat %}
@powershell -NoProfile -ExecutionPolicy unrestricted -Command "iex ((new-object net.webclient).DownloadString('https://raw.githubusercontent.com/aspnet/Home/master/kvminstall.ps1'))"
{% endhighlight %}


## OS X
You must have >= Mono 3.6.0 installed. 

If you have [brew](http://brew.sh), the following will the correct version of Mono and the KVM. Execute these in the Terminal.

{% highlight sh %}
brew tap aspnet/k
brew install kvm
source kvm.sh
{% endhighlight %}

## Linux
You must have Mono 3.4.1 or greater installed. Execute these on the command line.

{% highlight sh %}
curl -sSL https://raw.githubusercontent.com/aspnet/Home/master/kvminstall.sh | sh && source ~/.k/kvm/kvm.sh
{% endhighlight %}


# Beta 4
K, KRE, KVM, and KLR were all placeholder names. They have all been renamed in beta 4, but are stable as of March 14, 2015.  ■
