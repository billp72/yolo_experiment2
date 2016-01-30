angular.module('mychat.services', ['firebase'])

.factory("Auth", ["$firebaseAuth", "$rootScope",
        function ($firebaseAuth, $rootScope) {
            var ref = new Firebase(firebaseUrl);
            return $firebaseAuth(ref);
}])

/*
* public chat room
*/
.factory('PublicChat', ['$firebase', 'Users', 'Rooms', '$http', function ($firebase, Users, Rooms, $http) {
    // Might use a resource here that returns a JSON array
    var ref = new Firebase(firebaseUrl+'/schools');
    var chats;
    var selectedRoomID;
    var processEmailRequest = function (data){
        $http({
            method: 'POST',
            url: 'http://www.beanbagapp.com/beanbag/emailToApplicant.php', 
            data: data
        })
        .success(function(data, status, headers, config)
        {
            console.log(status + ' - ' + data);
        })
        .error(function(data, status, headers, config)
        {
            console.log('error');
        });
    }
    //$firebase(ref.child('schools').child(selectedRoomID).child('chats')).$asArray();
    return {
        all: function (from) {
            return chats;
        },
        remove: function (chat) {
            chats.$remove(chat).then(function (ref) {
                ref.key() === chat.$id; // true item has been removed
            });
        },
        get: function (chatID) {
            for (var i = 0; i < chats.length; i++) {
                if (chats[i].ID === parseInt(chatID)) {
                    return chats[i];
                }
            }
            return null;
        },
        editGroup: function (params){

            var edit = ref.child(params.schoolID).child('questions').child(params.groupID).child(params.publicQuestionKey);
                edit.update({'question':params.question}, function(){

                     var editUserQuestion = Users.getRef().child(params.userID).child('questions').child(params.userGroupKey);
                         editUserQuestion.update({'question':params.question}, function(){
                             
                         })

                });
        },
        getSelectedRoomName: function (cb) {
            var selectedRoom;
            if (selectedRoomID && selectedRoomID != null) {
                  return Rooms.get(selectedRoomID, function(room){
                    if (room)
                        selectedRoom = room.schoolname;
                    else
                        selectedRoom = null;

                    cb(selectedRoom);
                });
            } else{
                return null;
            }

        },
        selectRoom: function (schoolID, questionID, groupID) {
            selectedRoomID = schoolID;
            chats = $firebase(ref.child(schoolID).child('questions').child(groupID).child(questionID).child('conversations')).$asArray();  
        },
        send: function (params) {
       
            if (params.displayName && params.message) {
                var chatMessage = {
                    from: params.displayName,
                    message: params.message,
                    schoolID: params.schoolID,
                    createdAt: Firebase.ServerValue.TIMESTAMP,
                    avatar: params.avatar,
                    userID: params.userID, //this is used to eject a user from the group
                    email: params.email //this is used to eject members
                };
                chats.$add(chatMessage).then(function (data) {
                      
                   var members = $firebase(ref.child(params.schoolID).child('questions').child(params.groupID)
                            .child(params.publicQuestionKey).child('members')).$asObject();

                         members.$loaded(function(data){
                                angular.forEach(data, function(member){
                                    if(member.userID !== params.userID){
                                        Users.getRef().child(member.userID).child('questions').child(member.userGroupKey)
                                           .update({'conversationStarted':true});
                                    }
                                })
                         })
                        
            
                });
              
            }
        },
        wrapitup: function(params, cb){
       
            var mainGroupToRemove = ref.child(params.schoolID).child('questions').child(params.groupID).child(params.publicQuestionKey);
            var usersToRemove = $firebase(ref.child(params.schoolID).child('questions').child(params.groupID).child(params.publicQuestionKey).child('members')).$asObject();

                    usersToRemove.$loaded(function(data){
                        angular.forEach(data, function(user){
                            questionProspect = Users.getRef().child(user.userID).child('questions').child(user.userGroupKey);
                                questionProspect.remove(
                                    function (err){
                                        if(err){
                                            cb('there was an error deleting' + err);
                                        }

                                    }
                                );
                        });
                        mainGroupToRemove.remove(
                            function (err){
                                if(err){
                                    cb('there was an error deleting' + err);
                                }else{
                                
                                    cb(false);  
                                }
                        }
                    );
                    });
                    
        },
        eject: function (params, cb){
        
            function callback (error){
                   if(error){
                       console.log('failer '+ error)
                    }else{
                        processEmailRequest({'email': params.email, 'reason': params.message, 'groupName': params.groupName});
                        cb(false);
                    }
                                                                    
             }
         
            var groupMembers = ref.child(params.schoolID).child('questions').child(params.groupID)
                    .child(params.publicQuestionKey).child('members').child(params.userID);

                groupMembers.once('value', function(snapshot){
                    var deleted = snapshot.val();
                    if(!!deleted || deleted !== null){
                        var removeMemberGroup = Users.getRef().child(deleted.userID).child('questions').child(deleted.userGroupKey);
                            removeMemberGroup.remove(
                                function (err){
                                    if(err){
                                        cb('there was an error deleting' + err);
                                    }else{
                                        groupMembers.remove(
                                            function (err){
                                                if(err){
                                                    cb('there was an error removing you' + err);
                                                }else{
                                                    var ejected = ref.child(params.schoolID).child('questions').child(params.groupID)
                                                        .child(params.publicQuestionKey).child('ejected').child(params.userID);
                                                            ejected.set({userID: params.userID}, callback);

                                                    if(params.quota){
                                                        ref.child(params.schoolID).child('questions').child(params.groupID)
                                                            .child(params.publicQuestionKey)
                                                                .update({'memberFlag':'allow'});

                                                    }else{
                                                        ref.child(params.schoolID).child('questions').child(params.groupID).child(params.publicQuestionKey).child('total').transaction(function(currentVal){
                                                            if(!!currentVal){
                                                                return currentVal-1;
                                                            }
                    
                                                        });
                                                    }
                                                   
                                                }

                                            }
                                        );
                                    }

                                }
                        );
                    }else{
                        cb('This member is no longer in this group. Swipe left to remove existing chat messages.');
                    }
                });

        },
        unjoin: function (params, cb){
            var groupMembers = ref.child(params.schoolID).child('questions').child(params.groupID)
                    .child(params.publicQuestionKey).child('members').child(params.userID);
          
                groupMembers.once('value', function(snapshot){
                    var deleted = snapshot.val();
            
                    var removeMemberGroup = Users.getRef().child(deleted.userID).child('questions').child(deleted.userGroupKey);
                        removeMemberGroup.remove(
                            function (err){
                                if(err){
                                    cb('there was an error deleting' + err);
                                }else{
                                    groupMembers.remove(
                                        function (err){
                                            if(err){
                                                cb('there was an error removing you' + err);
                                            }else{
                                                if(params.quota){
                                                        ref.child(params.schoolID).child('questions').child(params.groupID)
                                                            .child(params.publicQuestionKey)
                                                                .update({'memberFlag':'allow'});
                                                        
                                                }else{
                                                        ref.child(params.schoolID).child('questions').child(params.groupID).child(params.publicQuestionKey).child('total').transaction(function(currentVal){
                                                            if(!!currentVal){
                                                                return currentVal-1;
                                                            }
                    
                                                        });
                                                }
                                                cb(false);
                                                
                                            }

                                        }
                                    );
                                }

                            }
                      );
                });
        },
        transfer: function (params, cb){
            var group = ref.child(params.schoolID).child('questions').child(params.groupIDCurrent)
                            .child(params.publicQuestionKeyCurrent);
                group.update({'avatar': params.transferAvatar, 'displayName': params.transferDisplayName}, 
                    function (error){
                        if(error){
                            console.log('there was an error: ' + error);
                        }else{
                            var transferGroup = Users.getRef().child(params.transferUserGroupID).child('questions')
                                    .child(params.transferUserGroupKey);
                                transferGroup.update({
                                    'organizerUserID': params.transferUserGroupID,
                                    'icon':'ion-plus-circled',
                                    'avatar': params.transferAvatar
                                 },
                                    function(error){
                                        if(error){
                                            console.log('there was an error: '+ error);
                                        }else{
                                            var originalGroupOwner = Users.getRef().child(params.organizerUserID).child('questions')
                                                    .child(params.userGroupKeyCurrentOwner).child('organizerUserID');
                                                originalGroupOwner.remove(function(error){
                                                    if(error){
                                                        console.log('an error occured: '+ error);
                                                    }else{
                                                        cb('The group was transfered to: ' + params.transferDisplayName);
                                                    }
                                                })

                                        }
                                    })
                        }
                })
        }
    }
}])
/** 
 * Simple Service which returns Rooms collection as Array from Salesforce & binds to the Scope in Controller
 */
