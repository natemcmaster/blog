require 'jekyll-assets'
require 'sprockets'
require 'uglifier'


Sprockets.register_compressor 'application/javascript', :no_mangle_uglifier, Uglifier.new(:mangle => false)
