const appConfig = require("../../config/appconfig.json");
const gmail = require("../../modules/gmail");
const mailboxes = require("../../modules/mailboxes");

const mailbox = mailboxes.getDefaultMailbox() || mailboxes.getMailboxes()[0];

describe("Testing Gmail API Functionality", () => {

    const maybeTest = mailbox ? test : test.skip;

    maybeTest("Fetch history list", async () => {
        const resp = await gmail.getHistoryList(mailbox.id, {
            startHistoryId: "12401428",
            userId: 'me',
            labelId: mailbox.labelIds && mailbox.labelIds.length > 0 ? mailbox.labelIds[0] : undefined,
            historyTypes: ["messageAdded","labelAdded"]
        });
        expect(resp.status).toBe(200);
        console.log(resp.data);
        expect(resp.data).toMatchObject(expect.objectContaining({
            history: expect.any(Array),
            historyId: expect.any(String)
        }))
    });

    maybeTest("Fetch message data", async () => {
        const messageId = "17bce3fb8561fefb";
        const resp = await gmail.getMessageData(mailbox.id, messageId);
        expect(resp.status).toBe(200);
        console.log(resp.data);
        expect(resp.data).toMatchObject(expect.objectContaining({
            id: messageId,
            threadId: expect.any(String),
            labelIds: expect.any(Array),
            snippet: expect.any(String),
            payload: {
                headers: expect.any(Array),
                parts: expect.any(Array),
                body: {
                    data: expect.any(String),
                    size: expect.any(Number)
                },
                filename: expect.any(String),
                mimeType: expect.any(String),
                partId: expect.any(String)
            },
            sizeEstimate: expect.any(Number),
            internalDate: expect.any(String),
            historyId: expect.any(String)
        }))
    });

});
