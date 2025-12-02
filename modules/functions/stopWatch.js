const gmail = require("../gmail");

/**
 * A Google Cloud Function with an HTTP trigger signature, Used to stop Gmail from sending Pub/Sub Notifications by calling the Gmail API "users.stop", more details in link below.
 *
 * @param {Object} req The HTTP request object of the HTTP request made
 * @param {Object} res The HTTP response object that will be served for the given request.
 * @see {@link https://developers.google.com/gmail/api/reference/rest/v1/users/stop}
 */
exports.stopWatch = async (req, res) => {
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

      const authGmail = await gmail.getAuthenticatedGmail(email, accessToken);
      const resp = await authGmail.users.stop({
        userId: 'me',
      });
      res.status(200).json({
        message: "Successfully Stopped Watching",
        result: [{
          email,
          response: resp.data || resp
        }]
      });
    }
    catch(ex) {
      res.status(500).send("Error occured: " + ex);
      throw new Error("Error occured while stopping gmail watch: " + ex);
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
