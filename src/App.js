import React, { useState, useMemo, useEffect } from "react";

const styles = {
  container: { backgroundColor: "#121212", color: "white", minHeight: "100vh", padding: "15px", textAlign: "center", fontFamily: "sans-serif" },
  header: { letterSpacing: "2px", margin: "0 0 5px 0" },
  badge: { backgroundColor: "#333", display: "inline-block", padding: "4px 12px", borderRadius: "10px", marginBottom: "15px" },
  scoreBox: { position: "sticky", top: 0, background: "#121212", padding: "10px", zIndex: 10, borderBottom: "1px solid #333" },
  slot: { border: "1px solid #333", margin: "10px auto", padding: "15px", maxWidth: "400px", borderRadius: "10px", backgroundColor: "#1b1b1b", position: "relative" },
  dropdown: { position: "absolute", top: "70px", left: "0", right: "0", background: "#222", border: "2px solid #4caf50", zIndex: 9999, maxHeight: "200px", overflowY: "auto", borderRadius: "5px", boxShadow: "0px 4px 20px rgba(0,0,0,0.8)" },
  resultItem: { padding: "12px", borderBottom: "1px solid #333", cursor: "pointer", color: "white", textAlign: "left" }
};

const CHALLENGES = [{
  date: "2026-02-26",
  stat: "PASS_YD",
  prompts: [
    { text: "Under 15 Passing TDs", maxTD: 14 },
    { text: "15+ Interceptions", minInt: 15 },
    { text: "300+ Rushing Yards", minRush: 300 },
    { text: "1+ Receptions on the year", minRec: 1 },
    { text: "Under 8 Games Played", maxGP: 7 },
    { text: "Under 3,000 Passing Yards", maxPass: 2999 }
  ]
}];

