//= require angulartics.min.js
//= require angulartics-ga.min.js
//= require angulartics-scroll.min.js

var blog = angular.module('blog', ['ngRoute', 'angulartics', 'angulartics.google.analytics', 'angulartics.scroll'], ['$routeProvider', '$locationProvider',
    function($routeProvider, $locationProvider) {
        $locationProvider.html5Mode(true);

        $routeProvider
            .when('/:partial*', {
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
            if ($window.scrollTo) {
                $window.scrollTo(0, 0);
            }

        });

        $scope.$on('$routeChangeSuccess', function() {
            $window.NProgress.done();
            if ($window.ga) {
                $window.ga('send', 'pageview');
            }
        });

        $scope.$on('$routeChangeError', function() {
            $window.NProgress.done();
        });
    }
]);