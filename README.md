# Project for Push Notifications to Webhooks

## Introduction
**GmailNotify** This is a quick project made to consume Pub-Sub messages sent via Gmail to be processed and finally execute a Webhook for external services to receive a push of email data. It now supports multiple Gmail mailboxes in a single deployment.

It is in essense a set of NodeJS Cloud Functions to handle Gmail Notifications which can be configured to receive wide range of Gmail notifications based on the `config/appconfig.json` file setting.

## Technologies Used
* NodeJS v14
* googleapis v85.0.0
* phin v3.6.0

## Google Cloud Resources Used
* Cloud Functions
* Pub/Sub

> These are just the primary resources, other supporting resources are also used but mainly for networking, security and permissions.

## Code Structure
The code is structured for clean and simple implementation as well as maintenance.

### Primary Folder's Explanation
* `/config` - contains the `appconfig.json` file (renamed from `sample-appconfig.json` template file) after putting in the values.
* `/credentials` - optional; contains `google-key.json` only if you choose to bundle a service account key (not required for the stateless watch flow).
* `/modules` - contains the individual modules `*.js` files.
* `/modules/functions` - contains the core Cloud Functions in their respective `*.js` files.
* `/tests` - contains all the JEST test files used to perform checks and validation on the functionality of the application locally, before deploying the Cloud Functions.

## Compiling
There are scripts already part of the `package.json` file to publish the project into the `/publish` directory and zip the output with the project name and version (from `package.json.version` property) for quick upload and deployment of Cloud Functions.

**Publish Command**
```
npm run publish
```
> Don't forget to rename the `sample-appconfig.json` file in `/config` (see below section **Basic Application Configuration**).

Publish outputs to a zip file
```
/publish/GNFunc_v{version}.zip
```

**Run all tests**
```
npm run test
```

## Google Cloud Setup
### Create Cloud Functions
## Functional Flow
The Cloud Function is deployed so that it starts the code in the `/main.js` file (which is renamed to `/index.js` on publish) and executes the assigned Cloud Function Entry Point.
## Google Cloud Credentials
To get the Google Cloud Credentials, you need to complete the following steps on your Google Cloud Platform account.

## Basic Application Configuration
You must configure the Webhook and Gmail OAuth client details before you configure the application.

### Rules
While entering values for the application config, please keep in mind the following.

1. Mailboxes are not configured in this repo; each `startWatch`/`stopWatch` request supplies the mailbox email and OAuth tokens directly.
2. `gcp.auth.clientIdEnv` / `clientSecretEnv` (or inline values) define the Gmail OAuth client used with the access tokens provided to `startWatch` and `stopWatch`.
3. `gcp.pubsub.topicEnv` (or `topic`) defines the Pub/Sub topic path for Gmail watches.
4. `gmail` - property object is based on the **Gmail API** and more information on the appropriate values for these properties can be found in the [Gmail API Reference](https://developers.google.com/gmail/api/reference/rest).

### Minimum Configuration
For you to quickly deploy this application, you only need to provide the following configuration

**For `/config/sample-appconfig.json` file.**

1. `external.webhookUrlEnv` and `external.webhookSecretEnv` - define the environment variable names for webhook configuration (values set during deployment via `--set-env-vars`).
2. `gcp.pubsub.topicEnv` (or `topic`) - the full topic name as provided in the Cloud Pub/Sub Dashboard.
3. `gcp.auth.clientIdEnv` / `clientSecretEnv` (or inline values) - OAuth2 client used with the access token provided to `startWatch` and `stopWatch`.

**Environment Variables (set during deployment):**
- `WEBHOOK_URL` - a fully qualified URL to an external service that accepts a `POST` request with the body: `{ emailAddress: 'mailbox@example.com' }`
- `WEBHOOK_SECRET` - (Optional) a shared secret for HMAC signing. If set, outgoing notifications include an `X-Signature` header with HMAC-SHA256 hex digest of the JSON payload.
- `PUBSUB_TOPIC` - Pub/Sub topic name used for Gmail watch callbacks.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth2 client used with mailbox access tokens.

### Rename Config File

* Rename the `sample-appconfig.json` file to `appconfig.json` file.

### Environment Variables

Webhook settings must be configured using environment variables. The environment variable names are defined in `config/appconfig.json`:

```json
"external": {
    "webhookUrlEnv": "WEBHOOK_URL",
    "webhookSecretEnv": "WEBHOOK_SECRET"
}
```

**Deploying to Google Cloud Functions with environment variables:**

Deploy the `processMessage` function (Pub/Sub trigger):
```bash
gcloud functions deploy processMessage \
  --runtime nodejs14 \
  --trigger-topic YOUR_PUBSUB_TOPIC_NAME \
  --entry-point processMessage \
  --source . \
  --set-env-vars WEBHOOK_URL=https://example.com/webhook,WEBHOOK_SECRET=your-secret-key
```

Deploy the `startWatch` function (HTTP trigger):
```bash
gcloud functions deploy startWatch \
  --runtime nodejs14 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point startWatch \
  --source . \
  --set-env-vars WEBHOOK_URL=https://example.com/webhook,WEBHOOK_SECRET=your-secret-key
```

Deploy the `stopWatch` function (HTTP trigger):
```bash
gcloud functions deploy stopWatch \
  --runtime nodejs14 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point stopWatch \
  --source . \
  --set-env-vars WEBHOOK_URL=https://example.com/webhook,WEBHOOK_SECRET=your-secret-key
```

**To update environment variables on existing functions:**
```bash
gcloud functions deploy processMessage \
  --update-env-vars WEBHOOK_URL=https://new-url.com/webhook
```

**To view current environment variables:**
```bash
gcloud functions describe processMessage --format="value(environmentVariables)"
```

### Stateless mailbox handling

- No mailbox data is stored in this project or in Cloud Storage.
- Every `startWatch` and `stopWatch` call must include `email` and `accessToken`.
- Watches always target the Gmail `INBOX`; labels/filters/IDs are not used.
- The Pub/Sub handler forwards only the `emailAddress` from the incoming Gmail notification to your webhook; it does not fetch or include message contents.

### Webhook signature
- If `external.webhookSecret` is set, outgoing webhook requests include an `X-Signature` header containing an HMAC-SHA256 hex digest of the JSON payload (the same secret is used for all mailboxes).
- When no secret is provided, the header is omitted and requests are sent unsigned.
- Payload shape: `{ "emailAddress": "<mailbox email from Pub/Sub payload>" }` (only field).

### Starting and stopping watch per mailbox

- Start watch for a mailbox: `POST https://<function-url>/startWatch` with JSON body `{ "email": "...", "accessToken": "..." }`. (`email=all` is not supported.)
- Stop watch for a mailbox: `POST https://<function-url>/stopWatch` with JSON body `{ "email": "...", "accessToken": "..." }`. (`email=all` is not supported.)
- `startWatch` responds with `expiresInMs` (milliseconds until expiration) so the client can schedule the next refresh.
