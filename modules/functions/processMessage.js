const crypto = require("crypto");
const appConfig = require("../../config/appconfig.json");
const mailboxes = require("../mailboxes");

/**
 * A Google Cloud Function with an Pub/Sub trigger signature.
 *
 * @param {Object} event The Pub/Sub message
 * @param {Object} context The event metadata
 * @return {Promise} A Promise so the GCP function does not stop execution till the returned promise is resolved or gets rejected.
 */
exports.ProcessMessage = async (event, context) => {
    try {
        const message = event.data ? Buffer.from(event.data, "base64").toString() : "";
        const msgObj = message ? JSON.parse(message) : {};
        const emailAddress = msgObj.emailAddress || msgObj.email;
        if (!emailAddress) {
            console.warn("emailAddress missing in Pub/Sub payload; skipping notification");
            return;
        }

        const mailbox = resolveMailboxFromMessage(msgObj);
        await sendNotification(mailbox, emailAddress);
        console.debug(`Function execution completed for mailbox ${mailbox.id} (${emailAddress})`);
    }
    catch (ex) {
        throw new Error("Error occured while processing message: " + ex);
    }
};

function resolveMailboxFromMessage(msgObj) {
    const emailAddress = msgObj.emailAddress || msgObj.email;
    if (emailAddress) {
        const mailboxFromEmail = mailboxes.getMailboxByEmail(emailAddress);
        if (mailboxFromEmail) {
            return mailboxFromEmail;
        }
    }
    if (msgObj.mailboxId) {
        const mailboxFromId = mailboxes.getMailboxById(msgObj.mailboxId);
        if (mailboxFromId) {
            return mailboxFromId;
        }
    }
    const defaultMailbox = mailboxes.getDefaultMailbox();
    if (defaultMailbox) {
        return defaultMailbox;
    }
    throw new Error(`No mailbox configuration found for message email: ${emailAddress || "unknown"}`);
}

/**
 * Sends the mailbox email address to the configured webhook.
 *
 * @param {Object} mailbox Mailbox configuration object
 * @param {String} emailAddress The email address received in the Pub/Sub payload
 */
async function sendNotification(mailbox, emailAddress) {
    const webhookUrl = appConfig.external && appConfig.external.webhookUrl;
    if (!webhookUrl) {
        console.warn("Webhook URL not configured; skipping notification for mailbox: " + mailbox.id);
        return;
    }
    const webhookSecret = appConfig.external && appConfig.external.webhookSecret;
    const payload = JSON.stringify({ emailAddress });
    const headers = {
        "Content-Type": "application/json"
    };

    if (webhookSecret) {
        const signature = crypto
            .createHmac("sha256", webhookSecret)
            .update(payload, "utf8")
            .digest("hex");
        headers["X-Signature"] = signature;
    }

    const p = require('phin');
    await p({
        url: webhookUrl,
        method: 'POST',
        headers,
        data: payload
    });
}
