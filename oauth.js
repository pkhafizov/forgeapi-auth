'use strict';

const AWS = require('aws-sdk');
const { AuthClientTwoLegged } = require('forge-apis');

const ssm = new AWS.SSM();

async function getClient(scopes, forgeClientIdParam, forgeClientSecretParam) {
  try {
    let client_id_request = await ssm.getParameter(forgeClientIdParam).promise();
    let client_id = client_id_request.Parameter.Value;
    let client_secret_request = await ssm.getParameter(forgeClientSecretParam).promise();
    let client_secret = client_secret_request.Parameter.Value;
    let scopesInternal = ['bucket:create', 'bucket:read', 'data:read', 'data:create', 'data:write'];
    return new AuthClientTwoLegged(client_id, client_secret, scopes || scopesInternal);
  } catch (error) {
    console.log('error: ', error);
  }
}

let cache = {};
async function getToken(scopes, forgeClientIdParam, forgeClientSecretParam) {
  const key = scopes.join('+');
  if (cache[key]) {
    return cache[key];
  }
  const client = await getClient(scopes, forgeClientIdParam, forgeClientSecretParam);
  let credentials = await client.authenticate();
  cache[key] = credentials;
  setTimeout(() => {
    delete cache[key];
  }, credentials.expires_in * 1000);
  return credentials;
}

async function getPublicToken(forgeClientIdParam, forgeClientSecretParam) {
  let scopesPublic = ['viewables:read'];
  return getToken(scopesPublic, forgeClientIdParam, forgeClientSecretParam);
}

async function getInternalToken() {
  let scopesInternal = ['bucket:create', 'bucket:read', 'data:read', 'data:create', 'data:write'];
  return getToken(scopesInternal);
}

module.exports = {
  getClient,
  getPublicToken,
  getInternalToken
};
