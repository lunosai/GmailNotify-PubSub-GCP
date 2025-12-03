# Redeploying the Cloud Functions

These commands assume the GCP project, Pub/Sub topic, and Secret Manager entries are already in place. Adjust the runtime/region to match your existing deployment.

## 1) Set helpful environment variables
```bash
PROJECT_ID=<your-project-id>
REGION=us-central1
RUNTIME=nodejs18         # match the runtime currently in use
TOPIC=gmail-notify       # topic name without the projects/<id>/topics/ prefix
AUTH_FLAG=--no-allow-unauthenticated   # use --allow-unauthenticated if you expose the HTTP endpoints publicly
```

## 2) Build the deployment zip
```bash
npm ci          # or npm install
npm run publish
ZIP_PATH=$(ls publish/GNFunc_v*.zip | sort | tail -1)
```

## 3) Deploy the Pub/Sub triggered function
Add `--set-env-vars SECRET_PROJECT_ID="$SECRET_PROJECT_ID"` if your secrets are kept in a different project.
```bash
gcloud functions deploy processMessage \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --runtime="$RUNTIME" \
  --entry-point=processMessage \
  --source="$ZIP_PATH" \
  --trigger-topic="$TOPIC"
```

## 4) Deploy the HTTP helpers
```bash
# Start Gmail watch
gcloud functions deploy startWatch \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --runtime="$RUNTIME" \
  --entry-point=startWatch \
  --source="$ZIP_PATH" \
  --trigger-http $AUTH_FLAG

# Stop Gmail watch
gcloud functions deploy stopWatch \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --runtime="$RUNTIME" \
  --entry-point=stopWatch \
  --source="$ZIP_PATH" \
  --trigger-http $AUTH_FLAG
```

## 5) Quick verification
- Confirm the upload: `gcloud functions describe processMessage --project "$PROJECT_ID" --region "$REGION"` (repeat for the HTTP functions).
- Send a POST to `startWatch` with a valid Gmail OAuth access token to ensure a watch is created.
- Publish a test message to the Pub/Sub topic and confirm the webhook receives a signed payload.
