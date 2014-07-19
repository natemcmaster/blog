var blog = angular.module('blog', ['ngRoute'], ['$routeProvider', '$locationProvider',
    function($routeProvider, $locationProvider) {
        $locationProvider.html5Mode(true);

        $routeProvider.when('/:partial*', {
            controller: 'PageCtrl',
            templateUrl: function(opts) {
                return '/partial/' + opts.partial;
            }
        })
            .when('/', {
                controller: 'PageCtrl',
                templateUrl: '/partial/index.html'
            });
    }
]);

blog.controller('PageCtrl', ['$scope', '$window',
    function($scope, $window) {
        $scope.$on('$routeChangeStart', function() {
            $window.NProgress.start();
        });
        $scope.$on('$routeChangeSuccess', function() {
            $window.NProgress.done();
        });
        $scope.$on('$routeChangeError', function() {
            $window.NProgress.done();
        })
    }
]);