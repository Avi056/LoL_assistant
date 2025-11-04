import json
from lambda_function import lambda_handler

# Simulate an API Gateway event
event = {
    "body": json.dumps({
        "game_name": "Faker",
        "tag_line": "KR1",
        "region": "ASIA"
    })
}

# Call the lambda handler
response = lambda_handler(event, None)

# Print the result
print(json.dumps(response, indent=2))
