import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const buildPublicAssetUrl = (fileName) => {
  const base = process.env.PUBLIC_URL ?? "";
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${normalizedBase}/assets/${encodeURI(fileName)}`;
};

const INTRO_BACKGROUND_ASSET = "dark blue league of legends background.jpg";
const LEAGUE_LOGO_ASSET = "League-of-Legends-Logo.png";

const introBackground = buildPublicAssetUrl(INTRO_BACKGROUND_ASSET);
const leagueLogo = buildPublicAssetUrl(LEAGUE_LOGO_ASSET);
const PIE_CHART_COLORS = [
  "#7c3aed",
  "#c084fc",
  "#22d3ee",
  "#34d399",
  "#f97316",
  "#f472b6",
];

const REGION_OPTIONS = [
  { value: "ASIA", label: "Asia", description: "KR, JP, OCE, PH, SG" },
  { value: "AMERICAS", label: "Americas", description: "NA, BR, LAN, LAS" },
  { value: "EUROPE", label: "Europe", description: "EUW, EUNE, TR, RU" },
];

const FETCH_MATCH_PROGRESS = [
  "Calling Riot APIs…",
  "Spooling match history…",
  "Crunching KDA ratios…",
  "Ranking highlight reels…",
  "Tuning champ insights…",
  "Fetching matches…",
];

const FEEDBACK_PROGRESS = [
  "Paging Claude…",
  "Reviewing macro trends…",
  "Judging your KP…",
  "Scouting grief potential…",
  "Sharpening the roast…",
  "Generating feedback…",
];

const APP_SHARE_URL = "https://main.dmmttg0yma1yv.amplifyapp.com/";
const DATA_DRAGON_VERSION = "14.24.1";
const API_URL =
  "https://fiauf5t7o7.execute-api.us-east-1.amazonaws.com/InitialStage/matches";
const createEmptyRecap = ({ summoner, regionLabel }) => ({
  summoner: summoner || "Summoner#TAG",
  regionLabel: regionLabel || REGION_OPTIONS[0].label,
  winDistribution: [
    { label: "Wins", value: 0 },
    { label: "Losses", value: 0 },
    { label: "Remakes", value: 0 },
  ],
  kda: {
    kills: 0,
    deaths: 0,
    assists: 0,
    streak: 0,
    csPerMin: 0,
    goldPerMin: 0,
  },
  matchHistory: [],
  playstyleTags: [],
  highlightMoments: [],
  lastGamesCount: 0,
  trendFocus: "Lock in your Riot ID to surface personalized trends.",
});

const normalizeRecapPayload = (payload, fallbackSummoner, regionLabel) => {
  if (!payload) {
    return createEmptyRecap({ summoner: fallbackSummoner, regionLabel });
  }
  const base = createEmptyRecap({ summoner: fallbackSummoner, regionLabel });
  return {
    ...base,
    ...payload,
    summoner: payload.summoner || fallbackSummoner,
    regionLabel: payload.regionLabel || regionLabel,
    winDistribution:
      payload.winDistribution?.length === 3
        ? payload.winDistribution
        : base.winDistribution,
    kda: {
      ...base.kda,
      ...(payload.kda || {}),
    },
    matchHistory: payload.matchHistory || [],
    playstyleTags: payload.playstyleTags || [],
    highlightMoments: payload.highlightMoments || [],
    lastGamesCount:
      typeof payload.lastGamesCount === "number"
        ? payload.lastGamesCount
        : base.lastGamesCount,
    trendFocus: payload.trendFocus || base.trendFocus,
  };
};

const buildShareSummary = (recap, winRate, kdaRatio) => {
  const wins =
    recap.winDistribution.find((segment) => segment.label === "Wins")?.value ??
    0;
  const losses =
    recap.winDistribution.find((segment) => segment.label === "Losses")
      ?.value ?? 0;
  const topMatch = recap.matchHistory[0];
  const signaturePlay =
    recap.highlightMoments[0]?.title ||
    topMatch?.highlightTag ||
    "Clutch plays across the Rift";

  const matchLine = topMatch
    ? `${topMatch.result} as ${topMatch.champion} (${topMatch.kda})`
    : "Queue up to log fresh wins.";

  return [
    `🎮 ${recap.summoner}'s Riot Rift Recap`,
    `📊 ${wins}W / ${losses}L (${winRate.toFixed(1)}% WR)`,
    `⚔️ ${kdaRatio.toFixed(2)} KDA · ${recap.kda.csPerMin} CS/min · ${recap.kda.goldPerMin} GPM`,
    `🎯 Focus: ${recap.trendFocus}`,
    `✨ Highlight: ${signaturePlay}`,
    "",
    `${matchLine}`,
    "",
    "📡 Every stat is sourced directly from Riot APIs.",
    `Check yours: ${APP_SHARE_URL}`,
  ].join("\n");
};

