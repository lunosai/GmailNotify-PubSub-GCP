# Redeploying the Cloud Functions

These commands assume the GCP project, Pub/Sub topic, and Secret Manager entries are already in place. Adjust the runtime/region to match your existing deployment.

## 1) Set helpful environment variables
```bash
PROJECT_ID=dashboard-472020
RUNTIME=nodejs22
TOPIC=gmail-notify
SA=595367417037-compute@developer.gserviceaccount.com
```

## 2) Build the deployment zip
```bash
npm install
npm run publish
```

## 3) Deploy the Pub/Sub triggered function
```bash
gcloud functions deploy processMessage \
  --gen2 \
  --runtime=$RUNTIME \
  --source=. \
  --entry-point=processMessage \
  --trigger-topic=$TOPIC \
  --service-account=$SA
```

## 4) Deploy startWatch & stopWatch
```bash
# Start Gmail watch
gcloud functions deploy startWatch \
    --gen2 \
    --runtime=$RUNTIME \
    --source=. \
    --entry-point=startWatch \
    --trigger-http \
    --service-account=$SA

# Stop Gmail watch
gcloud functions deploy stopWatch \
    --gen2 \
    --runtime=$RUNTIME \
    --source=. \
    --entry-point=stopWatch \
    --trigger-http \
    --service-account=$SA
```

## 5) Roles
Ensure these roles are enabled to the Service Account to allow it to build, deploy, and invoke Cloud Functions:
- Secret Manager Secret Accessor
- Cloud Run Invoker
- Cloud Build Service Account

## 6) Quick verification
- Confirm the upload: `gcloud functions describe processMessage --project "$PROJECT_ID"` (repeat for the HTTP functions).
- Send a POST to `startWatch` with a valid Gmail OAuth access token to ensure a watch is created.
- Publish a test message to the Pub/Sub topic and confirm the webhook receives a signed payload.
