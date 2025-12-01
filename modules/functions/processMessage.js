const crypto = require("crypto");
const appConfig = require("../../config/appconfig.json");
const storage = require("../storage");
const gmail = require("../gmail");
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
        const message = event.data ? Buffer.from(event.data, 'base64').toString() : 'No data provided';
        const msgObj = JSON.parse(message);
        const mailbox = resolveMailboxFromMessage(msgObj);
        const mailboxPaths = getMailboxPaths(mailbox);

        const historyExists = await storage.fileExist(mailboxPaths.historyFilePath);
        if (historyExists) {
            const data = await storage.fetchFileContent(mailboxPaths.historyFilePath);
            const prevMsgObj = JSON.parse(data[0]);
            await moveForward(mailbox, mailboxPaths, prevMsgObj.historyId, msgObj);
        } else {
            console.debug(`History file did not exist for mailbox ${mailbox.id}`);
            await storage.saveFileContent(mailboxPaths.historyFilePath, JSON.stringify(msgObj));
        }
        console.debug(`Function execution completed for mailbox ${mailbox.id}`);
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

function getMailboxPaths(mailbox) {
    const storageConfig = mailbox.storage || {};
    const basePath = storageConfig.rootFolderName + storageConfig.folderName;
    return {
        basePath: basePath,
        historyFilePath: basePath + storageConfig.historyFilename,
        emailsFolder: basePath + storageConfig.emailsFolderName,
        debugFolder: basePath + storageConfig.debugFolderName
    };
}

/**
 * A helper function to further process the previous history id and save the current Message Object for the next run's previous history id
 *
 * @param {Object} mailbox Mailbox configuration object
 * @param {Object} mailboxPaths Mailbox specific storage paths
 * @param {String} prevHistoryId Previous history id which will be queried for the latest messages
 * @param {Object} msgObj The current message object containing the new history id
 */
async function moveForward(mailbox, mailboxPaths, prevHistoryId, msgObj) {
    await storage.saveFileContent(mailboxPaths.historyFilePath, JSON.stringify(msgObj));
    await fetchMessageFromHistory(mailbox, mailboxPaths, prevHistoryId);
}

/**
 * Function to fetch the messages/updates starting from the given history id, then continue to process the received updates to identify the messages that needs to be send to the external webhook
 *
 * @param {Object} mailbox Mailbox configuration object
 * @param {Object} mailboxPaths Mailbox specific storage paths
 * @param {String} historyId
 * @return {Object} Returns the list of updates from the given history id
 * @see {@link gmail.getHistoryList}
 */
async function fetchMessageFromHistory(mailbox, mailboxPaths, historyId) {
    try {
        console.time("getHistoryList");
        const res = await gmail.getHistoryList(mailbox.id, {
            startHistoryId: historyId,
            userId: 'me',
            labelId: mailbox.labelIds && mailbox.labelIds.length > 0 ? mailbox.labelIds[0] : undefined,
            historyTypes: ["messageAdded", "labelAdded"]
        });
        console.timeEnd("getHistoryList");
        const shouldFilterLabels = mailbox.labelIds && mailbox.labelIds.length > 0;
        var history = res.data.history;
        if (history != null && history.length > 0) {
            var msgs = [];
            history.forEach(item => {
                const labelsAdded = item.labelsAdded;
                const messagesAdded = item.messagesAdded;
                if (labelsAdded != null)
                    for (let index = 0; index < labelsAdded.length; index++) {
                        const labelIds = labelsAdded[index].labelIds || [];
                        if (!shouldFilterLabels || labelIds.some(r => mailbox.labelIds.indexOf(r) >= 0))
                            msgs.push({ id: labelsAdded[index].message.id, threadId: labelsAdded[index].message.threadId });
                    }

                if (messagesAdded != null)
                    for (let index = 0; index < messagesAdded.length; index++) {
                        msgs.push({ id: messagesAdded[index].message.id, threadId: messagesAdded[index].message.threadId });
                    }
            });

            if (msgs.length > 0)
                msgs = msgs.reduce((newArr, current) => {
                    const x = newArr.find(item => item.id === current.id || item.threadId === current.threadId);
                    if (!x) {
                        return newArr.concat([current]);
                    } else {
                        return newArr;
                    }
                }, []);

            var pCount = 0;
            var msgIds = [];
            for (let index = 0; index < msgs.length; index++) {
                const messageId = msgs[index].id;
                console.time("getMessageData");
                const msg = await gmail.getMessageData(mailbox.id, messageId);
                console.timeEnd("getMessageData");
                if (msg == null || msg == undefined) {
                    console.error("Message object was null: id: " + messageId);
                    continue;
                }
                pCount++;
                msgIds.push(messageId);
                console.time("processEmail");
                await processEmail(mailbox, mailboxPaths, msg, messageId);
                console.timeEnd("processEmail");
            }
            console.log("Mailbox: " + mailbox.id + " | Message count: " + msgs.length + " | Processed Messages: " + pCount);
            console.log("Mailbox: " + mailbox.id + " | Messages ID: " + msgIds.join(","));
        }
        await storage.saveFileContent(mailboxPaths.debugFolder + historyId + ".json", JSON.stringify(res.data));
        return res.data;
    }
    catch (ex) {
        throw new Error("fetchMessageFromHistory ERROR: " + ex);
    }
}

