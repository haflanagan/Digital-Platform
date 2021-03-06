(function () {
  'use strict';

  angular
    .module('teams')
    .controller('TeamMemberController', TeamMemberController);

  TeamMemberController.$inject = ['$scope', '$http'];

  function TeamMemberController($scope, $http) {
    $scope.save = function(isValid) {
      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'form.teamMemberForm');
        return false;
      }

      if ($scope.teamMember._id) {
        $scope.teamMember.$update(successCallback, errorCallback);
      } else {
        $scope.teamMember.$save(successCallback, errorCallback);
      }

      function successCallback(res) {
        $scope.saveFunction();
      }

      function errorCallback(res) {
        console.log('error: ' + res.data.message);
        $scope.error = res.data.message;
        if ($scope.error.match('email already exists')) {
          $scope.error = 'Email address already exists in the system';
        }
      }
    };
  }
})();