const buildAiNarrative = (recap, winRate, kdaRatio) => {
  const favoriteChamp = recap.matchHistory[0]?.champion ?? "your mains";
  const streak = recap.kda.streak;
  const standoutMoments = recap.highlightMoments
    .map((moment) => `• ${moment.title} — ${moment.description}`)
    .join("\n");
  const tags = recap.playstyleTags.join(" · ") || "Data incoming soon";

  return `✨ ${recap.summoner}'s Riot Rift Recap ✨

Across ${recap.lastGamesCount} games in ${recap.regionLabel}, ${
    recap.summoner
  } logged a ${winRate}% win rate while averaging a ${kdaRatio} KDA. The longest win streak hit ${
    streak
  } games, led by ${favoriteChamp} and confident objective control.

Playstyle remix: ${tags}.

Standout moments:
${standoutMoments || "• Pull fresh data to unlock highlight descriptions."}

Live telemetry from Riot endpoints keeps the receipts. Queue up and write the next chapter. 🗡️`;
};

const LOSS_ROAST_TEMPLATES = [
  ({ champ, ratioLabel, role }) =>
    `You piloted ${champ} like a Bronze ${role}. ${ratioLabel} is an inting masterclass.`,
  ({ champ, ratioLabel }) =>
    `${champ} with a ${ratioLabel} KDA? Even cannon minions felt the carry diff.`,
  ({ champ }) =>
    `That loss looked like ${champ} was on autopilot. Maybe try playing with your monitor on.`,
];

const LUCK_TAUNT_TEMPLATES = [
  ({ champ, ratioLabel }) =>
    `Enjoy that ${champ} win—${ratioLabel} screams pure luck, not skill.`,
  ({ champ, ratioLabel }) =>
    `${champ} only popped off because the matchmaking RNG blessed you. ${ratioLabel} isn't happening twice.`,
  ({ champ }) =>
    `Screenshot that win with ${champ} while you can; nobody believes it wasn't a bot lobby.`,
];

const BORING_WIN_TEMPLATES = [
  ({ champ }) =>
    `Team diff carried your ${champ}. Try contributing next queue.`,
  ({ ratioLabel }) =>
    `${ratioLabel} KDA and still invisible? The squad dragged you across the finish line.`,
  () => `That victory was charity LP. Consider saying thank you to your randoms.`,
];

const sumCharCodes = (value = "") =>
  Array.from(value).reduce((acc, char) => acc + char.charCodeAt(0), 0);

