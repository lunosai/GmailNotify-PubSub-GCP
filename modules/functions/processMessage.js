const crypto = require("crypto");
const appConfig = require("../../config/appconfig.json");

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

        await sendNotification(emailAddress);
        console.debug(`Function execution completed for mailbox ${emailAddress}`);
    }
    catch (ex) {
        throw new Error("Error occured while processing message: " + ex);
    }
};

/**
 * Sends the mailbox email address to the configured webhook.
 *
 * @param {String} emailAddress The email address received in the Pub/Sub payload
 */
async function sendNotification(emailAddress) {
    const webhookUrlEnv = appConfig.external && appConfig.external.webhookUrlEnv;
    const webhookUrl = webhookUrlEnv ? process.env[webhookUrlEnv] : null;
    if (!webhookUrl) {
        console.warn("Webhook URL not configured; skipping notification for mailbox: " + emailAddress);
        return;
    }
    const webhookSecretEnv = appConfig.external && appConfig.external.webhookSecretEnv;
    const webhookSecret = webhookSecretEnv ? process.env[webhookSecretEnv] : null;
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
