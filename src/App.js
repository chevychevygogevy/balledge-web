import React, { useState, useMemo, useEffect } from "react";
import "./styles.css";
import { Analytics } from "@vercel/analytics/react";
import NBA_DATA from "./balledge_full_dataset.json";

// TEAM MAPPING (Includes historical abbreviations like SEA, NJN, CHH)
const TEAMS = {
  Atlantic: ["BOS", "PHI", "NYK", "BKN", "TOR", "NJN"],
  Pacific: ["GSW", "LAL", "LAC", "PHX", "SAC"],
  East: ["BOS", "PHI", "NYK", "BKN", "TOR", "NJN", "CHI", "CLE", "DET", "IND", "MIL", "ATL", "CHA", "MIA", "ORL", "WAS", "CHH", "SYR", "PHW"],
  West: ["GSW", "LAL", "LAC", "PHX", "SAC", "DEN", "MIN", "OKC", "POR", "UTA", "DAL", "HOU", "MEM", "NOP", "SAS", "SEA", "NOK", "KCK", "SDC", "SFW", "STL"],
};

const STAT_LABELS = { ppg: "Points Per Game", rpg: "Rebounds Per Game", apg: "Assists Per Game", FG3M: "Total 3-Pointers", STL: "Total Steals", BLK: "Total Blocks" };

// --- DAILY CHALLENGE LIBRARY ---
// Add new dates here to automate the game!
const CHALLENGES = [
  {
    date: "2026-02-26",
    stat: "FG3M", // Goal: Maximize Total 3-Pointers Made
    prompts: [
      { text: "Efficiency | Under 250 3PA", max3PA: 250, startYear: 1979, endYear: 2026 },
      { text: "Sharpshooter | FT% > 90%", minFT: 0.90, startYear: 1979, endYear: 2026 },
      { text: "Bad Team Floor Spacer | Negative +/-", maxPlusMinus: -0.1, startYear: 1979, endYear: 2026 },
      { text: "Big Man Range | 15+ Double-Doubles", minDD2: 15, startYear: 1979, endYear: 2026 },
      { text: "Specialist | Not Top 50 in Scoring", maxPPGRank: 51, startYear: 1979, endYear: 2026 },
      { text: "Winner | Top 20 in +/- Rank", maxPMRank: 20, startYear: 1979, endYear: 2026 }
    ]
  }
];

const formatSeason = (year) => {
  const nextYearShort = (year + 1).toString().slice(-2).padStart(2, '0');
  return `${year}-${nextYearShort}`;
};

