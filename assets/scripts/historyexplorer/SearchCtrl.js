graphApp.controller('SearchCtrl', ['$scope', '$element', 'GraphData',
    function SearchCtrl($scope, $element, GraphData) {
        var maxResults = 6;

        var bloodhound = new Bloodhound({
            limit: maxResults,
            local: GraphData.nodes(),
            datumTokenizer: function(d) {
                return Bloodhound.tokenizers.whitespace(d.title);
            },
            queryTokenizer: Bloodhound.tokenizers.whitespace
        });
        bloodhound.initialize()
            .done(function() {
                $scope.ready = true;
            });

        function cancel(e) {
            e.cancelBubble = true;
            e.returnValue = false;

            if (e.stopPropagation) {
                e.stopPropagation();
                e.preventDefault();
            }
        }

        $scope.$on('keypress', function(scope, e) {
            if (e.which == 47 || (e.metaKey || e.ctrlKey) && e.which == 102) {
                cancel(e);
                $element.find('input').focus();
            }
        });

        $scope.matches = [];

        $scope.$watch('searchQuery', function(query) {
            if (!$scope.ready)
                return;
            bloodhound.get(query, function(suggestions) {
                $scope.matches = suggestions;
                $scope.selectedResult = 0;
            });
        })

        GraphData.on('select.node', function(event, id, node, links) {
            $scope.matches = [];
            $element.find('input').blur()
        });

        $scope.clear = function(timeout) {
            setTimeout(function() {
                $scope.matches = []
                $scope.searchQuery = '';
            }, timeout || 0)
        }

        $scope.goTo = function(id) {
            $scope.clear();
            GraphData.emit('select.node', id);
        }

        $scope.searchKey = function(e) {
            if (e.which == 40 || e.which == 0) { // right arrow, down arrow, tab
                e.preventDefault();
                e.stopPropagation();
                $scope.selectedResult = Math.min($scope.selectedResult + 1, $scope.matches.length - 1)
            } else if (e.which == 38) { // up arrow
                e.preventDefault();
                e.stopPropagation();
                $scope.selectedResult = Math.max(0, $scope.selectedResult - 1);
            } else if (e.which == 13 && $scope.selectedResult > -1) {
                e.preventDefault();
                e.stopPropagation();
                var id = $scope.matches[$scope.selectedResult].id;
                $scope.goTo(id);
            }
        }
    }
]);
