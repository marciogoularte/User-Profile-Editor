using AutoMapper;
using System.Net;
using Umbraco.Core.Models.Membership;
using System.Web.Http;
using Umbraco.Web.Editors;
using Umbraco.Web.Models.ContentEditing;
using Umbraco.Web.Mvc;
using System.Net.Http;
using System.Threading.Tasks;
using Umbraco.Core.Configuration;
using System;
using Umbraco.Core;
using Umbraco.Core.Services;
using Umbraco.Web.WebApi.Filters;
using Umbraco.Core.Cache;
using Umbraco.Core.IO;
using System.IO;
using Umbraco.Web.WebApi;
using System.Linq;


namespace OurUmbraco.ProfileEditor.Controllers
{
    [PluginController("OurUmbraco")]
    public class ProfileEditorApiController : UmbracoAuthorizedJsonController
    {
        /// <summary>
        /// Get Current User
        /// </summary>        
        /// <returns></returns>
        public UserDisplay GetCurrentUser()
        {
            var user = Security.CurrentUser;
            if (user == null)
            {
                throw new HttpResponseException(HttpStatusCode.NotFound);
            }
            var result = Mapper.Map<IUser, UserDisplay>(user);
            return result;
        }

        /// <summary>
        /// Saves a user
        /// </summary>
        /// <param name="userSave"></param>
        /// <returns></returns>
        public UserDisplay PostSaveUser(UserSave userSave)
        {
            if (userSave == null) throw new ArgumentNullException("ProfileEditorUserSave");

            if (ModelState.IsValid == false)
            {
                throw new HttpResponseException(Request.CreateErrorResponse(HttpStatusCode.BadRequest, ModelState));
            }

            //check is current user
            if (userSave.Id != Security.CurrentUser.Id)
            {
                throw new HttpResponseException(HttpStatusCode.NotFound);
            }

            var intId = userSave.Id.TryConvertTo<int>();
            if (intId.Success == false)
                throw new HttpResponseException(HttpStatusCode.NotFound);

            var found = Services.UserService.GetUserById(intId.Result);
            if (found == null)
                throw new HttpResponseException(HttpStatusCode.NotFound);

            var hasErrors = false;
            
            //to do: translate            
            var existing = Services.UserService.GetByEmail(userSave.Email);
            if (existing != null && existing.Id != userSave.Id)
            {
                ModelState.AddModelError("Email", Services.TextService.Localize("profileEditor/DuplicateEmail"));
                hasErrors = true;
            }
            existing = Services.UserService.GetByUsername(userSave.Username);
            if (existing != null && existing.Id != userSave.Id)
            {
                ModelState.AddModelError("Username", Services.TextService.Localize("profileEditor/DuplicateUserName"));
                hasErrors = true;
            }
            // going forward we prefer to align usernames with email, so we should cross-check to make sure
            // the email or username isn't somehow being used by anyone.
            existing = Services.UserService.GetByEmail(userSave.Username);
            if (existing != null && existing.Id != userSave.Id)
            {
                ModelState.AddModelError("Username", Services.TextService.Localize("profileEditor/DuplicateUserNameEmail"));
                hasErrors = true;
            }
            existing = Services.UserService.GetByUsername(userSave.Email);
            if (existing != null && existing.Id != userSave.Id)
            {
                ModelState.AddModelError("Email", Services.TextService.Localize("profileEditor/DuplicateUserName"));
                hasErrors = true;
            }

            // if the found user has his email for username, we want to keep this synced when changing the email.
            // we have already cross-checked above that the email isn't colliding with anything, so we can safely assign it here.
            if (UmbracoConfig.For.UmbracoSettings().Security.UsernameIsEmail && found.Username == found.Email && userSave.Username != userSave.Email)
            {
                userSave.Username = userSave.Email;
            }


            if (hasErrors)
                throw new HttpResponseException(Request.CreateErrorResponse(HttpStatusCode.BadRequest, ModelState));


            //Only fields that can be edited
            found.Username = userSave.Username;
            found.Email = userSave.Email;
            found.Name = userSave.Name;
            found.Language = userSave.Culture;

            Services.UserService.Save(found);

            var display = Mapper.Map<UserDisplay>(found);

            display.AddSuccessNotification(Services.TextService.Localize("speechBubbles/operationSavedHeader"), Services.TextService.Localize("speechBubbles/editUserSaved"));
            return display;
        }

        //[FileUploadCleanupFilter(false)]
        [AppendUserModifiedHeader("id")]
        public async Task<HttpResponseMessage> PostSetAvatar(int id)
        {
            return await PostSetAvatarInternal(Request, Services.UserService, ApplicationContext.ApplicationCache.StaticCache, id);
        }

        internal static async Task<HttpResponseMessage> PostSetAvatarInternal(HttpRequestMessage request, IUserService userService, ICacheProvider staticCache, int id)
        {
            if (request.Content.IsMimeMultipartContent() == false)
            {
                throw new HttpResponseException(HttpStatusCode.UnsupportedMediaType);
            }

            var root = IOHelper.MapPath("~/App_Data/TEMP/FileUploads");
            //ensure it exists
            Directory.CreateDirectory(root);
            var provider = new MultipartFormDataStreamProvider(root);

            var result = await request.Content.ReadAsMultipartAsync(provider);

            //must have a file
            if (result.FileData.Count == 0)
            {
                return request.CreateResponse(HttpStatusCode.NotFound);
            }

            var user = userService.GetUserById(id);
            if (user == null)
                return request.CreateResponse(HttpStatusCode.NotFound);

            //var tempFiles = new PostedFiles();

            if (result.FileData.Count > 1)
                return request.CreateValidationErrorResponse("The request was not formatted correctly, only one file can be attached to the request");

            //get the file info
            var file = result.FileData[0];
            var fileName = file.Headers.ContentDisposition.FileName.Trim(new[] { '\"' }).TrimEnd();
            var safeFileName = fileName.ToSafeFileName();
            var ext = safeFileName.Substring(safeFileName.LastIndexOf('.') + 1).ToLower();

            if (UmbracoConfig.For.UmbracoSettings().Content.DisallowedUploadFiles.Contains(ext) == false)
            {
                //generate a path of known data, we don't want this path to be guessable
                user.Avatar = "UserAvatars/" + (user.Id + safeFileName).ToSHA1() + "." + ext;

                using (var fs = System.IO.File.OpenRead(file.LocalFileName))
                {
                    FileSystemProviderManager.Current.MediaFileSystem.AddFile(user.Avatar, fs, true);
                }

                userService.Save(user);
                                
            }
            user = userService.GetByUsername(user.Username);

            var userdisplay = Mapper.Map<IUser, UserDisplay>(user);
            var avatarurls = userdisplay.Avatars;

            return request.CreateResponse(HttpStatusCode.OK, avatarurls);
        }
               
    }
}