import React, { useState, useMemo, useEffect } from "react";

const styles = {
  container: { backgroundColor: "#121212", color: "white", minHeight: "100vh", padding: "15px", textAlign: "center", fontFamily: "sans-serif" },
  header: { letterSpacing: "2px", margin: "0 0 5px 0" },
  badge: { backgroundColor: "#333", display: "inline-block", padding: "4px 12px", borderRadius: "10px", marginBottom: "15px" },
  scoreBox: { position: "sticky", top: 0, background: "#121212", padding: "10px", zIndex: 10, borderBottom: "1px solid #333" },
  slot: { border: "1px solid #333", margin: "10px auto", padding: "15px", maxWidth: "400px", borderRadius: "10px", backgroundColor: "#1b1b1b", position: "relative" },
  dropdown: { 
    position: "absolute", top: "70px", left: "5%", right: "5%", 
    background: "#222", border: "2px solid #4caf50", zIndex: 9999, 
    maxHeight: "200px", overflowY: "auto", borderRadius: "5px", boxShadow: "0px 4px 15px rgba(0,0,0,0.5)"
  },
  resultItem: { padding: "12px", borderBottom: "1px solid #333", cursor: "pointer", color: "white", textAlign: "left" }
};

const CHALLENGES = [{
  date: "2026-02-26", stat: "PASS_YD", 
  prompts: [
    { text: "1999-2026 | Under 15 Passing TDs", maxTD: 14, startYear: 1999, endYear: 2026 },
    { text: "1999-2026 | 15+ Interceptions", minInt: 15, startYear: 1999, endYear: 2026 },
    { text: "1999-2026 | 300+ Rushing Yards", minRush: 300, startYear: 1999, endYear: 2026 },
    { text: "1999-2026 | 1+ Receptions on the year", minRec: 1, startYear: 1999, endYear: 2026 },
    { text: "1999-2026 | Under 8 Games Played", maxGP: 7, startYear: 1999, endYear: 2026 },
    { text: "1999-2026 | Under 3,000 Passing Yards", maxPass: 2999, startYear: 1999, endYear: 2026 }
  ]
}];

