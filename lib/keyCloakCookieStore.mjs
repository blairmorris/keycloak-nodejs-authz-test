export class KeyCloakCookieStore {

    static get = (req) => {
        let value = req.cookies[KeyCloakCookieStore.TOKEN_KEY];
        if (value) {
            try {
                return JSON.parse(value);
            }
            catch (err) {
                // ignore
            }
        }
    }
    static TOKEN_KEY = 'keycloak-token';

    static wrap = grant => {
        grant.store = this.store(grant);
        grant.unstore = this.unstore;
    }

    static store = grant => (req, res) => {
        const maxAgeMilliseconds = 900000;
        res.cookie(this.TOKEN_KEY, grant.__raw, {
            maxAge: maxAgeMilliseconds,
            httpOnly: true
        });
    }

    static unstore = (req, res) => {
        res.clearCookie(this.TOKEN_KEY);
    }

}
