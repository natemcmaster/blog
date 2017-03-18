---
layout: post
title: Vagrant Recipe for Ubuntu with ASP.NET 5
date: 2015-06-04 20:13:00 PDT
---

[Vagrant](https://www.vagrantup.com/) is a command-line utility that makes it easy to setup
and configure virtual machines. This configuration is controlled with special file called a **Vagrantfile**. This is a small ruby file that controls the config settings for your vm.

If you do not already have Vagrant, follow their [Getting Started Guide](http://docs.vagrantup.com/v2/getting-started/index.html) to get setup.

Add this file to the root folder of you project. Running ```vagrant up``` will install a VM of Ubuntu 14 and then install all the libraries and runtime config needed to use ASP.NET 5. 

When you connect to the VM using ```vagrant ssh```, your project will be accessible in the folder **/vagrant/**.

<br />

{% gist natemcmaster/9b021e030c3c906bf940 Vagrantfile %}