var graphApp = angular.module('graphApp', []);

graphApp.config(function($locationProvider) {
    $locationProvider.html5Mode(true);
});
graphApp.service('GraphData', ['$rootScope', '$location', GraphData]);

graphApp.filter('cut', function() {
    return function(value, max, wordwise, tail) {
        if (!value) return '';
        max = parseInt(max, 10);
        if (!max) return value;
        if (value.length <= max) return value;

        value = value.substr(0, max);
        if (wordwise) {
            var lastspace = value.lastIndexOf('. ');
            if (lastspace != -1) {
                value = value.substr(0, lastspace);
            }
        }

        return value + (wordwise ? '.' : (tail || ' ...'));
    };
});

if(window.ga){
    window.ga('set', 'appName', 'History Explorer');
}
