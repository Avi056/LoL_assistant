import { useEffect, useMemo, useState } from "react";
import "./App.css";
import introImage from "./assets/1568742297124374.jpeg";

const REGION_OPTIONS = [
  { value: "ASIA", label: "Asia", description: "KR, JP, OCE, PH, SG" },
  { value: "AMERICAS", label: "Americas", description: "NA, BR, LAN, LAS" },
  { value: "EUROPE", label: "Europe", description: "EUW, EUNE, TR, RU" },
];

const SAMPLE_RECAP = {
  winDistribution: [
    { label: "Wins", value: 18 },
    { label: "Losses", value: 6 },
    { label: "Remakes", value: 1 },
  ],
  kda: {
    kills: 9.4,
    deaths: 3.1,
    assists: 11.7,
    streak: 7,
    csPerMin: 7.3,
    goldPerMin: 420,
  },
  matchHistory: [
    {
      id: "NA1-5234509821",
      champion: "Ashe",
      role: "Bot",
      result: "Win",
      kda: "12 / 1 / 14",
      csPerMin: 8.5,
      damage: "31.8k dmg",
      duration: "32:18",
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
      champion: "Ashe",
      role: "Bot",
      result: "Win",
      kda: "8 / 1 / 13",
      csPerMin: 7.5,
      damage: "26.9k dmg",
      duration: "27:33",
      highlightTag: "MVP",
    },
    {
      id: "NA1-5234100032",
      champion: "Jhin",
      role: "Bot",
      result: "Win",
      kda: "11 / 3 / 9",
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

const buildShareSummary = (recap, winRate, kdaRatio) => {
  const topMatch = recap.matchHistory[0];
  const signaturePlay =
    recap.highlightMoments[0]?.title || "Leaving unforgettable plays on the Rift";
  const playstyle = recap.playstyleTags.slice(0, 2).join(" • ") || "Clutch performer";

  const matchLine = topMatch
    ? `${topMatch.result} as ${topMatch.champion} (${topMatch.kda})`
    : "Stacking victories across the Rift";

  return [
    `${recap.summoner} • ${recap.regionLabel}`,
    `Win rate ${winRate}% across ${recap.lastGamesCount} games`,
    `Avg KDA ${kdaRatio}:1 · ${matchLine}`,
    `Playstyle: ${playstyle}`,
    `Highlight: ${signaturePlay}`,
    "#LeagueOfLegends #ClutchMoments #RiftRecap",
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
  } catch (error) {
    // Fallback below
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
  } catch (fallbackError) {
    return false;
  }
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

  const regionDetails = useMemo(
    () => REGION_OPTIONS.find((option) => option.value === region),
    [region]
  );

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedName = gameName.trim();
    const trimmedTag = tagLine.trim();
    if (!trimmedName || !trimmedTag) return;

    const regionLabel = regionDetails?.label ?? region;

    setRecapData(
      createRecapData({
        summoner: `${trimmedName}#${trimmedTag}`,
        regionLabel,
      })
    );
    setView("recap");
    setAnimateApp(true);
    setRecapNarrative("");

    /*
     * To restore the live API integration, re-enable the fetch logic below
     * and wire the response into the recap view instead of the sample data.
     *
     * try {
     *   const response = await fetch("https://your-api-here", { ... });
     *   const payload = await response.json();
     *   // setRecapData(transformPayload(payload));
     * } catch (error) {
     *   console.error(error);
     * }
     */
  };

  const handleBackToLookup = () => {
    setView("form");
    setAnimateApp(true);
  };

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
  ).toFixed(1);
  const shareSummary = useMemo(
    () => buildShareSummary(recapData, winRate, kdaRatio),
    [recapData, winRate, kdaRatio]
  );

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
      case "instagram": {
        const copied = await copyTextToClipboard(shareSummary);
        if (copied) {
          setShareFeedback("Caption copied. Paste it into your Instagram story or post.");
        } else {
          setShareFeedback("Unable to copy automatically—select and copy the caption manually.");
        }
        window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
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
      setRecapNarrative(buildAiNarrative(recapData, winRate, kdaRatio));
      setIsGeneratingRecap(false);
    }, 1400);
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
                      onChange={(e) => setGameName(e.target.value)}
                      required
                    />
                    <span className="riot-id__separator">#</span>
                    <input
                      id="riot-tag"
                      type="text"
                      placeholder="Tag (e.g. KR1)"
                      value={tagLine}
                      onChange={(e) => setTagLine(e.target.value)}
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
                      onChange={(e) => setRegion(e.target.value)}
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
                  <button className="primary-button" type="submit">
                    Fetch matches
                  </button>
                </div>
              </form>
            </main>
          ) : (
            <section className="recap">
              <div className="recap__banner">
                <div>
                  <p className="recap__eyebrow">Personalized recap</p>
                  <h1 className="recap__title">{recapData.summoner}</h1>
                  <p className="recap__meta">
                    {recapData.regionLabel} · Last {recapData.lastGamesCount}{" "}
                    games
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
                    Spotlight your climb with a ready-to-post graphic for X or
                    Instagram, complete with standout stats and moments.
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
                      className="share-button share-button--instagram"
                      onClick={() => handleShare("instagram")}
                    >
                      Instagram caption
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

              <article className="ai-card">
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
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
