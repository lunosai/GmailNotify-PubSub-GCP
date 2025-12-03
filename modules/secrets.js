const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const secretClient = new SecretManagerServiceClient();

const SECRET_IDS = {
    webhookUrl: "WEBHOOK_URL",
    webhookSecret: "WEBHOOK_SECRET",
    pubsubTopic: "PUBSUB_TOPIC"
};

const cachedSecrets = new Map();

function buildSecretResourceName(secretId) {
    if (secretId.includes("/")) {
        return secretId;
    }

    return `projects/gmail-mailbox-notifications/secrets/${secretId}/versions/latest`;
}

async function readSecret(secretId, optional) {
    const name = buildSecretResourceName(secretId);
    const [version] = await secretClient.accessSecretVersion({ name });
    const payload = version && version.payload && version.payload.data ? version.payload.data.toString("utf8") : "";

    if (!payload && !optional) {
        throw new Error(`Secret ${secretId} is empty or missing a payload`);
    }

    return payload || null;
}

async function getSecret(secretId, { optional = false } = {}) {
    if (cachedSecrets.has(secretId)) {
        return cachedSecrets.get(secretId);
    }
    if (!secretId) {
        if (optional) {
            return null;
        }
        throw new Error("Secret id is required");
    }

    const secretPromise = readSecret(secretId, optional).catch(err => {
        cachedSecrets.delete(secretId);
        if (optional) {
            console.warn(`Optional secret ${secretId} is unavailable: ${err.message}`);
            return null;
        }
        throw err;
    });

    cachedSecrets.set(secretId, secretPromise);
    return secretPromise;
}

async function getWebhookConfig() {
    const [webhookUrl, webhookSecret] = await Promise.all([
        getSecret(SECRET_IDS.webhookUrl),
        getSecret(SECRET_IDS.webhookSecret)
    ]);

    return { webhookUrl, webhookSecret };
}

async function getPubSubTopic() {
    return getSecret(SECRET_IDS.pubsubTopic);
}

module.exports = {
    SECRET_IDS,
    getSecret,
    getWebhookConfig,
    getPubSubTopic
};
