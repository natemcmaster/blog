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


[View this code snippet on Gist](https://gist.github.com/natemcmaster/9b021e030c3c906bf940)

[Raw file](https://gist.githubusercontent.com/natemcmaster/9b021e030c3c906bf940/raw/bc1fdd9cc6d6d49f969f3a27a1bc6e988b036bf9/Vagrantfile)



{% highlight ruby %}
# Copy and paste this into a file name 'Vagrantfile'

Vagrant.configure(2) do |config|
  # The most common configuration options are documented and commented below.
  # For a complete reference, please see the online documentation at
  # https://docs.vagrantup.com.

  config.vm.box = "ubuntu/trusty64"

  # Enable provisioning with a shell script.
  config.vm.provision "shell", privileged: false, inline: <<-SHELL
    sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 3FA7E0328081BFF6A14DA29AA6A19B38D3D831EF
    echo "deb http://download.mono-project.com/repo/debian wheezy main" | sudo tee /etc/apt/sources.list.d/mono-xamarin.list
    sudo apt-get update
    sudo apt-get install -y mono-complete

    sudo apt-get install -y unzip automake libtool curl

    curl -sSL https://github.com/libuv/libuv/archive/v1.4.2.tar.gz | sudo tar zxfv - -C /usr/local/src
    cd /usr/local/src/libuv-1.4.2
    sudo sh autogen.sh
    sudo ./configure
    sudo make
    sudo make install
    sudo rm -rf /usr/local/src/libuv-1.4.2 && cd ~/
    sudo ldconfig

    curl -sSL https://raw.githubusercontent.com/aspnet/Home/dev/dnvminstall.sh | DNX_BRANCH=dev sh && source ~/.dnx/dnvm/dnvm.sh
  SHELL
end

{% endhighlight %}