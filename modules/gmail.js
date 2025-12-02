const appConfig = require("../config/appconfig.json");
const { google } = require('googleapis');

function resolveEnv(envName, fallback) {
    if (envName && process.env[envName]) {
        return process.env[envName];
    }
    return fallback;
}

const clientId = resolveEnv(
    appConfig.gcp && appConfig.gcp.auth && appConfig.gcp.auth.clientIdEnv,
    appConfig.gcp && appConfig.gcp.auth && appConfig.gcp.auth.clientId
);
const clientSecret = resolveEnv(
    appConfig.gcp && appConfig.gcp.auth && appConfig.gcp.auth.clientSecretEnv,
    appConfig.gcp && appConfig.gcp.auth && appConfig.gcp.auth.clientSecret
);

/**
 * Gets the authenticated Gmail API for the requested mailbox using provided access/refresh tokens.
 *
 * @param {String} mailboxEmail Mailbox email
 * @param {String} accessToken Gmail OAuth access token
 * @return {google.gmail} with the authClient attached and ready to call Gmail API
 */
async function getAuthenticatedGmail(mailboxEmail, accessToken) {
    if (!mailboxEmail) {
        throw new Error("Mailbox email is required");
    }
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

/**
 * Performs the Gmail API call to users.history.list Endpoint for a mailbox.
 *
 * @param {String} mailboxEmail Mailbox email
 * @param {*} options Query parameters as per the Gmail API documentation link below.
 * @return {Promise} A Promise that will resolve with the history data based on the options provided
 * @see {@link https://developers.google.com/gmail/api/reference/rest/v1/users.history/list}
 */
exports.getHistoryList = async (mailboxEmail, accessToken, options) => {
    try {
        const gmailClient = await getAuthenticatedGmail(mailboxEmail, accessToken);
        return gmailClient.users.history.list({
            userId: 'me',
            ...options
        });
    }
    catch (ex) {
        console.error("history list error: " + ex);
        throw ex;
    }
}

/**
 * Performs the Gmail API call to users.messages.get Endpoint for a mailbox.
 *
 * @param {String} mailboxEmail Mailbox email
 * @param {String} messageId  The message ID for which details (data) is required
 * @return {Promise} A Promise that will resolve with the message details (data) for the given message ID
 * @see {@link https://developers.google.com/gmail/api/reference/rest/v1/users.messages/get}
 */
exports.getMessageData = async (mailboxEmail, accessToken, messageId) => {
    try {
        const gmailClient = await getAuthenticatedGmail(mailboxEmail, accessToken);
        return gmailClient.users.messages.get({
            userId: 'me',
            id: messageId
        });
    }
    catch (ex) {
        console.error("msg data error: " + ex);
        throw ex;
    }
}