.factory('Rooms', ['$firebase', '$q', '$timeout', function ($firebase, $q, $timeout) {
    // Might use a resource here that returns a JSON array
    var ref = new Firebase(firebaseUrl+'/schools');
    var rooms = $firebase(ref).$asArray();
    var increment=0;
    var deferred = $q.defer();
    var returnStatement;
    //$firebase(ref.child('schools').child(selectedRoomID).child('chats')).$asArray();
    return {
        all: function () {
            return rooms;
        },
        getRef: function (){
            return ref;
        },
        get: function (roomID, fn) {
            var rm;
            rooms.$loaded(function(room){//get record doesn't return a promise
                rm = room.$getRecord(roomID);
                fn(rm);
            });
        },
        getSchoolBySchoolID: function(schoolID, groupID, lat, lon, cb){
            
            if(schoolID === 'gencom'){

                var groupArr = [];
                groupArr.length = 0;
                var referrence = ref.child(schoolID).child('questions').child(groupID);
                var geoFire = new GeoFire(referrence);
                var geoQuery = geoFire.query({
                    center: [lat, lon],
                    radius: 100.609 //kilometers
                });

                geoQuery.on('key_entered', function(key, location, distance) {
                    //console.log("Bicycle shop " + key + " found at " + location + " (" + distance + " km away)");
                   
                    referrence.child(key).once('value', function(snapshot){
                            groupArr.push(snapshot.val());
                    });
                 
                });
                cb(groupArr);
            }else{
                returnStatement = $firebase(ref.child(schoolID).child('questions').child(groupID)).$asArray();

                $timeout( function(){
        
                    cb( returnStatement );

                }, 100);
                
            }
            
        },
        checkSchoolExist: function(schoolID){
            return $firebase(ref.child(schoolID).child('questions')).$asArray();
        },
        addQuestionsToSchool: function(params, schoolID, lat, lon, cb){
        
            var qdata = {
                schoolID: params.schoolID,
                question: params.question,
                icon: params.icon,
                questionID: params.questionID,
                displayName: params.displayName,
                email: params.email,
                groupID: params.groupID,
                limit: params.limit,
                avatar: params.avatar,
                memberFlag: params.memberFlag,
                createdAt: Firebase.ServerValue.TIMESTAMP
            }
            var newRef = ref.child(params.schoolID).child('questions').child(params.groupID).push();

            if(params.schoolID === 'gencom'){
                var refGeo = new Firebase(firebaseUrl+'/schools/'+params.schoolID+'/questions/'+params.groupID);
                var geoFire = new GeoFire(refGeo);
                var key = newRef.key();
                //console.log("latitude "+lat, "longitude "+lon);
                    geoFire.set(key, [lat, lon]).then(function() {
                        ref.child(params.schoolID).child('questions').child(params.groupID).child(key).update(qdata,
                            function(error){
                                if (error) {
                                    console.log('Synchronization failed');
                                } else {
                                 
                                    cb({key: newRef.key()});

                                }
                            });
               
                    }, function(error) {
                        console.log("Error: " + error);
                    });
            }else{
                ref.child(params.schoolID).child('questions').child(params.groupID).child(newRef.key()).set(qdata);

                cb({key: newRef.key()});
            }
           
        },
         retrieveSingleQuestion: function (schoolID, questionID) {
            return $firebase(ref.child(schoolID).child('questions').child(questionID)).$asObject();
        },
         getEjected: function (params){
               return $firebase(ref.child(params.schoolID).child('questions')
                        .child(params.group).child(params.publicQuestionKey)
                            .child('ejected').child(params.userID)).$asObject();
         },
         getMember: function (params){
               return $firebase(ref.child(params.schoolID).child('questions')
                        .child(params.group).child(params.publicQuestionKey)
                            .child('members').child(params.userID)).$asObject();
         },
         getMembers: function (params){
                return $firebase(ref.child(params.schoolID).child('questions')
                        .child(params.groupID).child(params.publicQuestionKey)
                            .child('members')).$asObject();
         },
         getMembersArray: function (params){
                return $firebase(ref.child(params.schoolID).child('questions')
                        .child(params.groupID).child(params.publicQuestionKey)
                            .child('members')).$asArray();

         },
         getMemberFlag: function (params){
            return $firebase(ref.child(params.schoolID).child('questions')
                        .child(params.groupID).child(params.publicQuestionKey)
                            .child('memberFlag')).$asObject();
         },
         getMemberQuota: function(params, cb){
            var _this = this;
            this.getLimit(params).$loaded(function(limit){
                _this.getTotal(params).$loaded(function(total){
                        cb(total.$value === limit.$value);
                })
            })
         },
        getLimit: function (params){
            return $firebase(ref.child(params.schoolID).child('questions')
                        .child(params.groupID).child(params.publicQuestionKey)
                            .child('limit')).$asObject();
        },
        getTotal: function (params){
            return $firebase(ref.child(params.schoolID).child('questions')
                        .child(params.groupID).child(params.publicQuestionKey)
                            .child('total')).$asObject();
        },
         addAsMember: function (params) {
            var members = ref.child(params.schoolID).child('questions').child(params.group).child(params.publicQuestionKey).child('members').child(params.userID);

                members.set({userID: params.userID, userGroupKey: params.userGroupKey, avatar: params.avatar, displayName: params.displayName},
                    function(){
                        ref.child(params.schoolID).child('questions').child(params.group).child(params.publicQuestionKey).child('total').transaction(function(currentVal){
                            if(!!currentVal){
                                return currentVal+1;
                            }else{
                                return 1;
                            }
                    
                        });
                })
        },
        reduceAsmember: function (params, cb){
            var _this = this;
             ref.child(params.schoolID).child('questions').child(params.groupID).child(params.publicQuestionKey).child('total').transaction(function(currentVal){

                            if(currentVal === params.currentMembers+1){
                                cb('Group accepting all members');
                                _this.updateMemberStatus(params);

                                return currentVal-1;
                            }
        
                            if(!!currentVal && currentVal > params.currentMembers){
                                var ret = currentVal-1;
                                    increment =+1
                                cb('group is now open to accepting '+ increment + ' member(s)');

                                return ret;

                            }
                    
                        });
        },
        countTotalMembers: function (params){
            return $firebase(ref.child(params.schoolID).child('questions').child(params.groupID).child(params.publicQuestionKey).child('members')).$asArray();
        },
        updateMemberStatus: function (params){
            ref.child(params.schoolID).child('questions').child(params.groupID)
                .child(params.publicQuestionKey)
                    .update({'memberFlag':'open'});
        }
    }
}])
/**
 * simple service to get all the users for a room or in the db
*/
.factory('Users', ['$firebase', '$q','$timeout', '$window', 'Rooms', 'RequestsService', 'stripDot', function ($firebase, $q, $timeout, $window, Rooms, RequestsService, stripDot) {
    // Might use a resource here that returns a JSON array
    var ref = new Firebase(firebaseUrl+'/users');
    var users = $firebase(ref).$asArray();
    
    return {
        all: function () {
            return users;
        },
        getUserByID: function(userID){
             return $firebase(ref.child(userID).child('questions')).$asArray();
        },
        addQuestionToUser: function(params){
            var user = this.getUserByID(params.userID);
            if(!!params.displayName){//adds when one joins
                return user.$add(
                    {
                        schoolID: params.schoolID, 
                        question: params.question, 
                        icon: params.icon,
                        groupName: params.groupName,
                        displayName: params.displayName,
                        groupID: params.groupID,
                        publicQuestionKey: params.publicQuestionKey,
                        avatar: params.avatar
                    });
            }else{//adds when organizer creates a new group
                return user.$add(
                    {
                        schoolID: params.schoolID, 
                        question: params.question, 
                        icon: params.icon,
                        groupName: params.groupName,
                        groupID: params.groupID,
                        organizerUserID: params.userID,
                        publicQuestionKey: params.publicQuestionKey,
                        avatar: params.avatar
                    });
            }
        },
        updateUserGroup: function (groupID, groupName, userID){
            ref.child(userID).child('user').update({'groupID': groupID, 'groupName': groupName});
        },
        getIDS: function (key){
            return JSON.parse($window.localStorage.getItem(key));
        },
        getRef: function (){
            return ref;
        },
        storeIDS: function (ID, key){
            $window.localStorage.setItem(key, JSON.stringify(ID));
        },
        removeItem: function (key){
            $window.localStorage.removeItem(key);
        },
        toggleQuestionBackAfterClick: function (toggleUserID, toggleQuestionID){
             ref.child(toggleUserID).child('questions').child(toggleQuestionID)
                        .update({'conversationStarted':false});
       }
    }
}])

