import React, { useState, useMemo, useEffect } from "react";

const styles = {
  container: { backgroundColor: "#121212", color: "white", minHeight: "100vh", padding: "15px", textAlign: "center", fontFamily: "sans-serif" },
  header: { letterSpacing: "2px", margin: "0 0 5px 0" },
  badge: { backgroundColor: "#333", display: "inline-block", padding: "4px 12px", borderRadius: "10px", marginBottom: "15px" },
  scoreBox: { position: "sticky", top: 0, background: "#121212", padding: "10px", zIndex: 10, borderBottom: "1px solid #333" },
  slot: { border: "1px solid #333", margin: "10px auto", padding: "15px", maxWidth: "400px", borderRadius: "10px", backgroundColor: "#1b1b1b" }
};

const TEAMS = {
  "NFC East": ["NYG", "PHI", "DAL", "WAS"],
  "NFC North": ["CHI", "DET", "GB", "MIN"],
  "NFC South": ["ATL", "CAR", "NO", "TB"],
  "NFC West": ["ARI", "LA", "SF", "SEA"],
  "AFC East": ["BUF", "MIA", "NE", "NYJ"],
  "AFC North": ["BAL", "CIN", "CLE", "PIT"],
  "AFC South": ["HOU", "IND", "JAX", "TEN"],
  "AFC West": ["DEN", "KC", "LV", "LAC"],
};

const STAT_LABELS = { PASS_YD: "Passing Yds", PASS_TD: "Pass TDs", RUSH_YD: "Rush Yds", INT: "INTs" };

const CHALLENGES = [
  {
    date: "2026-02-26",
    stat: "PASS_YD", 
    prompts: [
      { text: "1999-2026 | Under 15 Passing TDs", maxTD: 14, startYear: 1999, endYear: 2026 },
      { text: "1999-2026 | 15+ Interceptions", minInt: 15, startYear: 1999, endYear: 2026 },
      { text: "1999-2026 | 300+ Rushing Yards", minRush: 300, startYear: 1999, endYear: 2026 },
      { text: "1999-2026 | 1+ Receptions on the year", minRec: 1, startYear: 1999, endYear: 2026 },
      { text: "1999-2026 | Under 8 Games Played", maxGP: 7, startYear: 1999, endYear: 2026 },
      { text: "1999-2026 | Under 3,000 Passing Yards", maxPass: 2999, startYear: 1999, endYear: 2026 }
    ]
  }
];

const StatSlot = ({ slotNumber, config, onScoreUpdate, isLocked, setIsLocked, targetStat, onWrongGuess, nbaData }) => {
  const [query, setQuery] = useState("");
  const [tempPlayer, setTempPlayer] = useState(null);
  const [error, setError] = useState("");
  const [showResults, setShowResults] = useState(false);

  const playerList = useMemo(() => {
    if (query.length < 3 || isLocked || !nbaData) return [];
    const uniquePlayers = Array.from(new Set(nbaData.map(s => s.PLAYER_NAME)));
    return uniquePlayers.filter(p => p.toLowerCase().includes(query.toLowerCase())).slice(0, 10);
  }, [query, isLocked, nbaData]);

  const playerSeasons = useMemo(() => {
    if (!tempPlayer || !nbaData) return [];
    return nbaData.filter(s => s.PLAYER_NAME === tempPlayer).sort((a, b) => b.SEASON - a.SEASON);
  }, [tempPlayer, nbaData]);

  const handleSelection = (seasonData) => {
    const year = parseInt(seasonData.SEASON || "0");
    let currentError = "";

    if (year < config.startYear || year > config.endYear) currentError = "Wrong Era!";
    else if (config.maxTD !== undefined && seasonData.PASS_TD > config.maxTD) currentError = "Too many Passing TDs!";
    else if (config.minInt !== undefined && seasonData.INT < config.minInt) currentError = "Need more Interceptions!";
    else if (config.minRush !== undefined && seasonData.RUSH_YD < config.minRush) currentError = "Not enough Rushing Yards!";
    else if (config.minRec !== undefined && seasonData.REC < config.minRec) currentError = "Need at least 1 Catch!";
    else if (config.maxGP !== undefined && seasonData.GP > config.maxGP) currentError = "Too many Games Played!";
    else if (config.maxPass !== undefined && seasonData.PASS_YD > config.maxPass) currentError = "Too many Passing Yards!";

    if (currentError) {
      setError(currentError);
      onWrongGuess();
      return;
    }
    onScoreUpdate(parseInt(seasonData[targetStat] || 0, 10));
    setIsLocked(seasonData);
  };

  return (
    <div style={styles.slot}>
      <p style={{ fontSize: "0.7rem", color: "#888", textAlign: "left", margin: "0 0 10px 0" }}>SLOT {slotNumber} • {config.text}</p>
      {!isLocked ? (
        <div style={{ position: "relative" }}>
          {!tempPlayer ? (
            <>
              <input placeholder="Search NFL Player..." value={query} onChange={(e) => { setQuery(e.target.value); setShowResults(true); setError(""); }} style={{ width: "100%", padding: "10px", boxSizing: "border-box", borderRadius: "5px", border: "1px solid #444", background: "#222", color: "white" }} />
              {showResults && playerList.length > 0 && (
                <div style={{ position: "absolute", top: "42px", left: 0, right: 0, background: "#222", border: "1px solid #444", zIndex: 10, maxHeight: "150px", overflowY: "auto" }}>
                  {playerList.map((p, i) => (
                    <div key={i} style={{ padding: "10px",