/**
 * Helper function to process the email data received from the Gmail API users.messages.get endpoint
 *
 * @param {Object} mailbox Mailbox configuration object
 * @param {Object} mailboxPaths Mailbox specific storage paths
 * @param {Object} msg The message object that contains all the metadata of an email, like subject, snippet, body, to, form, etc.
 * @param {String} messageId The message ID of the message object being processed
 * @return {Null} Does not return anything, must use await if you want it to complete the processing but not mandatory to await
 * @see For detailed message object properties, visit {@link https://developers.google.com/gmail/api/reference/rest/v1/users.messages#Message}
 */
async function processEmail(mailbox, mailboxPaths, msg, messageId) {
    try {
        const payload = msg.data.payload;
        const headers = payload.headers;
        const parts = payload.parts;
        const emailType = payload.mimeType;
        if (headers == null || headers == undefined) {
            console.debug("Header is not defined");
            return;
        }

        var email = {
            id: msg.data.id,
            from: "",
            to: "",
            subject: "",
            snippet: msg.data.snippet,
            bodyText: "",
            bodyHtml: ""
        };

        if (emailType && emailType.includes("plain")) {
            email.bodyText = payload.body.data;
        }
        else {
            if (parts == null || parts == undefined) {
                console.debug("Parts is not defined for msgId: " + messageId + " mimeType: " + emailType);
                email.bodyText = payload.body.data;
            }
            else {
                parts.forEach(part => {
                    const mimeType = part.mimeType;
                    switch (mimeType) {
                        case "text/plain":
                            email.bodyText = part.body.data;
                            break;
                        case "text/html":
                            email.bodyHtml = part.body.data;
                            break;
                    }
                });
            }
        }

        headers.forEach(header => {
            const name = header.name;
            switch (name) {
                case "To":
                    email.to = header.value;
                    break;
                case "From":
                    email.from = header.value;
                    break;
                case "Subject":
                    email.subject = header.value;
                    break;
            }
        });

        await storage.saveFileContent(mailboxPaths.debugFolder + messageId + "_msg.json", JSON.stringify(msg));
        await storage.saveFileContent(mailboxPaths.emailsFolder + messageId + "_email.json", JSON.stringify(email));

        var fromName = email.from.split("<")[0].trim();
        var notificationText = fromName + ": " + email.subject + "\n\n" + email.snippet;
        await sendNotification(mailbox, notificationText);

        console.debug("Message notification sent!: " + email.from + " - " + messageId + " | mailbox: " + mailbox.id);
    }
    catch (ex) {
        throw new Error("process email error: " + ex);
    }
}

/**
 * Function to execute an external WebHook via a HTTP Post method, passing the text data provided.
 *
 * @param {Object} mailbox Mailbox configuration object
 * @param {String} text The text data that needs to be send via HTTP Post to the external url (WebHook)
 */
async function sendNotification(mailbox, text) {
    const webhookUrl = mailbox.webhookUrl || (appConfig.external && appConfig.external.webhookUrl);
    if (!webhookUrl) {
        console.warn("Webhook URL not configured; skipping notification for mailbox: " + mailbox.id);
        return;
    }
    const webhookSecret = mailbox.webhookSecret || (appConfig.external && appConfig.external.webhookSecret);
    const payload = JSON.stringify({ text: text });
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