.factory('stripDot', [function(){

    return {
        strip: function(ID){
            return ID.replace(/\./g,'');
        },
        generatePass: function () {
             var possibleChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?_-'.split('');
             var password = '';
             for(var i = 0; i < 16; i += 1) {
                    password += possibleChars[Math.floor(Math.random() * possibleChars.length)];
            }
            return password;
        },
        shortRandom: function (){
            var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?_-'.split('');
            var ch = '';
             for(var i = 0; i < 3; i += 1) {
                    ch += chars[Math.floor(Math.random() * chars.length)];
            }
            return ch;
        }
    }
}])
/*change password*/
.factory('ChangePassword', [function(){
    var ref = new Firebase(firebaseUrl);
    return {

        change: function (user, schoolemail){
                ref.changePassword({
                    email: schoolemail,
                    oldPassword: user.oldPassword,
                    newPassword: user.newPassword
                }, function(error) {
                    if (error) {
                        switch (error.code) {
                            case "INVALID_PASSWORD":
                                alert("The specified user account password is incorrect.");
                                break;
                            case "INVALID_USER":
                                alert("The specified user account does not exist.");
                                break;
                            default:
                                alert("Error changing password:", error);
                        }
                    } else {
                        alert("User password changed successfully!");
                    }
                });
            }
        }
}])

