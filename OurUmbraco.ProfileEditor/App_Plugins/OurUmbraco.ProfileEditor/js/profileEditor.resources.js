angular.module("umbraco.resources")
        .factory("profileEditorResource", function ($http, umbDataFormatter, umbRequestHelper) {
            return {
                getCurrentUser: function () {
                    return $http.get("backoffice/OurUmbraco/ProfileEditorApi/GetCurrentUser");
                },

                editUser: function (user) {
                    if (!user) {
                        throw 'user not specified';
                    }
                    var formattedSaveData = umbDataFormatter.formatUserPostData(user);

                    return umbRequestHelper.resourcePromise($http.post("backoffice/OurUmbraco/ProfileEditorApi/PostSaveUser", formattedSaveData), 'Failed to save user');
                },
                clearAvatar: function (userId) {
                    return umbRequestHelper.resourcePromise($http.post("backoffice/OurUmbraco/ProfileEditorApi/PostClearAvatar", { id: userId }), 'Failed to clear the user avatar ');
                },
                PostSetAvatar: function (userId) {
                    return umbRequestHelper.resourcePromise($http.post("backoffice/OurUmbraco/ProfileEditorApi/PostSetAvatar", { id: userId }), 'Failed to save the user avatar ');
                }
            };
        });