import boto3
import json

REGION = "us-east-1"
MODEL_ID = "anthropic.claude-haiku-4-5-20251001-v1:0"
# MODEL_ID = "meta.llama4-maverick-17b-instruct-v1:0"

# Use the runtime client
client = boto3.client("bedrock-runtime", region_name=REGION)

prompt = "Write a short poem about a dragon learning to code in Python."

body = {
    "inputText": prompt,
    "maxTokensToSample": 100,
    "temperature": 0.7
}

try:
    response = client.invoke_model(
        modelId=MODEL_ID,
        body=json.dumps(body),
        contentType="application/json",
        accept="application/json"
    )

    # Claude returns a 'content' list
    response_json = json.loads(response["body"].read())
    generated_text = ""
    for item in response_json.get("content", []):
        if item.get("type") == "text":
            generated_text += item.get("text", "")

    print("=== Generated Output ===")
    print(generated_text)

except Exception as e:
    print("Error calling Bedrock:", e)
