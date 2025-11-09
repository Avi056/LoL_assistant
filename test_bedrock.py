import boto3
import json

# Set up the Amazon Bedrock client
bedrock_client = boto3.client(
    service_name="bedrock-runtime",
    region_name="us-east-1"
)

# Define the model ID
model_id = "anthropic.claude-3-sonnet-20240229-v1:0"

# Prepare the input prompt
prompt = "Hello, how are you?"

# Create the request payload
payload = {
    "anthropic_version": "bedrock-2023-05-31",
    "max_tokens": 2048,
    "temperature": 0.9,
    "top_k": 250,
    "top_p": 1,
    "messages": [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": prompt
                }
            ]
        }
    ]
}

# Invoke the Amazon Bedrock model
response = bedrock_client.invoke_model(
    modelId=model_id,
    body=json.dumps(payload)
)

# Process the response
result = json.loads(response["body"].read())
generated_text = "".join([output["text"] for output in result["content"]])
print(f"Response: {generated_text}")