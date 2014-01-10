#encoding: utf-8 
require 'jekyll' 
require 'rubygems'
require 'rake'
require 'rdoc'
require 'date'
require 'yaml'
require 'tmpdir'

def build level
   Jekyll::Site.new(Jekyll.configuration({
    url: "http://blog.natemcmaster#{level}.com",
    assets:{
    	js_compressor: level=='locl'? nil : 'uglify'
    }
    })).process 
end


desc "Generate blog files"
task :generate do
    build "loc"
end

desc "Clean"
task :clean do
	system "rm -r build/*"
end

# desc "Generate and publish blog to gh-pages"
#     task :publish do
#         build nil
#         orig=Dir.mktmpdir
#           Dir.mktmpdir do |tmp|
#             begin
#                system "mv _site/* #{tmp}"
#                 ckh=system "git checkout -B gh-pages"
#                 raise "Could not checkout" unless ckh
#                 puts "Backing up originals to #{orig}"
#                 system "mv * #{orig}"
#                 system "mv #{tmp}/* ."
#                 message = "Site updated at #{Time.now.utc}"
#                 system "git add ."
#                 system "git commit -am #{message.shellescape}"
#                 system "git checkout master" 
#                 system "mv #{orig}/* . " 
#             rescue 
#                 rollback()
#             end
       
#     end
# end

task :default => :generate
task :gen => :generate
task :pub => :publish