import { useState } from "react";

function App() {
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [region, setRegion] = useState("ASIA");
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        "https://fiauf5t7o7.execute-api.us-east-1.amazonaws.com/prod/matches",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            game_name: gameName,
            tag_line: tagLine,
            region: region,
          }),
        }
      );
      const data = await response.json();
      if (data.matches) {
        setMatches(data.matches);
      } else {
        setMatches([]);
        setError("No matches found");
      }
    } catch (err) {
      setError("Failed to fetch matches");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>LOL Match Fetcher</h1>
      <div style={{ marginBottom: "10px" }}>
        <input
          placeholder="Game Name"
          value={gameName}
          onChange={(e) => setGameName(e.target.value)}
        />
        <input
          placeholder="Tag Line"
          value={tagLine}
          onChange={(e) => setTagLine(e.target.value)}
        />
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="ASIA">ASIA</option>
          <option value="AMERICAS">AMERICAS</option>
          <option value="EUROPE">EUROPE</option>
        </select>
        <button onClick={fetchMatches} style={{ marginLeft: "10px" }}>
          Fetch Matches
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <h2>Matches</h2>
      <ul>
        {matches.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
