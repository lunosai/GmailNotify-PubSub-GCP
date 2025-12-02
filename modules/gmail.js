const { google } = require('googleapis');
const { getGmailAuthConfig } = require("./secrets");

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
    const { clientId, clientSecret } = await getGmailAuthConfig();
    if (!clientId || !clientSecret) {
        throw new Error("Gmail OAuth client secrets are not configured");
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
