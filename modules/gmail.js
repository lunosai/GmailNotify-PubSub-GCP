const appConfig = require("../config/appconfig.json");
const mailboxes = require("./mailboxes");
const { google } = require('googleapis');

const GoogleKeyFile = appConfig.gcp.auth.googleKeyFilePath;
const SCOPES = appConfig.gmail.scopes;

const JWT = google.auth.JWT;
const AuthenticatedGmailByMailbox = new Map();

function resolveMailbox(mailboxIdOrEmail) {
    const mailbox = mailboxes.getMailboxById(mailboxIdOrEmail) || mailboxes.getMailboxByEmail(mailboxIdOrEmail) || mailboxes.getDefaultMailbox();
    if (!mailbox) {
        throw new Error(`Mailbox not configured for identifier: ${mailboxIdOrEmail || "unknown"}`);
    }
    return mailbox;
}

/**
 * Gets the authenticated Gmail API for the requested mailbox. Caches per mailbox to reuse JWT sessions.
 *
 * @param {String} mailboxIdOrEmail Identifier to locate mailbox config.
 * @return {google.gmail} with the authClient attached and ready to call Gmail API
 */
async function getAuthenticatedGmail(mailboxIdOrEmail) {
    const mailbox = resolveMailbox(mailboxIdOrEmail);
    const cacheKey = mailbox.id;
    try {
        if (AuthenticatedGmailByMailbox.has(cacheKey)) {
            return AuthenticatedGmailByMailbox.get(cacheKey);
        }
        const authClient = new JWT({
            keyFile: GoogleKeyFile,
            scopes: SCOPES,
            subject: mailbox.email
        });
        await authClient.authorize();
        const gmailClient = google.gmail({
            auth: authClient,
            version: 'v1'
        });
        AuthenticatedGmailByMailbox.set(cacheKey, gmailClient);
        return gmailClient;
    }
    catch (ex) {
        throw ex;
    }
}

exports.getAuthenticatedGmail = getAuthenticatedGmail;
exports.resolveMailbox = resolveMailbox;

/**
 * Performs the Gmail API call to users.history.list Endpoint for a mailbox.
 *
 * @param {String} mailboxId Mailbox identifier
 * @param {*} options Query parameters as per the Gmail API documentation link below.
 * @return {Promise} A Promise that will resolve with the history data based on the options provided
 * @see {@link https://developers.google.com/gmail/api/reference/rest/v1/users.history/list}
 */
exports.getHistoryList = async (mailboxId, options) => {
    try {
        const gmailClient = await getAuthenticatedGmail(mailboxId);
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
 * @param {String} mailboxId Mailbox identifier
 * @param {String} messageId  The message ID for which details (data) is required
 * @return {Promise} A Promise that will resolve with the message details (data) for the given message ID
 * @see {@link https://developers.google.com/gmail/api/reference/rest/v1/users.messages/get}
 */
exports.getMessageData = async (mailboxId, messageId) => {
    try {
        const gmailClient = await getAuthenticatedGmail(mailboxId);
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