const parseKdaRatio = (kdaLabel) => {
  if (!kdaLabel || typeof kdaLabel !== "string") return null;
  const sanitized = kdaLabel.replace(/kda/i, "").trim();
  const slashParts = sanitized.split("/").map((part) => part.trim());
  if (slashParts.length === 3) {
    const [kills, deaths, assists] = slashParts.map((part) => {
      const numeric = parseFloat(part.replace(/[^\d.-]/g, ""));
      return Number.isFinite(numeric) ? numeric : null;
    });
    if (
      Number.isFinite(kills) &&
      Number.isFinite(deaths) &&
      Number.isFinite(assists)
    ) {
      return (kills + assists) / Math.max(1, deaths);
    }
  }
  const numeric = parseFloat(sanitized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
};

const getMatchTrashTalk = (match) => {
  if (!match) return "";
  const ratio = parseKdaRatio(match.kda);
  const isWin = String(match.result || "").toLowerCase() === "win";
  const ratioLabel = Number.isFinite(ratio) ? `${ratio.toFixed(1)}:1` : "???:1";
  const champ = match.champion || "that pick";
  const role = (match.role || "role").toLowerCase();
  const seed =
    sumCharCodes(match.id || "") +
    sumCharCodes(champ) +
    (Number.isFinite(ratio) ? Math.round(ratio * 10) : 0);
  const pickTemplate = (templates) =>
    templates[Math.abs(seed) % templates.length];

  const context = { champ, ratioLabel, role };
  const lowKda = Number.isFinite(ratio) ? ratio < 2.0 : false;
  const goodGame = isWin && Number.isFinite(ratio) && ratio >= 3.2;

  if (!isWin || lowKda) {
    return pickTemplate(LOSS_ROAST_TEMPLATES)(context);
  }

  if (goodGame) {
    return pickTemplate(LUCK_TAUNT_TEMPLATES)(context);
  }

  return pickTemplate(BORING_WIN_TEMPLATES)(context);
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

const buildIdentityShareImage = ({
  summoner,
  subtitle,
  winRate,
  kdaRatio,
  avgGame,
  regionLabel,
  trendFocus,
  highlightTitle,
  highlightDescription,
  streak,
}) => {
  if (typeof document === "undefined") return null;
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const background = ctx.createLinearGradient(0, 0, size, size);
  background.addColorStop(0, "#040714");
  background.addColorStop(0.4, "#0f172a");
  background.addColorStop(1, "#1a1036");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, size, size);

  const glow = ctx.createRadialGradient(
    size * 0.75,
    size * 0.2,
    40,
    size * 0.75,
    size * 0.2,
    size * 0.6
  );
  glow.addColorStop(0, "rgba(124, 58, 237, 0.35)");
  glow.addColorStop(1, "rgba(124, 58, 237, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(124, 58, 237, 0.55)";
  ctx.lineWidth = 8;
  ctx.strokeRect(60, 60, size - 120, size - 120);

  ctx.fillStyle = "rgba(226, 232, 240, 0.75)";
  ctx.font = "600 34px 'Poppins', sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText("ACCOUNT SNAPSHOT", 110, 120);

  ctx.fillStyle = "#f8fafc";
  ctx.font = "700 84px 'Poppins', sans-serif";
  ctx.fillText(summoner, 110, 190);

  ctx.fillStyle = "rgba(226, 232, 240, 0.85)";
  ctx.font = "400 34px 'Poppins', sans-serif";
  ctx.fillText(subtitle, 110, 285);

  ctx.fillStyle = "rgba(94, 234, 212, 0.3)";
  ctx.beginPath();
  ctx.arc(110, 400, 90, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(56, 189, 248, 0.2)";
  ctx.beginPath();
  ctx.arc(size - 220, 240, 140, 0, Math.PI * 2);
  ctx.fill();

  const stats = [
    { label: "Win rate", value: winRate },
    { label: "KDA", value: kdaRatio },
    { label: "Avg game", value: avgGame },
    { label: "Streak peak", value: `${streak || 0}W` },
  ];
  ctx.font = "600 30px 'Poppins', sans-serif";
  stats.forEach((stat, index) => {
    const x = 110 + index * 210;
    ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
    ctx.fillText(stat.label.toUpperCase(), x, 370);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 64px 'Poppins', sans-serif";
    ctx.fillText(String(stat.value || "—"), x, 430);
    ctx.font = "600 30px 'Poppins', sans-serif";
  });

  const highlightBoxY = 560;
  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.strokeStyle = "rgba(124, 58, 237, 0.4)";
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, 110, highlightBoxY, size - 220, 180, 24);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(226, 232, 240, 0.8)";
  ctx.font = "500 28px 'Poppins', sans-serif";
  ctx.fillText(highlightTitle || "Momentum spotlight", 140, highlightBoxY + 40);
  ctx.fillStyle = "rgba(148, 163, 184, 0.95)";
  ctx.font = "400 24px 'Poppins', sans-serif";
  const highlightCopy =
    highlightDescription ||
    "Queue up to generate highlight insights from Riot telemetry.";
  wrapAndFillText(
    ctx,
    highlightCopy,
    140,
    highlightBoxY + 90,
    size - 280,
    32
  );

  ctx.fillStyle = "rgba(148, 163, 184, 0.9)";
  ctx.font = "500 28px 'Poppins', sans-serif";
  ctx.fillText(`Region · ${regionLabel}`, 110, size - 200);
  ctx.font = "500 28px 'Poppins', sans-serif";
  ctx.fillText(`Trend focus · ${trendFocus}`, 110, size - 150);

  ctx.font = "400 24px 'Poppins', sans-serif";
  ctx.fillText("Share your recap at riot-rift.com", 110, size - 100);

  return canvas.toDataURL("image/png");
};

function wrapAndFillText(ctx, text, x, startY, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let y = startY;
  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = testLine;
    }
  });
  if (line) ctx.fillText(line, x, y);
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const polarToCartesian = (center, radius, angleInDegrees) => {
  const angleInRadians = toRadians(angleInDegrees - 90);
  return {
    x: center + radius * Math.cos(angleInRadians),
    y: center + radius * Math.sin(angleInRadians),
  };
};

