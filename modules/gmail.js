const appConfig = require("../config/appconfig.json");
const { google } = require('googleapis');

const authConfig = (appConfig.gcp && appConfig.gcp.auth) || {};
const clientId = process.env[authConfig.clientId];
const clientSecret = process.env[authConfig.clientSecret];

/**
 * Gets the authenticated Gmail API for the requested mailbox using provided access/refresh tokens.
 *
 * @param {String} accessToken Gmail OAuth access token
 * @return {google.gmail} with the authClient attached and ready to call Gmail API
 */
async function getAuthenticatedGmail(accessToken) {
    if (!accessToken) {
        throw new Error("Mailbox accessToken is required");
    }
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({
        access_token: accessToken
    });
    return google.gmail({
        auth: oauth2Client,
        version: 'v1'
    });
}

exports.getAuthenticatedGmail = getAuthenticatedGmail;