const StatSlot = ({ slotNumber, config, onScoreUpdate, isLocked, setIsLocked, targetStat, onWrongGuess }) => {
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState(null);
  const [error, setError] = useState("");
  const [showResults, setShowResults] = useState(false);

  const getStatValue = (s) => targetStat === "ppg" ? s.PTS / s.GP : targetStat === "rpg" ? s.REB / s.GP : targetStat === "apg" ? s.AST / s.GP : s[targetStat];

  const topAnswers = useMemo(() => {
    if (!isLocked) return [];
    return NBA_DATA.filter((s) => {
      const year = parseInt(s.SEASON.split("-")[0]);
      const firstName = s.PLAYER_NAME.split(" ")[0];
      return (
        year >= config.startYear && year <= config.endYear &&
        (config.startsWith ? firstName.startsWith(config.startsWith) : true) &&
        (config.conf ? TEAMS[config.conf].includes(s.TEAM_ABBREVIATION) : true) &&
        (config.div ? TEAMS[config.div].includes(s.TEAM_ABBREVIATION) : true) &&
        (config.maxAge ? s.AGE <= config.maxAge : true) &&
        (config.maxGP ? s.GP <= config.maxGP : true) &&
        (config.minWins ? s.W >= config.minWins : true) &&
        (config.minFG ? s.FG_PCT >= config.minFG : true) &&
        (config.min3PM ? s.FG3M >= config.min3PM : true)
      );
    }).sort((a, b) => getStatValue(b) - getStatValue(a)).slice(0, 5);
  }, [isLocked, config, targetStat]);

  const filteredResults = useMemo(() => {
    if (query.length < 3 || isLocked) return [];
    return NBA_DATA.filter((row) => row.PLAYER_NAME.toLowerCase().includes(query.toLowerCase())).slice(0, 50);
  }, [query, isLocked]);

  const handleLock = () => {
    if (!selection) return;
    const s = selection;
    const year = parseInt(s.SEASON.split("-")[0]);
    const val = getStatValue(s);
    const firstName = s.PLAYER_NAME.split(" ")[0];

    // Add these new checks inside your existing handleLock if-else chain:
    
    if (config.max3PA && (s.FG3A ?? 0) > config.max3PA) {
      currentError = `Too many attempts! (${s.FG3A})`;
    }
    else if (config.minFT && (s.FT_PCT ?? 0) < config.minFT) {
      currentError = `Low FT%! (${((s.FT_PCT ?? 0) * 100).toFixed(1)}%)`;
    }
    else if (config.maxPlusMinus && (s.PLUS_MINUS ?? 0) > config.maxPlusMinus) {
      currentError = `+/- is too high!`;
    }
    else if (config.minDD2 && (s.DD2 ?? 0) < config.minDD2) {
      currentError = `Need more Double-Doubles!`;
    }
    else if (config.maxPPGRank && (s.PTS_RANK ?? 999) < config.maxPPGRank) {
      currentError = `Too high in scoring rank!`;
    }
    else if (config.maxPMRank && (s.PLUS_MINUS_RANK ?? 999) > config.maxPMRank) {
      currentError = `Not high enough in +/- rank!`;
    }

    if (currentError) {
      setError(currentError);
      onWrongGuess(); // Track the penalty
      return;
    }

    onScoreUpdate(val);
    setIsLocked(selection);
  };

  return (
    <div style={{ border: isLocked ? "2px solid #4caf50" : error ? "2px solid #ff4444" : "1px solid #333", margin: "15px auto", padding: "20px", borderRadius: "16px", maxWidth: "400px", backgroundColor: isLocked ? "#0a1a0a" : "#161616" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
        <span style={{ color: "#888", fontSize: "0.75rem", fontWeight: "bold" }}>SLOT {slotNumber} • {config.text}</span>
        {isLocked && <span style={{ color: "#4caf50", fontWeight: "bold" }}>{getStatValue(isLocked).toFixed(1)}</span>}
      </div>
      {!isLocked ? (
        <div style={{ position: "relative" }}>
          <input placeholder="Search Player..." value={query} onChange={(e) => { setQuery(e.target.value); setShowResults(true); setError(""); setSelection(null); }} style={{ width: "100%", padding: "12px", borderRadius: "8px", backgroundColor: "#222", color: "white", border: "1px solid #444", boxSizing: "border-box" }} />
          {showResults && filteredResults.length > 0 && (
            <div style={{ position: "absolute", top: "50px", left: 0, right: 0, backgroundColor: "#222", borderRadius: "8px", border: "1px solid #444", zIndex: 10, maxHeight: "200px", overflowY: "auto" }}>
              {filteredResults.map((row, i) => (
                <div key={i} style={{ padding: "12px", cursor: "pointer", borderBottom: "1px solid #333", color: "white" }} onClick={() => { setSelection(row); setQuery(`${row.PLAYER_NAME} (${row.SEASON})`); setShowResults(false); }}>
                  <b>{row.PLAYER_NAME}</b> ({row.SEASON})
                </div>
              ))}
            </div>
          )}
          {error && <p style={{ color: "#ff4444", fontSize: "0.8rem", marginTop: "10px" }}>{error}</p>}
          {selection && <button onClick={handleLock} style={{ width: "100%", marginTop: "15px", padding: "12px", backgroundColor: "#4caf50", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>Submit</button>}
        </div>
      ) : (
        <div>
          <div style={{ fontSize: "1.1rem" }}>{isLocked.PLAYER_NAME} <span style={{ color: "#666" }}>({isLocked.SEASON})</span></div>
          <div style={{ marginTop: "10px", borderTop: "1px solid #333", paddingTop: "5px" }}>
            <span style={{ fontSize: "0.7rem", color: "#555" }}>BEST MOVES:</span>
            {topAnswers.map((top, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: idx === 0 ? "#ffd700" : "#888" }}>
                <span>{idx + 1}. {top.PLAYER_NAME}</span>
                <span>{getStatValue(top).toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [totalScore, setTotalScore] = useState(0);
  const [lockedCount, setLockedCount] = useState(0);
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [slotsLocked, setSlotsLocked] = useState([null, null, null, null, null, null]);

  // AUTO-ROTATION LOGIC
  const currentChallenge = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return CHALLENGES.find(c => c.date === today) || CHALLENGES[0];
  }, []);

  const todayStat = currentChallenge.stat;
  const dailyPrompts = currentChallenge.prompts;

  const maxPossibleScore = useMemo(() => {
    return dailyPrompts.reduce((acc, config) => {
      const best = NBA_DATA.filter((s) => {
        const year = parseInt(s.SEASON.split("-")[0]);
        const firstName = s.PLAYER_NAME.split(" ")[0];
        return (
          year >= config.startYear && year <= config.endYear &&
          (config.startsWith ? firstName.startsWith(config.startsWith) : true) &&
          (config.conf ? TEAMS[config.conf].includes(s.TEAM_ABBREVIATION) : true) &&
          (config.div ? TEAMS[config.div].includes(s.TEAM_ABBREVIATION) : true) &&
          (config.maxAge ? s.AGE <= config.maxAge : true) &&
          (config.maxGP ? s.GP <= config.maxGP : true) &&
          (config.minWins ? s.W >= config.minWins : true) &&
          (config.minFG ? s.FG_PCT >= config.minFG : true) &&
          (config.min3PM ? s.FG3M >= config.min3PM : true)
        );
      }).sort((a, b) => {
        const getVal = (x) => todayStat === "ppg" ? x.PTS / x.GP : todayStat === "rpg" ? x.REB / x.GP : todayStat === "apg" ? x.AST / x.GP : x[todayStat];
        return getVal(b) - getVal(a);
      })[0];
      const bestVal = best ? (todayStat === "ppg" ? best.PTS / best.GP : todayStat === "rpg" ? best.REB / best.GP : todayStat === "apg" ? best.AST / best.GP : best[todayStat]) : 0;
      return acc + bestVal;
    }, 0);
  }, [todayStat, dailyPrompts]);

  // PENALTY LOGIC: -2% efficiency for every wrong guess
  const efficiency = Math.max(0, ((totalScore / maxPossibleScore) * 100) - (wrongGuesses * 2)).toFixed(1);

  const shareScore = () => {
    const text = `Balledgemaxxing 🏀\nTotal: ${totalScore.toFixed(1)}\nEfficiency: ${efficiency}%\nGuessed wrong ${wrongGuesses} times.\n${window.location.href}`;
    navigator.clipboard.writeText(text);
    alert("Stats copied to clipboard!");
  };

  return (
    <div style={{ backgroundColor: "#121212", color: "white", minHeight: "100vh", padding: "20px", fontFamily: "sans-serif", textAlign: "center" }}>
      <h1 style={{ letterSpacing: "2px" }}>BALLEDGEMAXXING</h1>
      <div style={{ backgroundColor: "#333", display: "inline-block", padding: "5px 15px", borderRadius: "15px", marginBottom: "20px" }}>
        <span style={{ fontSize: "0.7rem", color: "#4caf50", fontWeight: "bold" }}>GOAL: MAXIMIZE {STAT_LABELS[todayStat].toUpperCase()}</span>
      </div>

      <div style={{ position: "sticky", top: 0, backgroundColor: "#121212", padding: "10px", zIndex: 100, borderBottom: "1px solid #333" }}>
        <h2 style={{ color: "#4caf50", fontSize: "2.5rem", margin: 0 }}>{totalScore.toFixed(1)}</h2>
        <span style={{ fontSize: "0.6rem", color: "#888" }}>WRONG GUESSES: {wrongGuesses} (Penalty Applied)</span>
      </div>

      <div style={{ marginTop: "20px", paddingBottom: "100px" }}>
        {dailyPrompts.map((config, index) => (
          <StatSlot key={index} slotNumber={index + 1} config={config} targetStat={todayStat} isLocked={slotsLocked[index]} onWrongGuess={() => setWrongGuesses(prev => prev + 1)} setIsLocked={(selection) => {
            const newLocks = [...slotsLocked];
            newLocks[index] = selection;
            setSlotsLocked(newLocks);
            setLockedCount(prev => prev + 1);
          }} onScoreUpdate={(val) => setTotalScore(prev => prev + val)} />
        ))}
      </div>

      {lockedCount === 6 && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: "#1e1e1e", padding: "25px", borderTop: "3px solid #4caf50" }}>
          <h3>FINAL EFFICIENCY: {efficiency}%</h3>
          <button onClick={shareScore} style={{ padding: "12px 25px", backgroundColor: "#4caf50", color: "white", border: "none", borderRadius: "25px", fontWeight: "bold", cursor: "pointer" }}>SHARE RESULTS 📋</button>
        </div>
      )}
      <Analytics />
    </div>
  );
}

