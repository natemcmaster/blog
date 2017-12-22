---
layout: post
title: Blogging with Jekyll and GitHub Pages
subtitle: How this blog is hosted for free
date: 2015-03-01 16:00:00
---

I host this blog for free. I don’t worry about hosting plans, bandwidth, or others common website concerns. How? To get this setup, you will need to be a little proficient with these tools:

 - Git
 - The command line
 - Markdown or HTML

## Free Hosting (thanks to [pages.github.com](http://pages.github.com))

GitHub provides a way for developers to post free webpages. This requires a little bit of hacking, but it is not too difficult. Their instructions are so simple, that rather than duplicate them here, I will just point you to their website.

[Setup free hosting with GitHub Pages](https://pages.github.com/)

## Generating Pages with Jekyll
GitHub pages requires that you serve static content only. For those update their blogs infrequently and don't need a complicated web service, static content works just fine. This blog is generated using [Jekyll](http://jekyllrb.com/), which is a light framework written in Ruby for generating content.

Jekyll is setup to generated blogs

## Customizing Jekyll
By default, GitHub will run Jekyll when you push your content and generate the HTML for you. Jekyll supports [some powerful plugins](http://jekyllrb.com/docs/plugins/#available-plugins), but to run these you must commit the generated content to your GitHub branch instead of the Jekyll code.


## My setup
For this blog, I have setup a separate folder within my project where Jekyll builds the content. This folder is configured as a git submodule for the same repo as the parent project.

```ini
[submodule "build"]
    path = build
    url = git@github.com:natemcmaster/natemcmaster.github.io.git
    branch = master
```

I added a simple **Makefile** to simplify the build and publishing process.

```make
DIR=./build

.PHONY: publish j_build serve

j_build:
    jekyll build

serve:
    @open http://localhost:4000
    jekyll serve --watch

publish: j_build
    git --git-dir=$(DIR)/.git add --all
    git --git-dir=$(DIR)/.git commit -m "Build `date`"
    git --git-dir=$(DIR)/.git push
    git add build/
```

Happy blogging! ■
