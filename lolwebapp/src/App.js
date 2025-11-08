import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import introImage from "./assets/1568742297124374.jpeg";

const REGION_OPTIONS = [
  { value: "ASIA", label: "Asia", description: "KR, JP, OCE, PH, SG" },
  { value: "AMERICAS", label: "Americas", description: "NA, BR, LAN, LAS" },
  { value: "EUROPE", label: "Europe", description: "EUW, EUNE, TR, RU" },
];

const APP_SHARE_URL = "https://main.d4ccg2oosnodu.amplifyapp.com";
const DATA_DRAGON_VERSION = "14.24.1";

const SAMPLE_RECAP = {
  winDistribution: [
    { label: "Wins", value: 21 },
    { label: "Losses", value: 7 },
    { label: "Remakes", value: 1 },
  ],
  kda: {
    kills: 10.2,
    deaths: 3.2,
    assists: 12.9,
    streak: 8,
    csPerMin: 7.6,
    goldPerMin: 438,
  },
  matchHistory: [
    {
      id: "NA1-5234509821",
      champion: "Ashe",
      role: "Bot",
      result: "Win",
      kda: "13 / 1 / 16",
      csPerMin: 8.2,
      damage: "33.4k dmg",
      duration: "31:08",
      highlightTag: "Quadra kill",
    },
    {
      id: "NA1-5234402719",
      champion: "Kai'Sa",
      role: "Bot",
      result: "Win",
      kda: "9 / 2 / 10",
      csPerMin: 7.9,
      damage: "28.4k dmg",
      duration: "29:42",
      highlightTag: "Clutch steal",
    },
    {
      id: "NA1-5234301184",
      champion: "Caitlyn",
      role: "Bot",
      result: "Loss",
      kda: "6 / 5 / 7",
      csPerMin: 7.1,
      damage: "24.6k dmg",
      duration: "34:05",
      highlightTag: "Siege expert",
    },
    {
      id: "NA1-5234205617",
      champion: "Aphelios",
      role: "Bot",
      result: "Win",
      kda: "11 / 2 / 12",
      csPerMin: 7.4,
      damage: "30.1k dmg",
      duration: "28:56",
      highlightTag: "Baron flip",
    },
    {
      id: "NA1-5234100032",
      champion: "Jhin",
      role: "Bot",
      result: "Win",
      kda: "10 / 3 / 11",
      csPerMin: 6.8,
      damage: "25.1k dmg",
      duration: "31:11",
      highlightTag: "Ace closer",
    },
  ],
  playstyleTags: [
    "Aggressive Marksman",
    "Objective Hunter",
    "Vision Controller",
    "Teamfight Anchor",
  ],
  highlightMoments: [
    {
      title: "Arrow that flipped the Baron fight",
      description:
        "28:45 — Crystal Arrow snipes the enemy jungler, turning a 4v5 Baron into a clean ace.",
    },
    {
      title: "Perfect vision lockdown",
      description:
        "Averaged 5.4 control wards per game, denying 73% of enemy ward placements around objectives.",
    },
    {
      title: "Impeccable kiting finish",
      description:
        "Final Elder stand showcased flawless kiting with two resets and a secure objective.",
    },
  ],
  lastGamesCount: 10,
  trendFocus: "Plays for late-game teamfights",
};

const SAMPLE_PROFILE = {
  riotId: "Summoner#TAG",
  platform: "NA1",
  level: 512,
  iconId: 588,
  lastActiveIso: "2024-11-15T18:22:00Z",
};

const SAMPLE_LEAGUE = [
  {
    queueType: "RANKED_SOLO_5x5",
    tier: "MASTER",
    rank: "I",
    leaguePoints: 266,
    wins: 110,
    losses: 92,
    winRate: 54.4,
    hotStreak: true,
  },
  {
    queueType: "RANKED_FLEX_SR",
    tier: "GRANDMASTER",
    rank: "I",
    leaguePoints: 121,
    wins: 72,
    losses: 41,
    winRate: 63.7,
  },
];

const SAMPLE_STATUS = {
  name: "Sample Region",
  slug: "na1",
  incidents: [],
  maintenances: [],
};

