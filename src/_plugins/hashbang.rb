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
			site.pages.select{ |x|
					!x.instance_of?(HashbangBlankPage) && !/.+\.html$/.match(x.name).nil?
				}.each{|y|
					z=HashbangBlankPage.new(site,y)
					site.pages << z
				}
			site.posts.each do |x|
				site.pages << HashbangPostPage.new(site,x)
			end
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