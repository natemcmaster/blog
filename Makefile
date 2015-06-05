DIR=./build

.PHONY: publish j_build serve

j_build:
	bower install
	jekyll build

serve:
	@open http://localhost:4000
	jekyll serve --watch

publish: j_build
	git --git-dir=$(DIR)/.git add --all
	git --git-dir=$(DIR)/.git commit -m "Build `date`"
	git --git-dir=$(DIR)/.git push
	git add build/
