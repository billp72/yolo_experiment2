angular.module('mychat.autocomplete', ['firebase'])

/*
* this is to populate the form with schools when the mentor is creating an account
*/
.factory('schoolFormDataService', ['$q', '$timeout', 'schoolFormData', 
    function ($q, $timeout, schoolFormData){
    var retrieveDataSort = function (searchFilter, cb){
                schoolFormData.all(function(data){
                    
                    var schools = data.data.sort(function(a, b) {

                        var schoolA = a.name.toLowerCase();
                        var schoolB = b.name.toLowerCase();

                        if(schoolA > schoolB) return  1;
                        if(schoolA < schoolB) return -1;

                        return 0;
                    });

                    var deferred = $q.defer();
                    var matches = schools.filter( function(school) {
                        if(school.name.toLowerCase().indexOf(searchFilter.toLowerCase()) !== -1 ) return true;
                    })

                    $timeout( function(){
        
                        deferred.resolve( matches );

                    }, 100);

                    cb(deferred.promise);
                });
        }

    return {
        retrieveDataSort: retrieveDataSort
    }
}])
/*
* get school data when mentor is filling out form
*/
.factory('schoolFormData', ['$http', function ($http){
    var data = $http.get('http://www.beanbagapp.com/beanbag/schools.php');

    return {
        all: function(cb){
            data.then(function(res){
                cb(res);
            });
           
        }
    }
}])
/*
* FOR ALL GROUP SEARCHES
* this is for mentors to choose a group
*/
.factory('groupsMentorsDataService', ['$q', '$timeout', 'groupsMentorData', 'Users', 
    function ($q, $timeout, groupsMentorData, Users) {

        var retrieveDataSort = function (searchFilter, cb){
                groupsMentorData.getGroupByID(Users.getIDS('schoolID'), function(data){

                    var schools = data.sort(function(a, b) {

                        var schoolA = a.groupName.toLowerCase();
                        var schoolB = b.groupName.toLowerCase();

                        if(schoolA > schoolB) return  1;
                        if(schoolA < schoolB) return -1;

                        return 0;
                    });

                    var deferred = $q.defer();
                    var matches = schools.filter( function(school) {
                        if(school.groupName.toLowerCase().indexOf(searchFilter.toLowerCase()) !== -1 ) return true;
                    })

                    $timeout( function(){
        
                        deferred.resolve( matches );

                    }, 100);

                    cb(deferred.promise);
                });
        }

    return {
        retrieveDataSort: retrieveDataSort
    }
}])
/*
*order alphabetically
*/
.factory('orderAlphanumeric', ['$q', '$timeout', 'groupsMentorData', 'Users',
        function ($q, $timeout, groupsMentorData, Users){
            var retrieveDataSort = function (cb){
                    groupsMentorData.getGroupByID(Users.getIDS('schoolID'), function(data){

                        var deferred = $q.defer();
                        
                        var schools = data.sort(function(a, b) {

                            var schoolA = a.groupName.toLowerCase();
                            var schoolB = b.groupName.toLowerCase();

                            if(schoolA > schoolB) return  1;
                            if(schoolA < schoolB) return -1;

                            return 0;
                        });

                        $timeout( function(){
        
                            deferred.resolve( schools );

                        }, 100);

                        cb(deferred.promise);
                });
            }

    return {
        retrieveDataSort: retrieveDataSort
    }
}])
/*
*get groups data
*/
.factory('groupsMentorData', ['$firebase', function ($firebase){
    var groups='';
    var allGroups='';
    var ref = new Firebase(firebaseUrl+'/groups');

    return{
        getGroupByID: function (schoolID, cb){
           groups = $firebase(ref.child('schools').child(schoolID)).$asArray();
           this.getGroupsGeneral(cb);
        },
        getGroupsGeneral: function (cb){
            groups.$loaded(function(data){
                var general = $firebase(ref.child('general')).$asArray();
                    general.$loaded(function(grp){
                        if(!!data && data.length > 0){
                            allGroups = grp.concat(data);
                            cb(allGroups);
                        }else{
                            cb(grp);
                        }
                        
                    });
            })
        }
    }
     
}])
.factory('groups', ['$firebase', function ($firebase, $q, $timeout){
    var ref = new Firebase(firebaseUrl+'/users');
    var allGroups;
    return {
        retrieveUserGroups: function (userID, cb){
                //return questionKey - publicQuestionKey by existance of organizerUserID
            allGroups = $firebase(ref.child(userID).child('questions').orderByChild('organizerUserID').startAt(!null)).$asArray();
            cb(allGroups);
        
        }
    }
}])



