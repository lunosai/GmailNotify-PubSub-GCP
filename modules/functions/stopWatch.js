const gmail = require("../gmail");
const mailboxes = require("../mailboxes");

/**
 * A Google Cloud Function with an HTTP trigger signature, Used to stop Gmail from sending Pub/Sub Notifications by calling the Gmail API "users.stop", more details in link below.
 *
 * @param {Object} req The HTTP request object of the HTTP request made
 * @param {Object} res The HTTP response object that will be served for the given request.
 * @see {@link https://developers.google.com/gmail/api/reference/rest/v1/users/stop}
 */
exports.stopWatch = async (req, res) => {
    try {
      const targetMailboxes = resolveRequestedMailboxes(req);
      if (targetMailboxes.length === 0) {
        res.status(400).send("No mailbox found to stop watch");
        return;
      }

      const responses = [];
      for (const mailbox of targetMailboxes) {
        const authGmail = await gmail.getAuthenticatedGmail(mailbox.id);
        const resp = await authGmail.users.stop({
          userId: 'me',
        });
        responses.push({
          mailboxId: mailbox.id,
          email: mailbox.email,
          response: resp.data || resp
        });
      }
      res.status(200).send("Successfully Stopped Watching - " + JSON.stringify(responses));
    }
    catch(ex) {
      res.status(500).send("Error occured: " + ex);
      throw new Error("Error occured while stopping gmail watch: " + ex);
    }
  };

function resolveRequestedMailboxes(req) {
  const requestedEmail = (req && req.query && req.query.email) || (req && req.body && req.body.email);
  if (requestedEmail && requestedEmail !== "all") {
    const mailbox = mailboxes.getMailboxByEmail(requestedEmail) || mailboxes.getMailboxById(requestedEmail);
    return mailbox ? [mailbox] : [];
  }
  return mailboxes.getMailboxes();
}
