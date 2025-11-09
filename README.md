# LoL_assistant

## CI/CD deployment

Amplify now runs `scripts/deploy_lambda.sh` after building the React app.  
Set the following environment variables in the Amplify console (per branch/environment) so the script can update the backend Lambda:

- `LAMBDA_FUNCTION_NAME` – the AWS Lambda function that powers `/matches`.
- `AWS_REGION` (optional) – defaults to `us-east-1` if omitted.

The script rebuilds `lambda-website/function.zip` from the vendored Python sources and calls `aws lambda update-function-code --publish`, so every successful build publishes the latest lambda alongside the web assets.
