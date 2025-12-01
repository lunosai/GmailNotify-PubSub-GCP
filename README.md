# Project for Push Notifications to Webhooks

## Introduction
**GmailNotify** This is a quick project made to consume Pub-Sub messages sent via Gmail to be processed and finally execute a Webhook for external services to receive a push of email data. It now supports multiple Gmail mailboxes in a single deployment.

It is in essense a set of NodeJS Cloud Functions to handle Gmail Notifications which can be configured to receive wide range of Gmail notifications based on the `config/appconfig.json` file setting.

## Technologies Used
* NodeJS v14
* google-cloud/pubsub v0.18.0
* google-cloud/storage v5.14.0
* googleapis v85.0.0
* phin v3.6.0

## Google Cloud Resources Used
* Cloud Functions
* Cloud Storage
* Pub/Sub

> These are just the primary resources, other supporting resources are also used but mainly for networking, security and permissions.

## Code Structure
The code is structured for clean and simple implementation as well as maintenance.

### Primary Folder's Explanation
* `/config` - contains the `appconfig.json` file (renamed from `sample-appconfig.json` template file) after putting in the values.
* `/credentials` - contains the `google-key.json` file (renamed from `sample-google-key.json` template file) after replacing the content from the actual json key file download from Google Cloud Platform.
* `/modules` - contains the individual modules `*.js` files.
* `/modules/functions` - contains the core Cloud Functions in their respective `*.js` files.
* `/tests` - contains all the JEST test files used to perform checks and validation on the functionality of the application locally, before deploying the Cloud Functions.

## Compiling
There are scripts already part of the `package.json` file to publish the project into the `/publish` directory and zip the output with the project name and version (from `package.json.version` property) for quick upload and deployment of Cloud Functions.

**Publish Command**
```
npm run publish
```
> Don't forget to rename the `sample-*.json` files in `/config` and `/credentials` folder as required (see below section **Basic Application Configuration**).

Publish outputs to a zip file
```
/publish/GNFunc_v{version}.zip
```

**Run all tests**
```
npm run test
```

## Google Cloud Setup
### Create a Cloud Storage
### Create Cloud Functions
## Functional Flow
The Cloud Function is deployed so that it starts the code in the `/main.js` file (which is renamed to `/index.js` on publish) and executes the assigned Cloud Function Entry Point.
## Google Cloud Credentials
To get the Google Cloud Credentials, you need to complete the following steps on your Google Cloud Platform account.

## Basic Application Configuration
You must have the Google Cloud Credentials `.json` file as well as have created the Cloud Storage, before you configure the application.

### Rules
While entering values for the application config, please keep in mind the following.

1. `gcp.storage.*` - any folder name property (like `gcp.storage.rootFolderName` or `gcp.storage.debugFolderName`, etc.) must end with a `/` (forward slash) if a value is provided.
2. `gcp.storage.historyFilename` - property must have a filename ending with `.json` file extension.
3. `gcp.auth.googleKeyFilePath` - property must have a file path ending with a filename that has the `.json` file extension.
4. `mailboxes[].email` - must be the full valid email address of each Gmail account you want to receive push notifications from. (`gcp.auth.subject` remains as an optional single-mailbox fallback.)
5. `gmail` - property object is based on the **Gmail API** and more information on the appropriate values for this properties can be found in the [Gmail API Reference](https://developers.google.com/gmail/api/reference/rest).

### Minimum Configuration
For you to quickly deploy this application, you only need to provide the following configuration

**For `/config/sample-appconfig.json` file.**

1. `external.webhookUrl` - a full qualified URL to an external service that accepts an `Post` request with the body
    ```
    { emailAddress: 'mailbox@example.com' }
    ```
   - Optional: set `external.webhookSecret` if you want outgoing notifications to include an `X-Signature` HMAC of the JSON payload (applied to all mailboxes).
2. `gcp.pubsub.topic` - the full topic name as provided in the Cloud Pub/Sub Dashboard.
3. `gcp.storage.bucketName` - the full bucket name as provided in the Cloud Storage Dashboard.
4. `mailboxes` - configure at least one mailbox entry (see below).

**For `/credentials/sample-google-key.json` file.**
1. Simply replace the content of this sample file with the content from your download `.json` cloud key file.

### Rename Config & Credentials Files

* Rename the `sample-google-key.json` file to `google-key.json` file.

* Rename the `sample-appconfig.json` file to `appconfig.json` file.

### Multi-mailbox configuration

Use the `mailboxes` array in `appconfig.json` to register each Gmail account you want to monitor. Each mailbox can override labels, webhook target, and storage folder.

```
{
  "mailboxes": [
    {
      "id": "primary",
      "email": "you@example.com",
      "labelIds": ["UNREAD"],
      "filterAction": "include",
      "storage": {
        "folderName": "primary/"
      }
    },
    {
      "id": "support",
      "email": "support@example.com",
      "labelIds": ["UNREAD", "IMPORTANT"],
      "filterAction": "include",
      "storage": {
        "folderName": "support/"
      }
    }
  ]
}
```

- If you omit `mailboxes`, the app will fall back to the legacy single-mailbox values (`gcp.auth.subject`, `gmail.labelsIds`, `gmail.filterAction`, and `external.webhookUrl`).
- Webhook destination and signature secret come from `external.*` and apply to every mailbox.
- Storage settings remain for compatibility, but when forwarding only `emailAddress` the function no longer writes history/debug/email payloads to Cloud Storage.
- The Pub/Sub handler forwards only the `emailAddress` from the incoming Gmail notification to your webhook; it does not fetch or include message contents.

### Webhook signature
- If `external.webhookSecret` is set, outgoing webhook requests include an `X-Signature` header containing an HMAC-SHA256 hex digest of the JSON payload (the same secret is used for all mailboxes).
- When no secret is provided, the header is omitted and requests are sent unsigned.
- Payload shape: `{ "emailAddress": "<mailbox email from Pub/Sub payload>" }` (only field).

### Starting and stopping watch per mailbox

- Start watch for one mailbox: `GET https://<function-url>/startWatch?email=you@example.com`
- Start watch for all configured mailboxes: `GET https://<function-url>/startWatch?email=all` (or omit the parameter to start all).
- Stop watch for one mailbox: `GET https://<function-url>/stopWatch?email=support@example.com`
- Stop watch for all configured mailboxes: `GET https://<function-url>/stopWatch?email=all` (or omit the parameter to stop all).

The `email` parameter accepts:
- **Email address** (e.g., `you@example.com`) - searches by email first
- **Mailbox ID** (e.g., `primary`, `support`) - fallback if email not found
- **`all`** - applies to all configured mailboxes
