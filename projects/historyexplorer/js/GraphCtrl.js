var GraphCtrl = (function _constuct() {
    var svg, graph, goToNode;

    function Link(a, b) {
        this.a = a;
        this.b = b;
    }

    var MAX_LEVEL = 2,
        WIDTH = 500,
        HEIGHT = 500,
        MAX_LEVEL = 2,
        MAX_NODE_RADIUS = 14,
        MIN_NODE_RADIUS = 5,
        TRANSITION = 1300,
        scale = 100;


    var lineSpacing = function(l) {
        return 15 - 2 * l;
    };

    function nodeRadius(d) {
        var flex = MAX_NODE_RADIUS - MIN_NODE_RADIUS;
        return flex / (d.radius + 1) + MIN_NODE_RADIUS;
    }

    function normx(n) {
        return Math.cos(n.angle) * n.radius * scale;
    }

    function normy(n) {
        return Math.sin(n.angle) * n.radius * scale;
    }

    function leftHalf(angle) {
        var half = Math.PI / 2;
        return angle > 3 * half || angle < half;
    }

    function radToDeg(rad) {
        return rad / Math.PI * 180;
    }

    function nodeLabel(d) {
        var quarter = Math.PI / 2;
        var el = d3.select(this);
        var inLeftHalf = leftHalf(d.angle);
        if (d.level != 0) {
            el.text(d.title)
                .attr('y', 0)
                .attr('text-anchor', (inLeftHalf ? 'start' : 'end'))
                .attr('transform', inLeftHalf ? 'translate(' + (10 + nodeRadius(d)) + ')' : 'rotate(180)translate(-' + (10 + nodeRadius(d)) + ')');
        } else {
            var words = d.title.split(' ');
            el.text('').attr('y', nodeRadius)
                .attr('transform','translate(0)rotate(0)')
                .attr('text-anchor', 'middle');

            for (var i = 0; i < words.length; i++) {
                var content = words[i];
                //handle short words
                if (words[i + 1] && words[i + 1].length <= 3) {
                    content += ' ' + words[i + 1];
                    i++;
                }
                var tspan = el.append('tspan').text(content);
                tspan.attr('x', 0).attr('dy', lineSpacing(d.radius));
            }
        }
    }

    function arrangeNodes(tree) {
        var incr = 2 * Math.PI / tree.count[2];
        var outerAngle = 0;
        for (var i = tree.items.children.length - 1; i >= 0; i--) {
            var level1 = tree.items.children[i];
            var count = level1.children.length;
            for (var j = 0; j < count; j++) {
                var level2=level1.children[j]
                level2.radius = 2;
                level2.angle = outerAngle;
                outerAngle += incr;
            };

            if(count % 2 == 0){
                var right = count/2;
                var left = right-1;
                level1.angle = (level1.children[left].angle + level1.children[right].angle) / 2;
            } else{
                level1.angle = level1.children[(count-1)/2].angle
            }
            level1.radius = 1;
        };

        tree.items.angle = 0
        tree.items.radius = 0;

        return tree.items;
    }

    function draw(items) {
        var nodes = [];
        var links = [];

        function flatten(parent) {
            nodes.push(parent);
            parent.children.forEach(function(child) {
                if(child.empty){
                    return;
                }
                links.push(new Link(parent, child))
                flatten(child);
            })
        }
        flatten(items);
        drawLinks(links);
        drawNodes(nodes);
    }

    function drawLinks(links) {

        var lines = svg.select('#lines').selectAll('.link')
            .data(links, function(d) {
                return (d.a.id > d.b.id) ? d.a.id * 1000 + d.b.id : d.a.id + d.b.id * 1000;
            });

        lines.enter()
            .append('line')
            .attr('class', 'link')
            .attr('x1', function(d) {
                var pt = d.a.parent || d.a;
                return normx(pt);
            }).attr('y1', function(d) {
                var pt = d.a.parent || d.a;
                return normy(pt);
            })
            .attr('x2', function(d) {
                var pt = d.a.parent || d.a;
                return normx(pt);
            }).attr('y2', function(d) {
                var pt = d.a.parent || d.a;
                return normy(pt);
            })
            .transition()
            .duration(TRANSITION)
            .attr('x2', function(d) {
                return normx(d.b);
            }).attr('y2', function(d) {
                return normy(d.b);
            });


        lines.transition()
            .duration(TRANSITION)
            .attr('x1', function(l) {
                return normx(l.a);
            }).attr('y1', function(l) {
                return normy(l.a);
            })
            .attr('x2', function(l) {
                return normx(l.b);
            }).attr('y2', function(l) {
                return normy(l.b);
            });

        lines.exit().remove();
    }

    function drawNodes(nodes) {
        var items = svg.select('#nodes').selectAll('.item')
            .data(nodes, function(d) {
                return d.id;
            });

        //enter
        var group = items.enter()
            .append('g')
            .on('click', goToNode)
            .attr('class', function(d) {
                return 'item level-' + d.radius;
            })
            .attr('transform', function(d) {
                var pt=d.parent || d;
                return 'rotate(' + radToDeg(pt.angle) + ')translate('+pt.radius * scale+')'
            });

        group.transition()
            .duration(TRANSITION)
            .attr('transform', function(d) {
                return 'rotate(' + radToDeg(d.angle) + ')translate(' + d.radius * scale + ')'
            });

        group.append('text')
            .attr('class', 'node-label')
            .each(nodeLabel)

        group.append('circle')
            .attr('r', nodeRadius)
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('class', 'node');

        //update
        var updatedGroup = items.attr('class', function(d) {
            return 'item level-' + d.radius;
        })
            .transition()
            .duration(TRANSITION)
            .attr('transform', function(d) {
                return 'rotate(' + radToDeg(d.angle) + ')translate(' + d.radius * scale + ')'
            });
        updatedGroup.select('circle')
            .attr('r', nodeRadius);
        updatedGroup.select('text')
            .each(nodeLabel)


        //exit
        items.exit().remove();

    }

    function GraphCtrl($scope, $http, $element, GraphData) {
        graph = GraphData;

        svg = d3.select($element[0])
            .append('svg')
            .attr('viewBox', [0, 0, WIDTH, HEIGHT].join(' '))
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .append('g')
            .attr('transform', 'translate(' + WIDTH / 2 + ',' + HEIGHT / 2 + ')');

        svg.append('g').attr('id', 'lines');
        svg.append('g').attr('id', 'nodes');

        graph.on('select.node', function(event, id) {
            this.centerOnNode(id);
        }.bind(this));

        goToNode = function(d) {
            this.selectNode(d.id);
        }.bind(this);
    }

    GraphCtrl.prototype.selectNode = function(id) {
        graph.emit('select.node', id);
    }

    GraphCtrl.prototype.centerOnNode = function(ctr) {
        var tree = graph.tree(ctr);
        for (var i = tree.items.children.length - 1; i >= 0; i--) {
            var s =tree.items.children[i];
            if(!s.children.length){
                tree.count[2]++;
                s.children=[{empty:true}];
            }
        };

        var items = arrangeNodes(tree);
        draw(items);
        return;
    }

    return GraphCtrl;
})();