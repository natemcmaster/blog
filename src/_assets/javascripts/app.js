//= require angular/angular.js
//= require angular-route/angular-route.js

angular.module('blog',['ngView'],
	function($routeProvider, $locationProvider){
		$routeProvider.when('/:partial*', {
	      controller: PartialCtrl,
	      controllerAs: 'post'
	    });
})

function MainCntl($route, $routeParams, $location) {
  this.$route = $route;
  this.$location = $location;
  this.$routeParams = $routeParams;
}

function PartialCtrl($routeParams) {
  this.name = "PartialCtrl";
  this.params = $routeParams;
  console.log($routeParams);
}