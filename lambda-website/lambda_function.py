import base64
import json
import os
import requests

# --- Environment variables ---
RIOT_API_KEY = "RGAPI-aea7e856-cbe8-4360-8284-089ac6523857"

# Allowed frontend origins (comma-separated string)
_RAW_ALLOWED_ORIGINS = (os.environ.get("ALLOWED_ORIGINS") or "").strip()
ALLOWED_ORIGINS = ["https://main.dmmttg0yma1yv.amplifyapp.com"]


# ---------- CORS helpers ----------
def _resolve_cors_origin(origin: str | None) -> str:
    if not ALLOWED_ORIGINS:
        return origin or "*"
    if origin and origin in ALLOWED_ORIGINS:
        return origin
    if "*" in ALLOWED_ORIGINS:
        return "*"
    return ALLOWED_ORIGINS[0]


def _build_cors_headers(event: dict) -> dict:
    headers = event.get("headers") or {}
    origin = headers.get("origin") or headers.get("Origin")
    allowed_origin = _resolve_cors_origin(origin)

    return {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowed_origin,
        "Access-Control-Allow-Headers": (
            "Content-Type,Authorization,X-Amz-Date,X-Amz-Security-Token,"
            "x-api-key,X-Api-Key"
        ),
        "Access-Control-Allow-Methods": "OPTIONS,POST",
        "Access-Control-Allow-Credentials": "false",
        "Vary": "Origin",
    }


def _build_response(event: dict, status_code: int, body: dict | str) -> dict:
    return {
        "statusCode": status_code,
        "headers": _build_cors_headers(event),
        "body": json.dumps(body) if not isinstance(body, str) else body,
    }


# ---------- Auth helper ----------
def _require_api_key(event: dict) -> tuple[bool, dict | None]:
    if not CUSTOM_API_KEY:
        return True, None

    headers = event.get("headers") or {}
    provided = headers.get("x-api-key") or headers.get("X-Api-Key")
    if provided != CUSTOM_API_KEY:
        return False, {
            "statusCode": 401,
            "headers": _build_cors_headers(event),
            "body": json.dumps({"error": "Unauthorized"}),
        }
    return True, None


# ---------- Lambda entry ----------
def lambda_handler(event, context):
    method = (
        event.get("httpMethod")
        or event.get("requestContext", {}).get("http", {}).get("method", "")
    ).upper()

    if method == "OPTIONS":
        return {
            "statusCode": 204,
            "headers": _build_cors_headers(event),
            "body": "",
        }

    ok, err = _require_api_key(event)
    if not ok:
        return err

    try:
        raw_body = event.get("body", "{}")
        if event.get("isBase64Encoded"):
            raw_body = base64.b64decode(raw_body).decode("utf-8")

        body = json.loads(raw_body or "{}")

        game_name = (body.get("game_name") or "").strip() or "Faker"
        tag_line = (body.get("tag_line") or "").strip() or "KR1"
        region = (body.get("region") or "ASIA").strip().upper()

        if not RIOT_API_KEY:
            return _build_response(event, 500, {"error": "RIOT_API_KEY not configured"})

        routing = region.lower()

        # Step 1: Get PUUID
        riot_id_url = (
            f"https://{routing}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/"
            f"{requests.utils.quote(game_name, safe='')}/"
            f"{requests.utils.quote(tag_line, safe='')}"
        )
        headers = {"X-Riot-Token": RIOT_API_KEY}

        account_res = requests.get(riot_id_url, headers=headers, timeout=10)
        if account_res.status_code != 200:
            return _build_response(
                event,
                account_res.status_code,
                {"error": "Failed to fetch Riot account", "details": account_res.text},
            )

        puuid = account_res.json().get("puuid")
        if not puuid:
            return _build_response(
                event, 502, {"error": "Missing PUUID in Riot response"}
            )

        # Step 2: Get match history (latest 5)
        match_url = (
            f"https://{routing}.api.riotgames.com/lol/match/v5/matches/by-puuid/"
            f"{puuid}/ids?count=5"
        )
        match_res = requests.get(match_url, headers=headers, timeout=10)
        if match_res.status_code != 200:
            return _build_response(
                event,
                match_res.status_code,
                {"error": "Failed to fetch matches", "details": match_res.text},
            )

        matches = match_res.json() or []

        # Step 3: Return success
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
