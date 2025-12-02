const { google } = require('googleapis');

/**
 * Gets the authenticated Gmail API client for a mailbox using a provided user access token.
 *
 * @param {String} accessToken Gmail OAuth access token
 * @return {google.gmail} with the authClient attached and ready to call Gmail API
 */
async function getAuthenticatedGmail(accessToken) {
    if (!accessToken) {
        throw new Error("Mailbox accessToken is required");
    }
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
        access_token: accessToken
    });
    return google.gmail({
        auth: oauth2Client,
        version: 'v1'
    });
}

exports.getAuthenticatedGmail = getAuthenticatedGmail;
