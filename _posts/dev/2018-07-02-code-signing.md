---
layout: post
title: Enabling code signing with NuGet, Azure Key Vault, and AppVeyor
date: July 2, 2018
tags:
- dotnet
- crytpo
hero:
  asset_path: /assets/images/blog/codesign_1.png
  width: 2092
  height: 744
---

About 4 weeks ago, I decided to [code sign the NuGet packages](https://blog.nuget.org/20180522/Introducing-signed-package-submissions.html) from my personal open-source projects. [I finally succeeded this weekend](https://github.com/natemcmaster/CommandLineUtils/pull/114). When I started, I figured it couldn't be that hard. In the end, it really isn't, but it took hours of research to figure out how to tie it all together. In this post, I'll share the technical details of what it took to enable code signing using Azure Key Vault, AppVeyor, and NuGet for one of my .NET Core projects.

## Background

If you find this subject daunting, even with instructions, you are not alone. Years ago in school, [Kent Seamons](https://twitter.com/SeamonsKent) showed my class usability studies he and [Daniel Zappala](https://twitter.com/Daniel_Zappala) were conducting on S/MIME, GPG, and 'Secure Email'. [The findings](https://arxiv.org/pdf/1510.08555.pdf), unsurprisingly, showed that most users have trouble using crypto tools, even when provided instructions.

Part of the trouble is understanding the concepts and terms. Let me start by providing rudimentary explanations, in the context of my [CommandLineUtils](https://github.com/natemcmaste/CommandLineUtils) project.

* [*Code signing*](https://en.wikipedia.org/wiki/Code_signing) means applying a digital signature to the executable binaries (for example `McMaster.Extensions.CommandLineUtils.dll`). This signature confirms the authenticity and integrity of the files.
* *Authenticity* proves the files came from me, Nathan McMaster, and not someone pretending to be me.
* *Integrity* also proves the files have not been altered by anyone since I made them.
* [A *certificate*](https://en.wikipedia.org/wiki/Public_key_certificate) contains public information about me and [a public key](https://en.wikipedia.org/wiki/Public-key_cryptography). Anyone can see my certificate, but only I can produce a signature with it because I keep secret the private key, which matches with the public key in the certificate. Anyone can create a certificate for free on their own, but Windows apps won't treat this as "trusted" unless you get a certificate from a CA.
* [A *certificate authority* (CA)](https://en.wikipedia.org/wiki/Certificate_authority) is an entity that issues certificates. In my case, I worked with [DigiCert](https://digicert.com) to get a certificate. This certificate, unlike a self-created cert, contains additional information which proves DigiCert gave me the certificate.

Code signing *does not*, however, guarantee that my binaries are safe to use. Tools like antivirus are required to check that.

## How to setup code signing

Code-signing requires at least 3 things:

* A code signing certificate
* A Windows machine
* Binaries to sign

I chose to use:

* [DigiCert](https://www.digicert.com/code-signing/) - a Microsoft-approved certificate authority
* [AppVeyor](https://appveyor.com) - provides Windows VMs for free to compile and test [my open-source project](https://ci.appveyor.com/project/natemcmaster/commandlineutils). They provide a way to [keep passwords secret](https://www.appveyor.com/docs/appveyor-yml/) even though everything else is publicly visible.
* [Azure Key Vault](https://azure.microsoft.com/en-us/services/key-vault/) -  the AppVeyor VMs are deleted after every build I produce, so I needed a place to store the code signing certificate and its private key between builds.

## Acquire a code signing certificate

I needed a real
code signing certificate from a certificate authority [trusted by Microsoft](http://aka.ms/trustcertpartners), so I got one through [DigiCert](https://www.digicert.com/code-signing/). They had [pretty good instructions](https://www.digicert.com/code-signing/installing-code-signing-certificate.htm) for creating a certificate. In the end, I received my certificate as a .pfx file.

Every vendor is different, but in order to get a certificate from DigiCert,
I submitted documents (Verizon phone bill, photocopy of drivers license) and video chatted on Skype with them to prove my identity. This took a few weeks to complete.

While I waited, I made a self-signed certificate to test my setup. In Powershell, I used the
[`New-SelfSignedCertificate`](https://docs.microsoft.com/en-us/powershell/module/pkiclient/new-selfsignedcertificate),
[`Export-Certificate`](https://docs.microsoft.com/en-us/powershell/module/pkiclient/export-certificate)
and [`Export-PfxCertificate`](https://docs.microsoft.com/en-us/powershell/module/pkiclient/export-pfxcertificate) commands to generate a .pfx file.

```powershell
$testCert = New-SelfSignedCertificate -Subject "CN=TestCodeSignCert, OU=Use for testing only" `
    -FriendlyName TestCodeSignCert `
    -Type CodeSigning `
    -KeyUsage DigitalSignature `
    -KeyLength 2048 `
    -KeyAlgorithm RSA `
    -HashAlgorithm SHA256 `
    -CertStoreLocation Cert:\CurrentUser\My

# This certificate does not contain the private key
# and is for public usage
Export-Certificate -Cert $testCert -FilePath "codesigncert.cer"

# This certificate contains the private key so distribute carefully
$exportPassword = ConvertTo-SecureString -String "mycertpassword" -Force -AsPlainText
Export-PfxCertificate -Cert $testCert `
    -FilePath codesigncert.pfx `
    -Password $exportPassword
```

## Configure NuGet.org

To make my NuGet packages to appear as "trusted", I registered my new certificate on NuGet.org under [Account Settings](https://www.nuget.org/account). I uploaded my \*.cer file (which does not contain a private key.)

![app reg](/assets/images/blog/codesign_nuget_1.png)

## Configure Azure Key Vault

Azure Key Vault is an inexpensive way to securely store and manage secrets, keys, and certificates. It took a while to setup access to this tool, so I took a bunch of screenshots to explain the steps I took. This part was not obvious, so read carefully.

### Create an 'app' in Azure AD

The code signing tools (discussed later) can automatically load and use a certificate stored in Key Vault. These tools needed a **Client ID** and **Client Secret**, which I created by adding an "application" in Azure Active Directory.

In the Azure Portal, go to ["App registrations"](https://portal.azure.com/#blade/Microsoft_AAD_IAM/ApplicationsListBlade) blade.

![App Registration in portal search by](/assets/images/blog/codesign_appreg_1.png)

Clicked *New application registration*. The value of the sign on URL didn't appear to be important since I'm only using the app to access Key Vault, so I put <https://appveyor.com>.

![Create a new app in the portal](/assets/images/blog/codesign_appreg_2.png)

Clicked on the new application in the list on App registrations to view its information. The **Application ID** is the **Client ID**.

![Get the client id](/assets/images/blog/codesign_appreg_3.png)

Next, generated a new password for the app by clicking on "Settings" > "Keys" section. Created a new password and clicked Save. The generated value is the **Client Secret**.

![Get the client secret](/assets/images/blog/codesign_appreg_4.png)

### Create a Key Vault

In the [Azure Portal](https://portal.azure.com), this was as easy "Create a resource" -> Key Vault. [This guide](https://docs.microsoft.com/en-us/azure/key-vault/key-vault-get-started) explains more about how to get started with Key Vault.

Once ready, I uploaded the `.pfx` certificate file (with the private key). In the Azure Portal, the upload pages is under "Certificates" > "Generate/Import".

![Upload the cert](/assets/images/blog/codesign_keyvault_1.png)

Next, I added permissions to my application from the steps above to interact with the Key Vault. Under "Access policies", click "Add New".

![Add access policy for the app](/assets/images/blog/codesign_keyvault_2.png)

Under "Select a principal", I found the application and gave the app these permissions:

* Key permissions
  * Crytpographic Operations
    * Sign
* Certificate permissions
  * Certificate Management Operations
    * Get

![Set policy permissions](/assets/images/blog/codesign_keyvault_3.png)

## Code sign binaries with Azure Sign Tool

[Azure Sign Tool](https://github.com/vcsjones/AzureSignTool), by [Kevin Jones](https://vcsjones.com) and [Oren Novotny](https://oren.codes/), is a console tool which authenticates to Key Vault to acquire your code signing cert and adds Microsoft Authenticode signatures to your binaries, such as .dll and .exe files. My build currently [downloads the tool](https://github.com/vcsjones/AzureSignTool/releases), but [hopefully soon it will be available](https://github.com/vcsjones/AzureSignTool/pull/33) as a .NET Core global tool. A basic usage of the tool might look like this:

```
AzureSignTool.exe sign McMaster.Extensions.CommandLineUtils.dll \
  --file-digest sha256 \
  --description-url "https://github.com/natemcmaster/blog" \
  --no-page-hashing \
  --timestamp-rfc3161 http://timestamp.digicert.com \
  --timestamp-digest sha256 \
  --azure-key-vault-url https://nmcmaster.vault.azure.net \
  --azure-key-vault-client-id "6a27a2da-bb78-4baa-bd2b-150fe89ea039" \
  --azure-key-vault-client-secret "K+xhD***********" \
  --azure-key-vault-certificate "DigiCertCodeSign1"
```

You can inspect the code signatures applied with File Explorer by right clicking on the file and viewing its properties.

![Viewing binary digital signatures](/assets/images/blog/codesign_signtool_1.png)


## Code sign NuGet packages with NuGet Key Vault Sign Tool

[NuGet Key Vault Sign Tool](https://github.com/onovotny/NuGetKeyVaultSignTool), by [Oren Novotny](https://oren.codes/), is a console tool which authenticates to Key Vault to acquire your code signing cert and adds signatures to your NuGet package files (\*.nupkg). A basic usage of the tool might look like this:

```powershell
NuGetKeyVaultSignTool.exe sign McMaster.Extensions.CommandLineUtils.2.2.5.nupkg \
  --file-digest sha256 \
  --timestamp-rfc3161 http://timestamp.digicert.com \
  --timestamp-digest sha256 \
  --azure-key-vault-url https://nmcmaster.vault.azure.net \
  --azure-key-vault-client-id "6a27a2da-bb78-4baa-bd2b-150fe89ea039" \
  --azure-key-vault-client-secret "K+xhD***********" \
  --azure-key-vault-certificate "DigiCertCodeSign1"
```

You can inspect package signatures with [NuGet Package Explorer](https://www.microsoft.com/store/productId/9WZDNCRDMDM3).

![Viewing nupkg digital signatures](/assets/images/blog/codesign_signtool_2.png)


## Altogether

In the end, I made this change to my project to enable code signing. <https://github.com/natemcmaster/CommandLineUtils/commit/7d1a472462f86375226fb60904ce7e2116fcf1dd>.

It's only 122 lines of code, but it took a full weekend and several weeks of waiting on DigiCert to get this all worked out. Hopefully this guide helps you figure out how to set up code signing for your projects.

## More reading

If you want to learn more about code signing, checkout the following resources.

* [signtool.exe](https://docs.microsoft.com/en-us/dotnet/framework/tools/signtool-exe) - The tool in the Windows SDK which can be used to sign using certificates installed locally on the machine instead of remotely in Azure Key Vault.
* [Sign Service](https://github.com/onovotny/SignService) - If you want to set up a dedicated service to run code signing in the cloud,
* [OpenOpcSignTool](https://github.com/vcsjones/OpenOpcSignTool) - Just like Azure Sign Tool, this provides a way to codesign Visual Studio Extensions (\*.vsix files).
