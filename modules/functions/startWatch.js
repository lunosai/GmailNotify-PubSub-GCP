const appConfig = require("../../config/appconfig.json");
const gmail = require("../gmail");

const topicName = process.env[appConfig.gcp.pubsub.topic];

/**
 * A Google Cloud Function with an HTTP trigger signature, Used to start Gmail Pub/Sub Notifications by calling the Gmail API "users.watch", more details in link below.
 *
 * @param {Object} req The HTTP request object of the HTTP request made
 * @param {Object} res The HTTP response object that will be served for the given request.
 * @see {@link https://developers.google.com/gmail/api/reference/rest/v1/users/watch}
 */
exports.startWatch = async (req, res) => {
    try {
      if ((req.method || "").toUpperCase() !== "POST") {
        res.status(405).send("Method Not Allowed; use POST");
        return;
      }

      const { email, accessToken, error } = resolveRequest(req);
      if (error) {
        res.status(400).send(error);
        return;
      }

      if (!topicName) {
        res.status(500).send("Pub/Sub topic is not configured");
        return;
      }

      const authGmail = await gmail.getAuthenticatedGmail(accessToken);
      const resp = await authGmail.users.watch({
        userId: 'me',
        topicName,
        labelIds: ["INBOX"]
      });

      const respData = resp && resp.data ? resp.data : {};
      const expiresInMs = respData.expiration ? Math.max(0, Number(respData.expiration) - Date.now()) : null;

      res.status(200).json({
        message: "Successfully Started Watching",
        result: [{
          email,
          expiresInMs,
          response: respData
        }]
      });
    }
    catch(ex) {
      res.status(500).send("Error occurred: " + ex);
      throw new Error("Error occurred while starting gmail watch: " + ex);
    }
  };

function resolveRequest(req) {
  const body = (req && req.body) || {};
  const email = (body.email || "").toString().trim();
  const accessToken = body.accessToken;
  if (!email || !accessToken) {
    return { error: "email and accessToken are required" };
  }
  return { email, accessToken };
}
