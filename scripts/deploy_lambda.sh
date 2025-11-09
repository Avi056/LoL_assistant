#!/usr/bin/env bash

# Rebuilds lambda-website/function.zip and updates the target Lambda function.
# Requires AWS credentials plus LAMBDA_FUNCTION_NAME (and optional AWS_REGION) in the env.

set -euo pipefail

if [[ -z "${LAMBDA_FUNCTION_NAME:-}" ]]; then
  echo "❌ LAMBDA_FUNCTION_NAME environment variable is required." >&2
  exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "❌ AWS CLI not found in PATH. Install it in the build image before running this script." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LAMBDA_DIR="$ROOT_DIR/lambda-website"
ZIP_PATH="$LAMBDA_DIR/function.zip"
AWS_REGION="${AWS_REGION:-us-east-1}"

if [[ ! -d "$LAMBDA_DIR" ]]; then
  echo "❌ Lambda directory '$LAMBDA_DIR' not found." >&2
  exit 1
fi

pushd "$LAMBDA_DIR" >/dev/null

echo "🧹 Cleaning previous lambda package…"
rm -f "$ZIP_PATH"

shopt -s nullglob
ARTIFACTS=(lambda_function.py certifi* charset_normalizer* idna* requests* urllib3*)
shopt -u nullglob

if [[ ${#ARTIFACTS[@]} -eq 0 ]]; then
  echo "❌ No artifacts found to package. Check lambda-website contents." >&2
  exit 1
fi

echo "📦 Packaging lambda sources (${ARTIFACTS[*]}) into function.zip…"
zip -r "$ZIP_PATH" "${ARTIFACTS[@]}" >/dev/null

echo "🚀 Updating Lambda function '$LAMBDA_FUNCTION_NAME' in region '$AWS_REGION'…"
aws lambda update-function-code \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --zip-file "fileb://$ZIP_PATH" \
  --region "$AWS_REGION" \
  --publish

echo "✅ Lambda function updated successfully."

popd >/dev/null