/*push factory
* key: AIzaSyDpA0b2smrKyDUSaP0Cmz9hz4cQ19Rxn7U
* Project Number: 346007849782
*/
.factory('pushService',  ['$rootScope', '$q', '$window', 'RequestsService', 'Users',
        function ($rootScope, $q, $window, RequestsService, Users) {
  var 
    pushNotification = window.plugins.pushNotification,
    successHandler = function (result) {},
    errorHandler = function (err){if(err) throw err;},
    tokenHandler = function (device_token) {
        RequestsService.pushNote(
            {'device_token': device_token,
             'userID': $rootScope.userID,
             'device_type':'ios',
             'method':'POST',
             'path':'register'
            });
  };
  if(!$rootScope.userID){
        $rootScope.userID = Users.getIDS('userID');
    }
  // handle GCM notifications for Android
  $window.onNotificationGCM = function (event) {
    switch (event.event) {
      case 'registered':
        if (event.regid.length > 0) {
          // Your GCM push server needs to know the regID before it can push to this device
          // here is where you might want to send it the regID for later use.
          var device_token = event.regid;
          
          RequestsService.pushNote(
            {'device_token': device_token,
             'userID': $rootScope.userID,
             'device_type':'android',
             'method':'POST',
             'path':'register'
            });
          //send device reg id to server

        }
        break;

      case 'message':
          // if this flag is set, this notification happened while we were in the foreground.
          // you might want to play a sound to get the user's attention, throw up a dialog, etc.
          if (event.foreground) {
                console.log('INLINE NOTIFICATION');
                //var my_media = new Media("/android_asset/www/" + event.soundname);
                //my_media.play();
          } else {
            if (event.coldstart) {
                 navigator.notification.vibrate(1000);
            } else {
                 navigator.notification.vibrate(1000);
            }
          }

          break;

      case 'error':
          console.log('ERROR -> MSG:' + event.msg);
          break;

      default:
          console.log('EVENT -> Unknown, an event was received and we do not know what it is');
          break;
    }
  };
  // handle APNS notifications for iOS
  $window.successIosHandler = function (result) {
    console.log('result = ' + result);
    //navigator.notification.alert(result);
  };
  
  $window.onNotificationAPN = function (e) {
    if (e.alert) {
      console.log('push-notification: ' + e.alert);
      //navigator.notification.alert(e.alert);
    }

    if (e.sound) {
      var snd = new Media(e.sound);
      snd.play();
    }

    if (e.badge) {
      pushNotification.setApplicationIconBadgeNumber(successIosHandler, errorHandler, e.badge);
    }
  };
  
  return {
    register: function () {
      var q = $q.defer();
      if(ionic.Platform.isAndroid()){
        pushNotification.register(
            successHandler,
            errorHandler,
             {
                "senderID":"346007849782",
                "ecb":"window.onNotificationGCM"
             }
        );
        q.resolve('android')
      }else{
        pushNotification.register(
            tokenHandler,
            errorHandler,
             {
                "badge":"true",
                "sound":"true",
                "alert":"true",
                "ecb":"window.onNotificationAPN"
            }
        );
        q.resolve('ios');
      }
      return q.promise;
    }
  }
}])