const StatSlot = ({ slotNumber, config, onScoreUpdate, isLocked, setIsLocked, targetStat, onWrongGuess, nflData }) => {
  const [query, setQuery] = useState("");
  const [tempPlayer, setTempPlayer] = useState(null);
  const [error, setError] = useState("");

  // DEBUG: This filters the player list.
  // UPDATED SEARCH LOGIC
  const playerList = useMemo(() => {
    if (!nflData || nflData.length === 0 || query.length < 3) return [];
    
    // We search for ANY variation of the name key
    const names = Array.from(new Set(nflData.map(s => 
      s.PLAYER_NAME || s.player_name || s.player_display_name
    ).filter(Boolean)));
    
    return names.filter(name => 
      name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);
  }, [query, nflData]);

  // UPDATED SEASON SELECTION
  const playerSeasons = useMemo(() => {
    if (!tempPlayer || !nflData) return [];
    return nflData.filter(s => 
      (s.PLAYER_NAME || s.player_name || s.player_display_name) === tempPlayer
    ).sort((a, b) => (b.SEASON || b.season) - (a.SEASON || a.season));
  }, [tempPlayer, nflData]);

  const handleSelection = (seasonData) => {
    const year = parseInt(seasonData.SEASON || "0");
    let msg = "";
    if (year < config.startYear || year > config.endYear) msg = "Wrong Era!";
    else if (config.maxTD !== undefined && seasonData.PASS_TD > config.maxTD) msg = "Too many Passing TDs!";
    else if (config.minInt !== undefined && seasonData.INT < config.minInt) msg = "Need more INTs!";
    else if (config.minRush !== undefined && seasonData.RUSH_YD < config.minRush) msg = "Not enough Rush Yds!";
    else if (config.minRec !== undefined && seasonData.REC < config.minRec) msg = "Need a catch!";
    else if (config.maxGP !== undefined && seasonData.GP > config.maxGP) msg = "Too many games!";
    else if (config.maxPass !== undefined && seasonData.PASS_YD > config.maxPass) msg = "Too many Pass Yds!";

    if (msg) { setError(msg); onWrongGuess(); return; }
    onScoreUpdate(parseInt(seasonData[targetStat] || 0, 10));
    setIsLocked(seasonData);
  };

  return (
    <div style={styles.slot}>
      <p style={{ fontSize: "0.7rem", color: "#888", textAlign: "left", margin: "0 0 10px 0" }}>SLOT {slotNumber} • {config.text}</p>
      
      {!isLocked ? (
        <>
          {!tempPlayer ? (
            <div style={{ position: "relative" }}>
              <input 
                placeholder="Search (e.g. Manning)..." 
                value={query} 
                onChange={(e) => { setQuery(e.target.value); setError(""); }} 
                style={{ width: "100%", padding: "12px", borderRadius: "5px", border: "1px solid #444", background: "#222", color: "white" }} 
              />
              {playerList.length > 0 && (
                <div style={styles.dropdown}>
                  {playerList.map((p, i) => (
                    <div key={i} style={styles.resultItem} onClick={() => setTempPlayer(p)}>{p}</div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <p style={{ color: "#4caf50", margin: "5px 0" }}>{tempPlayer} <span onClick={() => setTempPlayer(null)} style={{ cursor: "pointer", fontSize: "0.7rem", color: "#888", marginLeft: "10px" }}>[RESET]</span></p>
              <select 
                style={{ width: "100%", padding: "10px", background: "#333", color: "white", border: "none", borderRadius: "5px" }} 
                onChange={(e) => handleSelection(playerSeasons[e.target.value])} 
                defaultValue=""
              >
                <option value="" disabled>Pick a Year</option>
                {playerSeasons.map((s, idx) => (
                  <option key={idx} value={idx}>{s.SEASON} - {s.TEAM}</option>
                ))}
              </select>
            </div>
          )}
          {error && <p style={{ color: "#ff4444", fontSize: "0.7rem", marginTop: "5px" }}>{error}</p>}
        </>
      ) : (
        <div style={{ textAlign: "left" }}>
          <p style={{ margin: 0 }}><b>{isLocked.PLAYER_NAME}</b> ({isLocked.SEASON}) <span style={{ float: "right", color: "#4caf50" }}>+{isLocked[targetStat]}</span></p>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [nflData, setNflData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalScore, setTotalScore] = useState(0);
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [slotsLocked, setSlotsLocked] = useState([null, null, null, null, null, null]);

  useEffect(() => {
    fetch("/balledge_nfl_dataset.json")
      .then(res => res.json())
      .then(data => {
        console.log("Data Loaded:", data.length);
        setNflData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch Error:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ color: "white", textAlign: "center", padding: "50px" }}>Scouting NFL Personnel...</div>;

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>BALLEDGEMAXXING NFL</h2>
      <div style={styles.badge}>
        <span style={{ fontSize: "0.7rem", color: "#4caf50", fontWeight: "bold" }}>GOAL: MAX PASSING YARDS</span>
      </div>
      
      <div style={styles.scoreBox}>
        <h1 style={{ color: "#4caf50", margin: 0, fontSize: "3.5rem" }}>{totalScore}</h1>
        <p style={{ fontSize: "0.7rem", color: "#888" }}>MISSES: {wrongGuesses} | DATABASE: {nflData.length} PLAYERS</p>
      </div>

      {CHALLENGES[0].prompts.map((config, i) => (
        <StatSlot 
          key={i} slotNumber={i + 1} config={config} targetStat="PASS_YD" nflData={nflData} 
          isLocked={slotsLocked[i]} 
          setIsLocked={(s) => { const n = [...slotsLocked]; n[i] = s; setSlotsLocked(n); }}
          onScoreUpdate={(v) => setTotalScore(prev => prev + v)}
          onWrongGuess={() => setWrongGuesses(prev => prev + 1)}
        />
      ))}
    </div>
  );
}

