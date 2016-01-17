angular.module('mychat.controllers', [])

.controller('LoginCtrl', [
    '$scope', 
    '$ionicModal', 
    '$state', 
    '$firebaseAuth', 
    'Rooms', 
    'Users', 
    '$ionicLoading', 
    '$rootScope', 
    '$ionicHistory', 
    'schoolFormDataService',
    'stripDot',
    'pushService',
    '$window',
    function (
    $scope, 
    $ionicModal, 
    $state, 
    $firebaseAuth, 
    Rooms, 
    Users, 
    $ionicLoading, 
    $rootScope, 
    $ionicHistory, 
    schoolFormDataService,
    stripDot,
    pushService,
    $window) {
    var ref = new Firebase($scope.firebaseUrl);
    var auth = $firebaseAuth(ref);

    $scope.$on('$ionicView.enter', function(){
            $ionicHistory.clearCache();
            $ionicHistory.clearHistory();
    });

    $scope.user = {};
    $scope.data = { "list" : '', "search" : ''};
    
    function moveCaretToStart(el) {
        if (typeof el.selectionStart == "number") {
            el.selectionStart = el.selectionEnd = 0;
        } else if (typeof el.createTextRange != "undefined") {
            el.focus();
            var range = el.createTextRange();
            range.collapse(true);
            range.select();
        }
    }

    $scope.search = function() {

        schoolFormDataService.retrieveDataSort($scope.data.search, 
            function(promise) {
                promise.then(function(matches){
                    $scope.user.schoolID = matches[0];
                    $scope.data.list = matches;
                    $scope.user.schoolemail = '@'+$scope.user.schoolID.domain;
                    var textBox = document.getElementById('schoolemail');
                        moveCaretToStart(textBox);
                        $window.setTimeout(function() {
                            moveCaretToStart(textBox);
                        }, 1);
                });
            });
    }
    
    $scope.update = function(school){
        $scope.user.schoolemail = '@'+school.domain;
        var textBox = document.getElementById('schoolemail');
            moveCaretToStart(textBox);
            $window.setTimeout(function() {
                    moveCaretToStart(textBox);
            }, 1);    
    }
    function emailDomain(email){
        var tolower = email.toLowerCase();
        return (/[@]/.exec(tolower)) ? /[^@]+$/.exec(tolower) : undefined;
    }
     $scope.openModal = function(template){
        $ionicModal.fromTemplateUrl('templates/'+template+'.html', {
            scope: $scope
        }).then(function (modal) {
            $scope.modal1 = modal;
            $scope.modal1.show();
        });
    }
    $scope.forgotPass = function(){
        $ionicModal.fromTemplateUrl('templates/forgotpass.html', {
            scope: $scope
        }).then(function (modal) {
            $scope.modal2 = modal;
            $scope.modal2.show();
        });
    }
    $scope.forgotPassReset = function(enter){
        ref.resetPassword({
            email: enter.email
        }, function(error) {
            if (error) {
                switch (error.code) {
                    case "INVALID_USER":
                        alert("The specified user account does not exist.");
                        break;
                    default:
                        alert("Error resetting password:" + error);
                }
            } else {
                alert("Password reset. Email sent successfully!");
                $scope.modal2.hide();
                $scope.modal2.remove();
                $state.go('login');
            }
        });
    }
 
    $scope.createStudent = function (user) {
        if (
            !!user && 
            !!user.schoolemail &&
            !!user.displayname.value && 
            !!user.schoolID &&
            user.schoolID.domain === emailDomain(user.schoolemail)[0] || user.schoolID.domain === 'gen.com'
             ) 
        {
        
           $ionicLoading.show({
                template: 'Signing Up...'
            });
         
                auth.$createUser({
                    email: user.schoolemail,
                    password: stripDot.generatePass()
                }).then(function (userData) {
                    alert("User created successfully!");
                    ref.child("users").child(userData.uid).set({
                        user:{
                            displayName: user.displayname.value +'-'+ stripDot.shortRandom(),
                            schoolID: stripDot.strip(user.schoolID.domain),
                            schoolEmail: user.schoolemail
                        }
                    });
                    $ionicLoading.hide();
                    $scope.modal1.hide();
                    $scope.modal1.remove();
                }).then(function(userData){
                
                    var school = Rooms.checkSchoolExist(stripDot.strip(user.schoolID.domain));
                    school.$loaded(function(data){
                         
                        //if the school doesn't exist already, add it
                        if(data.length <= 0){
                            var room = ref.child("schools").child(stripDot.strip(user.schoolID.domain));
                            room.set({
                                icon: "ion-university",
                                schoolname: user.schoolID.value,
                                schoolID: stripDot.strip(user.schoolID.domain),
                                schoolEmail: user.schoolID.schoolContact,
                                ID: room.key()
                            },function(err){
                                if(err) throw err;

                            })
                        }
                    });
                }).then(function(){
                    ref.resetPassword({
                        email: user.schoolemail
                    }, function(error) {
                        if (error) {
                            switch (error.code) {
                                case "INVALID_USER":
                                    alert("The specified user account does not exist.");
                                    break;
                                default:
                                    alert("Error:" + error);
                            }
                        } else {
                            alert("An email to your student account has been sent!");
                            $ionicLoading.hide();
                            $state.go('login');
                        }
                    });
                })  
                .catch(function (error) {
                    alert("Error: " + error);
                    $ionicLoading.hide();
                });
            
        }else{
            alert("Please fill all details properly");
        }
    }
    $scope.openSignIn = function (){
        $ionicModal.fromTemplateUrl('templates/login2.html', {
                    scope: $scope
                }).then(function (modal) {
                    $scope.modal = modal;
                    $scope.modal.show();
                });
    }
    $scope.about = function (){
        $ionicModal.fromTemplateUrl('templates/about.html', {
                    scope: $scope
                }).then(function (modal) {
                    $scope.modal_about = modal;
                    $scope.modal_about.show();
                });
    }
    $scope.signIn = function (user) {

        $window.localStorage.setItem('test', 'test');

            if($window.localStorage.getItem('test') === null){
                alert('You must activate local storage on your device to use this app');
                $scope.modal.hide(); 

                $window.localStorage.removeItem('test');

                return; 
            }         
       
            $window.localStorage.removeItem('test');
        
            if (user && user.email && user.pwdForLogin) {

                $ionicLoading.show({
                    template: 'Signing In...'
                });

                    auth.$authWithPassword({
                        email: user.email,
                        password: user.pwdForLogin
                    }).then(function (authData) {
                
                        ref.child("users").child(authData.uid+'/user').once('value', function (snapshot) {
                            var val = snapshot.val();
                            //get and store gavitar image inside authData  - https://en.gravatar.com/
                            var group              = !!val.groupID ? {'groupID':val.groupID, 'groupName':val.groupName} : {'groupID': 'gen', 'groupName':'Whatever??'};
                            $rootScope.email       = val.schoolEmail;
                            $rootScope.schoolID    = val.schoolID;
                            $rootScope.group       = group;
                            $rootScope.userID      = authData.uid;
                            $rootScope.displayName = val.displayName;
                            $rootScope.superuser   = !!val.superuser ? val.superuser : null;
                 
                        //persist data
                            Users.storeIDS(authData.password.profileImageURL, 'avatar');
                            Users.storeIDS(val.schoolID, 'schoolID');
                            Users.storeIDS(authData.uid, 'userID');
                            Users.storeIDS(val.displayName, 'displayName');
                            Users.storeIDS(val.schoolEmail, 'email');

                            pushService.register().then(function(token){
          
                            });

                            $scope.modal.hide();
                    
                            $state.go('menu.tab.events');
                      
                    });
                
                }).catch(function (error) {
                    alert("Authentication failed:" + error.message);
                    $ionicLoading.hide();
                });

        } else{
            alert("Please enter email and password both");
        }

    }   
}])
/*
* end Loginctrl
*/
.controller('TabCtrl', ['$scope', '$rootScope', function ($scope, $rootScope){
    $scope.tabSelected = function (select){
        $rootScope.tabs = select;
    }
}])
/*
settings cntrl
*/
.controller('SettingsCtrlMentor', ['$scope', '$rootScope', 'Users','Rooms', 'groups', 'PublicChat', '$state', '$ionicLoading', '$ionicModal', 'Auth', '$ionicPopup',
    function ($scope, $rootScope, Users, Rooms, groups, PublicChat, $state, $ionicLoading, $ionicModal, Auth, $ionicPopup) { 
     
        if(!$scope.userID){
            $scope.userID = Users.getIDS('userID');
        }
        if(!$scope.schoolID){
            $scope.schoolID = Users.getIDS('schoolID');
        }

    //retrieve all groups this user created
    $scope.user = {}
    $scope.data = {'list': ''};
    $scope.$watch('tabs', function(old, newv){
        if(newv === 'settings' || old === 'settings'){
            groups.retrieveUserGroups($scope.userID, function (promise){
                promise.$loaded(function(matches){
                    
                    matches.push({'question':'Select Group'});  
                    $scope.user.group = matches[matches.length-1];
                    $scope.data.list = matches;
                });

            });
        }
        $scope.members = [];
        $scope.enter = true;

    });

    $scope.update = function (data){
            $scope.userGroups = {
                'userGroupKeyCurrentOwner': data.$id,
                'publicQuestionKey': data.publicQuestionKey,
                'groupID': data.groupID
            }

    }
    $scope.$watch('userGroups', function(oldValue, newValue){
        var val;
        if(!!oldValue){
            val = oldValue;
        }else{
            val = newValue;
        }
      //this is the group key of the original owner of the group. Need tp remove their organizerUserID
        if(!!val){
            $scope.enter = false;
            $scope.school = Rooms.getMembersArray({
                'publicQuestionKey':val.publicQuestionKey, 
                'schoolID': $scope.schoolID,
                'groupID': val.groupID
            });//countTotalMembers
            $scope.removed = Rooms.countTotalMembers({
                'publicQuestionKey':val.publicQuestionKey, 
                'schoolID': $scope.schoolID,
                'groupID': val.groupID
            });
            $scope.removed.$loaded(function (arr){
                if(!!arr)
                    $scope.currentMembers = arr.length;
            });
            $scope.limit = Rooms.getLimit({
                'publicQuestionKey':val.publicQuestionKey, 
                'schoolID': $scope.schoolID,
                'groupID': val.groupID
            });
            $scope.memberFlag = Rooms.getMemberFlag({
                'publicQuestionKey':val.publicQuestionKey, 
                'schoolID': $scope.schoolID,
                'groupID': val.groupID
            })
            $scope.reduceAndMakePublic = function (currentMembers){
                $ionicLoading.show();

                if($scope.removedInt < $scope.limit){
                    $scope.addOne = $scope.addOne + 1;
                }
                
                Rooms.reduceAsmember({
                    'publicQuestionKey':val.publicQuestionKey, 
                    'schoolID': $scope.schoolID,
                    'groupID': val.groupID,
                    'limit': $scope.limit,
                    'currentMembers': currentMembers
                }, function(val){
                    $ionicLoading.hide();

                    $ionicPopup.alert({
                        title: 'Open',
                        template: val
                    });
                })

            }
            $scope.userGroupKeyCurrentOwner = val.userGroupKeyCurrentOwner;
            $scope.publicQuestionKeyCurrent = val.publicQuestionKey;
            $scope.groupIDCurrent = val.groupID;

            $scope.school.$loaded(function(data){
                $scope.members = data;
            });
        }

    });
    $scope.transferGroup = function (){
        $ionicLoading.show();
        PublicChat.transfer({
            'schoolID': $scope.schoolID, //update avatar in schools groups 1)
            'groupIDCurrent': $scope.groupIDCurrent, //<--
            'publicQuestionKeyCurrent': $scope.publicQuestionKeyCurrent,//<--
            'transferAvatar': $scope.transferAvatar, //<--
            'transferDisplayName': $scope.transferDisplayName, //<--
            'transferUserGroupID': $scope.transferUserGroupID, //update new organizer with organizerUserID/transferUserGroupID 2)
            'transferUserGroupKey': $scope.transferUserGroupKey, //<--
            'organizerUserID': $scope.userID, //remove organizerID old organizer 3)
            'userGroupKeyCurrentOwner': $scope.userGroupKeyCurrentOwner //<--

        }, function(val){
            $ionicLoading.hide();
            $scope.modal.hide();
            alert(val);
        })
        /*
            TODO:
            1) update avatar and displayname with new organizers in the schools question/groups area: $schoolID | $groupIDCurrent | $publicQuestionKeyCurrent
            2) update the new member with organizerUserID (their own ID) icon: transferUserGroupID (ID to find the correct user): transferUserGroupKey (find correct group/question)
            3) remove original organizerUserID from current owner and update icon: $userID | $userGroupKeyCurrentOwner
        */
    }

    $scope.selectedMember = function(userGroupKey, userID, avatar, displayName){
        
        $scope.transferUserGroupKey = userGroupKey || '';
        $scope.transferUserGroupID = userID || '';
        $scope.transferAvatar = avatar || '';
        $scope.transferDisplayName = displayName || '';

        $ionicModal.fromTemplateUrl('templates/transfer-groupTo.html', {
            scope: $scope
        }).then(function (modal) {
            $scope.modal = modal;
            $scope.modal.show();
        });

    }
    $scope.askQuestion = function(){

            $state.go('menu.tab.ask');
    }
    $scope.logout = function () {
            $ionicLoading.show({
                template: 'Logging Out...'
            });
            Auth.$unauth();
    }
       
       
}])


