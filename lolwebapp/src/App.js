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
    recap.winDistribution.find((segment) => segment.label === "Wins")?.value ??
    0;
  const losses =
    recap.winDistribution.find((segment) => segment.label === "Losses")?.value ??
    0;
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
      const API_URL =
        "https://fiauf5t7o7.execute-api.us-east-1.amazonaws.com/InitialStage/matches";

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json",
          "x-api-key": "RGAPI-aea7e856-cbe8-4360-8284-089ac6523857"
         },
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
            <div> {/* Recap view JSX omitted for brevity, same as your original code */} </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
