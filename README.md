# Gmail Notify (GCP Pub/Sub)

Cloud Functions bundle that turns Gmail push notifications into signed webhook calls. It exposes two HTTP helpers to start/stop Gmail watches and one Pub/Sub triggered function that forwards mailbox events.

## Components
- `modules/functions/startWatch.js` – HTTP POST; calls Gmail `users.watch` for the INBOX label using the provided Gmail OAuth access token and the Pub/Sub topic stored in Secret Manager.
- `modules/functions/stopWatch.js` – HTTP POST; calls Gmail `users.stop` to cancel the watch for the mailbox tied to the provided access token.
- `modules/functions/processMessage.js` – Pub/Sub trigger; reads the email address from the notification payload and POSTs it to the configured webhook with an `X-Signature` HMAC header.

## Secrets and configuration
- `WEBHOOK_URL` and `WEBHOOK_SECRET` – used by `processMessage` to deliver signed webhook notifications.
- `PUBSUB_TOPIC` – full Pub/Sub topic resource name used when starting Gmail watches (e.g. `projects/<project-id>/topics/<topic-name>`).
- Secrets are read from Secret Manager. If your secrets live in a different project, set `SECRET_PROJECT_ID` (otherwise the Cloud Functions project ID is used).

## Local development
```bash
npm install       # install dependencies
npm test          # run Jest tests (none today, but wiring is present)
npm run publish   # bundle functions and produce publish/GNFunc_v<version>.zip
```

## HTTP endpoints
Use POST for both functions. Replace the URL with the HTTPS endpoint of your deployed Cloud Function.

```bash
# Start Gmail watch
curl -X POST https://<region>-<project>.cloudfunctions.net/startWatch \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","accessToken":"ya29...."}'

# Stop Gmail watch
curl -X POST https://<region>-<project>.cloudfunctions.net/stopWatch \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","accessToken":"ya29...."}'
```

## Pub/Sub payload
`processMessage` expects the Gmail push payload (base64 encoded by Pub/Sub). It looks for `emailAddress` (or `email`) and, when present, forwards it to the webhook configured in Secret Manager.

## Deployment
See `DEPLOYMENT.md` for the exact gcloud commands to rebuild the zip and redeploy the three functions.
