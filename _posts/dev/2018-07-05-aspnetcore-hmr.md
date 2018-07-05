---
layout: post
title: Configuring ASP.NET Core, webpack, and hot module replacement (hmr) for fast TypeScript development
subtitle: This project setup supports browser live-reloading changes to TypeScript files while you develop in ASP.NET Core
date: July 5, 2018
author: Nate
tags:
- aspnetcore
- typescript
- webpack
hero:
  asset_path: /assets/images/blog/aspnetcore_webpack_hmr_1.gif
  height: 800
  width: 1280
---

Recently, I spent a weekend banging my head against the wall as I tried to figure out how to upgrade a personal project 
to webpack 4, TypeScript 2.9, and React (used to be AngularJS 1.6). I finally got it all working together -- and even got
hot module replacement (hmr) working. **TL;DR?** Checkout the code here: <https://github.com/natemcmaster/aspnetcore-webpack-hmr-demo>

The important bits:

### Use the WebpackDevMiddleware 

This middleware in ASP.NET Core is built-in to ASP.NET Core 2.1, but you have to specifically add an option to configure HMR.
Add this to your Startup.cs file.

```c#
app.UseWebpackDevMiddleware(new WebpackDevMiddlewareOptions
{
    HotModuleReplacement = true
});
```
[See in source](https://github.com/natemcmaster/aspnetcore-webpack-hmr-demo/blob/b969c8bca2a574fb84221379bbad575093c64426/WebApplication1/Startup.cs#L25-L28)

### Use babel-core and ES6

HMR was silently failing for a while until I discovered a few knobs in awesomet-typescript-loader. 
After a bunch of GitHub spelunking, I discovered that I needed these magical settings in webpack.config.js.

```js
// webpack.config.js
{
    test: /\.tsx?$/,
    include: /ClientApp/,
    loader: [
        {
            loader: 'awesome-typescript-loader',
            options: {
                useCache: true,
                useBabel: true,
                babelOptions: {
                    babelrc: false,
                    plugins: ['react-hot-loader/babel'],
                }
            }
        }
    ]
}
```

Also, you may need to update your tsconfig.json file to target ES6.
```json
{
    "compilerOptions": {
         "target": "es6",
        "module": "commonjs",
        "jsx": "react"
    }
}
```

[See in source](https://github.com/natemcmaster/aspnetcore-webpack-hmr-demo/blob/b969c8bca2a574fb84221379bbad575093c64426/WebApplication1/webpack.config.js#L45-L61)

### react-hot-loader 4

If you've used previous versions, considering upgrading to version 4. It's usage is super simple now. Here's a minimal React app with hmr.

```tsx

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { hot } from 'react-hot-loader';

const App: React.SFC = () =>
    <div>
        Hello, hot reloading
    </div>;

const HotApp = hot(module)(App);

ReactDOM.render(<HotApp />, document.getElementById('root'));
```

### A few other goodies

I prefer Yarn to npm because it is faster, deterministic, and it's not too hard to integrate Yarn with the .NET Core command line.
Here are some MSBuild targets you can add to your project to lightup Yarn integration:

* [Webpack.targets](https://github.com/natemcmaster/aspnetcore-webpack-hmr-demo/blob/b969c8bca2a574fb84221379bbad575093c64426/WebApplication1/Webpack.targets)
* [Configuration in your .csproj file](https://github.com/natemcmaster/aspnetcore-webpack-hmr-demo/blob/b969c8bca2a574fb84221379bbad575093c64426/WebApplication1/WebApplication1.csproj#L13-L16)
