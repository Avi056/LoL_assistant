import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const REGION_OPTIONS = [
  { value: "ASIA", label: "Asia", description: "KR, JP, OCE, PH, SG" },
  { value: "AMERICAS", label: "Americas", description: "NA, BR, LAN, LAS" },
  { value: "EUROPE", label: "Europe", description: "EUW, EUNE, TR, RU" },
];

const APP_SHARE_URL = "https://main.d4ccg2oosnodu.amplifyapp.com";

const buildShareSummary = (recap, winRate, kdaRatio) => {
  if (!recap) {
    return [
      "🎮 LoL Assistant Recap",
      "No recap data yet. Fetch matches to generate a shareable summary.",
      `Check yours: ${APP_SHARE_URL}`,
    ].join("\n");
  }

  const winDistribution = recap.winDistribution || [];
  const wins = winDistribution.find((segment) => segment.label === "Wins")?.value ?? 0;
  const losses =
    winDistribution.find((segment) => segment.label === "Losses")?.value ?? 0;
  const topMatch = recap.matchHistory?.[0];
  const signaturePlay =
    recap.highlightMoments?.[0]?.title || "Leaving unforgettable plays on the Rift";

  const matchLine = topMatch
    ? `${topMatch.result} as ${topMatch.champion} (${topMatch.kda})`
    : "Stacking victories across the Rift";

  return [
    `🎮 ${recap.summoner}'s LoL Assistant Recap`,
    `📊 ${wins}W / ${losses}L (${winRate.toFixed(1)}% WR)`,
    `⚔️ ${kdaRatio} KDA`,
    `✨ Top moment: ${signaturePlay}`,
    "",
    `${matchLine}`,
    "",
    "🚀 Analyzed with AI insights!",
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
  } locked in a ${winRate}% win rate while averaging a ${kdaRatio}:1 KDA. The longest win streak hit ${
    streak
  } games, fueled by ${favoriteChamp} and razor-sharp late game instincts.

Playstyle remix: ${tags}.

Standout moments:
${standoutMoments}

Keep the energy high, queue up, and let the next chapter drop. 🎶🗡️`;
};

const getChampionSigil = (championName = "") => {
  if (!championName) return "LOL";
  const cleaned = championName.replace(/[^a-zA-Z]/g, "");
  if (!cleaned) return "LOL";
  return cleaned.slice(0, 3).toUpperCase();
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

function App() {
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [region, setRegion] = useState(REGION_OPTIONS[0].value);
  const [view, setView] = useState("form");
  const [recapData, setRecapData] = useState(null);
  const [introStage, setIntroStage] = useState("enter");
  const [animateApp, setAnimateApp] = useState(false);
  const [shareFeedback, setShareFeedback] = useState("");
  const [recapNarrative, setRecapNarrative] = useState("");
  const [isGeneratingRecap, setIsGeneratingRecap] = useState(false);
  const [matches, setMatches] = useState([]);
  const [summonerLabel, setSummonerLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState("");
  const copyTimeoutRef = useRef(null);
  useEffect(() => {
    const fadeTimer = setTimeout(() => setIntroStage("exit"), 2600);
    const endTimer = setTimeout(() => {
      setIntroStage("hidden");
      setAnimateApp(true);
    }, 4000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(endTimer);
    };
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

  const winDistribution = recapData?.winDistribution || [];
  const totalGames = winDistribution.reduce((acc, segment) => acc + segment.value, 0);
  const winsSegment = winDistribution.find((segment) => segment.label === "Wins");
  const winRate = totalGames
    ? Math.round(((winsSegment?.value ?? 0) / totalGames) * 100)
    : 0;

  const kda = recapData?.kda || {
    kills: 0,
    deaths: 0,
    assists: 0,
    streak: 0,
    csPerMin: 0,
    goldPerMin: 0,
  };
  const kdaRatio =
    (kda.kills || kda.assists || kda.deaths
      ? (
          (Number(kda.kills) + Number(kda.assists)) /
          Math.max(1, Number(kda.deaths))
        ).toFixed(2)
      : "0.00");

  const shareSummary = useMemo(
    () => buildShareSummary(recapData, winRate, Number(kdaRatio)),
    [recapData, winRate, kdaRatio]
  );

  const matchHistoryEntries = recapData?.matchHistory || [];
  const highlightEntries = recapData?.highlightMoments || [];
  const playstyleTags = recapData?.playstyleTags || [];
  const primaryHighlight = highlightEntries[0];
  const topChampion = matchHistoryEntries[0]?.champion;
  const featuredRoles = useMemo(() => {
    const roles = matchHistoryEntries
      .map((match) => match.role)
      .filter((role) => typeof role === "string" && role.trim().length > 0);
    return Array.from(new Set(roles));
  }, [matchHistoryEntries]);
  const runeFocusLabel = useMemo(() => {
    const focus = playstyleTags.slice(0, 3);
    if (!focus.length) return "Awaiting scouting report";
    return focus.join(" · ");
  }, [playstyleTags]);
  const crestHue = useMemo(() => {
    if (!topChampion) return 218;
    const base = topChampion
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return base % 360;
  }, [topChampion]);
  const storyBackdropStyle = { "--story-hue": crestHue };

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
      const resolvedSummoner = payload.summoner ?? `${trimmedName}#${trimmedTag}`;
      setSummonerLabel(resolvedSummoner);

      if (!payload.recap) {
        throw new Error("Recap data unavailable for this Riot ID. Try again shortly.");
      }

      const recapPayload = payload.recap;
      setRecapData({
        ...recapPayload,
        summoner: recapPayload.summoner || resolvedSummoner,
        regionLabel: recapPayload.regionLabel || regionLabel,
        winDistribution: recapPayload.winDistribution || [],
        kda: {
          kills: recapPayload.kda?.kills ?? 0,
          deaths: recapPayload.kda?.deaths ?? 0,
          assists: recapPayload.kda?.assists ?? 0,
          streak: recapPayload.kda?.streak ?? 0,
          csPerMin: recapPayload.kda?.csPerMin ?? 0,
          goldPerMin: recapPayload.kda?.goldPerMin ?? 0,
        },
        matchHistory: recapPayload.matchHistory || [],
        playstyleTags: recapPayload.playstyleTags || [],
        highlightMoments: recapPayload.highlightMoments || [],
        lastGamesCount: recapPayload.lastGamesCount ?? payload.matches.length,
        trendFocus: recapPayload.trendFocus || "Live data in progress",
      });
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
          window.open("https://discord.com/channels/@me", "_blank", "noopener,noreferrer");
        }
        break;
      case "copy":
        {
          const copied = await copyTextToClipboard(shareSummary);
          setShareFeedback(
            copied ? "Recap copied to clipboard." : "Copy failed. Please copy manually."
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

  const introVisible = introStage !== "hidden";

  return (
    <div className="app-shell">
      {introVisible && (
        <div className={`intro-screen intro-screen--${introStage}`}>
          <div className="intro-screen__backdrop">
            <span className="intro-screen__halo" />
            <span className="intro-screen__flare intro-screen__flare--one" />
            <span className="intro-screen__flare intro-screen__flare--two" />
            <span className="intro-screen__sigil intro-screen__sigil--outer" />
            <span className="intro-screen__sigil intro-screen__sigil--inner" />
            <span className="intro-screen__glyph intro-screen__glyph--left" />
            <span className="intro-screen__glyph intro-screen__glyph--right" />
          </div>
          <div className="intro-screen__overlay">
            <span className="intro-screen__tag">Summoner's Briefing</span>
            <h1 className="intro-screen__headline">LoL Assistant</h1>
            <p className="intro-screen__subtitle">
              Syncing Hextech telemetry from across Runeterra…
            </p>
            <div className="intro-screen__motif">
              <span>Patch uplink stable</span>
              <span>Rift climate nominal</span>
              <span>Champions standing by</span>
            </div>
          </div>
        </div>
      )}

      {!introVisible && (
        <div className={`app ${animateApp ? "app--enter" : ""}`}>
          {view === "form" ? (
            <main className="card card--compact">
              <div className="card__header">
                <h1 className="title">League of Legends Match Explorer</h1>
                <p className="subtitle">
                  Lock in your Riot ID and region to preview the new recap
                  experience while the live data pipeline is under
                  construction.
                </p>
                <div className="summoner-hints">
                  <span className="summoner-hints__pill">Patch 14.9 calibration</span>
                  <span className="summoner-hints__pill">Queues: Solo/Duo · Flex</span>
                  <span className="summoner-hints__pill">
                    Roles tracked: Top · Jungle · Mid · Bot · Support
                  </span>
                </div>
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
          ) : !recapData ? (
            <main className="card card--compact">
              <div className="card__header">
                <h1 className="title">Recap unavailable</h1>
                <p className="subtitle">
                  We couldn&apos;t build a recap from the Riot APIs just yet. Please try
                  fetching matches again in a moment.
                </p>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleBackToLookup}
                >
                  Back to lookup
                </button>
              </div>
            </main>
          ) : (
            <section className="recap">
              <article className="ai-card ai-card--top">
                <header className="ai-card__header">
                  <h2>Spotify Wrapped-style recap</h2>
                  <p>
                    Generate an AI-written story beat that captures your vibe on
                    the Rift. Perfect for captions, reels, or keeping the hype
                    rolling into the next queue.
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
                    {isGeneratingRecap ? "Summoning AI…" : "Generate Recap"}
                  </button>
                  <span className="ai-card__hint">
                    Powered by AWS Bedrock-style storytelling using your latest
                    performance.
                  </span>
                </div>
              </article>

              <div className="recap__banner">
                <div className="recap__summary">
                  <p className="recap__eyebrow">Personalized recap</p>
                  <h1 className="recap__title">{recapData.summoner}</h1>
                  <p className="recap__meta">
                    {recapData.regionLabel} · Last {recapData.lastGamesCount} games
                  </p>
                  <div className="recap__chips">
                    <span className="recap__chip">{winRate}% win rate</span>
                    <span className="recap__chip">{kdaRatio}:1 KDA</span>
                    {topChampion && (
                      <span className="recap__chip recap__chip--accent">
                        Signature: {topChampion}
                      </span>
                    )}
                  </div>
                  <div className="recap__status-strip">
                    <span>
                      Featured lanes: {featuredRoles.length
                        ? featuredRoles.join(" • ")
                        : "Calibrating"}
                    </span>
                    <span>Rune focus: {runeFocusLabel}</span>
                  </div>
                </div>
                <div className="recap__crest" style={storyBackdropStyle}>
                  <div className="recap__crest-ring" aria-hidden="true">
                    <span>{getChampionSigil(topChampion)}</span>
                  </div>
                  <div className="recap__crest-meta">
                    <span>Signature pick</span>
                    <strong>{topChampion || "Calibrating pool"}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={handleBackToLookup}
                >
                  Back to lookup
                </button>
              </div>

              <div className="story">
                <div className="story__frame" style={storyBackdropStyle}>
                  <div className="story__header">
                    <span className="story__badge">LoL Assistant</span>
                    <span className="story__season">
                      Last {recapData.lastGamesCount} games · {recapData.regionLabel}
                    </span>
                  </div>
                  <div className="story__hero">
                    <p className="story__tagline">Your Rift Wrapped</p>
                    <h2 className="story__stat">{winRate}%</h2>
                    <p className="story__label">Win rate</p>
                  </div>
                  <div className="story__grid">
                    <div className="story__tile">
                      <span className="story__tile-label">KDA</span>
                      <span className="story__tile-value">{kdaRatio}:1</span>
                    </div>
                    <div className="story__tile">
                      <span className="story__tile-label">Streak</span>
                      <span className="story__tile-value">{kda.streak} W</span>
                    </div>
                    <div className="story__tile">
                      <span className="story__tile-label">CS / min</span>
                      <span className="story__tile-value">
                        {typeof kda.csPerMin === "number"
                          ? kda.csPerMin.toFixed(2)
                          : kda.csPerMin}
                      </span>
                    </div>
                    <div className="story__tile">
                      <span className="story__tile-label">Gold / min</span>
                      <span className="story__tile-value">{kda.goldPerMin}</span>
                    </div>
                  </div>
                  <div className="story__highlight">
                    <span className="story__highlight-title">Highlight moment</span>
                    <p>
                      {primaryHighlight?.title ||
                        matchHistoryEntries[0]?.highlightTag ||
                        "Stacking wins across the Rift"}
                    </p>
                  </div>
                  <div className="story__footer">
                    <span>Swipe up</span>
                    <strong>@lolforge</strong>
                  </div>
                </div>
              </div>

              <div className="stat-grid">
                <article className="stat-card">
                  <header className="stat-card__header">
                    <h2>Win Distribution</h2>
                    <span className="stat-card__sub">Win rate {winRate}%</span>
                  </header>
                  <div className="win-bar">
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
                  <ul className="win-legend">
                    {recapData.winDistribution.map((segment) => (
                      <li key={segment.label}>
                        <span
                          className={`win-legend__swatch win-legend__swatch--${segment.label.toLowerCase()}`}
                        />
                        <span className="win-legend__label">
                          {segment.label}
                        </span>
                        <span className="win-legend__value">
                          {segment.value} games
                        </span>
                      </li>
                    ))}
                  </ul>
                </article>

                <article className="stat-card">
                  <header className="stat-card__header">
                    <h2>KDA Breakdown</h2>
                    <span className="stat-card__sub">
                      Average {kdaRatio}:1 across recent games
                    </span>
                  </header>
                  <div className="kda-figure">{kdaRatio}:1</div>
                  <div className="kda-breakdown">
                    <div>
                      <span>Avg Kills</span>
                      <strong>{kda.kills}</strong>
                    </div>
                    <div>
                      <span>Avg Deaths</span>
                      <strong>{kda.deaths}</strong>
                    </div>
                    <div>
                      <span>Avg Assists</span>
                      <strong>{kda.assists}</strong>
                    </div>
                  </div>
                  <div className="kda-tags">
                    <span className="accent-chip">
                      Longest win streak: {kda.streak}
                    </span>
                    <span className="accent-chip">
                      CS / min: {kda.csPerMin}
                    </span>
                    <span className="accent-chip">
                      Gold / min: {kda.goldPerMin}
                    </span>
                  </div>
                </article>

                <article className="stat-card stat-card--tags">
                  <header className="stat-card__header">
                    <h2>Playstyle Tags</h2>
                    <span className="stat-card__sub">
                      {recapData.trendFocus}
                    </span>
                  </header>
                  <div className="pill-row">
                    {playstyleTags.map((tag) => (
                      <span key={tag} className="pill">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="stat-card__note">
                    Tags refresh each batch of games to reflect your evolving
                    macro, mechanics, and team impact.
                  </p>
                </article>
              </div>

              <div className="recap__body">
                <article className="history-card">
                  <header className="history-card__header">
                    <h2>Match History</h2>
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
                            <div className="history-item__champion">
                              <div className="history-item__sigil" aria-hidden="true">
                                {getChampionSigil(match.champion)}
                              </div>
                              <div className="history-item__champion-copy">
                                <span className="history-item__champion-name">
                                  {match.champion}
                                </span>
                                <span className="history-item__role">{match.role}</span>
                              </div>
                            </div>
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

                <article className="moments-card">
                  <header className="moments-card__header">
                    <h2>Highlight Moments</h2>
                    <span>Season-defining plays</span>
                  </header>
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

              <aside className="share-card">
                <div>
                  <h2>Share your recap</h2>
                  <p>
                    Spotlight your climb with ready-to-post captions for X,
                    Discord, or Reddit, complete with standout stats and
                    moments.
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
                    <span className="social-pill">#ClutchMoments</span>
                  </div>
                </div>
              </aside>

              <div className="matches">
                <div className="matches__header">
                  <h2>Live match IDs</h2>
                  {summonerLabel && (
                    <p className="matches__meta">
                      Showing latest games for <strong>{summonerLabel}</strong>
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
