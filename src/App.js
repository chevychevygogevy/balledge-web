import React, { useState, useMemo, useEffect } from "react";
import "./styles.css";

const TEAMS = {
  Atlantic: ["BOS", "PHI", "NYK", "BKN", "TOR", "NJN"],
  Pacific: ["GSW", "LAL", "LAC", "PHX", "SAC"],
  East: ["BOS", "PHI", "NYK", "BKN", "TOR", "NJN", "CHI", "CLE", "DET", "IND", "MIL", "ATL", "CHA", "MIA", "ORL", "WAS", "CHH", "SYR", "PHW"],
  West: ["GSW", "LAL", "LAC", "PHX", "SAC", "DEN", "MIN", "OKC", "POR", "UTA", "DAL", "HOU", "MEM", "NOP", "SAS", "SEA", "NOK", "KCK", "SDC", "SFW", "STL"],
};

const STAT_LABELS = { ppg: "PPG", rpg: "RPG", apg: "APG", FG3M: "3PM", STL: "STL", BLK: "BLK" };

const CHALLENGES = [
  {
    date: "2026-02-26",
    stat: "FG3M",
    prompts: [
      { text: "2010-2020 | Under 250 3PA", max3PA: 250, startYear: 2010, endYear: 2020 },
      { text: "2010-2026 | Pacific | FT% > 90%", div: "Pacific", minFT: 0.90, startYear: 2010, endYear: 2026 },
      { text: "2015-2026 | East | Negative +/-", conf: "East", maxPlusMinus: -0.1, startYear: 2015, endYear: 2026 },
      { text: "2000-2015 | 15+ Double-Doubles", minDD2: 15, startYear: 2000, endYear: 2015 },
      { text: "2015-2026 | West | Outside Top 50 in PPG that season", conf: "West", minPPGRank: 51, startYear: 2015, endYear: 2026 },
      { text: "2020-2026 | Atlantic | Top 20 in +/- that season", div: "Atlantic", maxPMRank: 20, startYear: 2020, endYear: 2026 }
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
    return nbaData.filter(s => s.PLAYER_NAME === tempPlayer).sort((a, b) => b.SEASON.localeCompare(a.SEASON));
  }, [tempPlayer, nbaData]);

  const bestMoves = useMemo(() => {
    if (!isLocked || !nbaData) return [];
    return nbaData.filter(s => {
      const year = parseInt(s.SEASON?.split("-")[0] || "0");
      return (
        year >= config.startYear && year <= config.endYear &&
        (config.div ? TEAMS[config.div]?.includes(s.TEAM_ABBREVIATION) : true) &&
        (config.conf ? TEAMS[config.conf]?.includes(s.TEAM_ABBREVIATION) : true) &&
        (config.max3PA ? (s.FG3A || 0) <= config.max3PA : true) &&
        (config.minFT ? (s.FT_PCT || 0) >= config.minFT : true) &&
        (config.maxPlusMinus ? (s.PLUS_MINUS || 0) <= config.maxPlusMinus : true) &&
        (config.minDD2 ? (s.DD2 || 0) >= config.minDD2 : true) &&
        (config.minPPGRank ? (s.PTS_RANK || 999) >= config.minPPGRank : true) &&
        (config.maxPMRank ? (s.PLUS_MINUS_RANK || 999) <= config.maxPMRank : true)
      );
    }).sort((a, b) => (b[targetStat] || 0) - (a[targetStat] || 0)).slice(0, 3);
  }, [isLocked, nbaData, config, targetStat]);

  const handleSelection = (seasonData) => {
    const year = parseInt(seasonData.SEASON?.split("-")[0] || "0");
    let currentError = "";
    if (year < config.startYear || year > config.endYear) currentError = "Wrong Era!";
    else if (config.div && !TEAMS[config.div]?.includes(seasonData.TEAM_ABBREVIATION)) currentError = "Wrong Division!";
    else if (config.conf && !TEAMS[config.conf]?.includes(seasonData.TEAM_ABBREVIATION)) currentError = "Wrong Conference!";
    else if (config.max3PA && (seasonData.FG3A || 0) > config.max3PA) currentError = "Too many 3PA!";
    else if (config.minFT && (seasonData.FT_PCT || 0) < config.minFT) currentError = "FT% too low!";
    else if (config.maxPlusMinus && (seasonData.PLUS_MINUS || 0) > config.maxPlusMinus) currentError = "+/- too high!";
    else if (config.minDD2 && (seasonData.DD2 || 0) < config.minDD2) currentError = "Need more DD!";
    else if (config.minPPGRank && (seasonData.PTS_RANK || 999) < config.minPPGRank) currentError = "Scoring rank too high!";
    else if (config.maxPMRank && (seasonData.PLUS_MINUS_RANK || 999) > config.maxPMRank) currentError = "+/- rank too low!";

    if (currentError) {
      setError(currentError);
      onWrongGuess();
      return;
    }
    onScoreUpdate(parseInt(seasonData[targetStat] || 0, 10));
    setIsLocked(seasonData);
  };

  return (
    <div style={{ border: isLocked ? "2px solid #4caf50" : "1px solid #333", margin: "10px auto", padding: "15px", maxWidth: "400px", borderRadius: "10px", backgroundColor: "#1b1b1b" }}>
      <p style={{ fontSize: "0.7rem", color: "#888", textAlign: "left", margin: "0 0 10px 0" }}>SLOT {slotNumber} • {config.text}</p>
      {!isLocked ? (
        <div style={{ position: "relative" }}>
          {!tempPlayer ? (
            <>
              <input placeholder="Search Player..." value={query} onChange={(e) => { setQuery(e.target.value); setShowResults(true); setError(""); }} style={{ width: "100%", padding: "10px", boxSizing: "border-box", borderRadius: "5px", border: "1px solid #444", background: "#222", color: "white" }} />
              {showResults && playerList.length > 0 && (
                <div style={{ position: "absolute", top: "42px", left: 0, right: 0, background: "#222", border: "1px solid #444", zIndex: 10, maxHeight: "150px", overflowY: "auto" }}>
                  {playerList.map((p, i) => (
                    <div key={i} style={{ padding: "10px", borderBottom: "1px solid #333", cursor: "pointer" }} onClick={() => { setTempPlayer(p); setShowResults(false); }}>{p}</div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div>
              <p style={{ fontSize: "0.9rem", color: "#4caf50" }}>{tempPlayer} <span style={{ float: "right", color: "#888", cursor: "pointer", fontSize: "0.7rem" }} onClick={() => setTempPlayer(null)}>CHANGE</span></p>
              <select style={{ width: "100%", padding: "10px", borderRadius: "5px", background: "#333", color: "white", border: "none" }} onChange={(e) => handleSelection(playerSeasons[e.target.value])} defaultValue="" >
                <option value="" disabled>Select Season</option>
                {playerSeasons.map((s, idx) => (<option key={idx} value={idx}>{s.SEASON} - {s.TEAM_ABBREVIATION}</option>))}
              </select>
            </div>
          )}
          {error && <p style={{ color: "#ff4444", fontSize: "0.7rem", marginTop: "5px" }}>{error}</p>}
        </div>
      ) : (
        <div style={{ textAlign:
