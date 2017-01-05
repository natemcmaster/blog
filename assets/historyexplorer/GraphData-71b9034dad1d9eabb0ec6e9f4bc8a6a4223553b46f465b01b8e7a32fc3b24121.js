function GraphData(t,i){this.$location=i,this.events={},this.__data=window.GRAPH_DATA,t.$on("$locationChangeSuccess",function(){var t=this.$location.search().id;t&&this.node(t)&&this.selected!==t&&this.emit("select.node",t,!0),window.ga&&window.ga("send","pageview",this.$location.url())}.bind(this)),angular.element(document).ready(function(){this.init()}.bind(this))}GraphData.prototype.init=function(){var t=this.$location.search().id;t&&this.node(t)?this.emit("select.node",t):this.choseRandomStart()},GraphData.prototype.choseRandomStart=function(){var t=this.nodes();if(t.length)for(var i;!i;){var e=Math.round(Math.random()*t.length);if(i=t[e],i&&(i.id||0===i.id))return void this.emit("select.node",i.id)}},GraphData.prototype.tree=function(t){function i(t,i){return a[i]||(a[i]=0),a[i]++,{id:t.id,title:t.title,level:i,children:[]}}function e(t){if(!(t.level>=n)){var a=this.links(t.id);if(a){for(var o=a.length-1;o>=0;o--){var s=a[o];if(!r[s]){var h=i(this.node(s),t.level+1);h.parent=t,r[h.id]=!0,t.children.push(h)}}for(o=t.children.length-1;o>=0;o--)e.call(this,t.children[o])}}}var n=2,a={},r={};r[t]=!0;var o=i(this.node(t),0);return e.call(this,o),{items:o,count:a}},GraphData.prototype.nodes=function(){if(this.__arr)return this.__arr;this.__arr=[];for(var t in this.__data.nodes)this.__arr.push(this.__data.nodes[t]);return this.__arr},GraphData.prototype.node=function(t){return this.__data.nodes[t]},GraphData.prototype.links=function(t){return this.__data.links[t]},GraphData.prototype.emit=function(t){var i=Array.prototype.slice.call(arguments,1);if("select.node"==t){if(!i[0])return;i=[i[0],this.node(i[0]),this.links(i[0])],this.selected=i[0],this.$location.search("id",i[0]),document.title=i[1].title+" : History Explorer"}this.events[t]&&this.events[t].forEach(function(e){e.apply(null,[t].concat(i))})},GraphData.prototype.on=function(t,i){this.events[t]||(this.events[t]=[]),this.events[t].push(i)};