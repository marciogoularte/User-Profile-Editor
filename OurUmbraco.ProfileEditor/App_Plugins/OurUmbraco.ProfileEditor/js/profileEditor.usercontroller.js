
angular.module('umbraco').controller('OurUmbraco.ProfileEditor.UserController', function ($scope, $timeout, $location, $routeParams, formHelper,historyService, profileEditorResource, eventsService,currentUserResource, usersResource, userService, contentEditingHelper, localizationService, notificationsService, mediaHelper, Upload, umbRequestHelper, usersHelper, authResource, dateHelper) {
        
    var vm = this;
    vm.history = historyService.getCurrent();
    var evts = [];
    evts.push(eventsService.on("historyService.add", function (e, args) {
        $scope.history = args.all;
    }));
    evts.push(eventsService.on("historyService.remove", function (e, args) {
        $scope.history = args.all;
    }));
    evts.push(eventsService.on("historyService.removeAll", function (e, args) {
        $scope.history = [];
    }));
        
    vm.user = { changePassword: null };    
    vm.avatarFile = {};
    vm.labels = {};
    vm.maxFileSize = Umbraco.Sys.ServerVariables.umbracoSettings.maxFileSize + 'KB';
    vm.acceptedFileTypes = mediaHelper.formatFileTypes(Umbraco.Sys.ServerVariables.umbracoSettings.imageFileTypes);
    vm.usernameIsEmail = Umbraco.Sys.ServerVariables.umbracoSettings.usernameIsEmail;
    //create the initial model for change password
    vm.changePasswordModel = {
        config: {},
        isChanging: false,
        value: {}
    };
    vm.clearAvatar = clearAvatar;
    vm.save = save;
    vm.toggleChangePassword = toggleChangePassword;
    function init() {
        vm.loading = true;
        var labelKeys = [
            'general_saving',
            'general_cancel',
            'defaultdialogs_selectContentStartNode',
            'defaultdialogs_selectMediaStartNode',
            'sections_users',
            'content_contentRoot',
            'media_mediaRoot',
            'user_noStartNodes'
        ];
        localizationService.localizeMany(labelKeys).then(function (values) {
            vm.labels.saving = values[0];
            vm.labels.cancel = values[1];
            vm.labels.selectContentStartNode = values[2];
            vm.labels.selectMediaStartNode = values[3];
            vm.labels.users = values[4];
            vm.labels.contentRoot = values[5];
            vm.labels.mediaRoot = values[6];
            vm.labels.noStartNodes = values[7];
        });    
        
        profileEditorResource.getCurrentUser().then(function (result) {
            console.log(result.data);
            vm.user = result.data;
            user = vm.user;

            vm.usernameIsEmail = Umbraco.Sys.ServerVariables.umbracoSettings.usernameIsEmail && user.email === user.username;
            
            authResource.getMembershipProviderConfig().then(function (data) {
                vm.changePasswordModel.config = data; 
                vm.changePasswordModel.config.hasPassword = true;
                vm.changePasswordModel.config.disableToggle = true;               
                vm.changePasswordModel.config.enableReset = false;
                vm.changePasswordModel.config.showOldPass = true;               
                vm.loading = false;
            });
        });        
        
        vm.usernameIsEmail = Umbraco.Sys.ServerVariables.umbracoSettings.usernameIsEmail && vm.user.email === vm.user.username;
       
        authResource.getMembershipProviderConfig().then(function (data) {
            vm.changePasswordModel.config = data;                       
            vm.changePasswordModel.config.hasPassword = true;
            vm.changePasswordModel.config.disableToggle = true;            
            vm.changePasswordModel.config.enableReset = false;
            vm.changePasswordModel.config.showOldPass = true;        
            vm.loading = false;
        });

    }
    function getLocalDate(date, culture, format) {
        if (date) {
            var dateVal;
            var serverOffset = Umbraco.Sys.ServerVariables.application.serverTimeOffset;
            var localOffset = new Date().getTimezoneOffset();
            var serverTimeNeedsOffsetting = -serverOffset !== localOffset;
            if (serverTimeNeedsOffsetting) {
                dateVal = dateHelper.convertToLocalMomentTime(date, serverOffset);
            } else {
                dateVal = moment(date, 'YYYY-MM-DD HH:mm:ss');
            }
            return dateVal.locale(culture).format(format);
        }
    }
    function toggleChangePassword() {
        vm.changePasswordModel.isChanging = !vm.changePasswordModel.isChanging;                
        vm.changePasswordModel.value = null;
        clearPasswordFields();
    }
    function save() {
        vm.page.saveButtonState = 'busy';
        vm.user.resetPasswordValue = null;
        
        contentEditingHelper.contentEditorPerformSave({
            statusMessage: vm.labels.saving,
            saveMethod: profileEditorResource.editUser,
            scope: $scope,
            content: vm.user,            
            redirectOnFailure: false,
            rebindCallback: function (orignal, saved) {
            }
        }).then(function (saved) {
            vm.user = saved;            
            vm.changePasswordModel.isChanging = false;
            vm.page.saveButtonState = 'success';            
            vm.changePasswordModel.config.hasPassword = true;
        }, function (err) {
            vm.page.saveButtonState = 'error';
        });
    }
    function clearAvatar() {        
        profileEditorResource.clearAvatar(vm.user.id).then(function (data) {
            vm.user.avatars = data;
        });
    }
    $scope.changeAvatar = function (files, event) {
        if (files && files.length > 0) {
            upload(files[0]);
        }
    };

    $scope.changePassword = function () {

        if (formHelper.submitForm({ scope: $scope })) {
                       
            currentUserResource.changePassword(vm.changePasswordModel.value).then(function (data) {

                clearPasswordFields();

                //if the password has been reset, then update our model
                if (data.value) {
                    vm.changePasswordModel.value.generatedPassword = data.value;
                }

                formHelper.resetForm({ scope: $scope, notifications: data.notifications });
                              
                $timeout(function () {
                    toggleChangePassword();
                }, 2000);

            }, function (err) {

                formHelper.handleError(err);
                               
            });

        }

    };

    $scope.logout = function () {               
        var pendingChangeEvent = eventsService.on("valFormManager.pendingChanges", function (e, args) {          
            pendingChangeEvent();           
        });                
        $location.path("/logout");
    };

    $scope.gotoHistory = function (link) {
        $location.path(link);        
    };

    function upload(file) {
        vm.avatarFile.uploadProgress = 0;
        Upload.upload({
            url: "backoffice/OurUmbraco/ProfileEditorApi/PostSetAvatar?id=" + vm.user.id,
            fields: {},
            file: file
        }).progress(function (evt) {
            if (vm.avatarFile.uploadStatus !== 'done' && vm.avatarFile.uploadStatus !== 'error') {
                // set uploading status on file
                vm.avatarFile.uploadStatus = 'uploading';
                // calculate progress in percentage
                var progressPercentage = parseInt(100 * evt.loaded / evt.total, 10);
                // set percentage property on file
                vm.avatarFile.uploadProgress = progressPercentage;
            }
        }).success(function (data, status, headers, config) {
            // set done status on file
            vm.avatarFile.uploadStatus = 'done';
            vm.avatarFile.uploadProgress = 100;
            vm.user.avatars = data;
        }).error(function (evt, status, headers, config) {
            // set status done
            vm.avatarFile.uploadStatus = 'error';
            // If file not found, server will return a 404 and display this message
            if (status === 404) {
                vm.avatarFile.serverErrorMessage = 'File not found';
            } else if (status == 400) {
                //it's a validation error
                vm.avatarFile.serverErrorMessage = evt.message;
            } else {
                //it's an unhandled error
                //if the service returns a detailed error
                if (evt.InnerException) {
                    vm.avatarFile.serverErrorMessage = evt.InnerException.ExceptionMessage;
                    //Check if its the common "too large file" exception
                    if (evt.InnerException.StackTrace && evt.InnerException.StackTrace.indexOf('ValidateRequestEntityLength') > 0) {
                        vm.avatarFile.serverErrorMessage = 'File too large to upload';
                    }
                } else if (evt.Message) {
                    vm.avatarFile.serverErrorMessage = evt.Message;
                }
            }
        });
    }
       
    function clearPasswordFields() {
        vm.changePasswordModel.value.oldPassword = "";
        vm.changePasswordModel.value.newPassword = "";
        vm.changePasswordModel.value.confirm = "";
    }    
    init();
});