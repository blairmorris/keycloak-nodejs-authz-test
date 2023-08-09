import Keycloak from 'keycloak-connect';
import jwt from 'jsonwebtoken';
import {KeyCloakCookieStore} from './keyCloakCookieStore.mjs';

export class KeyCloakService {

    /**
     *
     * @param permissions
     * @param config can be:
     *      undefined (not specified) - the configuration will be loaded from 'keycloak.json'
     *      string - config will be loaded from a file
     *      object - parameters from this object
     */
    constructor(permissions, config) {
        this.permissions = permissions;
        this.keyCloak = KeyCloakService.initKeyCloak(config);
        this.keyCloakProtect = this.keyCloak.protect();
    }

    static initKeyCloak(config) {
        let result = new Keycloak(
            {
                cookies: true
            },
            KeyCloakService.createKeyCloakConfig(config)
        );

        // replace CookieStore from keycloak-connect
        result.stores[1] = KeyCloakCookieStore;

        // disable redirection to Keycloak login page
        result.redirectToLogin = () => false;

        // TODO It is not necessary, this function returns 403 by default. Just to having redirect to a page.
        // This function is used in other KeyCloakService methods
        result.accessDenied = (req, res) => res.redirect('/accessDenied.html');
        return result;
    }

    static createKeyCloakConfig = config => {
        if (!config || typeof config === 'string') {
            return null;
        }

        const authServerUrl = `${config.serverUrl}/auth`;
        return {
            realm: config.realm,
            authServerUrl: authServerUrl,
            resource: config.resource,
            credentials: {
                secret: config.secret
            }
        };
    }

    accessDenied(request, response) {
        this.keyCloak.accessDenied(request, response);
    }

    middleware = logoutUrl => {
        // Return the Keycloak middleware.
        //
        // Specifies that the user-accessible application URL to
        // logout should be mounted at /logout
        //
        // Specifies that Keycloak console callbacks should target the
        // root URL.  Various permutations, such as /k_logout will ultimately
        // be appended to the admin URL.
        const result = this.keyCloak.middleware({
            logout: logoutUrl,
            admin: '/'
        });
        result.push(this.createSecurityMiddleware());
        return result;
    }

    loginUser = (login, password, req, res) => {
        return this.keyCloak.grantManager.obtainDirectly(login, password).then(grant => {
            this.keyCloak.storeGrant(grant, req, res);
            return grant;
        });
    }

    getUserName = req => {
        return this.getAccessToken(req)
            .then(token => Promise.resolve(jwt.decode(token).preferred_username));
    }

    getAllPermissions = req => {
        return this.getAccessToken(req)
            .then(() => this.getAccessTokenWithPermissions(req))
            .then(KeyCloakService.decodeAccessToken);
    }

    static decodeAccessToken = accessToken => {
        const accessTokenAsObject = jwt.decode(accessToken);
        const permissions = (accessTokenAsObject.authorization.permissions || []).map(permission => ({
            scopes: permission.scopes,
            resource: permission.rsname,
        }));

        return {
            userName: accessTokenAsObject.preferred_username,
            roles: accessTokenAsObject.realm_access.roles,
            permissions: permissions
        };
    }

    /**
     * Protect with checking authentication only.
     *
     * @returns protect middleware
     */
    justProtect = () => this.keyCloak.protect()

    protect = (resource, scope) => (req, res, next) =>
        this.protectAndCheckPermission(req, res, next, resource, scope);

    createSecurityMiddleware = () => (req, res, next) => {
        if (this.permissions.isNotProtectedUrl(req)) {
            return next();
        }

        const permission = this.permissions.findPermission(req);
        if (!permission) {
            console.log('Can not find a permission for: %s %s', req.method, req.originalUrl);
            return this.keyCloak.accessDenied(req, res);
        }

        this.protectAndCheckPermission(req, res, next, permission.resource, permission.scope);
    }

    protectAndCheckPermission = (req, res, next, resource, scope) => {
        // keyCloakProtect checks that there is a token in the request
        this.keyCloakProtect(req, res, () => this.checkPermission(req, resource, scope)
            .then(res => {
                console.info('permission check: ' + JSON.stringify(res))
                return next();
            })
            .catch(error => {
                console.error('access denied: ' + error.message);
                this.keyCloak.accessDenied(req, res);
            }));
    }

    getAccessTokenWithPermissions = req => {
        let authzRequest = {};
        return this.keyCloak.grantManager.checkPermissions(authzRequest, req)
            .then(grant => grant.access_token?.token);
    }

    checkPermission = async (req, resource, scope) => {
        let permission = {
            id: resource,
            scopes: [scope]
        };

        let authzRequest = {
            permissions: [permission],
            response_mode: 'permissions' // can be 'decision'
        };

        // we need here because grantManager.checkPermissions() returns a promise, but calls reject() only
        let keyCloak = this.keyCloak;
        return new Promise((resolve, reject) => {
            keyCloak.grantManager.checkPermissions(
                authzRequest,
                req,
                response => resolve(response)
            ).catch(reject)
        });
    }

    // get the access token form cookies
    getAccessToken = async (req) => {
        let tokens = this.keyCloak.stores[1].get(req);
        return tokens?.access_token || Promise.reject('There is not token.');
    }

}
