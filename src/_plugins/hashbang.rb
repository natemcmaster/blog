module Jekyll
	class Post
		attr_reader :base
		def getdir
			@dir
		end
	end
	class Page
		attr_reader :base
	end
end
module Hashbang
	class HashbangGen < Jekyll::Generator
		def generate(site)
			site.posts.each do |x|
				site.pages << HashbangPostPage.new(site,x)
			end
			site.pages.select {
				|x| x.name=='index.html'
				}.each{|y|
					z=HashbangBlankPage.new(site,y)
					site.pages << z
				}
		end
	end
	class HashbangBlankPage < Jekyll::Page
		def initialize site,page
			super(site,page.base,page.dir,page.name)
			@url = File.join('/partial',page.url)
			self.data['layout']='blank'
		end
	end
	class HashbangPostPage < Jekyll::Page
		attr_accessor :url
		def initialize site,post
			super(site,post.base,post.getdir,post.name)
			@url=File.join('/partial',post.url)
			self.data['layout']='blank'
			self.data['title']=post.name + "##hashbang"

		end
	end
end