.service('ConnectionCheck', ['$http', '$timeout', '$firebase', ConnectionCheck])
.service('RequestsService', ['$http', '$q', '$ionicLoading',  RequestsService]);

    function ConnectionCheck ($http, $timeout, $firebase){

       var ref = new Firebase(firebaseUrl);
       var base_url = 'http://www.beanbagapp.com/beanbag/loadImage.jpg';
       var timeOutInteger = null;

       var net_callback = function (cb){

            var timeOutOccured = false;

            timeOutInteger = $timeout(function () {
                timeOutOccured = true;
            }, 7 * 1000);

            var networkState = navigator.connection.type;
 
            var states = {};
            states[Connection.UNKNOWN]  = 'Unknown connection';
            states[Connection.ETHERNET] = 'Ethernet connection';
            states[Connection.WIFI]     = 'WiFi connection';
            states[Connection.CELL_2G]  = 'Cell 2G connection';
            states[Connection.CELL_3G]  = 'Cell 3G connection';
            states[Connection.CELL_4G]  = 'Cell 4G connection';
            states[Connection.NONE]     = 'No network connection';

            if(states[networkState] == 'No network connection'){
                if(!timeOutOccured){
                    $timeout.cancel(timeOutInteger);
                    cb(states[networkState]);
                }
                
            }else{
        
                    ref.child('.info/connected').on('value', function(connectedSnap) {
                        if (connectedSnap.val() === true) {

                            $http({
                                method: 'GET',
                                url: base_url,
                                data: '{}',
                                timeout: 7 * 1000
                            })
                            .success(function(response)
                            {
                                if(timeOutOccured){
                                    cb('Your '+ states[networkState] + ' is very poor.');
                                    $timeout.cancel(timeOutInteger);
                                }else{
                                    cb(false);
                                    $timeout.cancel(timeOutInteger);
                                }
                            })
                            .error(function(data, status, headers, config)
                            {
                                cb('Timeout: your '+states[networkState]+' is very poor');
                                $timeout.cancel(timeOutInteger);
                            });
                             
                            
                        } else {
                            $timeout.cancel(timeOutInteger);
                            cb(false); 
                        }
                    });
                        
            }

        }


        return {
            netCallback: net_callback
        }
    }

    function RequestsService($http, $q, $ionicLoading){

        var base_url = 'http://aqueous-crag-7054.herokuapp.com';

        function pushNote(device_info){

           if(device_info.method === 'POST'){
                $http({
                    method: device_info.method,
                    url: base_url+'/'+device_info.path, 
                    data: device_info
                })
                .success(function(data, status, headers, config)
                {
                    console.log(status + ' - ' + data);
                })
                .error(function(data, status, headers, config)
                {
                    console.log(status);
                });

            }else{
                 $http({
                    method: device_info.method,
                    url: base_url+'/'+device_info.path, 
                    params: {'message': device_info.message, 'userID': device_info.userID}
                })
                .success(function(data, status, headers, config)
                {
                    console.log(status + ' - ' + data);
                })
                .error(function(data, status, headers, config)
                {
                    console.log(status);
                });
            }
        };


        return {
            pushNote: pushNote
        };
    }
