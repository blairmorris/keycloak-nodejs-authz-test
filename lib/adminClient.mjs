import adminClient from 'keycloak-admin-client';
import getToken from 'keycloak-request-token';
import request from 'request-promise-native';

export class AdminClient {
    constructor(config) {
        this.config = AdminClient.createAdminClientConfig(config);
        this.request = new KeyCloakAdminRequest(this.config);
    }

    static createAdminClientConfig = (config) => ({
        realm: config.realm,
        baseUrl: config.serverUrl,
        resource: config.resource,
        username: config.adminLogin,
        password: config.adminPassword,
        grant_type: 'password',
        client_id: 'admin-cli'
    })

    realmsList = () =>
        adminClient(this.config).then(client => client.realms.find());

    usersList = () =>
        adminClient(this.config).then(client => client.users.find(this.config.realm));

    createTestUser = async () => {
        const client = await adminClient(this.config);
        const newUser = await createTestUser(client, this.config.realm);
        await resetUserPassword(client, this.config.realm, newUser);
        return newUser;
    }

    updateTestUser = async () => {
        const client = await adminClient(this.config);
        const user = await this.findTestUser();
        user.firstName = 'user first name updated';
        await client.users.update(this.config.realm, {...user, firstName: 'user first name updated'});
        return 'user updated';
    }

    findTestUser = async () => {
        const client = await adminClient(this.config);
        const users = await client.users.find(this.config.realm, {username: 'test_user'});
        const user = users?.[0];
        return user?.id ? user : Promise.reject('user not found');
    }

    setTestUserCustomerId = async () => {
        const client = await adminClient(this.config);
        const user = await this.findTestUser();
        user.attributes = user.attributes || {};
        user.attributes.customerId = 123;
        await client.users.update(this.config.realm, user);
        return 'customerId added';
    }

    removeTestUserCustomerId = async () => {
        const client = await adminClient(this.config);
        const user = await this.findTestUser();
        user.attributes = user.attributes || {};
        user.attributes.customerId = undefined;
        await client.users.update(this.config.realm, user);
        return 'customerId removed';
    }

    // this is an example how to get user by id
    getUserById = async () => {
        const client = await adminClient(this.config);
        const user = await this.findTestUser();
        return client.users.find(this.config.realm, {userId: user.id});
    }

    deleteTestUser = async () => {
        const client = await adminClient(this.config);
        const user = await this.findTestUser();
        await this.deleteUserById(user.id);
        return 'user deleted';
    }

    deleteUserById = async userId => {
        const client = await adminClient(this.config);
        await client.users.remove(this.config.realm, userId);
        return 'user deleted';
    }

    // admin client doesn't have these methods

    createRole = async () => {
        const token = await this.authenticate();
        await this.request.createRole('TEST_ROLE', token);
        return 'role created';
    }

    deleteRole = async () => {
        const token = await this.authenticate();
        await this.request.deleteRole('TEST_ROLE', token);
        return 'role deleted';
    }

    addTestRoleToTestUser = async () => {
        const user = await this.findTestUser();
        const token = await this.authenticate();
        const role = await this.getRoleByName('TEST_ROLE');
        await this.request.addRole(user.id, role, token);
        return 'TEST_ROLE role is added to the user login=test_user';
    }

    removeTestRoleFromTestUser = async () => {
        const user = await this.findTestUser();
        const token = await this.authenticate();
        const role = await this.getRoleByName('TEST_ROLE');
        await this.request.removeRoleFromUser(user.id, role, token);
        return 'TEST_ROLE role is removed from user';
    }

    getRoleByName = async roleName => {
        const token = await this.authenticate();
        const role = await this.request.getRole(roleName, token);
        return role || Promise.reject('role not found');
    };

    authenticate = () => getToken(this.config.baseUrl, this.config);
}

const createTestUser = async (client, realm) => {
    return client.users.create(realm, {
        username: 'test_user',
        firstName: 'user first name',
        enabled: true
    });
}

const resetUserPassword = async (client, realm, user) => {
    // set password 'test_user' for a user
    return client.users.resetPassword(realm, user.id, {
        type: 'password',
        value: 'test_user'
    });
}

class KeyCloakAdminRequest {

    constructor(config) {
        this.config = config;
    }

    addRole = async (userId, role, token) => {
        return this.doRequest('POST',
            `/admin/realms/${this.config.realm}/users/${userId}/role-mappings/realm`, token, [role]);
    }

    createRole = async (roleName, token) => {
        return this.doRequest('POST',
            `/admin/realms/${this.config.realm}/roles`, token, {
                name: roleName
            });
    }

    deleteRole = async (roleName, token) => {
        return this.doRequest('DELETE',
            `/admin/realms/${this.config.realm}/roles/${roleName}`, token);
    }

    getRole = async (roleName, token) => {
        return this.doRequest('GET',
            `/admin/realms/${this.config.realm}/roles/${roleName}`, token, null);
    }

    removeRoleFromUser = async (userId, role, token) => {
        return this.doRequest('DELETE',
            `/admin/realms/${this.config.realm}/users/${userId}/role-mappings/realm`, token, [role]);
    }

    doRequest = async (method, url, accessToken, jsonBody) => {
        let options = {
            url: this.config.baseUrl + url,
            auth: {
                bearer: accessToken
            },
            method: method,
            json: true
        };

        if (jsonBody !== null) {
            options.body = jsonBody;
        }

        return request(options).catch(error => Promise.reject(error?.message || error));
    }

}
