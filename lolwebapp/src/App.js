import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const REGION_OPTIONS = [
  { value: "ASIA", label: "Asia", description: "KR, JP, OCE, PH, SG" },
  { value: "AMERICAS", label: "Americas", description: "NA, BR, LAN, LAS" },
  { value: "EUROPE", label: "Europe", description: "EUW, EUNE, TR, RU" },
];

function App() {
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [region, setRegion] = useState(REGION_OPTIONS[0].value);
  const [matches, setMatches] = useState([]);
  const [summonerLabel, setSummonerLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState("");
  const copyTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const regionDetails = useMemo(
    () => REGION_OPTIONS.find((option) => option.value === region),
    [region]
  );

  const handleCopy = async (matchId) => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    try {
      const canUseClipboard =
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof window !== "undefined" &&
        window.isSecureContext;

      if (canUseClipboard) {
        await navigator.clipboard.writeText(matchId);
        setCopyFeedback(`Copied ${matchId}`);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = matchId;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "absolute";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopyFeedback(`Copied ${matchId}`);
      }
    } catch (copyError) {
      console.error(copyError);
      setCopyFeedback("Copy failed. Please copy manually.");
    }
    copyTimeoutRef.current = setTimeout(() => setCopyFeedback(""), 2000);
  };

  const fetchMatches = async (event) => {
    event.preventDefault();
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
            game_name: gameName.trim(),
            tag_line: tagLine.trim(),
            region,
          }),
        }
      );

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        // Non-JSON response
      }

      if (!response.ok) {
        const message =
          payload?.error ||
          `Request failed with status ${response.status}. Please try again.`;
        throw new Error(message);
      }

      if (!payload?.matches?.length) {
        setMatches([]);
        setSummonerLabel(payload?.summoner || "");
        setError("No matches found for this Riot ID.");
        return;
      }

      setMatches(payload.matches);
      setSummonerLabel(payload.summoner ?? "");
    } catch (requestError) {
      setError(
        requestError?.message || "Something went wrong while fetching matches."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <main className="card">
        <div className="card__header">
          <h1 className="title">League of Legends Match Explorer</h1>
          <p className="subtitle">
            Enter a Riot ID to pull the five most recent matches straight from
            the Riot Games API. Perfect for scouting opponents or reviewing your
            own performance.
          </p>
        </div>

        <form className="form" onSubmit={fetchMatches}>
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
            <button type="submit" disabled={loading}>
              {loading ? "Fetching matches…" : "Fetch matches"}
            </button>
            <p className="region-hint">
              Querying: <strong>{regionDetails?.label}</strong> servers
            </p>
          </div>
        </form>

        {error && <div className="alert alert--error">{error}</div>}
        {!error && copyFeedback && (
          <div className="alert alert--success">{copyFeedback}</div>
        )}

        <section className="matches">
          <div className="matches__header">
            <h2>Recent matches</h2>
            {summonerLabel && (
              <p className="matches__meta">
                Showing latest games for <strong>{summonerLabel}</strong>
              </p>
            )}
          </div>

          {loading && (
            <div className="loading">
              <span className="loading__spinner" aria-hidden />
              <span>Contacting the Rift…</span>
            </div>
          )}

          {!loading && matches.length > 0 && (
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
          )}

          {!loading && matches.length === 0 && !error && (
            <p className="empty-state">
              No matches yet. Enter a Riot ID above and press{" "}
              <strong>Fetch matches</strong> to get started.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
