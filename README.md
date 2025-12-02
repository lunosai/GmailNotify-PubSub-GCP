# Project for Push Notifications to Webhooks

## Introduction
**GmailNotify** This is a quick project made to consume Pub-Sub messages sent via Gmail to be processed and finally execute a Webhook for external services to receive a push of email data. It now supports multiple Gmail mailboxes in a single deployment.

It is in essense a set of NodeJS Cloud Functions to handle Gmail Notifications; runtime configuration is pulled from Google Secret Manager.

## Technologies Used
* NodeJS v14
* googleapis v85.0.0
* phin v3.6.0
* @google-cloud/secret-manager

## Google Cloud Resources Used
* Cloud Functions
* Pub/Sub

> These are just the primary resources, other supporting resources are also used but mainly for networking, security and permissions.

## Code Structure
The code is structured for clean and simple implementation as well as maintenance.

### Primary Folder's Explanation
* `/credentials` - optional; contains `google-key.json` only if you choose to bundle a service account key (not required for the stateless watch flow; no sample key is included).
* `/modules` - contains the individual modules `*.js` files.
* `/modules/functions` - contains the core Cloud Functions in their respective `*.js` files.
* `/tests` - contains all the JEST test files used to perform checks and validation on the functionality of the application locally, before deploying the Cloud Functions.
* Configuration values are stored in Google Secret Manager (no local config files are required).

## Compiling
There are scripts already part of the `package.json` file to publish the project into the `/publish` directory and zip the output with the project name and version (from `package.json.version` property) for quick upload and deployment of Cloud Functions.

**Publish Command**
```
npm run publish
```
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
You must configure the Webhook, Pub/Sub topic, and Gmail OAuth client details before you configure the application. All values are loaded from Google Secret Manager at runtime; grant the Cloud Functions runtime service account access to the secrets.

### Required secrets
- `WEBHOOK_URL` - a fully qualified URL to an external service that accepts a `POST` request with the body: `{ emailAddress: 'mailbox@example.com' }`
- `WEBHOOK_SECRET` - (Optional) a shared secret for HMAC signing. If set, outgoing notifications include an `X-Signature` header with HMAC-SHA256 hex digest of the JSON payload.
- `PUBSUB_TOPIC` - Pub/Sub topic name used for Gmail watch callbacks (full topic resource name is recommended).
- `GOOGLE_CLIENT_ID` - OAuth2 client ID used with the access token provided to `startWatch` and `stopWatch`.
- `GOOGLE_CLIENT_SECRET` - OAuth2 client secret matching the above client.

Secrets can be referenced by simple IDs (above) in the project identified by `GCLOUD_PROJECT`/`GCP_PROJECT`, or by full resource names such as `projects/<project>/secrets/WEBHOOK_URL/versions/latest`.

### Stateless mailbox handling

- No mailbox data is stored in this project or in Cloud Storage.
- Every `startWatch` and `stopWatch` call must include `email` and `accessToken`.
- Watches always target the Gmail `INBOX`; labels/filters/IDs are not used.
- The Pub/Sub handler forwards only the `emailAddress` from the incoming Gmail notification to your webhook; it does not fetch or include message contents.

### Webhook signature
- If the `WEBHOOK_SECRET` secret is set, outgoing webhook requests include an `X-Signature` header containing an HMAC-SHA256 hex digest of the JSON payload (the same secret is used for all mailboxes).
- When no secret is provided, the header is omitted and requests are sent unsigned.
- Payload shape: `{ "emailAddress": "<mailbox email from Pub/Sub payload>" }` (only field).

### Starting and stopping watch per mailbox

- Start watch for a mailbox: `POST https://<function-url>/startWatch` with JSON body `{ "email": "...", "accessToken": "..." }`. (`email=all` is not supported.)
- Stop watch for a mailbox: `POST https://<function-url>/stopWatch` with JSON body `{ "email": "...", "accessToken": "..." }`. (`email=all` is not supported.)
- `startWatch` responds with `expiresInMs` (milliseconds until expiration) so the client can schedule the next refresh.
