'use strict';

const AWS = require('aws-sdk');
const { AuthClientTwoLegged } = require('forge-apis');

const ssm = new AWS.SSM();

async function getClient(scopes) {
  let client_id = await getClientId();
  let client_secret = await getClientSecret();
  let scopesInternal = ['bucket:create', 'bucket:read', 'data:read', 'data:create', 'data:write'];
  return new AuthClientTwoLegged(client_id, client_secret, scopes || scopesInternal);
}

let cache = {};
async function getToken(scopes) {
  const key = scopes.join('+');
  if (cache[key]) {
    return cache[key];
  }
  const client = await getClient(scopes);
  let credentials = await client.authenticate();
  cache[key] = credentials;
  setTimeout(() => {
    delete cache[key];
  }, credentials.expires_in * 1000);
  return credentials;
}

async function getPublicToken() {
  let scopesPublic = ['viewables:read'];
  return getToken(scopesPublic);
}

async function getInternalToken() {
  let scopesInternal = ['bucket:create', 'bucket:read', 'data:read', 'data:create', 'data:write'];
  return getToken(scopesInternal);
}

async function getClientId() {
  try {
    let paramForgeClientId = process.env.FORGE_CLIENT_ID;
    let forgeClientIdParam = {
      Name: paramForgeClientId
    };

    let client_id_request = await ssm.getParameter(forgeClientIdParam).promise();
    return client_id_request.Parameter.Value;
  } catch (error) {
    console.log('Error: ', error);
  }
}

async function getClientSecret() {
  try {
    let paramForgeClientSecret = process.env.FORGE_CLIENT_SECRET;
    var forgeClientSecretParam = {
      Name: paramForgeClientSecret,
      WithDecryption: true
    };
    let client_secret_request = await ssm.getParameter(forgeClientSecretParam).promise();
    return client_secret_request.Parameter.Value;
  } catch (error) {
    console.log('Error: ', error);
  }
}

module.exports = {
  getClient,
  getPublicToken,
  getInternalToken,
  getClientId
};
