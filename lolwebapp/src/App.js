import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import introImage from "./assets/1568742297124374.jpeg";

const REGION_OPTIONS = [
  { value: "ASIA", label: "Asia", description: "KR, JP, OCE, PH, SG" },
  { value: "AMERICAS", label: "Americas", description: "NA, BR, LAN, LAS" },
  { value: "EUROPE", label: "Europe", description: "EUW, EUNE, TR, RU" },
];

const APP_SHARE_URL = "https://main.d4ccg2oosnodu.amplifyapp.com";

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
    recap.winDistribution.find((segment) => segment.label === "Wins")?.value ?? 0;
  const losses =
    recap.winDistribution.find((segment) => segment.label === "Losses")?.value ?? 0;
  const topMatch = recap.matchHistory[0];
  const signaturePlay =
    recap.highlightMoments[0]?.title || "Leaving unforgettable plays on the Rift";

  const matchLine = topMatch
    ? `${topMatch.result} as ${topMatch.champion} (${topMatch.kda})`
    : "Stacking victories across the Rift";

  return [
    `🎮 ${recap.summoner}'s LOL Forge Recap`,
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
  } catch {
    // fall back below
  }

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
  const copyTimeoutRef = useRef(null);

  useEffect(() => {
    const introTimer = setTimeout(() => {
      setShowIntro(false);
      setAnimateApp(true);
    }, 3000);

    return () => clearTimeout(introTimer);
  }, []);

  useEffect(() => {
    if (!animateApp) return undefined;
    const animationTimer = setTimeout(() => setAnimateApp(false), 700);
    return () => clearTimeout(animationTimer);
  }, [animateApp]);

  useEffect(() => {
    if (!shareFeedback) return undefined;
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
      const response = await fetch(
        "https://fiauf5t7o7.execute-api.us-east-1.amazonaws.com/InitialStage/matches",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            game_name: trimmedName,
            tag_line: trimmedTag,
            region,
          }),
        }
      );

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        // non-JSON response
      }

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

      setMatches(payload.matches);
      setSummonerLabel(payload.summoner ?? `${trimmedName}#${trimmedTag}`);
      setRecapData(
        createRecapData({
          summoner: `${trimmedName}#${trimmedTag}`,
          regionLabel,
        })
      );
      setRecapNarrative("");
      setView("recap");
      setAnimateApp(true);
    } catch (requestError) {
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
      case "twitter": {
        const url = `https://twitter.com/intent/tweet?text=${encodedSummary}`;
        window.open(url, "_blank", "noopener,noreferrer");
        setShareFeedback("Opened a ready-to-post Tweet in a new tab.");
        break;
      }
      case "reddit": {
        const url = `https://www.reddit.com/submit?title=${encodedTitle}&text=${encodedSummary}`;
        window.open(url, "_blank", "noopener,noreferrer");
        setShareFeedback("Reddit share drafted in a new tab.");
        break;
      }
      case "discord": {
        const copied = await copyTextToClipboard(shareSummary);
        if (copied) {
          setShareFeedback("Recap copied. Paste it into your next Discord chat.");
        } else {
          setShareFeedback("Copy failed. Please copy manually before posting to Discord.");
        }
        window.open("https://discord.com/channels/@me", "_blank", "noopener,noreferrer");
        break;
      }
      case "copy": {
        const copied = await copyTextToClipboard(shareSummary);
        setShareFeedback(
          copied ? "Recap copied to clipboard." : "Copy failed. Please copy manually."
        );
        break;
      }
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
                  Lock in your Riot ID and region to preview the new recap
                  experience while the live data pipeline is under
                  construction.
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
                <div>
                  <p className="recap__eyebrow">Personalized recap</p>
                  <h1 className="recap__title">{recapData.summoner}</h1>
                  <p className="recap__meta">
                    {recapData.regionLabel} · Last {recapData.lastGamesCount} games
                  </p>
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
                <div className="story__frame">
                  <div className="story__header">
                    <span className="story__badge">LOL Forge</span>
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
                      <span className="story__tile-value">
                        {recapData.kda.streak} W
                      </span>
                    </div>
                    <div className="story__tile">
                      <span className="story__tile-label">CS / min</span>
                      <span className="story__tile-value">
                        {recapData.kda.csPerMin.toFixed(1)}
                      </span>
                    </div>
                    <div className="story__tile">
                      <span className="story__tile-label">Gold / min</span>
                      <span className="story__tile-value">
                        {recapData.kda.goldPerMin}
                      </span>
                    </div>
                  </div>
                  <div className="story__highlight">
                    <span className="story__highlight-title">Highlight moment</span>
                    <p>{recapData.highlightMoments[0]?.title}</p>
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
                      <strong>{recapData.kda.kills.toFixed(1)}</strong>
                    </div>
                    <div>
                      <span>Avg Deaths</span>
                      <strong>{recapData.kda.deaths.toFixed(1)}</strong>
                    </div>
                    <div>
                      <span>Avg Assists</span>
                      <strong>{recapData.kda.assists.toFixed(1)}</strong>
                    </div>
                  </div>
                  <div className="kda-tags">
                    <span className="accent-chip">
                      Longest win streak: {recapData.kda.streak}
                    </span>
                    <span className="accent-chip">
                      CS / min: {recapData.kda.csPerMin.toFixed(1)}
                    </span>
                    <span className="accent-chip">
                      Gold / min: {recapData.kda.goldPerMin}
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
                    {recapData.playstyleTags.map((tag) => (
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
                  <ul className="history-list">
                    {recapData.matchHistory.map((match) => (
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
                          <span>{match.csPerMin.toFixed(1)} CS / min</span>
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
                </article>

                <article className="moments-card">
                  <header className="moments-card__header">
                    <h2>Highlight Moments</h2>
                    <span>Season-defining plays</span>
                  </header>
                  <ul className="highlight-list">
                    {recapData.highlightMoments.map((moment, index) => (
                      <li key={moment.title} className="highlight-item">
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
