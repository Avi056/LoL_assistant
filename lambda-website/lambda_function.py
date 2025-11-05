import base64
import json
import os

import requests

# Optional: store your Riot API key in Lambda environment variable
RIOT_API_KEY = os.environ.get("RIOT_API_KEY", "RGAPI-aea7e856-cbe8-4360-8284-089ac6523857")


def _build_cors_headers(event):
    """Generate CORS headers, reflecting the caller origin when available."""
    headers = event.get("headers") or {}
    origin = headers.get("origin") or headers.get("Origin") or "*"

    return {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
        "Access-Control-Allow-Credentials": "false",
    }


def _build_response(event, status_code, body):
    return {
        "statusCode": status_code,
        "headers": _build_cors_headers(event),
        "body": json.dumps(body),
    }


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
    cors_headers = _build_cors_headers(event)

    # Handle CORS preflight requests for both REST (v1) and HTTP (v2) API Gateway
    method = (
        event.get("httpMethod")
        or event.get("requestContext", {}).get("http", {}).get("method")
        or ""
    ).upper()

    if method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": "",
        }

    try:
        raw_body = event.get("body", "{}")
        if event.get("isBase64Encoded"):
            raw_body = base64.b64decode(raw_body).decode("utf-8")

        body = json.loads(raw_body or "{}")

        game_name = body.get("game_name", "Faker")
        tag_line = body.get("tag_line", "KR1")
        region = body.get("region", "ASIA")

        # Step 1: Get PUUID (player unique ID)
        riot_id_url = f"https://{region.lower()}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}"
        headers = {"X-Riot-Token": RIOT_API_KEY}
        account_res = requests.get(riot_id_url, headers=headers)

        if account_res.status_code != 200:
            return _build_response(
                event,
                account_res.status_code,
                {
                    "error": "Failed to fetch Riot account",
                    "details": account_res.text,
                },
            )

        puuid = account_res.json()["puuid"]

        # Step 2: Get match history
        match_url = f"https://{region.lower()}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids?count=5"
        match_res = requests.get(match_url, headers=headers)

        if match_res.status_code != 200:
            return _build_response(
                event,
                match_res.status_code,
                {
                    "error": "Failed to fetch matches",
                    "details": match_res.text,
                },
            )

        matches = match_res.json()

        # Step 3: Return formatted response
        return _build_response(
            event,
            200,
            {
                "summoner": f"{game_name}#{tag_line}",
                "region": region,
                "matches": matches,
            },
        )

    except requests.RequestException as request_error:
        return _build_response(
            event,
            502,
            {"error": "Failed to contact Riot API", "details": str(request_error)},
        )

    except Exception as e:
        return _build_response(event, 500, {"error": str(e)})
