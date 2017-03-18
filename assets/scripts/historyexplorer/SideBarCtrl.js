graphApp.controller('SideBarCtrl', ['$scope', 'GraphData',
    function SideBarCtrl($scope, GraphData) {
        $scope.maxDesc = 600;
        $scope.animate = false;
        GraphData.on('select.node', function(event, id, node, links) {
            $scope.animate = false;
            $scope.title = node.title;
            $scope.related = links;
            $scope.heroImage = node.image;
            $scope.imageSize = node.image_size;
            // $scope.caption = 'Portrait of Leonardo da Vinci';
            // $scope.subtitle = '1452-1519';
            $scope.description = node.description;
            if (node.image) {
                var img = new Image();
                img.onload = function() {
                    $scope.animate = true;
                    $scope.$apply();
                };
                img.src = node.image;
            }
            $scope.source = node.source;
            $scope.sourceURI = node.url;
            $scope.$apply();
        });

        $scope.loadRelated = function(id) {
            GraphData.emit('select.node', id);
        }

        $scope.relatedTitle = function(id) {
            return GraphData.node(id).title;
        }
    }
]);
