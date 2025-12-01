const appConfig = require("../config/appconfig.json");

const defaultLabels = (appConfig.gmail && appConfig.gmail.labelsIds) || [];
const defaultFilterAction = appConfig.gmail && appConfig.gmail.filterAction;
const defaultWebhookUrl = appConfig.external && appConfig.external.webhookUrl;

let cachedMailboxes = null;

function ensureTrailingSlash(value) {
    if (!value) {
        return "";
    }
    return value.endsWith("/") ? value : value + "/";
}

function normalizeMailbox(mailbox, index) {
    const normalized = { ...mailbox };
    normalized.email = normalized.email || normalized.subject;
    if (!normalized.email) {
        throw new Error(`Mailbox at index ${index} is missing an email/subject`);
    }
    normalized.id = normalized.id || normalized.email.toLowerCase().replace(/[^a-z0-9]/g, "_");
    normalized.labelIds = normalized.labelIds || defaultLabels;
    normalized.filterAction = normalized.filterAction || defaultFilterAction;
    normalized.webhookUrl = normalized.webhookUrl || defaultWebhookUrl;
    normalized.storage = normalized.storage || {};
    normalized.storage.rootFolderName = normalized.storage.rootFolderName || appConfig.gcp.storage.rootFolderName || "";
    normalized.storage.folderName = normalized.storage.folderName || normalized.id;
    normalized.storage.debugFolderName = normalized.storage.debugFolderName || appConfig.gcp.storage.debugFolderName;
    normalized.storage.emailsFolderName = normalized.storage.emailsFolderName || appConfig.gcp.storage.emailsFolderName;
    normalized.storage.historyFilename = normalized.storage.historyFilename || appConfig.gcp.storage.historyFilename;
    normalized.storage.rootFolderName = ensureTrailingSlash(normalized.storage.rootFolderName);
    normalized.storage.folderName = ensureTrailingSlash(normalized.storage.folderName);
    normalized.storage.debugFolderName = ensureTrailingSlash(normalized.storage.debugFolderName);
    normalized.storage.emailsFolderName = ensureTrailingSlash(normalized.storage.emailsFolderName);
    return normalized;
}

function loadMailboxes() {
    const configuredMailboxes = Array.isArray(appConfig.mailboxes) ? appConfig.mailboxes : [];
    if (configuredMailboxes.length > 0) {
        return configuredMailboxes.map(normalizeMailbox);
    }
    if (appConfig.gcp && appConfig.gcp.auth && appConfig.gcp.auth.subject) {
        return [
            normalizeMailbox(
                {
                    id: "default",
                    email: appConfig.gcp.auth.subject,
                    labelIds: defaultLabels,
                    filterAction: defaultFilterAction,
                    webhookUrl: defaultWebhookUrl
                },
                0
            )
        ];
    }
    return [];
}

function getMailboxes() {
    if (!cachedMailboxes) {
        cachedMailboxes = loadMailboxes();
    }
    return cachedMailboxes;
}

function getMailboxById(mailboxId) {
    return getMailboxes().find((mailbox) => mailbox.id === mailboxId);
}

function getMailboxByEmail(email) {
    if (!email) {
        return null;
    }
    const lowered = email.toLowerCase();
    return getMailboxes().find((mailbox) => mailbox.email.toLowerCase() === lowered);
}

function getDefaultMailbox() {
    const mailboxes = getMailboxes();
    return mailboxes.length === 1 ? mailboxes[0] : null;
}

module.exports = {
    getMailboxes,
    getMailboxByEmail,
    getMailboxById,
    getDefaultMailbox
};
