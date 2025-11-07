import base64
import json
import requests

# --- Hard-coded configuration ---
RIOT_API_KEY = "RGAPI-aea7e856-cbe8-4360-8284-089ac6523857"   # your actual Riot key here
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
            "content-type,Content-Type,authorization,Authorization,"
            "X-Amz-Date,X-Amz-Security-Token,x-api-key,X-Api-Key"
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
        "isBase64Encoded": False,
    }


# ---------- Lambda entry ----------
def lambda_handler(event, context):
    # Detect method (works for HTTP API v2 or REST v1)
    method = (
        (event.get("requestContext") or {}).get("http", {}).get("method")
        or event.get("httpMethod")
        or (event.get("requestContext") or {}).get("httpMethod")
        or ""
    ).upper()
    route_key = (event.get("routeKey") or "").upper()

    # ---- Preflight ----
    if method == "OPTIONS" or route_key.startswith("OPTIONS "):
        return {
            "statusCode": 204,
            "headers": _build_cors_headers(event),
            "body": "",
            "isBase64Encoded": False,
        }

    # ---- Main request ----
    try:
        raw_body = event.get("body", "{}")
        if event.get("isBase64Encoded"):
            raw_body = base64.b64decode(raw_body).decode("utf-8")

        body = json.loads(raw_body or "{}")

        game_name = (body.get("game_name") or "").strip() or "Faker"
        tag_line = (body.get("tag_line") or "").strip() or "KR1"
        region = (body.get("region") or "ASIA").strip().upper()
        routing = region.lower()

        if not RIOT_API_KEY:
            return _build_response(event, 500, {"error": "RIOT_API_KEY not configured"})

        # Step 1 – Get PUUID
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
            return _build_response(event, 502, {"error": "Missing PUUID in Riot response"})

        # Step 2 – Get match IDs
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

        # Step 3 – Return success
        return _build_response(
            event,
            200,
            {"summoner": f"{game_name}#{tag_line}", "region": region, "matches": matches},
        )

    except requests.RequestException as re:
        return _build_response(
            event, 502, {"error": "Failed to contact Riot API", "details": str(re)}
        )
    except Exception as e:
        return _build_response(event, 500, {"error": str(e)})
