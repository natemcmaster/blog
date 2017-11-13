default: build

.PHONY: build serve setup

build:
	bundle exec jekyll build

serve:
	@open http://localhost:4000
	bundle exec jekyll serve --watch

setup:
	gem install bundler
	bundle install

test:
	bundle exec htmlproofer ./_site