const SAMPLE_ADVANCED = {
  avgGameDurationLabel: "31:42",
  avgGameDurationMinutes: 31.7,
  damagePerMinute: 712.5,
  killParticipation: 68.6,
  visionScore: 34.1,
  objectiveDamage: 15420,
  objectiveFocusRate: 66.7,
  visionControlRate: 53.1,
  championPool: [
    { champion: "Ashe", count: 6 },
    { champion: "Jhin", count: 3 },
    { champion: "Kai'Sa", count: 2 },
  ],
  roleDistribution: [
    { role: "BOTTOM", count: 7 },
    { role: "UTILITY", count: 3 },
  ],
  clutchGame: {
    champion: "Ashe",
    matchId: "NA1-5234509821",
    kda: "13 / 1 / 16",
    highlight: "Quadra Kill",
    killParticipation: 82.5,
  },
};

const createRecapData = ({ summoner, regionLabel }) => ({
  summoner,
  regionLabel,
  winDistribution: SAMPLE_RECAP.winDistribution.map((segment) => ({
    ...segment,
  })),
  kda: { ...SAMPLE_RECAP.kda },
  matchHistory: SAMPLE_RECAP.matchHistory.map((match) => ({ ...match })),
  playstyleTags: [...SAMPLE_RECAP.playstyleTags],
  highlightMoments: SAMPLE_RECAP.highlightMoments.map((moment) => ({
    ...moment,
  })),
  lastGamesCount: SAMPLE_RECAP.lastGamesCount,
  trendFocus: SAMPLE_RECAP.trendFocus,
});

const buildShareSummary = (recap, winRate, kdaRatio) => {
  const wins =
    recap.winDistribution.find((segment) => segment.label === "Wins")?.value ??
    0;
  const losses =
    recap.winDistribution.find((segment) => segment.label === "Losses")
      ?.value ?? 0;
  const topMatch = recap.matchHistory[0];
  const signaturePlay =
    recap.highlightMoments[0]?.title || "Clutch plays across the Rift";

  const matchLine = topMatch
    ? `${topMatch.result} as ${topMatch.champion} (${topMatch.kda})`
    : "Stacking victories across the Rift";

  return [
    `🎮 ${recap.summoner}'s Riot Rift Recap`,
    `📊 ${wins}W / ${losses}L (${winRate.toFixed(1)}% WR)`,
    `⚔️ ${kdaRatio.toFixed(2)} KDA · ${recap.kda.csPerMin} CS/min · ${recap.kda.goldPerMin} GPM`,
    `🎯 Focus: ${recap.trendFocus}`,
    `✨ Highlight: ${signaturePlay}`,
    "",
    `${matchLine}`,
    "",
    "📡 Data pulled directly from Riot APIs.",
    `Check yours: ${APP_SHARE_URL}`,
  ].join("\n");
};

const buildAiNarrative = (recap, winRate, kdaRatio) => {
  const favoriteChamp = recap.matchHistory[0]?.champion ?? "their mains";
  const streak = recap.kda.streak;
  const standoutMoments = recap.highlightMoments
    .map((moment) => `• ${moment.title} — ${moment.description}`)
    .join("\n");
  const tags = recap.playstyleTags.join(" · ");

  return `✨ ${recap.summoner}'s Rift Wrapped ✨

Across ${recap.lastGamesCount} games in ${recap.regionLabel}, ${
    recap.summoner
  } logged a ${winRate}% win rate while averaging a ${kdaRatio}:1 KDA. The longest win streak hit ${
    streak
  } games, fueled by ${favoriteChamp} and razor-sharp late game instincts.

Playstyle remix: ${tags}.

Standout moments:
${standoutMoments}

Live data straight from Riot endpoints keeps the receipts. Queue up and write the next chapter. 🗡️`;
};

const copyTextToClipboard = async (text) => {
  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}

  try {
    if (typeof document === "undefined") return false;
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "absolute";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    return true;
  } catch {
    return false;
  }
};

const buildProfileIconUrl = (iconId) =>
  iconId
    ? `https://ddragon.leagueoflegends.com/cdn/${DATA_DRAGON_VERSION}/img/profileicon/${iconId}.png`
    : null;

const formatQueueLabel = (queueType = "") => {
  if (queueType.includes("SOLO")) return "Ranked Solo/Duo";
  if (queueType.includes("FLEX")) return "Ranked Flex";
  if (queueType.includes("TFT")) return "TFT";
  return queueType.replace(/_/g, " ").toLowerCase();
};

