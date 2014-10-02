#!/bin/sh
DIR=./build
git --git-dir=$DIR/.git add .
git --git-dir=$DIR/.git commit -m "Build `date`"
git --git-dir=$DIR/.git push
