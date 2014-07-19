//= require angular/angular.js
//= require angular-route/angular-route.js

var blog=angular.module('blog',['ngRoute'],
    function($routeProvider, $locationProvider){
        $locationProvider.html5Mode(true);

        $routeProvider.when('/:partial*', {
            controller: 'PartialCtrl',
            templateUrl:function(opts){
                return '/partial/'+opts.partial;
            }
        })
        .when('/',{
            controller:'PartialCtrl',
            templateUrl:'/partial/index.html'
        });
    })
.controller('PartialCtrl',function($routeParams) {
    console.log('PartialCtrl');
})