String.prototype.linkify = function() {

        // http://, https://, ftp://
        var urlPattern = /\b(?:https?|ftp):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim;

        // www. sans http:// or https://
        var pseudoUrlPattern = /(^|[^\/])(www\.[\S]+(\b|$))/gim;

        // Email addresses
        var emailAddressPattern = /[\w.]+@[a-zA-Z_-]+?(?:\.[a-zA-Z]{2,6})+/gim;

        return this
            .replace(urlPattern, '<a href="$&">$&</a>')
            .replace(pseudoUrlPattern, '$1<a href="http://$2">$2</a>')
            .replace(emailAddressPattern, '<a href="mailto:$&">$&</a>');
};

angular.module('mychat.directives', [])

.directive('myMaxlength', [function() {
  return {
    require: 'ngModel',
    link: function (scope, element, attrs, ngModelCtrl) {
      var maxlength = Number(attrs.myMaxlength);
      function fromUser(text) {
          if (text.length > maxlength) {
            var transformedInput = text.substring(0, maxlength);
            ngModelCtrl.$setViewValue(transformedInput);
            ngModelCtrl.$render();
            return {
                'amount': transformedInput.length,
                'value': transformedInput
              }
          } 
          return {
                'amount': text.length,
                'value': text
              }
      }
      ngModelCtrl.$parsers.push(fromUser);
    }
  }; 
}])

.directive('myLinks', ['$compile', '$sce', function ($compile, $sce){
    
    return {
        restrict: 'AE',
        scope: {
          links: '='
        },
        template: '<span ng-bind-html="messageWithLinks">{{messageWithLinks}}</span>',
        link: function (scope, element, attrs){
             scope.messageWithLinks = $sce.trustAsHtml(scope.links.message.linkify());

        }
    }

}])