const describeDonutSegment = (center, outerRadius, thickness, startAngle, endAngle) => {
  const innerRadius = outerRadius - thickness;
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  const outerStart = polarToCartesian(center, outerRadius, startAngle);
  const outerEnd = polarToCartesian(center, outerRadius, endAngle);
  const innerEnd = polarToCartesian(center, innerRadius, endAngle);
  const innerStart = polarToCartesian(center, innerRadius, startAngle);

  return [
    "M",
    outerStart.x,
    outerStart.y,
    "A",
    outerRadius,
    outerRadius,
    0,
    largeArcFlag,
    1,
    outerEnd.x,
    outerEnd.y,
    "L",
    innerEnd.x,
    innerEnd.y,
    "A",
    innerRadius,
    innerRadius,
    0,
    largeArcFlag,
    0,
    innerStart.x,
    innerStart.y,
    "Z",
  ].join(" ");
};

const formatPercent = (value, total) =>
  Math.round((value / total) * 1000) / 10 || 0;

const PieChart = ({
  data = [],
  labelKey = "label",
  valueKey = "value",
  centerLabel = "",
  emptyMessage = "No data available.",
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const series = data.filter((entry) => {
    const value = entry?.[valueKey];
    return typeof value === "number" && value > 0;
  });
  const total = series.reduce((acc, entry) => acc + (entry?.[valueKey] ?? 0), 0);

  if (!series.length || total === 0) {
    return <p className="empty-state">{emptyMessage}</p>;
  }

  let currentAngle = 0;
  const center = 110;
  const outerRadius = 90;
  const thickness = 26;

  const segments = series.map((entry, index) => {
    const value = entry[valueKey];
    const fraction = value / total;
    const startAngle = currentAngle * 360;
    currentAngle += fraction;
    const endAngle = currentAngle * 360;
    const color = PIE_CHART_COLORS[index % PIE_CHART_COLORS.length];
    return {
      path: describeDonutSegment(center, outerRadius, thickness, startAngle, endAngle),
      color,
      value,
      label: entry[labelKey] ?? `Entry ${index + 1}`,
      percent: formatPercent(value, total),
      index,
    };
  });

  const activeSegment =
    (hoveredIndex != null && segments.find((segment) => segment.index === hoveredIndex)) ||
    null;
  const activeValue = activeSegment ? activeSegment.value : total;
  const activeLabel = activeSegment
    ? `${activeSegment.label} · ${activeSegment.percent}%`
    : centerLabel || "games";

  return (
    <div className="pie-chart">
      <div className="pie-chart__visual-wrapper">
        <div className="pie-chart__visual">
          <svg
            viewBox="0 0 220 220"
            role="img"
            aria-label={`Donut chart showing ${series.length} segments`}
          >
            {segments.map((segment) => (
              <path
                key={`${segment.label}-${segment.index}`}
                d={segment.path}
                fill={segment.color}
                className={`pie-chart__segment${
                  segment.index === hoveredIndex ? " pie-chart__segment--active" : ""
                }`}
                onMouseEnter={() => setHoveredIndex(segment.index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <title>
                  {segment.label}: {segment.value} games ({segment.percent}%)
                </title>
              </path>
            ))}
          </svg>
          <div className="pie-chart__center">
            <strong>{activeValue}</strong>
            <span>{activeLabel}</span>
          </div>
        </div>
      </div>
      <ul className="pie-chart__legend">
        {segments.map((segment) => (
          <li
            key={`${segment.label}-${segment.index}`}
            className={`pie-chart__legend-item${
              segment.index === hoveredIndex ? " pie-chart__legend-item--active" : ""
            }`}
            onMouseEnter={() => setHoveredIndex(segment.index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <span
              className="pie-chart__swatch"
              style={{ backgroundColor: segment.color }}
            />
            <div>
              <strong>{segment.label}</strong>
              <span>
                {segment.value} games · {segment.percent}%
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

function App() {
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [region, setRegion] = useState(REGION_OPTIONS[0].value);
  const [view, setView] = useState("form");
  const [recapData, setRecapData] = useState(() =>
    createEmptyRecap({
      summoner: "Summoner#TAG",
      regionLabel: REGION_OPTIONS[0].label,
    })
  );
  const [showIntro, setShowIntro] = useState(true);
  const [introStage, setIntroStage] = useState("enter");
  const [animateApp, setAnimateApp] = useState(false);
  const [shareFeedback, setShareFeedback] = useState("");
  const [recapNarrative, setRecapNarrative] = useState("");
  const [isGeneratingRecap, setIsGeneratingRecap] = useState(false);
  const [summonerLabel, setSummonerLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profileInsight, setProfileInsight] = useState(null);
  const [statusInsight, setStatusInsight] = useState(null);
  const [advancedInsight, setAdvancedInsight] = useState(null);
  const [hasLiveInsights, setHasLiveInsights] = useState(false);
  const [fetchMessageIndex, setFetchMessageIndex] = useState(0);
  const [feedbackMessageIndex, setFeedbackMessageIndex] = useState(0);
  const [aiError, setAiError] = useState("");
  const [identityShareStatus, setIdentityShareStatus] = useState("");
  const introDelayTimeoutRef = useRef(null);
  const introHideTimeoutRef = useRef(null);
  const aiStatsRef = useRef(null);

  useEffect(() => {
    introDelayTimeoutRef.current = setTimeout(() => {
      setIntroStage("exit");
      introHideTimeoutRef.current = setTimeout(() => {
        setShowIntro(false);
        setAnimateApp(true);
      }, 600);
    }, 3000);

    return () => {
      if (introDelayTimeoutRef.current) {
        clearTimeout(introDelayTimeoutRef.current);
      }
      if (introHideTimeoutRef.current) {
        clearTimeout(introHideTimeoutRef.current);
      }
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
    if (!identityShareStatus) return;
    const timer = setTimeout(() => setIdentityShareStatus(""), 2600);
    return () => clearTimeout(timer);
  }, [identityShareStatus]);

  useEffect(() => {
    if (!loading) {
      setFetchMessageIndex(0);
      return;
    }

    const totalMessages = FETCH_MATCH_PROGRESS.length;
    setFetchMessageIndex(0);
    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex = Math.min(currentIndex + 1, totalMessages - 1);
      setFetchMessageIndex(currentIndex);
      if (currentIndex === totalMessages - 1) {
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (!isGeneratingRecap) {
      setFeedbackMessageIndex(0);
      return;
    }

    const totalMessages = FEEDBACK_PROGRESS.length;
    setFeedbackMessageIndex(0);
    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex = Math.min(currentIndex + 1, totalMessages - 1);
      setFeedbackMessageIndex(currentIndex);
      if (currentIndex === totalMessages - 1) {
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isGeneratingRecap]);

  const regionDetails = useMemo(
    () => REGION_OPTIONS.find((option) => option.value === region),
    [region]
  );

  const totalGames = useMemo(
    () => recapData.winDistribution.reduce((acc, segment) => acc + segment.value, 0),
    [recapData.winDistribution]
  );
  const winsSegment =
    recapData.winDistribution.find((segment) => segment.label === "Wins") ??
    { value: 0 };
  const lossesSegment =
    recapData.winDistribution.find((segment) => segment.label === "Losses") ??
    { value: 0 };
  const winRate = totalGames
    ? Math.round(((winsSegment.value ?? 0) / totalGames) * 100)
    : 0;
  const kdaRatio = (
    (recapData.kda.kills + recapData.kda.assists) /
    Math.max(1, recapData.kda.deaths)
  ).toFixed(2);
  const shareSummary = useMemo(
    () => buildShareSummary(recapData, winRate, Number(kdaRatio)),
    [recapData, winRate, kdaRatio]
  );

  const resolvedProfile = hasLiveInsights ? profileInsight : null;
  const resolvedStatus = hasLiveInsights ? statusInsight : null;
  const resolvedAdvanced = hasLiveInsights ? advancedInsight : null;

  const profileIconUrl = useMemo(
    () => buildProfileIconUrl(resolvedProfile?.iconId),
    [resolvedProfile]
  );

  const incidents = resolvedStatus?.incidents || [];
  const maintenances = resolvedStatus?.maintenances || [];
  const statusMessage =
    incidents[0]?.message ||
    incidents[0]?.title ||
    maintenances[0]?.message ||
    maintenances[0]?.title ||
    "No active incidents reported by Riot for this shard.";

  const championPool = resolvedAdvanced?.championPool ?? [];
  const roleDistribution = resolvedAdvanced?.roleDistribution ?? [];
  const clutchGame = resolvedAdvanced?.clutchGame;
  const matchHistoryEntries = recapData.matchHistory || [];
  const highlightEntries = recapData.highlightMoments || [];
  const playstyleTags = recapData.playstyleTags || [];
  const primaryHighlight = highlightEntries[0];
  const lastActiveLabel = formatDateLabel(resolvedProfile?.lastActiveIso);

  const bestHistoryMatchId = useMemo(() => {
    if (!matchHistoryEntries || matchHistoryEntries.length === 0) {
      return null;
    }

    const scoreForMatch = (match) => {
      if (
        typeof match?.heroScore === "number" &&
        !Number.isNaN(match.heroScore)
      ) {
        return match.heroScore;
      }

      const [kills = 0, deaths = 0, assists = 0] =
        match?.kda
          ?.split("/")
          ?.map((value) => parseFloat(value.trim()) || 0) ?? [];
      const kdaScore = ((kills + assists) / Math.max(1, deaths)) * 100;

      const damageLabel = String(match?.damage || "").toLowerCase();
      const rawDamage = parseFloat(damageLabel.replace(/[^\d.]/g, "")) || 0;
      const damageScore = damageLabel.includes("k") ? rawDamage * 1000 : rawDamage;

      const csScore = parseFloat(match?.csPerMin) || 0;

      return kdaScore + damageScore + csScore * 10;
    };

    return matchHistoryEntries.reduce(
      (best, match) => {
        const score = scoreForMatch(match);
        if (score > best.score) {
          return { id: match.id, score };
        }
        return best;
      },
      {
        id: matchHistoryEntries[0]?.id ?? null,
        score: scoreForMatch(matchHistoryEntries[0]),
      }
    ).id;
  }, [matchHistoryEntries]);

  const fetchButtonText = loading
    ? FETCH_MATCH_PROGRESS[
        Math.min(fetchMessageIndex, FETCH_MATCH_PROGRESS.length - 1)
      ]
    : "Fetch matches";

  const feedbackButtonText = isGeneratingRecap
    ? FEEDBACK_PROGRESS[
        Math.min(feedbackMessageIndex, FEEDBACK_PROGRESS.length - 1)
      ]
    : "Generate Feedback";

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedName = gameName.trim();
    const trimmedTag = tagLine.trim();
    if (!trimmedName || !trimmedTag) return;

    const regionLabel = regionDetails?.label ?? region;

    setLoading(true);
    setError(null);
    setSummonerLabel("");
    setRecapNarrative("");
    setAiError("");
    aiStatsRef.current = null;

    try {
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
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const message =
          payload?.error ||
          `Request failed with status ${response.status}. Please try again.`;
        throw new Error(message);
      }

      const recapMatches = payload?.recap?.matchHistory ?? [];
      if (recapMatches.length === 0) {
        setSummonerLabel(payload?.summoner || `${trimmedName}#${trimmedTag}`);
        setError("No matches found for this Riot ID.");
        return;
      }

      const resolvedSummoner =
        payload.summoner ?? `${trimmedName}#${trimmedTag}`;
      const normalizedRecap = normalizeRecapPayload(
        payload.recap,
        resolvedSummoner,
        regionLabel
      );

      setSummonerLabel(resolvedSummoner);
      setRecapData(normalizedRecap);
      setProfileInsight(payload.profile ?? null);
      setStatusInsight(payload.platformStatus ?? null);
      setAdvancedInsight(payload.advancedMetrics ?? null);
      setHasLiveInsights(true);
      aiStatsRef.current =
        payload.aiStatsContext || {
          recap: normalizedRecap,
          profile: payload.profile ?? null,
          leagueSummary: payload.leagueSummary ?? [],
          platformStatus: payload.platformStatus ?? null,
          advancedMetrics: payload.advancedMetrics ?? null,
          matches: normalizedRecap.matchHistory ?? [],
        };
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
    setRecapNarrative("");
    setAiError("");
    aiStatsRef.current = null;
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
          setShareFeedback(
            copied
              ? "Recap copied. Paste it into your next Discord chat."
              : "Copy failed. Please copy manually before posting to Discord."
          );
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

  const handleIdentityShare = () => {
    try {
      if (typeof document === "undefined") {
        throw new Error("Share not available in this environment.");
      }
      const imageUrl = buildIdentityShareImage({
        summoner: resolvedProfile?.summonerName || recapData.summoner,
        subtitle: `Level ${resolvedProfile?.level ?? "—"} · ${
          resolvedProfile?.platform || recapData.regionLabel || "—"
        }`,
        winRate: `${winRate}%`,
        kdaRatio,
        avgGame: resolvedAdvanced?.avgGameDurationLabel || "—",
        regionLabel: recapData.regionLabel,
        trendFocus: recapData.trendFocus || "Lock in games to surface macro focus.",
        highlightTitle: primaryHighlight?.title || "Momentum spotlight",
        highlightDescription:
          primaryHighlight?.description ||
          (playstyleTags.length
            ? `Playstyle tags: ${playstyleTags.join(" · ")}`
            : "Lock in more matches to reveal highlight data."),
        streak: recapData.kda.streak,
      });
      if (!imageUrl) {
        throw new Error("Unable to generate share image.");
      }
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `${recapData.summoner}-snapshot.png`;
      link.click();
      setIdentityShareStatus("Snapshot saved. Share it anywhere you like.");
    } catch (shareError) {
      console.error(shareError);
      setIdentityShareStatus("Share export failed. Please try again.");
    }
  };

 const handleGenerateRecap = async () => {
  if (isGeneratingRecap) return;
  if (!aiStatsRef.current) {
    setAiError("No stats available for AI feedback yet. Fetch matches first.");
    return;
  }

  setIsGeneratingRecap(true);
  setAiError("");

  console.log("🧠 Generating recap...");
  console.log("📊 Sending stats to backend:", aiStatsRef.current);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "ai-feedback",
        stats: aiStatsRef.current,
      }),
    });

    console.log("📩 Response received:", response);
    console.log("📩 Response status:", response.status);

    let payload = null;
    try {
      const text = await response.text(); // Always read as text first
      console.log("🧾 Raw response body:", text);

      payload = JSON.parse(text);
      console.log("✅ Parsed JSON payload:", payload);
    } catch (parseErr) {
      console.error("❌ Failed to parse response JSON:", parseErr);
      payload = null;
    }

    if (!response.ok) {
      const message =
        payload?.error ||
        `Request failed with status ${response.status}. Please try again.`;
      console.error("❌ Backend error:", message);
      throw new Error(message);
    }

    const aiFeedback = payload?.aiFeedback || {};
    console.log("🤖 AI Feedback object:", aiFeedback);

    setRecapNarrative(aiFeedback.message || "");
    setAiError(aiFeedback.error || "");
  } catch (requestError) {
    console.error("🔥 Request failed:", requestError);
    setAiError(
      requestError?.message || "Something went wrong while generating feedback."
    );
  } finally {
    setIsGeneratingRecap(false);
    console.log("✅ Finished generating recap");
  }
};


  return (
    <div className="app-shell">
      {showIntro && (
        <div className={`intro-screen intro-screen--${introStage}`}>
          <img
            className="intro-screen__logo"
            src={leagueLogo}
            alt="League of Legends logo"
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
                  Lock in your Riot ID and region to pull match history,
                  account, league, platform-status, and macro insights directly
                  from the Riot API stack.
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
                    {fetchButtonText}
                  </button>
                </div>
              </form>
              {error && <div className="alert alert--error">{error}</div>}
            </main>
          ) : (
            <section className="recap">
              <article className="ai-card ai-card--top">
                <header className="ai-card__header">
                  <h2>Generate Feedback (only for those with tough skin)</h2>
                  <p>
                    Tap the button to let Claude 3 Haiku on AWS Bedrock
                    roast your stats and drop constructive advice based on the
                    live Riot API data.
                  </p>
                </header>
                <textarea
                  className="ai-card__textarea"
                  rows={8}
                  value={recapNarrative}
                  placeholder="Prepare your eyeballs..."
                  readOnly
                />
                <div className="ai-card__actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleGenerateRecap}
                    disabled={isGeneratingRecap}
                  >
                    {feedbackButtonText}
                  </button>
                  <span className="ai-card__hint">
                    Powered by Amazon Bedrock (Claude 3.5 Haiku) and fresh Riot
                    API data.
                  </span>
                  {aiError && <span className="ai-card__error">{aiError}</span>}
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
                    {hasLiveInsights ? "Live Riot data" : "Awaiting lookup"}
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
                    <div className="identity-card__profile">
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
                        <p className="recap__eyebrow">Account snapshot</p>
                        <h2>
                          {resolvedProfile?.summonerName || recapData.summoner}
                        </h2>
                        <p className="identity-card__meta">
                          Level {resolvedProfile?.level ?? "—"} ·{" "}
                          {resolvedProfile?.platform ||
                            recapData.regionLabel ||
                            "—"}
                        </p>
                      </div>
                    </div>
                    <div className="identity-card__share">
                      <button
                        type="button"
                        className="identity-card__share-button"
                        onClick={handleIdentityShare}
                      >
                        Download card
                      </button>
                    </div>
                  </div>
                  <div className="identity-card__stats">
                    <div>
                      <span>Win rate</span>
                      <strong>{winRate}%</strong>
                    </div>
                    <div>
                      <span>KDA</span>
                      <strong>{kdaRatio}</strong>
                    </div>
                    <div>
                      <span>Avg game</span>
                      <strong>
                        {resolvedAdvanced?.avgGameDurationLabel || "—"}
                      </strong>
                    </div>
                  </div>
                  <div className="identity-card__footer">
                    {lastActiveLabel && (
                      <span className="identity-card__activity">
                        {/* Last active · {lastActiveLabel} */}
                      </span>
                    )}
                    {identityShareStatus && (
                      <span className="identity-card__share-status">
                        {identityShareStatus}
                      </span>
                    )}
                  </div>
                </article>

                <article className="insight-card momentum-card">
                  <header className="insight-card__header">
                    <h3>Momentum tracker</h3>
                    <span>
                      {winsSegment.value ?? 0}W · {lossesSegment.value ?? 0}L ·{" "}
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
                      Incidents {incidents.length}
                    </span>
                    <span className="pill">
                      Maintenances {maintenances.length}
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
                      Data from participant statistics
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
                    Objective rate counts games with 15k+ objective damage,
                    while vision rate tracks 40+ vision score games.
                  </p>
                </article>

                <article className="stat-card stat-card--tags">
                  <header className="stat-card__header">
                    <h2>Playstyle tags</h2>
                    <span className="stat-card__sub">{recapData.trendFocus}</span>
                  </header>
                  {playstyleTags.length > 0 ? (
                    <div className="pill-row">
                      {playstyleTags.map((tag) => (
                        <span key={tag} className="pill">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-state">
                      Pull fresh games to classify your macro tendencies.
                    </p>
                  )}
                  <p className="stat-card__note">
                    Tags are rebuilt every lookup from Riot&apos;s raw match
                    telemetry.
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
                      {matchHistoryEntries.map((match) => {
                        const isBestGame =
                          typeof match.isBestGame === "boolean"
                            ? match.isBestGame
                            : Boolean(
                                bestHistoryMatchId &&
                                  match.id &&
                                  match.id === bestHistoryMatchId
                              );
                        const roastNote = getMatchTrashTalk(match);
                        return (
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
                          {(isBestGame || match.highlightTag) && (
                            <div className="history-item__badges">
                              {isBestGame && (
                                <span className="history-item__badge history-item__badge--best">
                                  Best Game
                                </span>
                              )}
                              {match.highlightTag && (
                                <span className="history-item__badge">
                                  {match.highlightTag}
                                </span>
                              )}
                            </div>
                          )}
                          {roastNote && (
                            <p className="history-item__roast">{roastNote}</p>
                          )}
                        </li>
                        );
                      })}
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
                  {/* <span>Top pulls from match-v5</span> */}
                </header>
                <div className="champion-card__body">
                  <div className="champion-card__section">
                    <h4>Most played champs</h4>
                    <PieChart
                      data={championPool}
                      labelKey="champion"
                      valueKey="count"
                      centerLabel="games"
                      emptyMessage="No champion data yet."
                    />
                  </div>
                  <div className="champion-card__section">
                    <h4>Role distribution</h4>
                    <PieChart
                      data={roleDistribution}
                      labelKey="role"
                      valueKey="count"
                      centerLabel="games"
                      emptyMessage="No role data yet."
                    />
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

            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
