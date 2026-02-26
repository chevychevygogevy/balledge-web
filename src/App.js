import React, { useState, useMemo, useEffect } from "react";

const CHALLENGES = [{
  stat: "PASS_YD",
  prompts: [
    { text: "1999-2026 | Under 15 Passing TDs", maxTD: 14 },
    { text: "1999-2026 | 15+ Interceptions", minInt: 15 },
    { text: "1999-2026 | 300+ Rushing Yards", minRush: 300 },
    { text: "1999-2026 | 1+ Receptions on the year", minRec: 1 },
    { text: "1999-2026 | Under 8 Games Played", maxGP: 7 },
    { text: "1999-2026 | Under 3,000 Passing Yards", maxPass: 2999 }
  ]
}];

export default function App() {
  const [nflData, setNflData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [query, setQuery] = useState("");
  const [slots, setSlots] = useState([null, null, null, null, null, null]);

  useEffect(() => {
    // Try to fetch the data
    fetch("/balledge_nfl_dataset.json")
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setNflData(data);
        setLoading(false);
      })
      .catch(err => {
        setFetchError(err.message);
        setLoading(false);
      });
  }, []);

  // Filter logic - looking for PLAYER_NAME (Capitalized)
  const filteredPlayers = useMemo(() => {
    if (query.length < 3) return [];
    const names = Array.from(new Set(nflData.map(s => s.PLAYER_NAME || s.player_name)));
    return names.filter(n => n?.toLowerCase().includes(query.toLowerCase())).slice(0, 10);
  }, [query, nflData]);

  if (loading) return <div style={{color: "white", padding: "50px"}}>SCREEEENING FILM...</div>;
  if (fetchError) return <div style={{color: "red", padding: "50px"}}>RED ALERT: {fetchError} - Check if file is in public folder!</div>;

  return (
    <div style={{ backgroundColor: "#121212", color: "white", minHeight: "100vh", padding: "20px", fontFamily: "sans-serif" }}>
      <h1>NFL MAXXER</h1>
      <p>DATABASE COUNT: {nflData.length}</p>

      <div style={{ marginBottom: "20px" }}>
        <input 
          placeholder="Type 3 letters (e.g. Mahomes)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: "100%", padding: "15px", borderRadius: "10px", border: "none", background: "#222", color: "white" }}
        />
        {filteredPlayers.length > 0 && (
          <div style={{ background: "#333", borderRadius: "10px", marginTop: "10px", textAlign: "left" }}>
            {filteredPlayers.map((p, i) => (
              <div key={i} style={{ padding: "10px", borderBottom: "1px solid #444", cursor: "pointer" }} onClick={() => { alert(`Selected: ${p}`); setQuery(""); }}>
                {p}
              </div>
            ))}
          </div>
        )}
      </div>

      {CHALLENGES[0].prompts.map((p, i) => (
        <div key={i} style={{ border: "1px solid #444", padding: "15px", margin: "10px 0", borderRadius: "10px", background: "#1b1b1b" }}>
          {p.text}
        </div>
      ))}
    </div>
  );
}
