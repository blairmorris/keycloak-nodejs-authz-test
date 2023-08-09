import UrlPattern from 'url-pattern';

export class Permissions {

    constructor(permissions) {
        this.publicUrls = [];
        this.permissions = permissions.map(permission => ({
            url: new UrlPattern(permission[0]),
            method: permission[1].toUpperCase(),
            resource: permission[2],
            scope: permission[3]
        }))
    }

    notProtect = (...publicUrls) => {
        publicUrls.forEach(url => this.publicUrls.push(new UrlPattern(url)));
        return this;
    }

    findPermission = req => {
        return this.permissions.find(
            p => req.method.toUpperCase() === p.method && p.url.match(req.originalUrl)
        );
    }

    isNotProtectedUrl = req => {
        let url = req.originalUrl;
        let result = this.publicUrls.find(u => u.match(url));
        return result !== undefined;
    }
}
