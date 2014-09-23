function GraphData($rootScope, $http, $location) {
    $http.get('./data.json', {
        'responseType': 'json'
    })
        .success(function(graph, error) {
            this.__data = graph;
            this.emit('load');
            var id = this.$location.search().id;
            if(id && this.node(id)){
                this.emit('select.node', id);
            } else{
                this.choseRandomStart();
            }
        }.bind(this));
    this.events = {};
    this.__data = {
        nodes: {},
        links: {}
    };
    this.$location = $location;
    $rootScope.$on('$locationChangeSuccess', function() {
        var id = this.$location.search().id;
        if (id && this.node(id) && this.selected !== id) {
            this.emit('select.node', id, true);
        } 
        if(window.ga){
            window.ga('send','pageview',this.$location.url());
        }
    }.bind(this));
}

GraphData.prototype.choseRandomStart = function(){
    var nodes = this.nodes();
    if(!nodes.length)
        return;
    var index = Math.round(Math.random()*nodes.length)
    node = nodes[index];
    if(node && (node.id || node.id === 0))
        this.emit('select.node',node.id);
}

GraphData.prototype.tree = function(id){
    var maxDepth = 2;
    var count={};
    function makeObj(node,level){
        if(!count[level]){
            count[level] = 0;
        }
        count[level]++;
        return {
            id: node.id,
            title: node.title,
            level: level,
            children: []
        };
    }

    var inTree={};
    inTree[id]=true;
    function loadChildren(parent){
        if(parent.level >= maxDepth){
            return;
        }
        var c = this.links(parent.id);
        if(!c)
            return;
        for (var i = c.length - 1; i >= 0; i--) {
            var id = c[i];
            if(inTree[id])
                continue;
            var child = makeObj(this.node(id),parent.level+1);
            child.parent = parent;
            inTree[child.id]=true;
            parent.children.push(child);
        }
        for (var i = parent.children.length - 1; i >= 0; i--) {
            loadChildren.call(this,parent.children[i]);
        };
    }

    var tree = makeObj(this.node(id),0);
    loadChildren.call(this,tree);
    return {
        items:tree,
        count:count
    };
}

GraphData.prototype.nodes = function() {
    if (this.__arr)
        return this.__arr
    this.__arr = [];
    for (var x in this.__data.nodes) {
        this.__arr.push(this.__data.nodes[x]);
    }
    return this.__arr;
}

GraphData.prototype.node = function(id) {
    return this.__data.nodes[id];
}

GraphData.prototype.links = function(id) {
    return this.__data.links[id];
}

GraphData.prototype.emit = function(event) {
    var args = Array.prototype.slice.call(arguments, 1);
    if (event == 'select.node') {
        if (!args[0])
            return;
        args = [args[0], this.node(args[0]), this.links(args[0])];
        this.selected = args[0];
        this.$location.search('id', args[0]);
        document.title = args[1].title +' : History Explorer';
    }
    if (!this.events[event])
        return;
    this.events[event].forEach(function(cb) {
        cb.apply(null, [event].concat(args))
    });
}

GraphData.prototype.on = function(event, handler) {
    if (!this.events[event])
        this.events[event] = [];
    this.events[event].push(handler);
}