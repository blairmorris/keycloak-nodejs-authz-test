import 'express-async-errors';
import Express from 'express';
import hogan from 'hogan-express';
import path from 'path';
import {fileURLToPath} from 'url';
import cookieParser from 'cookie-parser';

import {Permissions} from './lib/permissions.mjs';
import {KeyCloakService} from './lib/keyCloakService.mjs';
import {AdminClient} from './lib/adminClient.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fundingVehicles = [
    {id: 1, name: 'Funding Vehicle 1', owner: 'admin_user'},
    {id: 2, name: 'Funding Vehicle 2', owner: 'advertiser_user'},
    {id: 3, name: 'Funding Vehicle 3', owner: 'analyst_user'},
]
/**
 * URL patterns for permissions. URL patterns documentation https://github.com/snd/url-pattern.
 */
const PERMISSIONS = new Permissions([
    ['/customers', 'post', 'customer', 'create'],
    ['/customers(*)', 'get', 'customer', 'view'],
    ['/campaigns', 'post', 'campaign', 'create'],
    ['/campaigns(*)', 'get', 'campaign', 'view'],
    ['/reports', 'post', 'report', 'create'],
    ['/reports(*)', 'get', 'report', 'view'],
    ['/fundingVehicles', 'get', 'fundingVehicle', 'view'],
]).notProtect(
    '/favicon.ico', // just to not log requests
    '/login(*)',
    '/accessDenied',
    '/adminClient',
    '/adminApi(*)',
    '/fundingVehicles(*)',
    '/resources',
    '/resources(*)',

    /**
     * It is protected because we need an access token. Better to move it to the protected area.
     */
    '/permissions',
    '/checkPermission'
);

const app = Express();

// hogan-express configuration to render html
app.set('view engine', 'html');
app.engine('html', hogan);

const keyCloak = new KeyCloakService(PERMISSIONS);

const adminClient = new AdminClient({
    realm: 'CAMPAIGN_REALM',
    serverUrl: 'http://localhost:8080',
    resource: 'CAMPAIGN_CLIENT',
    adminLogin: 'admin',
    adminPassword: 'admin'
});

const configureMiddleware = () => {
    app.use(Express.static(path.join(__dirname, 'static')));

    // for a Keycloak token
    app.use(cookieParser());

    // protection middleware is configured for all links
    const logoutUrl = '/logout';
    app.use(keyCloak.middleware(logoutUrl));
}

const configureRoutes = () => {
    let router = Express.Router();
    app.use('/', router);

    // example urls to check protection
    app.use('/campaigns', showUrl);
    app.use('/customers', showUrl);
    app.use('/upload', showUrl);
    app.use('/optimizer', showUrl);
    app.use('/reports', showUrl);
    app.use('/targets', showUrl);
    app.get('/resources/:resourceId?', async (req, res, next) => {
        const {access_token: {token: access_token}} = await keyCloak.keyCloak.grantManager.obtainDirectly('admin_user', 'admin_user');
        let url = `${keyCloak.keyCloak.config.realmUrl}/authz/protection/resource_set/${req.params.resourceId || ''}`;
        return fetch(url, {
            method: 'GET',
            headers: {'Authorization': `Bearer ${access_token}`},
            credentials: 'include'
        }).then(async result => {
            if (result.ok) {
                const json = await result.json();
                if (!req.params.resourceId) {
                    return res.json(json.map(resource => `/resources/${resource}`));
                }
                return res.json(json);
            }
            return res.status(result.status).send(result.statusMessage);
        });
    });
    const fundingVehiclesRouter = Express.Router({mergeParams: true});
    fundingVehiclesRouter.get('/', keyCloak.keyCloak.enforcer('fundingVehicle:view'), (req, res) => {
        res.json(fundingVehicles);
    });
    fundingVehiclesRouter.get('/:id',
        (req, res, next) => {
            const permission = `fv${req.params.id}:view`;
            return keyCloak.keyCloak.enforcer(permission)(req, res, next);
        },
        (req, res) => {
            console.log(req.permissions)
            res.json(fundingVehicles.find(fv => fv.id === Number(req.params.id)));
        },
    );
    // fundingVehiclesRouter.get('/:id',
    //     (req, res, next) => keyCloak.keyCloak.enforcer(
    //         ['fundingVehicle:view'], {
    //         claims: function(request) {
    //             return {
    //                 "fvId": [request.params.id]
    //             }
    //         }
    //     })(req, res, next),
    //     (req, res) => {
    //         console.log(req.permissions)
    //         res.json(fundingVehicles.find(fv => fv.id === Number(req.params.id)));
    //     },
    // );
    app.use('/fundingVehicles', fundingVehiclesRouter);

    applicationRoutes();

    app.get('*', (req, res) => res.sendFile(path.join(__dirname, '/static/index.html')));
}

// these routes are used by this application
const applicationRoutes = () => {
    app.get('/login', login);

    app.get('/adminClient', (req, res) => renderAdminClient(res, 'we will have result here'));

    app.get('/adminApi', (req, res) => {
        let render = renderAdminClient.bind(null, res);
        adminClient[req.query.api]()
            .then(render)
            .catch(render);
    });

    //get all permissions
    app.get('/permissions', (req, res) => {
        keyCloak.getAllPermissions(req)
            .then(json => res.json(json))
            .catch(error => res.end('error ' + error));
    });

    // check a specified permission
    app.get('/checkPermission', (req, res) => {
        keyCloak.checkPermission(req, 'res:customer', 'scopes:create')
            .then(() => res.end('permission granted'))
            .catch(error => res.end('error ' + error));
    });
}

const login = (req, res) => {
    keyCloak.loginUser(req.query.login, req.query.password, req, res).then(grant => {
        // console.log(grant.__raw);
        res.render('loginSuccess', {
            userLogin: req.query.login
        });
    }).catch(error => {
        // TODO put login failed code here (we can return 401 code)
        console.error(error);
        res.end('Login error: ' + error);
    });
}

const renderAdminClient = (res, result) => {
    res.render('adminClient', {
        result: JSON.stringify(result, null, 4)
    });
}

const showUrl = (req, res) => {
    res.end('<a href="javascript: window.history.back()">back</a> Access acquired to ' + req.originalUrl);
}

configureMiddleware();
configureRoutes();

const server = app.listen(8888, () => {
    const {port} = server.address();
    console.log(`App listening at http://localhost:${port}`);
});

process.on('unhandledRejection', (err) => {
    console.error(err);
})