const StatSlot = ({ slotNumber, config, onScoreUpdate, isLocked, setIsLocked, nflData, onWrongGuess }) => {
  const [query, setQuery] = useState("");
  const [tempPlayer, setTempPlayer] = useState(null);
  const [error, setError] = useState("");

  const playerList = useMemo(() => {
    if (!nflData || nflData.length === 0 || query.length < 3) return [];
    const names = Array.from(new Set(nflData.map(s => s.PLAYER_NAME || s.player_name || s.player_display_name).filter(Boolean)));
    return names.filter(n => n.toLowerCase().includes(query.toLowerCase())).slice(0, 10);
  }, [query, nflData]);

  const playerSeasons = useMemo(() => {
    if (!tempPlayer || !nflData) return [];
    return nflData.filter(s => (s.PLAYER_NAME || s.player_name || s.player_display_name) === tempPlayer)
                  .sort((a, b) => (b.SEASON || b.season) - (a.SEASON || a.season));
  }, [tempPlayer, nflData]);

  // NEW: Find the "Max Possible" answer for this specific slot
  const maxPossible = useMemo(() => {
    if (!nflData || nflData.length === 0) return null;
    return nflData.filter(s => {
      const pTd = parseInt(s.PASS_TD || s.passing_tds || 0);
      const pInt = parseInt(s.INT || s.interceptions || 0);
      const rYd = parseInt(s.RUSH_YD || s.rushing_yards || 0);
      const rec = parseInt(s.REC || s.receptions || 0);
      const gp = parseInt(s.GP || s.games || 0);
      const pYd = parseInt(s.PASS_YD || s.passing_yards || 0);
      const year = parseInt(s.SEASON || s.season || 0);

      if (config.maxTD && pTd > config.maxTD) return false;
      if (config.minInt && pInt < config.minInt) return false;
      if (config.minRush && rYd < config.minRush) return false;
      if (config.minRec && rec < config.minRec) return false;
      if (config.maxGP && gp > config.maxGP) return false;
      if (config.maxPass && pYd > config.maxPass) return false;
      return true;
    }).reduce((prev, curr) => {
      const currY = parseInt(curr.PASS_YD || curr.passing_yards || 0);
      const prevY = prev ? parseInt(prev.PASS_YD || prev.passing_yards || 0) : -1;
      return currY > prevY ? curr : prev;
    }, null);
  }, [nflData, config]);

  const handleSelection = (s) => {
    const pYd = parseInt(s.PASS_YD || s.passing_yards || 0);
    const pTd = parseInt(s.PASS_TD || s.passing_tds || 0);
    const pInt = parseInt(s.INT || s.interceptions || 0);
    const rYd = parseInt(s.RUSH_YD || s.rushing_yards || 0);
    const rec = parseInt(s.REC || s.receptions || 0);
    const gp = parseInt(s.GP || s.games || 0);

    let msg = "";
    if (config.maxTD && pTd > config.maxTD) msg = `Too many TDs (${pTd})`;
    else if (config.minInt && pInt < config.minInt) msg = `Need 15+ INTs (${pInt})`;
    else if (config.minRush && rYd < config.minRush) msg = `Need 300+ Rush Yds (${rYd})`;
    else if (config.minRec && rec < config.minRec) msg = "No catches found!";
    else if (config.maxGP && gp > config.maxGP) msg = `Too many games (${gp})`;
    else if (config.maxPass && pYd > config.maxPass) msg = `Too many Pass Yds (${pYd})`;

    if (msg) { setError(msg); onWrongGuess(); return; }
    onScoreUpdate(pYd);
    setIsLocked({ name: tempPlayer, season: (s.SEASON || s.season), score: pYd });
  };

  return (
    <div style={styles.slot}>
      <p style={{ fontSize: "0.7rem", color: "#888", textAlign: "left", margin: "0 0 5px 0" }}>SLOT {slotNumber} • {config.text}</p>
      {!isLocked ? (
        <div style={{ position: "relative" }}>
          {!tempPlayer ? (
            <>
              <input placeholder="Search Player..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "5px", border: "1px solid #444", background: "#222", color: "white", boxSizing: "border-box" }} />
              {playerList.length > 0 && (
                <div style={styles.dropdown}>
                  {playerList.map((p, i) => <div key={i} style={styles.resultItem} onClick={() => setTempPlayer(p)}>{p}</div>)}
                </div>
              )}
            </>
          ) : (
            <div>
              <p style={{ color: "#4caf50", margin: "5px 0" }}>{tempPlayer} <span onClick={() => setTempPlayer(null)} style={{ cursor: "pointer", fontSize: "0.7rem", color: "#888", marginLeft: "10px" }}>[CHANGE]</span></p>
              <select style={{ width: "100%", padding: "10px", background: "#333", color: "white", borderRadius: "5px" }} onChange={(e) => handleSelection(playerSeasons[e.target.value])} defaultValue="">
                <option value="" disabled>Select Year</option>
                {playerSeasons.map((s, idx) => <option key={idx} value={idx}>{(s.SEASON || s.season)} - {(s.TEAM || s.team || s.recent_team)}</option>)}
              </select>
            </div>
          )}
          {error && <p style={{ color: "#ff4444", fontSize: "0.7rem", marginTop: "5px" }}>{error}</p>}
        </div>
      ) : (
        <div style={{ textAlign: "left" }}>
          <p style={{ margin: 0 }}><b>{isLocked.name}</b> ({isLocked.season}) <span style={{ float: "right", color: "#4caf50" }}>+{isLocked.score.toLocaleString()}</span></p>
          <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px dashed #444", fontSize: "0.75rem" }}>
            <span style={{ color: "#888" }}>Best Possible: </span>
            <span style={{ color: "#ffd700" }}>{maxPossible ? `${maxPossible.PLAYER_NAME || maxPossible.player_name} (${maxPossible.SEASON || maxPossible.season})` : "N/A"}</span>
            <span style={{ float: "right", color: "#ffd700" }}>{maxPossible ? `+${(maxPossible.PASS_YD || maxPossible.passing_yards).toLocaleString()}` : ""}</span>
          </div>
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
    fetch("/balledge_nfl_dataset.json").then(res => res.json()).then(data => { setNflData(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: "white", textAlign: "center", padding: "50px" }}>LOADING NFL DATABASE...</div>;

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>BALLEDGEMAXXING NFL</h2>
      <div style={styles.badge}><span style={{ fontSize: "0.7rem", color: "#4caf50", fontWeight: "bold" }}>GOAL: MAX PASSING YARDS</span></div>
      <div style={styles.scoreBox}>
        <h1 style={{ color: "#4caf50", margin: 0, fontSize: "3.5rem" }}>{totalScore.toLocaleString()}</h1>
        <p style={{ fontSize: "0.7rem", color: "#888" }}>MISSES: {wrongGuesses} | DB: {nflData.length.toLocaleString()}</p>
      </div>
      {CHALLENGES[0].prompts.map((config, i) => (
        <StatSlot 
          key={i} slotNumber={i + 1} config={config} nflData={nflData} 
          isLocked={slotsLocked[i]} 
          setIsLocked={(s) => { const n = [...slotsLocked]; n[i] = s; setSlotsLocked(n); }}
          onScoreUpdate={(v) => setTotalScore(prev => prev + v)}
          onWrongGuess={() => setWrongGuesses(prev => prev + 1)}
        />
      ))}
    </div>
  );
}
