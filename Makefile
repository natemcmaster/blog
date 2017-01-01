DIR=./build

default: j_build

.PHONY: publish j_build serve install

j_build:
	jekyll build --incremental

serve:
	@open http://localhost:4000
	jekyll serve --watch

commit: j_build
	git --git-dir=$(DIR)/.git add --all build/
	git --git-dir=$(DIR)/.git commit -m "Build `date`"

setup:
	git clone https://github.com/natemcmaster/natemcmaster.github.io/ -b master build
	npm install -g bower
	gem install bundler

install:
	bundle install
	bower install

status:
	git --git-dir=$(DIR)/.git status