# Credit
Base copied from https://github.com/v-ladynev/keycloak-nodejs-example

# Changes to original source
- Removed mySQL dependency from docker-compose and using memory store for keycloak 
- changed project to an ES6 module, and updated all syntax to ES6
- updated dependencies to latest versions
- added routes for funding vehicles to test attribute level permissions and user managed access
- changed scope names to work with keycloak-connect's enforcer middleware
- updated default resource policy to be role based (js policies not allowed in keycloak realm upload since v18)
- added realm data for funding vehicles, including scopes, roles, policies and permissions

# To edit custom JS policy "resource owner"
You must bundle the policy into a jar file and copy it to the keycloak docker image
```shell
(cd ./testpolicy && zip -r ../docker/providers/keycloak-scripts.jar .)
```

# keycloak-nodejs-authz-test

This is a simply Node.js REST application with checking permissions. The code with permissions check: [keycloak-nodejs-authz-test/app.js](app.js)
<br>
Just go to the [Quick Start Section](#quick-start), if you don't want to read.

This applications has REST API to work with _customers_, _campaigns_ and _reports_. We will protect all endpoints
based on permissions are configured using Keycloak.

| URL        | Method |    Permission   |   Resource   |     Scope     |                     Roles                    |
|:----------:|:------:|:---------------:|:------------:|:-------------:|:--------------------------------------------:|
| /customers | POST   | customer-create | res:customer | scopes:create | admin                                        |
| /customers | GET    | customer-view   | res:customer | scopes:view   | admin, customer-advertiser, customer-analyst |
| /campaigns | POST   | campaign-create | res:campaign | scopes:create | admin, customer-advertiser                   |
| /campaigns | GET    | campaign-view   | res:campaign | scopes:view   | admin, customer-advertiser, customer-analyst |
| /reports   | POST   | report-create   | res:report   | scopes:create | customer-analyst                             |
| /reports   | GET    | report-view     | res:report   | scopes:view   | admin, customer-advertiser, customer-analyst |

The application will use a combination of _(resource, scope)_ to check a permission. 
We will configure Keycloak to use polices are based on roles. 
For the application a combination of _(resource, scope)_ is important only.
We can configure Keycloak using something other than roles, without changing the application.

## The Most Useful Features

* Custom login without using Keycloak login page.
* Stateless Node.js server without using a session. Keycloak token is stored using cookies.
* A centralized middleware to check permissions. Routes are not described explicitly can't be accessed.
* Configuration without `keycloak.json`. It can be used to having configuration for multiple environments. For example — DEV, QA.
* Examples of using Keycloak REST API to create users, roles and custom attributes. It can be accessed from the application UI to work with users list.

# Quick Start

1. Docker has to be installed in the system
2. Type in the console in a root of the project directory to run already configured Keycloak (with users, roles and scopes). Keycloak will need time to initialize a database schema and start (about 1 minute).   
```bash
docker-compose up
```
3. Go to the Keycloak administration console [http://localhost:8080/auth/admin/](http://localhost:8080/auth/admin/)
4. Enter credentials (it was specified in the `docker-compose.yml`)
```
Username or email: admin 
Password: admin
```
5. After `Sign in`, `abs_realm` has to be selected. Go to the `Clients` menu.
6. Choose `connector` in the `Clients` list.
7. Press on the `Installation` tab.
8. Choose `Format Option: Keycloak OIDC JSON` and click `Download` to download `keycloak.json`
10. Replace `keycloak-nodejs-authz-test\keycloak.json` in the root of the project with the downloaded `keycloak.json`.
11. Run `npm install` in the project directory to install Node.js libraries
12. Run `npm start` to run node.js application

5. Login to the application using this URL [http://localhost:8888/](http://localhost:3000/)
   <br>
   with any of these credentials:
* login: admin_user, password: admin_user
* login: advertiser_user, password: advertiser_user
* login: analyst_user, password: analyst_user

## Keycloak Configuration

### Import Users, Realm, Client and Polices
Realm, Client and Polices configuration can be imported using this file:
[abs_realm-realm.json](https://github.com/blairmorris/keycloak-nodejs-authz-test/blob/master/import_realm_json/CAMPAIGN_REALM-realm.json)

Users can be imported from this file:
[abs_realm-users-0.json](https://github.com/blairmorris/keycloak-nodejs-authz-test/blob/master/import_realm_json/CAMPAIGN_REALM-users-0.json)

#### Import at server boot time
Export and import is triggered at server boot time and its parameters are passed in via Java system properties. 
https://www.keycloak.org/docs/latest/server_admin/index.html#_export_import

### Configure permissions

#### Add polices

Using `Authorization -> Policies` add role based polices to the `connector` 
https://www.keycloak.org/docs/latest/authorization_services/index.html#_policy_rbac

| Policy Name                    | Role                |
|--------------------------------|---------------------|
| Admin                          | admin               |
| Advertiser                     | customer-advertiser |
| Analyst                        | customer-analyst    |
| Admin or Advertiser or Analyst | Aggregated Policy*  |  

Aggregated Policy*
This policy consist of an aggregation of other polices
https://www.keycloak.org/docs/latest/authorization_services/index.html#_policy_aggregated  
  
* Policy name: `Admin or Advertiser or Analyst`
* Apply Policy: `Admin`, `Advertiser`, `Analyst`
* Decision Strategy: `Affirmative`
 
 #### Add scopes
 
Using `Authorization -> Authorization Scopes` add scopes
* create
* view  

#### Add resources

Using `Authorization -> Resources` add resources. Scopes should be entered in the `Scopes` field for every resource.

| Resource Name | Scopes                 |
|---------------|------------------------|
| campaign      | create, view           |
| customer      | create, view           |
| report        | create, view           |

Enter `Rsource Name` column value to the `Name` and `Display Name` fields 

#### Add scope-based permissions

Using `Authorization -> Permissions` add *scope-based* permissions
https://www.keycloak.org/docs/latest/authorization_services/index.html#_permission_create_scope

Set *decision strategy* for every permission 
* Decision Strategy: `Affirmative`

|    Permission     |  Resource  |  Scope   |               Polices                |
|:-----------------:|:----------:|:--------:|:------------------------------------:|
|  customer-create  |  customer  |  create  |                Admin                 |
|   customer-view   |  customer  |   view   |    Admin or Advertiser or Analyst    |
|  campaign-create  |  campaign  |  create  |          Admin, Advertiser           |
|   campaign-view   |  campaign  |   view   |    Admin or Advertiser or Analyst    |
|   report-create   |   report   |  create  |               Analyst                |
|    report-view    |   report   |   view   |    Admin or Advertiser or Analyst    |

10. Download `keycloak.json` using `CAMPAIGN_CLIENT -> Installation` :
https://www.keycloak.org/docs/latest/securing_apps/index.html#_nodejs_adapter

### Download and run application

1. Clone this project https://github.com/blairmorris/keycloak-nodejs-authz-test.git

2. Replace `keycloak.json` in the [root of this project](https://github.com/blairmorris/keycloak-nodejs-authz-test/blob/master/keycloak.json)
with downloaded `keycloak.json`.

3. Run `npm install` in the project directory to install Node.js libraries

4. `npm start` to run node.js application

5. Login to the application using this URL http://localhost:3000/
<br>
and any of these credentials:
* login: admin_user, password: admin_user
* login: advertiser_user, password: advertiser_user
* login: analyst_user, password: analyst_user

## Add custom attribute

1. Add a user attribute `customerId` to the `advanced_user`<br>
https://www.keycloak.org/docs/latest/server_admin/index.html#user-attributes

2. Create a mapper and add `customerId` to `ID token`<br> 
http://stackoverflow.com/a/32890003/3405171

3. `customerId` value will be in the decoded `ID token`

## Keycloak docker image

### Build docker image from the root of the project

```shell
sudo docker build -t keycloak-mysql-realm-users ./docker/import_realm_users
```
After that new image can be tagged
```shell
docker tag keycloak-mysql-realm-users ladynev/keycloak-mysql-realm-users
```
and pushed to the docker
```shell
docker push ladynev/keycloak-mysql-realm-users
```

## Examples of using Admin REST API and Custom Login

### Example of custom login 

Keycloak, by default, uses an own page to login a user. There is an example, how to use an application login page.
`Direct Access Grants` should be enabled in that case (https://github.com/blairmorris/keycloak-nodejs-authz-test#basic-configuration)
The file [app.js](https://github.com/blairmorris/keycloak-nodejs-authz-test/blob/master/app.js)
 
```javascript 
 app.get('/customLoginEnter', function (req, res) {
     let rptToken = null
     keycloak.grantManager.obtainDirectly(req.query.login, req.query.password).then(grant => {
         keycloak.storeGrant(grant, req, res);
         renderIndex(req, res, rptToken);
     }, error => {
         renderIndex(req, res, rptToken, "Error: " + error);
     });
 });
```

#### What happens with custom login

To perform custom login we need to obtain tokens from Keycloak. We can do this by HTTP request:
```shell
curl -X POST \
  http://localhost:8080/auth/realms/abs_realm/protocol/openid-connect/token \
  -H 'authorization: Basic Q0FNUEFJR05fQ0xJRU5UOjZkOTc5YmU1LWNiODEtNGQ1Yy05ZmM3LTQ1ZDFiMGM3YTc1ZQ==' \
  -H 'content-type: application/x-www-form-urlencoded' \
  -d 'client_id=CAMPAIGN_CLIENT&username=admin_user&password=admin_user&grant_type=password'
```

`authorization: Basic Q0FNUEFJR05fQ0xJRU5UOjZkOTc5YmU1LWNiODEtNGQ1Yy05ZmM3LTQ1ZDFiMGM3YTc1ZQ==`
is computed as
```javascript
'Basic ' + btoa(clientId + ':' + secret);
```
where (they can be obtained from `keycloak.json`) 
```
client_id = CAMPAIGN_CLIENT
secret = 6d979be5-cb81-4d5c-9fc7-45d1b0c7a75e
```
This is just an example, the secret can be different.

We will have, as a result, a response with `access_token`, `refresh_token` and `id_token` (The response has 2447 bytes length)
```json
{
    "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJfT3B2Wm5lSkR3T0NqczZSZmFObjdIc0lKZmRhMWxfU0ZkYUo2SU1hV0k0In0.eyJqdGkiOiI0ODM0OWQ5NS03NjNkLTQ5NTQtODNmMy01NGYzOTY0Y2I4NTQiLCJleHAiOjE1MDk0NzYyODAsIm5iZiI6MCwiaWF0IjoxNTA5NDc1OTgwLCJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwODAvYXV0aC9yZWFsbXMvQ0FNUEFJR05fUkVBTE0iLCJhdWQiOiJDQU1QQUlHTl9DTElFTlQiLCJzdWIiOiI1ZGMzMDBjOS04NmM4LTQ5OTUtYjJiOS0zNjhmOTA0OWJhM2YiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJDQU1QQUlHTl9DTElFTlQiLCJhdXRoX3RpbWUiOjAsInNlc3Npb25fc3RhdGUiOiI3OGRhOWJhMi00YmRmLTRlNTYtODE4NC00N2QxYjgxNGEwZGEiLCJhY3IiOiIxIiwiYWxsb3dlZC1vcmlnaW5zIjpbIioiXSwicmVhbG1fYWNjZXNzIjp7InJvbGVzIjpbImFkbWluIiwidW1hX2F1dGhvcml6YXRpb24iXX0sInJlc291cmNlX2FjY2VzcyI6eyJhY2NvdW50Ijp7InJvbGVzIjpbIm1hbmFnZS1hY2NvdW50IiwibWFuYWdlLWFjY291bnQtbGlua3MiLCJ2aWV3LXByb2ZpbGUiXX19LCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJhZG1pbl91c2VyIn0.Qa2PXHhRs_JpMPHYYwKVcpb3kfHN8l6QUGCyWkIRhl6eoI6IlWu3FG11NOtuDhKn5DvKHdnpft9nK7W5b87WSHa5lXawm6Dcp4RLfD5WvK7W7yFceFGhvC8vuM8xXOhvWDbhnX1eP_Tanrpqs19nWbTjLQ2E8iFqzxnJ1PQNNDFL2BXQ3Y58jt0uwaebJnjIhU0Mpb0plTPaRbnMBNfsjfCurXXWN6MM0rVFAHEDDrrW0M3kKeVyDuq9PYvcDvedlETOlCx3Ss9DXtZY2u__qGfABk3aNbCuUtkn9xy-HYJLBUTZIpPW0ImBKM4-tM4tEzQLvb9b6P4iWYFsaQR08w",
    "expires_in": 300,
    "refresh_expires_in": 1800,
    "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJfT3B2Wm5lSkR3T0NqczZSZmFObjdIc0lKZmRhMWxfU0ZkYUo2SU1hV0k0In0.eyJqdGkiOiJjMzdhNWFiYi1kZDNlLTQxMGMtOGQxMy1mMWU5NTU0ZjhmNzMiLCJleHAiOjE1MDk0Nzc3ODAsIm5iZiI6MCwiaWF0IjoxNTA5NDc1OTgwLCJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwODAvYXV0aC9yZWFsbXMvQ0FNUEFJR05fUkVBTE0iLCJhdWQiOiJDQU1QQUlHTl9DTElFTlQiLCJzdWIiOiI1ZGMzMDBjOS04NmM4LTQ5OTUtYjJiOS0zNjhmOTA0OWJhM2YiLCJ0eXAiOiJSZWZyZXNoIiwiYXpwIjoiQ0FNUEFJR05fQ0xJRU5UIiwiYXV0aF90aW1lIjowLCJzZXNzaW9uX3N0YXRlIjoiNzhkYTliYTItNGJkZi00ZTU2LTgxODQtNDdkMWI4MTRhMGRhIiwicmVhbG1fYWNjZXNzIjp7InJvbGVzIjpbImFkbWluIiwidW1hX2F1dGhvcml6YXRpb24iXX0sInJlc291cmNlX2FjY2VzcyI6eyJhY2NvdW50Ijp7InJvbGVzIjpbIm1hbmFnZS1hY2NvdW50IiwibWFuYWdlLWFjY291bnQtbGlua3MiLCJ2aWV3LXByb2ZpbGUiXX19fQ.E46pp4oqM9o9Xa0d44YYzZ7fI61kB1KCDYksoXnUIw0Qbv67VoEWcloMKC2Lr6pmPeu6ptjkK6QJKjmoaeiFNcGHE7SoU5RTq0cyKjTFqg4GkTZuK-y0tk2ek-Beq64Zu69HzTfWGT0zSIDfd2l7EiEN8ptSCS-Tugsgmk1Snvrb2nC_1-U87qUFBR_qVryhwRk8Ie_AAwTVRWk5jATu5PPsLsCXqfM5_VVu-lc_qbOJaPeg1Ag2WXhE4lf_3BzVeRlgsxDr2EuzZG56O4Y6QeyV2J-XsZF2C7n3CcNPVXD42-MGB7Jhn5l2onl074JsJqhE6bzKB063jSf_wzyB4Q",
    "token_type": "bearer",
    "not-before-policy": 0,
    "session_state": "78da9ba2-4bdf-4e56-8184-47d1b814a0da"
}
```
if we decode `access_token` (using https://jwt.io/), we will have (there are roles in the token)

```json
{
  "jti": "48349d95-763d-4954-83f3-54f3964cb854",
  "exp": 1509476280,
  "nbf": 0,
  "iat": 1509475980,
  "iss": "http://localhost:8080/auth/realms/abs_realm",
  "aud": "CAMPAIGN_CLIENT",
  "sub": "5dc300c9-86c8-4995-b2b9-368f9049ba3f",
  "typ": "Bearer",
  "azp": "CAMPAIGN_CLIENT",
  "auth_time": 0,
  "session_state": "78da9ba2-4bdf-4e56-8184-47d1b814a0da",
  "acr": "1",
  "allowed-origins": [
    "*"
  ],
  "realm_access": {
    "roles": [
      "admin",
      "uma_authorization"
    ]
  },
  "resource_access": {
    "account": {
      "roles": [
        "manage-account",
        "manage-account-links",
        "view-profile"
      ]
    }
  },
  "preferred_username": "admin_user"
}
```
### Examples of Admin REST API 
The file [adminClient.js](https://github.com/blairmorris/keycloak-nodejs-authz-test/blob/master/lib/adminClient.js)

  * Realms list
  * Users list for `abs_realm`
  * Create user `test_user` (password: `test_user`)
  * Get user `test_user`
  * Delete user `test_user`
  * Update user `test_user` 
  * Set `test_user` `customerId=123`
  * Remove `test_user` `customerId`
  * Create Role `TEST_ROLE`
  * Add `TEST_ROLE` to `test_user`
  * Remove `TEST_ROLE` from `test_user` 

## Update custom attribute using REST API

Update the user<br>
http://www.keycloak.org/docs-api/2.5/rest-api/index.html#_update_the_user

Using `UserRepresentation`, `attributes` field<br>
http://www.keycloak.org/docs-api/2.5/rest-api/index.html#_userrepresentation

## Check permissions using REST API

[Obtaining Permissions](https://www.keycloak.org/docs/latest/authorization_services/index.html#_service_obtaining_permissions)
<br>
[Resources, scopes, permissions and policies in keycloak](https://stackoverflow.com/questions/42186537/resources-scopes-permissions-and-policies-in-keycloak)

## Secure URL

https://stackoverflow.com/questions/12276046/nodejs-express-how-to-secure-a-url

## Links

[Keycloak Admin REST API](http://www.keycloak.org/docs-api/2.5/rest-api/index.html)<br>
<br>
[Change Keycloak login page, get security tokens using REST](http://stackoverflow.com/questions/39356300/avoid-keycloak-default-login-page-and-use-project-login-page)
<br>
[Obtain access token for user](https://www.keycloak.org/docs/latest/server_development/index.html#admin-rest-api)
<br>
[Stop using JWT for sessions](http://cryto.net/~joepie91/blog/2016/06/13/stop-using-jwt-for-sessions/)
<br>
[Video Keycloak intro part 2 - Resources, Permissions, Scope and Policies](https://www.youtube.com/watch?v=3K77Pvv-ouU)
<br>
Keycloak uses _JSON web token (JWT)_ as a bearer token format. To decode such tokens: https://jwt.io/

