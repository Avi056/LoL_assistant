import base64
import json
import os
from collections import Counter
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import requests

try:  # pragma: no cover - optional dependency in local dev
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
except ImportError:  # pragma: no cover - lambda environment provides boto3
    boto3 = None
    BotoCoreError = ClientError = Exception

print("boto3 version:", boto3.__version__)

# --- Environment variables ---
RIOT_API_KEY = os.environ.get("RIOT_API_KEY")
CUSTOM_API_KEY = os.environ.get("CUSTOM_API_KEY")


def _resolve_limit(var_name: str, minimum: int) -> int:
    raw_value = os.environ.get(var_name)
    try:
        parsed = int(raw_value) if raw_value is not None else minimum
    except (TypeError, ValueError):
        parsed = minimum
    return max(minimum, parsed)


MATCH_ID_LIMIT = _resolve_limit("MATCH_ID_LIMIT", 20)
MATCH_DETAIL_LIMIT = _resolve_limit("MATCH_DETAIL_LIMIT", 20)
MATCH_HISTORY_LIMIT = _resolve_limit("MATCH_HISTORY_LIMIT", 20)

DEFAULT_PLATFORM_BY_REGION = {
    "AMERICAS": "na1",
    "EUROPE": "euw1",
    "ASIA": "kr",
}

_RAW_ALLOWED_ORIGINS = (os.environ.get("ALLOWED_ORIGINS") or "").strip()
ALLOWED_ORIGINS = [o.strip() for o in _RAW_ALLOWED_ORIGINS.split(",") if o.strip()]

ENABLE_BEDROCK = (os.environ.get("ENABLE_BEDROCK", "true").lower() not in {"0", "false", "no"})
BEDROCK_MODEL_ID = os.environ.get(
    "BEDROCK_MODEL_ID", "anthropic.claude-3-5-haiku-20241022-v1:0"
)
BEDROCK_REGION = os.environ.get("BEDROCK_REGION", os.environ.get("AWS_REGION", "us-east-1"))

_bedrock_client: Optional["boto3.client"] = None


# ---------- CORS helpers ----------
def _resolve_cors_origin(origin: Optional[str]) -> str:
    if not ALLOWED_ORIGINS:
        return origin or "*"
    if origin and origin in ALLOWED_ORIGINS:
        return origin
    if "*" in ALLOWED_ORIGINS:
        return "*"
    return ALLOWED_ORIGINS[0]


def _build_cors_headers(event: Dict[str, Any]) -> Dict[str, str]:
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


def _build_response(event: Dict[str, Any], status_code: int, body: Any) -> Dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": _build_cors_headers(event),
        "body": json.dumps(body) if not isinstance(body, str) else body,
    }


# ---------- Helpers ----------
def _format_duration(seconds: float) -> str:
    total_seconds = max(0, int(round(seconds)))
    minutes, secs = divmod(total_seconds, 60)
    return f"{minutes}:{secs:02d}"


def _safe_div(numerator: float, denominator: float) -> float:
    return numerator / denominator if denominator else 0.0


def _require_api_key(event: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]]]:
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


def _riot_headers() -> Dict[str, str]:
    if not RIOT_API_KEY:
        raise RuntimeError("RIOT_API_KEY not configured")
    return {"X-Riot-Token": RIOT_API_KEY}


def _riot_get_json(
    url: str,
    *,
    params: Optional[Dict[str, Any]] = None,
    timeout: int = 15,
) -> Dict[str, Any]:
    response = requests.get(url, headers=_riot_headers(), params=params, timeout=timeout)
    if response.status_code != 200:
        raise RuntimeError(
            f"Riot API error {response.status_code} for {url} :: {response.text[:200]}"
        )
    try:
        return response.json()
    except ValueError as exc:  # pragma: no cover - defensive
        raise RuntimeError(f"Invalid JSON from Riot API for {url}") from exc


