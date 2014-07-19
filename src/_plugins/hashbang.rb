module Jekyll
	class Post
		attr_reader :base
		def getdir
			@dir
		end
	end
	class Page
		attr_reader :base
		def getdir
			@dir
		end
	end
end

module Hashbang
	class HashbangGen < Jekyll::Generator
		def generate(site)
			site.pages.select{ |x|
					!x.instance_of?(HashbangBlankPage) and !(x.data['layout'].nil? or x.data['layout'] == 'none')
				}.each{|y|
					z=HashbangBlankPage.new(site,y)
					site.pages << z
				}
			site.posts.each do |x|
				site.pages << HashbangPostPage.new(site,x)
			end
		end

		def self.process(data)
			if data['layout'].nil? or data['layout'] == 'default'
				data['layout'] = 'blank'
			else
				data['layout'] << '_partial'	
			end
			data['header'] = false
			return data
		end
	end
	class HashbangBlankPage < Jekyll::Page
		def initialize site,page
			super(site, page.base, page.getdir, page.name)
			@url = File.join('/partial',page.url)
			self.data = HashbangGen.process(self.data)
		end
	end
	class HashbangPostPage < Jekyll::Page
		attr_accessor :url
		def initialize site,post
			super(site,post.base,post.getdir,post.name)
			@url=File.join('/partial',post.url)
			self.data = HashbangGen.process(self.data)
		end
	end
end