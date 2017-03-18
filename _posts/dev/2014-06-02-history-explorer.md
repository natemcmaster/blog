---
title: "Graphs, Trees, and Leonardo da Vinci"
subtitle: Creating an interactive website for a history class
layout: post
date: 2014-06-02 18:00:00
author:
    name: Nate
hero:
    url: "https://farm3.staticflickr.com/2933/14333073622_bb383f1236_b.jpg"
    width: 500
    height: 313
---

[History Explorer](http://www.natemcmaster.com/projects/historyexplorer/) allows users to explore the relationship between historical people, places, and ideas. The content itself is almost completely verbatim Wikipedia. The more important part is the graphical presentation. 

Ideas, people, and places share a connection. Karinthy theorized that everyone can be connected to everyone in a chain of six links or fewer, or six degrees of separation. Unique ideas, wars, political leaders, books, painting, and music share a similar connection. History explorer attempts to capture and present some of those connections (but only a very minor subset).

## Motivation

Most college seniors barely survive their last and final history class. I got lucky. My history class allowed me to do something new and innovative. The professor chose to theme his class around *creativity*. For the final project, worth a third of our grade, we had to present a "creative work that involves historical content." This project is the fruit of those open-ended guidelines.

## Technical Details
This static website relys almost entirely on client-side JavaScript. [The application](https://github.com/natemcmaster/historyexplorer/tree/build) relies on [AngularJS](https://angularjs.org) and [D3.js](http://d3js.org) to organize and present the content. The website is served from GitHub pages, and includes a rather large (900 kb) JSON file to provide the data for the graph. I crafted the JSON using some [Python scripts](https://github.com/natemcmaster/historyexplorer/tree/master/builder) and a list of historical terms from the course. The most rigorous part of the project involved matching connections between key terms and choosing images. This took almost as much time as the invention of a good heuristic for arranging the nodes in the graph.




