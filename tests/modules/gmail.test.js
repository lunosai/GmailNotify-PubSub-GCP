const gmail = require("../../modules/gmail");

const runLiveTests = process.env.RUN_GMAIL_TESTS === "true";
const testEmail = process.env.GMAIL_TEST_EMAIL;
const testAccessToken = process.env.GMAIL_TEST_ACCESS_TOKEN;

describe("Testing Gmail API Functionality", () => {

    const maybeTest = runLiveTests ? test : test.skip;

    maybeTest("Fetch history list", async () => {
        if (!testEmail || !testAccessToken) {
            console.warn("Skipping test - GMAIL_TEST_EMAIL/GMAIL_TEST_ACCESS_TOKEN not set");
            return;
        }
        const startHistoryId = process.env.GMAIL_START_HISTORY_ID;
        if (!startHistoryId) {
            console.warn("Skipping test - GMAIL_START_HISTORY_ID env var not set");
            return;
        }
        const resp = await gmail.getHistoryList(testEmail, testAccessToken, {
            startHistoryId,
            userId: 'me',
            labelId: "INBOX",
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
        if (!testEmail || !testAccessToken) {
            console.warn("Skipping test - GMAIL_TEST_EMAIL/GMAIL_TEST_ACCESS_TOKEN not set");
            return;
        }
        const messageId = process.env.GMAIL_TEST_MESSAGE_ID;
        if (!messageId) {
            console.warn("Skipping test - GMAIL_TEST_MESSAGE_ID env var not set");
            return;
        }
        const resp = await gmail.getMessageData(testEmail, testAccessToken, messageId);
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