/*
* opens the public chat room in the groups tab and allows members to join
*
*/
.controller('PublicChatCtrl', [
                    '$scope', 
                    'PublicChat', 
                    'Users',
                    'Rooms',
                    '$state',  
                    '$ionicModal', 
                    '$ionicLoading', 
                    '$ionicScrollDelegate', 
                    '$timeout', 
                    'RequestsService', 
        function ($scope, 
                  PublicChat, 
                  Users,
                  Rooms, 
                  $state, 
                  $ionicModal, 
                  $ionicLoading, 
                  $ionicScrollDelegate, 
                  $timeout, 
                  RequestsService) {

    var 
        publicQuestionKey   = $state.params.publicQuestionKey,
        displayName         = $state.params.displayName,
        groupID             = $state.params.group,
        groupName           = $state.params.groupName,
        wrap                = $state.params.wrap,
        avatar              = $state.params.avatar,
        txtInput;

    if(!$scope.schoolID){
        $scope.schoolID = Users.getIDS('schoolID');
    }
    if(!$scope.displayName){
        $scope.displayName = Users.getIDS('displayName');
    }
     if(!$scope.userID){
        $scope.email = Users.getIDS('email');
    }
    $scope.IM = {
        textMessage: ""
    };
    if(wrap == ''){
        $scope.wrap1 =   false;
        $scope.unjoin1 = false;
        $scope.remove1 = false;
    }

    $timeout(function(){
        footerBar = document.body.querySelector('#userMessagesView .bar-footer');
        txtInput = angular.element(footerBar.querySelector('input'));
    },0);
    var viewScroll = $ionicScrollDelegate.$getByHandle('userMessageScroll');
    function keepKeyboardOpen() {
      txtInput.one('blur', function() {
        txtInput[0].focus();
      });
    }   

    $scope.editorEnabled = false;
    
    $scope.typ = function (obj){
        return typeof obj === 'string';
    }
       
    $scope.roomName = 'Just enter message to become a member.'
    $scope.avatar   = $state.params.avatar;
    $scope.question = $state.params.question;

    PublicChat.selectRoom($scope.schoolID, publicQuestionKey, groupID);

 
    $scope.sendMessage = function (msg) {
        
        $ionicLoading.show();
        var key;
        /*
            check the users status
                check members array. make sure not already a member
        */
        Rooms.getMember({
             userID: $scope.userID,
             schoolID: $scope.schoolID,
             publicQuestionKey: publicQuestionKey,
             group: groupID
          }).$loaded(function(member){
            if(member.userID !== $scope.userID){
                Users.addQuestionToUser({//add the question to new member (displayName means member)
                    schoolID:$scope.schoolID, 
                    publicQuestionKey:publicQuestionKey, 
                    question:$scope.question, 
                    icon:'ion-chatbubbles', 
                    displayName:displayName,
                    avatar:avatar,
                    userID: $scope.userID,
                    groupID: groupID,
                    groupName: groupName
                 }
                ).then(function(data){
                    /*add the userID to the group: member
                            and increase count by one
                    */
                    key = data.key();
                    Rooms.addAsMember({
                        schoolID:$scope.schoolID, 
                        publicQuestionKey:publicQuestionKey,
                        userID: $scope.userID,
                        group: groupID,
                        userGroupKey: data.key(),
                        displayName: $scope.displayName,
                        avatar: Users.getIDS('avatar')
                    })
                }).then(function(){
                    /*populate current chats once they are a member
                            this gets all the current chats that were hidden
                     */
                    PublicChat.getSelectedRoomName(function(roomName){
                        if (roomName) {
                            $scope.roomName = "Welcome " + $scope.displayName;
                            $scope.chats = PublicChat.all($scope.displayName);
                            
                            $scope.$watch('chats', function(newValue, oldValue){
                                $timeout(function() {
                                    keepKeyboardOpen();
                                    viewScroll.scrollBottom();
                                }, 0);
        
                            },true);
                        }
                    });
                    
                }).then(function(){
                  /*send their message 
                        new member message
                  */
                    PublicChat.send({ 
                        displayName:$scope.displayName, 
                        schoolID:$scope.schoolID,
                        groupID:groupID,
                        publicQuestionKey:publicQuestionKey,  
                        message: msg, 
                        avatar: Users.getIDS('avatar'),
                        userID: $scope.userID, //this goes into each chat for ejection
                        email: $scope.email
                    });
                    $scope.IM.textMessage = "";
                    //send out push to group
                    $ionicLoading.hide();

                    Rooms.getMembers({
                        userID: $scope.userID,
                        schoolID: $scope.schoolID,
                        publicQuestionKey: publicQuestionKey,
                        groupID: groupID
                    }).$loaded(function(members){

                        angular.forEach(members, function(member){
                            if(member.userID !== $scope.userID){
                                console.log(member.userID); 
                                    RequestsService.pushNote(
                                    {
                                        'message':'New Member: ' + $scope.displayName + 'Category: '+ groupName + ' Message ' + msg,
                                        'userID': member.userID,
                                        'method':'GET',
                                        'path':'push'
                                    });
                            }
                        }); 
                    });

                });
  
            }else{
              $ionicLoading.hide();
              alert('You are already a member of this group.');
               
            }
        });
    }

}])
/*
* opens the private chat room on the conversations tab
*
*/
.controller('PrivateChatCtrl', [
                    '$scope', 
                    'PublicChat', 
                    'Users',
                    'Rooms', 
                    '$state',  
                    '$ionicModal', 
                    '$ionicLoading', 
                    '$ionicScrollDelegate', 
                    '$timeout', 
                    'RequestsService', 
        function ($scope, 
                  PublicChat, 
                  Users,
                  Rooms, 
                  $state, 
                  $ionicModal, 
                  $ionicLoading, 
                  $ionicScrollDelegate, 
                  $timeout, 
                  RequestsService) {

            $ionicLoading.show();

    var 
        publicQuestionKey    = $state.params.publicQuestionKey,
        displayName          = $state.params.displayName,
        group                = $state.params.group,
        groupName            = $state.params.groupName,
        wrap                 = $state.params.wrap,
        selfKey              = $state.params.selfKey,
        txtInput;

    $scope.remove1 = true;

    if(wrap === 'wrap'){
        $scope.wrap1     = true;
        $scope.unjoin1   = false;    
    }else if(wrap === 'unjoin'){
        $scope.unjoin1   = true;
        $scope.wrap1     = false;
    }

    if(!$scope.schoolID){
        $scope.schoolID = Users.getIDS('schoolID');
    }
    if(!$scope.displayName){
        $scope.displayName = Users.getIDS('displayName');
    }
    if(!$scope.userID){
        $scope.userID = Users.getIDS('userID');
    }
    if(!$scope.userID){
        $scope.email = Users.getIDS('email');
    }
    $scope.IM = {
        textMessage: ""
    };
  
    $timeout(function(){
        footerBar = document.body.querySelector('#userMessagesView .bar-footer');
        txtInput = angular.element(footerBar.querySelector('input'));
    },0);
    var viewScroll = $ionicScrollDelegate.$getByHandle('userMessageScroll');
    function keepKeyboardOpen() {
      txtInput.one('blur', function() {
        txtInput[0].focus();
      });
    }
    $scope.editorEnabled = false;

    $scope.typ = function (obj){
        return typeof obj === 'string';
    }
    $scope.avatar   = $state.params.avatar;
    $scope.question = $state.params.question;

    PublicChat.selectRoom($scope.schoolID, publicQuestionKey, group);

    PublicChat.getSelectedRoomName(function(roomName){
        if (roomName) {
            $scope.roomName = "Hello " + $scope.displayName;
            $scope.chats = PublicChat.all($scope.displayName);
            if(!$scope.chats){
                $ionicLoading.hide();
            }
            $scope.chats.$loaded(function(data){
                $ionicLoading.hide();
            })
            $scope.$watch('chats', function(newValue, oldValue){
                $timeout(function() {
                    keepKeyboardOpen();
                    viewScroll.scrollBottom();
                }, 0);
        
            },true);
        }
    });

    $scope.edit = function (){
        $scope.editorEnabled = true;
    }
    
    $scope.saveEdit = function (question){
        if(question.amount <= 14){
            alert('must be at least 15 characters');

            return;
        }
        PublicChat.editGroup({
            'question': question.value,
            'schoolID': $scope.schoolID,
            'groupID': group,
            'userID': $scope.userID,
            'publicQuestionKey': publicQuestionKey,
            'userGroupKey': selfKey
        });
        $scope.editorEnabled = false;
        
    }
//removes a single chat message
    $scope.remove = function (chat, index) {
        PublicChat.remove(chat);
    }
//remove question/conversation once dialog is confirmed
    $scope.wrapit = function () {
       $ionicLoading.show();

       var val = PublicChat.wrapitup({ 
                schoolID: $scope.schoolID, 
                publicQuestionKey: publicQuestionKey,  
                groupID: group,
            },function(val){
                if(!val){
                    $ionicLoading.hide();
                    $scope.modal.hide();
                    $state.go('menu.tab.events', {
                        schoolID: $scope.schoolID
                    });          
                }else{
                    $ionicLoading.hide();
                    alert(val);
                }
            });
    }
//unjoin event
    $scope.unjoinme = function (){
          $ionicLoading.show();
          Rooms.getMemberQuota({
            'schoolID':$scope.schoolID, 
            'publicQuestionKey':publicQuestionKey, 
            'groupID': group
          }, function(bool){
   
          var val = PublicChat.unjoin({ 
                schoolID: $scope.schoolID, 
                publicQuestionKey: publicQuestionKey,  
                groupID: group,
                userID: $scope.userID,
                quota: bool
            },function(val){
                if(!val){
                    $ionicLoading.hide();
                    $scope.modal.hide();
                    $state.go('menu.tab.events', {
                        schoolID: $scope.schoolID
                    });          
                }else{
                    $ionicLoading.hide();
                    alert(val);
                }
            });
        });
    }
    $scope.ejectuser = function (msg){
        if($scope.wrap1){
            if($scope.ejectuserID !== $scope.userID){
                $ionicLoading.show();
          Rooms.getMemberQuota({
            'schoolID':$scope.schoolID, 
            'publicQuestionKey':publicQuestionKey, 
            'groupID': group
          }, function(bool){

            var val = PublicChat.eject({ 
                schoolID: $scope.schoolID, 
                publicQuestionKey: publicQuestionKey,  
                groupID: group,
                message: msg.reason.value,
                email: $scope.ejectEmail,
                userID: $scope.ejectuserID,
                groupName: $scope.question,
                quota: bool
            },function(val){
                if(!val){
                    $scope.modal.hide();
                    $state.go('menu.tab.events', {
                        schoolID: $scope.schoolID
                    });          
                }else{
                    alert(val);
                }
                $ionicLoading.hide();
            });
         });
           }else{
                alert('To remove yourself, transfer ownership and unjoin.');
           }
        }else{
            alert('You are not authorized to remove a member');
        }
    }
//dialog that warns user before question/conversation is deleted
    $scope.wrap = function (str, chat){

        $scope.ejectuserID = !!chat ? chat.userID : '';
        $scope.ejectEmail = !!chat ? chat.email : '';
        $scope.ejectImage = !!chat ? chat.avatar : '';
        $scope.ejectName = !!chat ? chat.from : '';

        $ionicModal.fromTemplateUrl('templates/'+str+'.html', {
            scope: $scope
        }).then(function (modal) {
            $scope.modal = modal;
            $scope.modal.show();
        });
    }
     $scope.sendMessage = function (msg) {
 
            PublicChat.send({
                displayName: $scope.displayName, 
                schoolID: $scope.schoolID,
                groupID:group,
                publicQuestionKey:publicQuestionKey, 
                message: msg, 
                avatar: Users.getIDS('avatar'),
                userID: $scope.userID, //this goes into each chat for ejection
                email: $scope.email  //this goes each chat for ejecting user
            });
            $scope.IM.textMessage = "";

            Rooms.getMembers({
                userID: $scope.userID,
                schoolID: $scope.schoolID,
                publicQuestionKey: publicQuestionKey,
                groupID: group
            }).$loaded(function(members){
                angular.forEach(members, function(member){
                    if(member.userID !== $scope.userID){ 
                        console.log(member.userID);
                        RequestsService.pushNote(
                        {
                            'message':'Category: '+ groupName + '| From: ' + $scope.displayName + '| Message ' + msg,
                            'userID': member.userID,
                            'method':'GET',
                            'path':'push'
                        });
                    }
                }); 
            });
    }

}])
/*the advisor see private questions and open chat
*
*/
.controller('ConversationsCtrl', ['$scope', 'Users', 'Rooms', '$state', '$window',
    function ($scope, Users, Rooms, $state, $window) {
        console.log('conversation initiated');
    if(!$scope.userID){
        $scope.userID = Users.getIDS('userID');
    }
    if(!$scope.schoolID){
        $scope.schoolID = Users.getIDS('schoolID');
    }
    $scope.school = Users.getUserByID($scope.userID);
    $scope.school.$loaded(function(data){
         $scope.rooms = data;

     });
    $scope.askQuestion = function(){
        $state.go('menu.tab.ask');
    }
    $scope.openChatRoom = function (question, selfKey, groupID, groupName, publicQuestionKey, organizerUserID, avatar) {
        
        if($scope.userID === organizerUserID){
            $state.transitionTo('menu.tab.privatechat', {
                publicQuestionKey: publicQuestionKey,
                groupName: groupName,
                question: question,
                group: groupID,
                wrap: 'wrap',
                avatar: avatar,
                selfKey: selfKey
            },{reload: true, inherit: true, notify: true });
            Users.toggleQuestionBackAfterClick($scope.userID, selfKey);
        }else{
            $state.transitionTo('menu.tab.privatechat', {
                publicQuestionKey: publicQuestionKey,
                groupName: groupName,
                question: question,
                group: groupID,
                wrap: 'unjoin',
                avatar: avatar,
                selfKey: selfKey
            },{reload: true, inherit: true, notify: true });
            Users.toggleQuestionBackAfterClick($scope.userID, selfKey);
        }
    }
}])

