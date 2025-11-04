import json
import os
import requests

# Optional: store your Riot API key in Lambda environment variable
RIOT_API_KEY = os.environ.get("RIOT_API_KEY", "RGAPI-aea7e856-cbe8-4360-8284-089ac6523857")

def lambda_handler(event, context):
    """
    AWS Lambda handler function.
    Expects JSON input like:
    {
        "game_name": "Faker",
        "tag_line": "KR1",
        "region": "ASIA"
    }
    """
    try:
        body = json.loads(event.get("body", "{}"))

        game_name = body.get("game_name", "Faker")
        tag_line = body.get("tag_line", "KR1")
        region = body.get("region", "ASIA")

        # Step 1: Get PUUID (player unique ID)
        riot_id_url = f"https://{region.lower()}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}"
        headers = {"X-Riot-Token": RIOT_API_KEY}
        account_res = requests.get(riot_id_url, headers=headers)

        if account_res.status_code != 200:
            return {
                "statusCode": account_res.status_code,
                "body": json.dumps({"error": "Failed to fetch Riot account", "details": account_res.text})
            }

        puuid = account_res.json()["puuid"]

        # Step 2: Get match history
        match_url = f"https://{region.lower()}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids?count=5"
        match_res = requests.get(match_url, headers=headers)

        if match_res.status_code != 200:
            return {
                "statusCode": match_res.status_code,
                "body": json.dumps({"error": "Failed to fetch matches", "details": match_res.text})
            }

        matches = match_res.json()

        # Step 3: Return formatted response
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "summoner": f"{game_name}#{tag_line}",
                "region": region,
                "matches": matches
            })
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
