default: build

.PHONY: publish build serve install

build:
	jekyll build --incremental

serve:
	@open http://localhost:4000
	jekyll serve --watch

setup:
	npm install -g bower
	gem install bundler

install:
	bundle install
	pushd src
	bower install
	popd