const formatDateLabel = (isoString) => {
  if (!isoString) return null;
  try {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
};

function App() {
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [region, setRegion] = useState(REGION_OPTIONS[0].value);
  const [view, setView] = useState("form");
  const [recapData, setRecapData] = useState(() =>
    createRecapData({
      summoner: "Summoner#TAG",
      regionLabel: REGION_OPTIONS[0].label,
    })
  );
  const [showIntro, setShowIntro] = useState(true);
  const [animateApp, setAnimateApp] = useState(false);
  const [shareFeedback, setShareFeedback] = useState("");
  const [recapNarrative, setRecapNarrative] = useState("");
  const [isGeneratingRecap, setIsGeneratingRecap] = useState(false);
  const [matches, setMatches] = useState([]);
  const [summonerLabel, setSummonerLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState("");
  const [profileInsight, setProfileInsight] = useState(null);
  const [leagueInsight, setLeagueInsight] = useState([]);
  const [statusInsight, setStatusInsight] = useState(null);
  const [advancedInsight, setAdvancedInsight] = useState(null);
  const [hasLiveInsights, setHasLiveInsights] = useState(false);
  const copyTimeoutRef = useRef(null);

  useEffect(() => {
    const introTimer = setTimeout(() => {
      setShowIntro(false);
      setAnimateApp(true);
    }, 3000);
    return () => clearTimeout(introTimer);
  }, []);

  useEffect(() => {
    if (!animateApp) return;
    const animationTimer = setTimeout(() => setAnimateApp(false), 700);
    return () => clearTimeout(animationTimer);
  }, [animateApp]);

  useEffect(() => {
    if (!shareFeedback) return;
    const timer = setTimeout(() => setShareFeedback(""), 2600);
    return () => clearTimeout(timer);
  }, [shareFeedback]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const regionDetails = useMemo(
    () => REGION_OPTIONS.find((option) => option.value === region),
    [region]
  );

  const totalGames = recapData.winDistribution.reduce(
    (acc, segment) => acc + segment.value,
    0
  );
  const winsSegment = recapData.winDistribution.find(
    (segment) => segment.label === "Wins"
  );
  const lossesSegment = recapData.winDistribution.find(
    (segment) => segment.label === "Losses"
  );
  const winRate = totalGames
    ? Math.round(((winsSegment?.value ?? 0) / totalGames) * 100)
    : 0;
  const kdaRatio = (
    (recapData.kda.kills + recapData.kda.assists) /
    Math.max(1, recapData.kda.deaths)
  ).toFixed(2);
  const shareSummary = useMemo(
    () => buildShareSummary(recapData, winRate, Number(kdaRatio)),
    [recapData, winRate, kdaRatio]
  );

  const resolvedProfile =
    profileInsight || (!hasLiveInsights ? SAMPLE_PROFILE : null);
  const resolvedLeague =
    hasLiveInsights && leagueInsight.length === 0
      ? []
      : leagueInsight.length
      ? leagueInsight
      : SAMPLE_LEAGUE;
  const resolvedStatus =
    statusInsight || (!hasLiveInsights ? SAMPLE_STATUS : null);
  const resolvedAdvanced =
    advancedInsight || (!hasLiveInsights ? SAMPLE_ADVANCED : null);

  const profileIconUrl = useMemo(
    () => buildProfileIconUrl(resolvedProfile?.iconId),
    [resolvedProfile]
  );

  const displayedLeague = resolvedLeague || [];
  const soloQueueEntry = displayedLeague.find(
    (entry) => entry.queueType === "RANKED_SOLO_5x5"
  );
  const anchorRank = soloQueueEntry || displayedLeague[0];
  const rankLabel = anchorRank
    ? `${anchorRank.tier} ${anchorRank.rank} · ${anchorRank.leaguePoints} LP`
    : "Unranked";
  const rankQueueLabel = anchorRank
    ? formatQueueLabel(anchorRank.queueType)
    : "Ranked ladder";
  const rankRecord = anchorRank
    ? `${anchorRank.wins}W / ${anchorRank.losses}L (${anchorRank.winRate}% WR)`
    : "Play a ranked game to surface ladder data.";

  const statusIncident = resolvedStatus?.incidents?.[0];
  const statusMaintenance = resolvedStatus?.maintenances?.[0];
  const statusMessage =
    statusIncident?.message ||
    statusIncident?.title ||
    statusMaintenance?.message ||
    statusMaintenance?.title ||
    "No active incidents reported.";

  const championPool = resolvedAdvanced?.championPool ?? [];
  const roleDistribution = resolvedAdvanced?.roleDistribution ?? [];
  const clutchGame = resolvedAdvanced?.clutchGame;
  const matchHistoryEntries = recapData.matchHistory || [];
  const highlightEntries = recapData.highlightMoments || [];
  const playstyleTags = recapData.playstyleTags || [];
  const primaryHighlight = highlightEntries[0];
  const lastActiveLabel = formatDateLabel(resolvedProfile?.lastActiveIso);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedName = gameName.trim();
    const trimmedTag = tagLine.trim();
    if (!trimmedName || !trimmedTag) return;

    const regionLabel = regionDetails?.label ?? region;

    setLoading(true);
    setError(null);
    setMatches([]);
    setSummonerLabel("");
    setCopyFeedback("");

    try {
      const API_URL =
        "https://fiauf5t7o7.execute-api.us-east-1.amazonaws.com/InitialStage/matches";

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_name: trimmedName,
          tag_line: trimmedTag,
          region,
        }),
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch {}

      if (!response.ok) {
        const message =
          payload?.error ||
          `Request failed with status ${response.status}. Please try again.`;
        throw new Error(message);
      }

      if (!payload?.matches?.length) {
        setSummonerLabel(payload?.summoner || `${trimmedName}#${trimmedTag}`);
        setError("No matches found for this Riot ID.");
        return;
      }

      setMatches(payload.matches || []);
      const resolvedSummoner =
        payload.summoner ?? `${trimmedName}#${trimmedTag}`;
      setSummonerLabel(resolvedSummoner);

      if (payload.recap) {
        setRecapData({
          ...payload.recap,
          summoner: payload.recap.summoner || resolvedSummoner,
          regionLabel: payload.recap.regionLabel || regionLabel,
          winDistribution:
            payload.recap.winDistribution || SAMPLE_RECAP.winDistribution,
          kda: {
            ...SAMPLE_RECAP.kda,
            ...(payload.recap.kda || {}),
          },
          matchHistory: payload.recap.matchHistory || [],
          playstyleTags: payload.recap.playstyleTags || [],
          highlightMoments: payload.recap.highlightMoments || [],
          lastGamesCount: payload.recap.lastGamesCount ?? 0,
          trendFocus: payload.recap.trendFocus || SAMPLE_RECAP.trendFocus,
        });
      } else {
        setRecapData(
          createRecapData({
            summoner: resolvedSummoner,
            regionLabel,
          })
        );
      }

      setProfileInsight(payload.profile ?? null);
      setLeagueInsight(payload.leagueSummary ?? []);
      setStatusInsight(payload.platformStatus ?? null);
      setAdvancedInsight(payload.advancedMetrics ?? null);
      setHasLiveInsights(true);
      setRecapNarrative("");
      setView("recap");
      setAnimateApp(true);
    } catch (requestError) {
      console.error(requestError);
      setError(
        requestError?.message ||
          "Something went wrong while fetching matches."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLookup = () => {
    setView("form");
    setAnimateApp(true);
  };

  const handleShare = async (platform) => {
    if (typeof window === "undefined") return;

    const encodedSummary = encodeURIComponent(shareSummary);
    const encodedTitle = encodeURIComponent(
      `${recapData.summoner} — ${recapData.regionLabel} recap`
    );

    switch (platform) {
      case "twitter":
        window.open(
          `https://twitter.com/intent/tweet?text=${encodedSummary}`,
          "_blank",
          "noopener,noreferrer"
        );
        setShareFeedback("Opened a ready-to-post Tweet in a new tab.");
        break;
      case "reddit":
        window.open(
          `https://www.reddit.com/submit?title=${encodedTitle}&text=${encodedSummary}`,
          "_blank",
          "noopener,noreferrer"
        );
        setShareFeedback("Reddit share drafted in a new tab.");
        break;
      case "discord":
        {
          const copied = await copyTextToClipboard(shareSummary);
          if (copied) {
            setShareFeedback(
              "Recap copied. Paste it into your next Discord chat."
            );
          } else {
            setShareFeedback(
              "Copy failed. Please copy manually before posting to Discord."
            );
          }
          window.open(
            "https://discord.com/channels/@me",
            "_blank",
            "noopener,noreferrer"
          );
        }
        break;
      case "copy":
        {
          const copied = await copyTextToClipboard(shareSummary);
          setShareFeedback(
            copied
              ? "Recap copied to clipboard."
              : "Copy failed. Please copy manually."
          );
        }
        break;
      default:
        break;
    }
  };

  const handleGenerateRecap = () => {
    if (isGeneratingRecap) return;
    setIsGeneratingRecap(true);

    setTimeout(() => {
      setRecapNarrative(buildAiNarrative(recapData, winRate, Number(kdaRatio)));
      setIsGeneratingRecap(false);
    }, 1400);
  };

  const handleCopy = async (matchId) => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    const copied = await copyTextToClipboard(matchId);
    setCopyFeedback(
      copied ? `Copied ${matchId}` : "Copy failed. Please copy manually."
    );
    copyTimeoutRef.current = setTimeout(() => setCopyFeedback(""), 2000);
  };

  return (
    <div className="app-shell">
      {showIntro && (
        <div className="intro-screen">
          <img
            className="intro-screen__image"
            src={introImage}
            alt="Loading splash art"
          />
        </div>
      )}

      {!showIntro && (
        <div className={`app ${animateApp ? "app--enter" : ""}`}>
          {view === "form" ? (
            <main className="card card--compact">
              <div className="card__header">
                <h1 className="title">League of Legends Match Explorer</h1>
                <p className="subtitle">
                  Lock in your Riot ID and region to pull match history, account,
                  league, and platform-status data directly from the Riot API
                  stack. Every stat on the recap is sourced from those live
                  endpoints.
                </p>
              </div>

              <form className="form" onSubmit={handleSubmit}>
                <div className="field-group">
                  <label className="field-label" htmlFor="riot-name">
                    Riot ID
                  </label>
                  <div className="riot-id">
                    <input
                      id="riot-name"
                      type="text"
                      placeholder="Summoner (e.g. Faker)"
                      value={gameName}
                      onChange={(event) => setGameName(event.target.value)}
                      required
                    />
                    <span className="riot-id__separator">#</span>
                    <input
                      id="riot-tag"
                      type="text"
                      placeholder="Tag (e.g. KR1)"
                      value={tagLine}
                      onChange={(event) => setTagLine(event.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="region">
                    Region
                  </label>
                  <div className="select-wrapper">
                    <select
                      id="region"
                      value={region}
                      onChange={(event) => setRegion(event.target.value)}
                    >
                      {REGION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label} · {option.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? "Fetching matches…" : "Fetch matches"}
                  </button>
                </div>
              </form>
              {error && <div className="alert alert--error">{error}</div>}
            </main>
          ) : (
            <section className="recap">
              <article className="ai-card ai-card--top">
                <header className="ai-card__header">
                  <h2>AI headline</h2>
                  <p>
                    Generate a Spotify Wrapped-style voiceover rooted in the
                    same Riot match, summoner, league, and status endpoints used
                    for the dashboard.
                  </p>
                </header>
                <textarea
                  className="ai-card__textarea"
                  rows={8}
                  value={recapNarrative}
                  placeholder="Tap Generate Recap to create your personalized narrative."
                  onChange={(event) => setRecapNarrative(event.target.value)}
                />
                <div className="ai-card__actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleGenerateRecap}
                    disabled={isGeneratingRecap}
                  >
                    {isGeneratingRecap ? "Summoning recap…" : "Generate Recap"}
                  </button>
                  <span className="ai-card__hint">
                    Pulls in the same stats that power the rest of the data
                    screen.
                  </span>
                </div>
              </article>

              <div className="recap__banner">
                <div>
                  <p className="recap__eyebrow">Personalized recap</p>
                  <h1 className="recap__title">{recapData.summoner}</h1>
                  <p className="recap__meta">
                    {recapData.regionLabel} · Last {recapData.lastGamesCount}{" "}
                    games
                  </p>
                </div>
                <div className="banner__actions">
                  <span
                    className={`data-chip ${
                      hasLiveInsights ? "data-chip--live" : "data-chip--sample"
                    }`}
                  >
                    {hasLiveInsights ? "Live Riot data" : "Sample preview"}
                  </span>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={handleBackToLookup}
                  >
                    Back to lookup
                  </button>
                </div>
              </div>

              <div className="data-hero">
                <article className="insight-card identity-card">
                  <div className="identity-card__header">
                    <div className="identity-card__avatar">
                      {profileIconUrl ? (
                        <img src={profileIconUrl} alt="Summoner icon" />
                      ) : (
                        <span>
                          {recapData.summoner?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="recap__eyebrow">Live account snapshot</p>
                      <h2>{recapData.summoner}</h2>
                      <p className="identity-card__meta">
                        Level {resolvedProfile?.level ?? "—"} ·{" "}
                        {resolvedProfile?.platform || recapData.regionLabel}
                      </p>
                    </div>
                  </div>
                  <div className="identity-card__stats">
                    <div>
                      <span>Win rate</span>
                      <strong>{winRate}%</strong>
                    </div>
                    <div>
                      <span>KDA</span>
                      <strong>{kdaRatio}:1</strong>
                    </div>
                    <div>
                      <span>Avg game</span>
                      <strong>
                        {resolvedAdvanced?.avgGameDurationLabel || "—"}
                      </strong>
                    </div>
                  </div>
                  <div className="identity-card__footer">
                    <div className="rank-chip">
                      <span>{rankQueueLabel}</span>
                      <p>{rankLabel}</p>
                      <small>{rankRecord}</small>
                    </div>
                    {lastActiveLabel && (
                      <span className="identity-card__activity">
                        Last active · {lastActiveLabel}
                      </span>
                    )}
                  </div>
                </article>

                <article className="insight-card momentum-card">
                  <header className="insight-card__header">
                    <h3>Momentum tracker</h3>
                    <span>
                      {winsSegment?.value ?? 0}W · {lossesSegment?.value ?? 0}L ·{" "}
                      {recapData.winDistribution.find(
                        (segment) => segment.label === "Remakes"
                      )?.value ?? 0}
                      R
                    </span>
                  </header>
                  <div className="win-bar win-bar--compact">
                    {recapData.winDistribution.map((segment) => (
                      <span
                        key={segment.label}
                        className={`win-bar__segment win-bar__segment--${segment.label.toLowerCase()}`}
                        style={{
                          width: totalGames
                            ? `${Math.max(
                                6,
                                (segment.value / totalGames) * 100
                              )}%`
                            : "0%",
                        }}
                      />
                    ))}
                  </div>
                  <ul className="insight-list">
                    <li>
                      <span>Avg duration</span>
                      <strong>
                        {resolvedAdvanced?.avgGameDurationLabel || "—"}
                      </strong>
                    </li>
                    <li>
                      <span>Damage / min</span>
                      <strong>
                        {resolvedAdvanced?.damagePerMinute
                          ? `${resolvedAdvanced.damagePerMinute}`
                          : "—"}
                      </strong>
                    </li>
                    <li>
                      <span>Kill participation</span>
                      <strong>
                        {resolvedAdvanced?.killParticipation
                          ? `${resolvedAdvanced.killParticipation}%`
                          : "—"}
                      </strong>
                    </li>
                  </ul>
                </article>

                <article className="insight-card status-card">
                  <header className="insight-card__header">
                    <h3>Platform status</h3>
                    <span>{resolvedStatus?.name || recapData.regionLabel}</span>
                  </header>
                  <p className="status-card__message">{statusMessage}</p>
                  <div className="status-card__tags">
                    <span className="pill">
                      Incidents {resolvedStatus?.incidents?.length ?? 0}
                    </span>
                    <span className="pill">
                      Maintenances {resolvedStatus?.maintenances?.length ?? 0}
                    </span>
                  </div>
                </article>
              </div>

              <div className="stat-grid stat-grid--expanded">
                <article className="stat-card">
                  <header className="stat-card__header">
                    <h2>KDA breakdown</h2>
                    <span className="stat-card__sub">
                      Average {kdaRatio}:1 across recent games
                    </span>
                  </header>
                  <div className="kda-grid">
                    <div>
                      <span>Kills</span>
                      <strong>{recapData.kda.kills}</strong>
                    </div>
                    <div>
                      <span>Deaths</span>
                      <strong>{recapData.kda.deaths}</strong>
                    </div>
                    <div>
                      <span>Assists</span>
                      <strong>{recapData.kda.assists}</strong>
                    </div>
                  </div>
                  <div className="stat-chips">
                    <span className="accent-chip">
                      Longest streak: {recapData.kda.streak}
                    </span>
                    <span className="accent-chip">
                      CS / min: {recapData.kda.csPerMin}
                    </span>
                    <span className="accent-chip">
                      Gold / min: {recapData.kda.goldPerMin}
                    </span>
                  </div>
                </article>

                <article className="stat-card stat-card--macro">
                  <header className="stat-card__header">
                    <h2>Macro & vision</h2>
                    <span className="stat-card__sub">
                      Data from match-v5 participant stats
                    </span>
                  </header>
                  <ul className="insight-list insight-list--two-col">
                    <li>
                      <span>Objective damage</span>
                      <strong>
                        {resolvedAdvanced?.objectiveDamage
                          ? `${resolvedAdvanced.objectiveDamage.toLocaleString()}`
                          : "—"}
                      </strong>
                    </li>
                    <li>
                      <span>Vision score</span>
                      <strong>
                        {resolvedAdvanced?.visionScore
                          ? resolvedAdvanced.visionScore
                          : "—"}
                      </strong>
                    </li>
                    <li>
                      <span>Obj focus rate</span>
                      <strong>
                        {resolvedAdvanced?.objectiveFocusRate
                          ? `${resolvedAdvanced.objectiveFocusRate}%`
                          : "—"}
                      </strong>
                    </li>
                    <li>
                      <span>Vision control rate</span>
                      <strong>
                        {resolvedAdvanced?.visionControlRate
                          ? `${resolvedAdvanced.visionControlRate}%`
                          : "—"}
                      </strong>
                    </li>
                  </ul>
                  <p className="stat-card__note">
                    Objective rate counts games with 15k+ objective damage, while
                    vision rate tracks 40+ vision score games.
                  </p>
                </article>

                <article className="stat-card stat-card--tags">
                  <header className="stat-card__header">
                    <h2>Playstyle tags</h2>
                    <span className="stat-card__sub">{recapData.trendFocus}</span>
                  </header>
                  <div className="pill-row">
                    {playstyleTags.map((tag) => (
                      <span key={tag} className="pill">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="stat-card__note">
                    Tags refresh every pull to mirror how the Riot endpoints see
                    your macro, tempo, and late-game presence.
                  </p>
                </article>
              </div>

              <div className="insight-grid insight-grid--split">
                <article className="history-card">
                  <header className="history-card__header">
                    <h2>Match history</h2>
                    <span>Last {recapData.lastGamesCount} games</span>
                  </header>
                  {matchHistoryEntries.length > 0 ? (
                    <ul className="history-list">
                      {matchHistoryEntries.map((match) => (
                        <li key={match.id} className="history-item">
                          <div className="history-item__top">
                            <span
                              className={`history-item__result history-item__result--${match.result.toLowerCase()}`}
                            >
                              {match.result}
                            </span>
                            <span className="history-item__id">{match.id}</span>
                          </div>
                          <div className="history-item__row">
                            <span className="history-item__champion">
                              {match.champion} · {match.role}
                            </span>
                            <span className="history-item__kda">
                              {match.kda} KDA
                            </span>
                          </div>
                          <div className="history-item__row history-item__row--meta">
                            <span>{match.damage}</span>
                            <span>{match.csPerMin} CS / min</span>
                            <span>{match.duration}</span>
                          </div>
                          {match.highlightTag && (
                            <span className="history-item__badge">
                              {match.highlightTag}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="empty-state">
                      No match history available yet. Fetch matches to populate
                      this recap.
                    </p>
                  )}
                </article>

                <article className="moments-card moments-card--clutch">
                  <header className="moments-card__header">
                    <h2>Highlight moments</h2>
                    <span>
                      {clutchGame
                        ? `Clutch: ${clutchGame.champion} (${clutchGame.kda})`
                        : "Season-defining plays"}
                    </span>
                  </header>
                  {clutchGame && (
                    <div className="clutch-card">
                      <div>
                        <p className="clutch-card__label">Highest hero score</p>
                        <h3>{clutchGame.champion}</h3>
                        <p className="clutch-card__meta">
                          {clutchGame.kda} · {clutchGame.killParticipation}% KP
                        </p>
                      </div>
                      <div className="clutch-card__tags">
                        <span className="pill">{clutchGame.highlight}</span>
                        <span className="pill">{clutchGame.matchId}</span>
                      </div>
                    </div>
                  )}
                  {highlightEntries.length > 0 ? (
                    <ul className="highlight-list">
                      {highlightEntries.map((moment, index) => (
                        <li key={moment.title || index} className="highlight-item">
                          <span className="highlight-item__index">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <div className="highlight-item__body">
                            <h3>{moment.title}</h3>
                            <p>{moment.description}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="empty-state">
                      Highlight moments will appear once we have detailed match
                      data.
                    </p>
                  )}
                </article>
              </div>

              <article className="champion-card insight-card">
                <header className="insight-card__header">
                  <h3>Champion & role mix</h3>
                  <span>Top pulls from the match endpoints</span>
                </header>
                <div className="champion-card__body">
                  <div>
                    <h4>Most played champs</h4>
                    {championPool.length > 0 ? (
                      <ul className="mini-list">
                        {championPool.map((entry) => (
                          <li key={entry.champion}>
                            <span>{entry.champion}</span>
                            <strong>{entry.count} games</strong>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="empty-state">No champion data yet.</p>
                    )}
                  </div>
                  <div>
                    <h4>Role distribution</h4>
                    {roleDistribution.length > 0 ? (
                      <ul className="mini-list">
                        {roleDistribution.map((entry) => (
                          <li key={entry.role}>
                            <span>{entry.role}</span>
                            <strong>{entry.count}</strong>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="empty-state">No role data yet.</p>
                    )}
                  </div>
                </div>
              </article>

              <aside className="share-card">
                <div>
                  <h2>Share your recap</h2>
                  <p>
                    Spotlight your climb with ready-to-post captions for X,
                    Discord, or Reddit, complete with standout stats sourced
                    directly from Riot&apos;s data feeds.
                  </p>
                </div>
                <div className="share-card__actions">
                  <div className="share-card__buttons">
                    <button
                      type="button"
                      className="share-button share-button--twitter"
                      onClick={() => handleShare("twitter")}
                    >
                      Tweet recap
                    </button>
                    <button
                      type="button"
                      className="share-button share-button--discord"
                      onClick={() => handleShare("discord")}
                    >
                      Share on Discord
                    </button>
                    <button
                      type="button"
                      className="share-button share-button--reddit"
                      onClick={() => handleShare("reddit")}
                    >
                      Share to Reddit
                    </button>
                    <button
                      type="button"
                      className="share-button share-button--copy"
                      onClick={() => handleShare("copy")}
                    >
                      Copy recap
                    </button>
                  </div>
                  {shareFeedback && (
                    <p className="share-card__feedback">{shareFeedback}</p>
                  )}
                  <div className="share-card__meta">
                    <span className="social-pill">#LeagueOfLegends</span>
                    <span className="social-pill">#LiveRiotData</span>
                  </div>
                </div>
              </aside>

              <div className="matches">
                <div className="matches__header">
                  <h2>Live match IDs</h2>
                  {summonerLabel && (
                    <p className="matches__meta">
                      Pulled from match-v5 for{" "}
                      <strong>{summonerLabel}</strong>
                    </p>
                  )}
                </div>

                {matches.length > 0 ? (
                  <ul className="matches__grid">
                    {matches.map((matchId, index) => (
                      <li key={matchId} className="match-card">
                        <div className="match-card__content">
                          <span className="match-card__index">#{index + 1}</span>
                          <p className="match-card__id">{matchId}</p>
                        </div>
                        <button
                          type="button"
                          className="match-card__action"
                          onClick={() => handleCopy(matchId)}
                        >
                          Copy ID
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-state">
                    Fetch matches to populate live IDs from the Riot API.
                  </p>
                )}

                {copyFeedback && (
                  <div className="alert alert--success">{copyFeedback}</div>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