/*this controller is for public questions
*
*/
.controller('EventsCtrl', ['$scope', 'Users', 'Rooms', '$state', '$window', 'orderAlphanumeric', '$ionicLoading',
    function ($scope, Users, Rooms, $state, $window, orderAlphanumeric, $ionicLoading) {

    if(!$scope.schoolID){
        $scope.schoolID = Users.getIDS('schoolID');
    }
    if(!$scope.userID){
        $scope.userID = Users.getIDS('userID');
    }
    if(!$scope.group){
        $scope.group = Users.getIDS('group');
    }
    $scope.askQuestion = function(){
        $state.go('menu.tab.ask');
    }
    $scope.user = {}
    $scope.data = {'list': ''};
    $scope.$watch('tabs', function(old, newv){
        if(newv === 'events' || old === 'events'){
            orderAlphanumeric.retrieveDataSort(function (promise){
                promise.then(function(matches){
                    matches.push({'groupID': 'sel', 'groupName':'Select Category'});
                    $scope.user.group = matches[matches.length-1];
                    $scope.data.list = matches;
                });

            });
        }
    });

    $scope.update = function (data){
            $scope.group = {
                'groupID': data.groupID,
                'groupName': data.groupName
            }
    }
    $scope.$watch('group', function(oldValue, newValue){
        var val;
        if(!!oldValue){
            val = oldValue;
        }else{
            val = newValue;
        }

        $scope.groupID = !!val ? val.groupID : $scope.group.groupID;
        $scope.title1  = !!val ? val.groupName : $scope.group.groupName;

        var group = {'groupID':$scope.groupID, 'groupName':$scope.title1}

        Users.storeIDS(group, 'group');
        
        Rooms.getSchoolBySchoolID($scope.schoolID, $scope.groupID, $scope.lat, $scope.lon, function(datap){
            if($scope.schoolID === 'gencom'){
                    $scope.rooms = datap;
                    $ionicLoading.hide();
            }else{
                datap.$loaded(function(data){
                    $scope.rooms = data;
                    $ionicLoading.hide();  
                });
            }
        
        });
           
        Users.updateUserGroup($scope.groupID, $scope.title1, $scope.userID);  

    });
   
    $scope.openChatRoom = function (question, publicQuestionKey, groupID, organizerUserID, displayName, avatar, total, limit) {
      if(total < limit){
       Rooms.getEjected({
             userID: $scope.userID,
             schoolID: $scope.schoolID,
             publicQuestionKey: publicQuestionKey,
             group: $scope.groupID
          }).$loaded(function(member){
            if(member.userID !== $scope.userID){
        
                    $state.transitionTo('menu.tab.chat', {
                        publicQuestionKey: publicQuestionKey,
                        groupName: $scope.title1,
                        question: question,
                        group: $scope.groupID,
                        displayName: displayName,
                        wrap: '',//hides ability to wrap question
                        avatar: avatar
                    },{reload: true, inherit: true, notify: true });
                
            }else{
                alert('You have been removed from this group');
            }
       });
      }else{
        alert('This group is currently closed to new members');
      }
    }
 
}])
/*the prospect can ask a question
*
*/
.controller('AskCtrl', ['$scope', '$state', 'Users', 'Rooms', 'orderAlphanumeric', 'stripDot', '$ionicLoading',
    function ($scope, $state, Users, Rooms, orderAlphanumeric, stripDot, $ionicLoading){
    var icon='',
        grpID,
        grpName,
        status;
    if(!$scope.userID){
        $scope.userID = Users.getIDS('userID');
    }
    if(!$scope.schoolID){
        $scope.schoolID = Users.getIDS('schoolID');
    }
    if(!$scope.displayName){
        $scope.displayName = Users.getIDS('displayName');
    }
    $scope.sudo = !$scope.superuser ? false : true;
    $scope.user = {}
    $scope.data = { 'listg' : '', 'search' : '', 'groups': ''};
    $scope.user.limit = "2";

   /*$scope.searchg = function() {
     groupsMentorsDataService.retrieveDataSort($scope.data.groups, function(promise){
                promise.then(
                    function(matches) {
                        $scope.user.group = matches[0];
                        $scope.data.listg = matches;     
                    }
                )
            });
    }*/

    $scope.$watch('tabs', function(old, newv){
        if(newv === 'ask' || old === 'ask'){
            orderAlphanumeric.retrieveDataSort(function (promise){
                promise.then(function(matches){
                    matches.push({'groupID': 'sel', 'groupName':'Select Category'});
                    $scope.user.group = matches[matches.length-1];
                    $scope.data.listg = matches;
                });

            });
        }
    });

    $scope.ask = function (quest){
          var params;
          key=''; 
         //!quest.group && !quest.group.groupID &&        
          if(quest.group.groupID === 'sel'){
                alert('please select a group');
                return;
          } 
          if(quest.question.amount <= 14){
                alert('questions must be at least 15 characters long');
                return;
           }
          
          grpID = quest.group.groupID;
          grpName = quest.group.groupName;
           
          $ionicLoading.show({
                template: 'Sending...'
           });
           params = {
                schoolID: $scope.schoolID, 
                question: quest.question.value, 
                icon: 'ion-chatbubbles', 
                questionID: null, 
                displayName: $scope.displayName, 
                email: $scope.email,
                limit:parseInt(quest.limit, 10),
                memberFlag: 'open', 
                groupID: grpID, 
                groupName: grpName,  
                avatar: Users.getIDS('avatar') 
           }

          
                Rooms.addQuestionsToSchool(params, $scope.schoolID, $scope.lat, $scope.lon, function(data){

                    //addSchool.then(function(data){
                             key = data.key;
                             Users.addQuestionToUser({//no displayName property signifies creater of group
                                schoolID:$scope.schoolID, 
                                userID:$scope.userID, //becomes organizerUserID
                                question:quest.question.value, 
                                icon:'ion-chatbubble',
                                groupName: grpName,
                                groupID: grpID, 
                                publicQuestionKey: key, 
                                avatar:Users.getIDS('avatar')
                                }
                            ).then(function(data){

                                Rooms.addAsMember({
                                    schoolID:$scope.schoolID, 
                                    publicQuestionKey:key,
                                    userID: $scope.userID,
                                    group: grpID,
                                    userGroupKey: data.key(),
                                    displayName: $scope.displayName,
                                    avatar: Users.getIDS('avatar')
                                })

                                
                            }).then(function(){
                                $ionicLoading.hide();
                                $state.transitionTo('menu.tab.conversations',{},{ reload: true, inherit: true, notify: true });
                                $scope.data.search = '';
                                $scope.user.question = '';
                            })
                        //});
                    
                    });
                    /*if(grpID !== 'gen'){
                       var keys = Users.getGroupKeys().
                            then(function(data){
                                Users.sendPushByGroup(data, grpID, $scope.schoolID, grpName);
                            }); 
                    }

                    */
         
            }
}]);
