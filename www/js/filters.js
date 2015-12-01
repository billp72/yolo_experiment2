var filt = angular.module('mychat.filters', [])

filt.filter('reverse', [function () {

  return function(items, total, limit) {
  	if( !items ){ return; }
         var shownItems = [];
         var revered = items.slice().reverse();
         angular.forEach(revered, function(item){

                if (item[total] < item[limit]) {
                      shownItems.unshift(item);
                }

                if (item[total] === item[limit]) {
                      shownItems.push(item);
                }
         });
  
      return shownItems;
  };
}]);

filt.filter('conversation', [function () {
	return function(items, attr){
		if(!items){ return;}
		 var shownItems = [];
		 angular.forEach(items, function (item) {
    
                if (item[attr] === true) {shownItems.unshift(item)}
            
                if (item[attr] !== true) {shownItems.push(item)}
           
        });
		return shownItems;
	}
}]);
