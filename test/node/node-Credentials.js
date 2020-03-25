const assert = require('chai').assert;
const GeotabApi = require('../../dist/api');
const mocks = require('../mocks/mocks');
const LocalStorageCredentialStore = require('../../lib/LocalStorageCredentialStore').default;
require('./nocks/nock');
require('source-map-support').install();

/**
 *  Tests the core functionality of failing cases
 *  Tests failures against call -> Call will be the failing point of most requests
 *  via bad args or credentials 
 */

describe('User loads GeotabApi node module with credentials', async () => {

    it('Api should initialize', async () => {
        let api = await new GeotabApi(mocks.login, {rememberMe: false});
        assert.isDefined(api.call);
    });

    it('Api should successfully run a call (Callback)', async () => {
        let api = await new GeotabApi(mocks.login, {rememberMe: false});
        let callPromise = new Promise( (resolve, reject) => {
            api.call('Get', {typeName: 'Device'}, function(success){
                resolve(success);
            }, function(error){
                reject(error);
            });
        });

        let response = await callPromise
            .then( resolved => resolved )
            .catch( error => console.log('rejected', error) );
        assert.isTrue(response.name === 'DeviceName', 'Call did not return information');
    });

    it('Api should successfully run a call (Async)', async () => {
        let api = await new GeotabApi(mocks.login, {rememberMe: false});
        let call = api.call('Get', {typeName: 'Device'});
        let response = await call
                        .then( result => result )
                        .catch( err => console.log('err', err.message) );
        assert.isTrue(response.data.result.name === 'DeviceName', 'Promise response undefined');
    })

    it('Api should successfully run getSession (Callback)', async () => {
        let api = await new GeotabApi(mocks.login, {rememberMe: false});        
        let sessionPromise = new Promise( (resolve, reject) => {
            try {
                api.getSession( (credentials, server) => {
                    resolve([credentials, server]);
                });  
            } catch (err) {
                reject(err);
            }
        });
        // Awaiting the session promise to ensure we get the response
        let auth = await sessionPromise
            .then( (response) => response )
            .catch( (err) => console.log(err) );        

        assert.isObject(auth[0], 'Credentials not properly received');
        assert.equal(auth[1], 'www.myaddin.com', 'Server is not matching expected output')        
    });

    it('Api should successfully run getSession (Async)', async () =>{
        let api = await new GeotabApi(mocks.login, {rememberMe: false});
        let server, credentials;
        // getSession returns an unresolved promise
        let call = api.getSession();
        await call.then( response => {
            // Response should have a .then appended in the api to add the server
            // to the result
            credentials = response.data.result.credentials;
            server = response.data.result.path;
        })
        .catch( err => console.log(err));

        assert.isObject(credentials, 'Credentials not properly received');
        assert.equal(server, 'ThisServer', 'Server is not matching expected output')        
    });

    // it('Api should run multicall (callback)', async () => {
    //     let api = await new GeotabApi(mocks.login, {rememberMe: false});
    //     let getPromise = new Promise( (resolve, reject) => {
    //         let calls = [
    //             ["GetCountOf", { typeName: "Device" }],
    //             ["GetCountOf", { typeName: "User" }]
    //         ];
    //         api.multiCall(calls, function(result){
    //             resolve(result);
    //         }, function(error){
    //             reject(error);
    //         });
    //     });

    //     let result = await getPromise
    //         .then( response => response)
    //         .catch( err => console.log(err));
        
    //     assert.isTrue(result.length > 0, 'Multicall did not return list');
    // });

    // it('Api should run multi call (async)', async () => {
    //     let api = await new GeotabApi(mocks.login, {rememberMe: false});
    //     let calls = [
    //         ["GetCountOf", { typeName: "Device" }],
    //         ["GetCountOf", { typeName: "User" }]
    //     ];
    //     let multicall = api.multiCall(calls);
    //     // multicall returns a promise
    //     let response =await multicall
    //         .then( result => result.data.result )
    //         .catch( err => console.log(err));
    //     assert.isTrue( response.length === 2, 'Response does not match expected output');
    // });

    it('Api should run forget', async () => {
        let api = await new GeotabApi(mocks.login, {rememberMe: true});
        let auth1 = await api.getSession().then( response => response.data.result.credentials.sessionId );
        let auth2 = await api.forget().then( response => response.data.result.credentials.sessionId );
        assert.notEqual(auth1, auth2, 'Session did not refresh');
    });
    
    it('Api rememberMe should function properly', async () => {
        let localStorage = new LocalStorageCredentialStore();
        let rememberCredentials = {
            sessionId: 123456,
            userName: 'testUser',
            database: 1
        }
        localStorage.set(rememberCredentials, 'testServer');
        let api = new GeotabApi(mocks.login, {rememberMe: true, newCredentialStore: localStorage});
        let session = await api.getSession();
        assert.equal(rememberCredentials.sessionId, session.credentials.sessionId, 'SessionIDs are not remembered');
    });
});