def _extract_match_entry(match_json: Dict[str, Any], puuid: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    info = match_json.get("info") or {}
    participants: List[Dict[str, Any]] = info.get("participants") or []
    player = next((p for p in participants if p.get("puuid") == puuid), None)
    if not player:
        return None, info.get("platformId")

    duration = info.get("gameDuration") or info.get("gameLength") or 0
    if duration > 40000:  # some legacy matches report ms
        duration = duration / 1000
    duration_minutes = _safe_div(duration, 60)

    total_cs = (player.get("totalMinionsKilled") or 0) + (player.get("neutralMinionsKilled") or 0)
    cs_per_min = _safe_div(total_cs, duration_minutes)
    gold_per_min = _safe_div(player.get("goldEarned", 0), duration_minutes)

    team_id = player.get("teamId")
    team_kills = sum(
        ally.get("kills", 0)
        for ally in participants
        if ally.get("teamId") == team_id
    ) or 1
    kp = _safe_div(player.get("kills", 0) + player.get("assists", 0), team_kills)

    is_remake = duration < 300
    damage_champs = player.get("totalDamageDealtToChampions", 0)
    hero_score = damage_champs / 1000 + player.get("kills", 0) * 2 + kp * 50

    highlight_tag = None
    if (player.get("pentaKills") or 0) > 0:
        highlight_tag = "Penta Threat"
    elif (player.get("largestMultiKill") or 0) >= 4:
        highlight_tag = "Quadra Kill"
    elif kp >= 0.7:
        highlight_tag = "Teamfight Anchor"
    elif player.get("damageDealtToObjectives", 0) > 15000:
        highlight_tag = "Objective Hunter"
    elif player.get("visionScore", 0) >= 40:
        highlight_tag = "Vision Controller"
    else:
        highlight_tag = "Carry Performance"

    entry = {
        "id": info.get("gameId") or match_json.get("metadata", {}).get("matchId"),
        "matchId": match_json.get("metadata", {}).get("matchId"),
        "champion": player.get("championName") or "Unknown",
        "role": player.get("teamPosition") or player.get("individualPosition") or "FLEX",
        "win": bool(player.get("win")),
        "kda_tuple": (
            player.get("kills", 0),
            player.get("deaths", 0),
            player.get("assists", 0),
        ),
        "kda": f"{player.get('kills', 0)} / {player.get('deaths', 0)} / {player.get('assists', 0)}",
        "cs_per_min": cs_per_min,
        "gold_per_min": gold_per_min,
        "objective_damage": player.get("damageDealtToObjectives", 0),
        "vision_score": player.get("visionScore", 0),
        "damage_champs": damage_champs,
        "duration_seconds": duration,
        "duration_label": _format_duration(duration),
        "highlight_tag": highlight_tag,
        "kill_participation": round(kp * 100, 1),
        "queue_id": info.get("queueId"),
        "is_remake": is_remake,
        "hero_score": hero_score,
    }
    return entry, info.get("platformId")


def _build_recap_payload(
    summoner_label: str,
    region_label: str,
    matches: List[Dict[str, Any]],
    league_entries: List[Dict[str, Any]],
    platform_name: Optional[str],
) -> Dict[str, Any]:
    if not matches:
        return {
            "summoner": summoner_label,
            "regionLabel": region_label,
            "winDistribution": [
                {"label": "Wins", "value": 0},
                {"label": "Losses", "value": 0},
                {"label": "Remakes", "value": 0},
            ],
            "kda": {
                "kills": 0,
                "deaths": 0,
                "assists": 0,
                "streak": 0,
                "csPerMin": 0,
                "goldPerMin": 0,
            },
            "matchHistory": [],
            "playstyleTags": ["Data unavailable"],
            "highlightMoments": [],
            "lastGamesCount": 0,
            "trendFocus": f"Waiting on fresh data from {platform_name or region_label}.",
        }

    wins = sum(1 for entry in matches if entry["win"] and not entry["is_remake"])
    losses = sum(1 for entry in matches if not entry["win"] and not entry["is_remake"])
    remakes = sum(1 for entry in matches if entry["is_remake"])

    avg_kills = _safe_div(sum(e["kda_tuple"][0] for e in matches), len(matches))
    avg_deaths = _safe_div(sum(e["kda_tuple"][1] for e in matches), len(matches))
    avg_assists = _safe_div(sum(e["kda_tuple"][2] for e in matches), len(matches))
    avg_cs_min = _safe_div(sum(e["cs_per_min"] for e in matches), len(matches))
    avg_gold_min = _safe_div(sum(e["gold_per_min"] for e in matches), len(matches))

    avg_objective_damage = _safe_div(sum(e["objective_damage"] for e in matches), len(matches))
    avg_vision = _safe_div(sum(e["vision_score"] for e in matches), len(matches))
    avg_kp = _safe_div(sum(e["kill_participation"] for e in matches), len(matches))

    streak = longest = 0
    for entry in matches:
        if entry["win"]:
            streak += 1
            longest = max(longest, streak)
        else:
            streak = 0

    role_counter = Counter(entry["role"] for entry in matches if entry.get("role"))
    top_role = role_counter.most_common(1)[0][0] if role_counter else "Flex"

    playstyle_tags: List[str] = []
    if avg_kills >= 9:
        playstyle_tags.append("Aggressive Marksman")
    if avg_objective_damage >= 12000:
        playstyle_tags.append("Objective Hunter")
    if avg_vision >= 35:
        playstyle_tags.append("Vision Controller")
    if avg_kp >= 65 or avg_assists >= 10:
        playstyle_tags.append("Teamfight Anchor")
    if not playstyle_tags:
        playstyle_tags.append("Reliable Carry")

    recent_matches = matches[:MATCH_HISTORY_LIMIT]
    best_recent_match = max(
        recent_matches,
        key=lambda entry: entry.get("hero_score", float("-inf")),
        default=None,
    )
    best_match_id = (
        (best_recent_match.get("matchId") or best_recent_match.get("id"))
        if best_recent_match
        else None
    )

    match_history = []
    for entry in recent_matches:
        entry_id = entry["matchId"] or entry["id"]
        match_history.append(
            {
                "id": entry_id,
                "champion": entry["champion"],
                "role": entry["role"],
                "result": "Win" if entry["win"] else "Loss",
                "kda": entry["kda"],
                "csPerMin": round(entry["cs_per_min"], 2),
                "damage": f"{round(entry['damage_champs'] / 1000, 1)}k dmg",
                "duration": entry["duration_label"],
                "highlightTag": entry["highlight_tag"],
                "heroScore": round(entry.get("hero_score", 0.0), 2),
                "isBestGame": bool(best_match_id and entry_id == best_match_id),
            }
        )

    highlight_moments = []
    for entry in sorted(matches, key=lambda e: e["hero_score"], reverse=True)[:3]:
        highlight_moments.append(
            {
                "title": entry["highlight_tag"],
                "description": (
                    f"{entry['champion']} went {entry['kda']} with "
                    f"{round(entry['damage_champs'] / 1000, 1)}k damage and "
                    f"{entry['kill_participation']}% KP in {entry['duration_label']}."
                ),
            }
        )

    rank_summary = None
    for entry in league_entries:
        if entry.get("queueType") == "RANKED_SOLO_5x5":
            rank_summary = (
                f"{entry.get('tier', '').title()} {entry.get('rank', '')} "
                f"{entry.get('leaguePoints', 0)} LP "
                f"({entry.get('wins', 0)}W/{entry.get('losses', 0)}L)"
            ).strip()
            break

    trend_focus_bits = [f"{top_role.title()} specialist"]
    if rank_summary:
        trend_focus_bits.append(rank_summary)
    if platform_name:
        trend_focus_bits.append(platform_name)

    return {
        "summoner": summoner_label,
        "regionLabel": region_label,
        "winDistribution": [
            {"label": "Wins", "value": wins},
            {"label": "Losses", "value": losses},
            {"label": "Remakes", "value": remakes},
        ],
        "kda": {
            "kills": round(avg_kills, 1),
            "deaths": round(avg_deaths, 1),
            "assists": round(avg_assists, 1),
            "streak": longest,
            "csPerMin": round(avg_cs_min, 2),
            "goldPerMin": round(avg_gold_min, 2),
        },
        "matchHistory": match_history,
        "playstyleTags": playstyle_tags,
        "highlightMoments": highlight_moments,
        "lastGamesCount": len(matches),
        "trendFocus": " · ".join(trend_focus_bits),
    }


def _build_profile_payload(
    riot_id: str, platform_host: str, summoner_data: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    profile = {
        "riotId": riot_id,
        "platform": platform_host.upper(),
    }
    if not summoner_data:
        return profile

    profile.update(
        {
            "summonerName": summoner_data.get("name"),
            "level": summoner_data.get("summonerLevel"),
            "iconId": summoner_data.get("profileIconId"),
        }
    )

    revision_ms = summoner_data.get("revisionDate")
    if isinstance(revision_ms, (int, float)):
        try:
            profile["lastActiveIso"] = (
                datetime.fromtimestamp(revision_ms / 1000, tz=timezone.utc)
                .isoformat()
                .replace("+00:00", "Z")
            )
        except (OSError, OverflowError, ValueError):
            pass

    return profile


def _simplify_league_entries(entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    simplified: List[Dict[str, Any]] = []
    for entry in entries or []:
        wins = entry.get("wins", 0)
        losses = entry.get("losses", 0)
        total_games = wins + losses
        win_rate = round(_safe_div(wins, total_games) * 100, 1) if total_games else 0.0
        simplified.append(
            {
                "queueType": entry.get("queueType"),
                "tier": entry.get("tier"),
                "rank": entry.get("rank"),
                "leaguePoints": entry.get("leaguePoints"),
                "wins": wins,
                "losses": losses,
                "hotStreak": entry.get("hotStreak"),
                "veteran": entry.get("veteran"),
                "freshBlood": entry.get("freshBlood"),
                "inactive": entry.get("inactive"),
                "miniSeries": entry.get("miniSeries"),
                "winRate": win_rate,
            }
        )
    return simplified


def _pick_locale_content(
    entries: Optional[Any], preferred_locale: str = "en_US"
) -> Optional[str]:
    if not entries:
        return None

    if isinstance(entries, dict):
        entries = [entries]

    for entry in entries:
        if isinstance(entry, dict) and entry.get("locale") == preferred_locale:
            return entry.get("content") or entry.get("translation")

    first = entries[0] if entries else None
    if isinstance(first, dict):
        return first.get("content") or first.get("translation")
    return None


def _simplify_status_entries(entries: Optional[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    simplified: List[Dict[str, Any]] = []
    for entry in entries or []:
        updates = entry.get("updates") or []
        latest_update = updates[0] if updates else {}
        simplified.append(
            {
                "id": entry.get("id"),
                "title": _pick_locale_content(entry.get("titles")),
                "status": entry.get("status"),
                "severity": entry.get("severity"),
                "createdAt": entry.get("created_at"),
                "updatedAt": latest_update.get("updated_at") or entry.get("updated_at"),
                "message": _pick_locale_content(latest_update.get("translations")),
            }
        )
    return simplified


def _build_platform_status_payload(
    status_data: Optional[Dict[str, Any]],
    platform_host: str,
    platform_name: Optional[str],
) -> Dict[str, Any]:
    payload = {
        "name": platform_name or platform_host.upper(),
        "slug": platform_host,
        "locales": status_data.get("locales") if status_data else None,
        "incidents": [],
        "maintenances": [],
    }

    if status_data:
        payload["incidents"] = _simplify_status_entries(status_data.get("incidents"))
        payload["maintenances"] = _simplify_status_entries(status_data.get("maintenances"))

    return payload


def _build_advanced_metrics(matches: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not matches:
        return {}

    total_duration = sum(entry.get("duration_seconds", 0) or 0 for entry in matches)
    avg_duration = _safe_div(total_duration, len(matches))
    total_damage = sum(entry.get("damage_champs", 0) or 0 for entry in matches)
    minutes_played = total_duration / 60 if total_duration else 0
    damage_per_min = _safe_div(total_damage, minutes_played)
    avg_kp = _safe_div(
        sum(entry.get("kill_participation", 0) or 0 for entry in matches), len(matches)
    )
    avg_vision = _safe_div(
        sum(entry.get("vision_score", 0) or 0 for entry in matches), len(matches)
    )
    avg_objective = _safe_div(
        sum(entry.get("objective_damage", 0) or 0 for entry in matches), len(matches)
    )
    objective_focus_rate = _safe_div(
        sum(1 for entry in matches if (entry.get("objective_damage") or 0) >= 15000),
        len(matches),
    )
    vision_control_rate = _safe_div(
        sum(1 for entry in matches if (entry.get("vision_score") or 0) >= 40),
        len(matches),
    )

    champ_counter = Counter(entry.get("champion") or "Unknown" for entry in matches)
    role_counter = Counter(entry.get("role") or "FLEX" for entry in matches)
    clutch_game = max(matches, key=lambda entry: entry.get("hero_score", 0), default=None)

    return {
        "avgGameDurationLabel": _format_duration(avg_duration),
        "avgGameDurationMinutes": round(_safe_div(avg_duration, 60), 1),
        "damagePerMinute": round(damage_per_min, 1),
        "killParticipation": round(avg_kp, 1),
        "visionScore": round(avg_vision, 1),
        "objectiveDamage": round(avg_objective),
        "objectiveFocusRate": round(objective_focus_rate * 100, 1),
        "visionControlRate": round(vision_control_rate * 100, 1),
        "championPool": [
            {"champion": champ, "count": count}
            for champ, count in champ_counter.most_common(5)
        ],
        "roleDistribution": [
            {"role": role, "count": count}
            for role, count in role_counter.most_common(5)
        ],
        "clutchGame": {
            "champion": clutch_game["champion"],
            "matchId": clutch_game.get("matchId") or clutch_game.get("id"),
            "kda": clutch_game["kda"],
            "highlight": clutch_game["highlight_tag"],
            "killParticipation": clutch_game["kill_participation"],
        }
        if clutch_game
        else None,
    }


def _build_ai_stats_context(
    recap_payload: Dict[str, Any],
    profile_payload: Optional[Dict[str, Any]],
    league_payload: List[Dict[str, Any]],
    platform_payload: Optional[Dict[str, Any]],
    advanced_metrics: Optional[Dict[str, Any]],
    matches: List[Dict[str, Any]],
) -> Dict[str, Any]:
    return {
        "recap": recap_payload,
        "profile": profile_payload,
        "leagueSummary": league_payload,
        "platformStatus": platform_payload,
        "advancedMetrics": advanced_metrics,
        "matches": matches,
    }


def _get_bedrock_client():
    """Return or initialize a Bedrock client using boto3."""
    global _bedrock_client
    if _bedrock_client is None and ENABLE_BEDROCK and boto3:
        _bedrock_client = boto3.client(
            service_name="bedrock-runtime",
            region_name=BEDROCK_REGION,
        )
    return _bedrock_client


def _render_bedrock_content(response_json: Dict[str, Any]) -> str:
    """Extract text output from various Bedrock/Anthropic model formats."""
    # New Claude format (v2024+)
    if isinstance(response_json, dict):
        if "content" in response_json and isinstance(response_json["content"], list):
            parts = []
            for item in response_json["content"]:
                if isinstance(item, dict) and "text" in item:
                    parts.append(item["text"])
            if parts:
                return "".join(parts).strip()

        # Older Anthropic or fallback
        if "output_text" in response_json:
            return response_json["output_text"].strip()
        if "completion" in response_json:
            return response_json["completion"].strip()
        if "message" in response_json:
            return str(response_json["message"]).strip()

    # Default fallback
    return str(response_json).strip()

def _generate_ai_feedback(stats_context: Dict[str, Any]) -> Dict[str, Any]:
    """Generate AI feedback using Amazon Bedrock + Anthropic Claude (robust version)."""

    print("🟦 Entered _generate_ai_feedback()")

    if not ENABLE_BEDROCK:
        print("❌ Bedrock disabled via config.")
        return {"message": "", "modelId": None, "error": "Amazon Bedrock integration disabled."}

    if not boto3:
        print("❌ boto3 not available in environment.")
        return {"message": "", "modelId": BEDROCK_MODEL_ID, "error": "boto3 not available."}

    if not stats_context:
        print("⚠️  No stats provided for AI feedback.")
        return {"message": "", "modelId": BEDROCK_MODEL_ID, "error": "Empty stats context."}

    try:
        bedrock = _get_bedrock_client()
        if bedrock is None:
            raise RuntimeError("Unable to initialize Bedrock client.")
        print("✅ Bedrock client initialized successfully.")

        # Build prompt
        stats_json = json.dumps(stats_context, ensure_ascii=False, indent=2)
        prompt = (
            "I am going to give you some LoL stats in JSON format."
            "Roast me very very hard like penguinz0. Maybe sprinkle in a little bit of feedback."
            "Make it around 10 sentence in one format and tone. Short and sweet, no intro just straight roasting."
            "All stats do not need to be covered. Roast me very very hard with obscure metaphors. Put in emojis."
            "\n\n"
            f"Stats JSON:\n{stats_json}"
        )

        # Anthropic payload
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 600,
            "temperature": 0.6,
            "top_k": 250,
            "top_p": 1,
            "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}],
        }

        response = bedrock.invoke_model(
            modelId=BEDROCK_MODEL_ID,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(body),
        )

        # Read response body
        raw_body = response.get("body")
        if hasattr(raw_body, "read"):
            raw_body = raw_body.read()

        payload = json.loads(raw_body)
        print("🧩 Bedrock response preview:", json.dumps(payload, indent=2)[:600])

        # Use robust renderer
        message = _render_bedrock_content(payload)

        if not message:
            print("⚠️  Bedrock returned empty message.")
            return {"message": "", "modelId": BEDROCK_MODEL_ID, "error": "Bedrock returned no content."}

        print("✅ Final message extracted:", message[:400] + " ...")
        return {"message": message.strip(), "modelId": BEDROCK_MODEL_ID, "error": None}

    except Exception as e:
        print("❌ Exception during Bedrock call:", repr(e))
        return {"message": "", "modelId": BEDROCK_MODEL_ID, "error": str(e)}


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

        if body.get("mode") == "ai-feedback":
            stats_context = body.get("stats") or {}
            ai_feedback = _generate_ai_feedback(stats_context)
            return _build_response(event, 200, {"aiFeedback": ai_feedback})

        game_name = (body.get("game_name") or "").strip() or "Faker"
        tag_line = (body.get("tag_line") or "").strip() or "KR1"
        region = (body.get("region") or "ASIA").strip().upper()
        region_label = region

        if not RIOT_API_KEY:
            return _build_response(event, 500, {"error": "RIOT_API_KEY not configured"})

        routing = region.lower()

        # Step 1: Get PUUID
        riot_id_url = (
            f"https://{routing}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/"
            f"{requests.utils.quote(game_name, safe='')}/"
            f"{requests.utils.quote(tag_line, safe='')}"
        )
        account_data = _riot_get_json(riot_id_url)
        puuid = account_data.get("puuid")
        if not puuid:
            return _build_response(event, 502, {"error": "Missing PUUID in Riot response"})

        # Step 2: Get match IDs
        match_url = (
            f"https://{routing}.api.riotgames.com/lol/match/v5/matches/by-puuid/"
            f"{puuid}/ids"
        )
        desired_window = max(MATCH_DETAIL_LIMIT, MATCH_ID_LIMIT)
        id_fetch_target = min(100, max(desired_window * 2, desired_window))
        match_ids = _riot_get_json(
            match_url, params={"count": id_fetch_target}
        ) or []
        trimmed_match_ids = match_ids[:MATCH_ID_LIMIT]

        # Step 3: Fetch match details for recap
        detailed_entries: List[Dict[str, Any]] = []
        platform_host: Optional[str] = None
        for match_id in match_ids:
            detail_url = (
                f"https://{routing}.api.riotgames.com/lol/match/v5/matches/{match_id}"
            )
            try:
                detail_json = _riot_get_json(detail_url)
            except RuntimeError:
                continue
            entry, platform_id = _extract_match_entry(detail_json, puuid)
            if not entry:
                continue
            detailed_entries.append(entry)
            if not platform_host and platform_id:
                platform_host = platform_id.lower()
            if len(detailed_entries) >= MATCH_DETAIL_LIMIT:
                break

        if not detailed_entries:
            return _build_response(
                event,
                404,
                {"error": "No recent match details available for this Riot ID."},
            )

        platform_host = platform_host or DEFAULT_PLATFORM_BY_REGION.get(region, "na1")

        # Step 4: Enriched data (Summoner + League + Status)
        summoner_data: Optional[Dict[str, Any]] = None
        league_entries: List[Dict[str, Any]] = []
        platform_name = None
        status_data: Optional[Dict[str, Any]] = None
        try:
            summoner_url = (
                f"https://{platform_host}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{puuid}"
            )
            summoner_data = _riot_get_json(summoner_url)
            encrypted_id = summoner_data.get("id")
            if encrypted_id:
                league_url = (
                    f"https://{platform_host}.api.riotgames.com/lol/league/v4/entries/by-summoner/{encrypted_id}"
                )
                league_entries = _riot_get_json(league_url) or []
        except RuntimeError:
            league_entries = []

        try:
            status_url = f"https://{platform_host}.api.riotgames.com/lol/status/v4/platform-data"
            status_data = _riot_get_json(status_url)
            platform_name = status_data.get("name")
        except RuntimeError:
            platform_name = platform_host.upper()
            status_data = None

        recap_payload = _build_recap_payload(
            f"{game_name}#{tag_line}",
            region_label,
            detailed_entries,
            league_entries,
            platform_name,
        )
        profile_payload = _build_profile_payload(
            f"{game_name}#{tag_line}",
            platform_host,
            summoner_data,
        )
        league_payload = _simplify_league_entries(league_entries)
        platform_payload = _build_platform_status_payload(
            status_data,
            platform_host,
            platform_name,
        )
        advanced_metrics = _build_advanced_metrics(detailed_entries)

        stats_context = _build_ai_stats_context(
            recap_payload,
            profile_payload,
            league_payload,
            platform_payload,
            advanced_metrics,
            detailed_entries,
        )
        return _build_response(
            event,
            200,
            {
                "summoner": recap_payload["summoner"],
                "region": region,
                "matches": trimmed_match_ids,
                "recap": recap_payload,
                "profile": profile_payload,
                "leagueSummary": league_payload,
                "platformStatus": platform_payload,
                "advancedMetrics": advanced_metrics,
                "aiStatsContext": stats_context,
                "limits": {
                    "matchIdLimit": MATCH_ID_LIMIT,
                    "matchDetailLimit": MATCH_DETAIL_LIMIT,
                    "matchHistoryLimit": MATCH_HISTORY_LIMIT,
                    "idFetchWindow": id_fetch_target,
                    "idsReturned": len(match_ids),
                    "detailedMatches": len(detailed_entries),
                },
            },
        )


    except requests.RequestException as request_error:
        return _build_response(
            event,
            502,
            {"error": "Failed to contact Riot API", "details": str(request_error)},
        )
    except RuntimeError as runtime_error:
        return _build_response(event, 502, {"error": str(runtime_error)})
    except Exception as exc:  # pragma: no cover - defensive
        return _build_response(event, 500, {"error": str(exc)})
