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
      { text: "1980-89 | Under 250 3PA", max3PA: 250, startYear: 1980, endYear: 1989 },
      { text: "2010-26 | Pacific | FT% > 90%", div: "Pacific", minFT: 0.90, startYear: 2010, endYear: 2026 },
      { text: "2000-10 | East | Negative +/-", conf: "East", maxPlusMinus: -0.1, startYear: 2000, endYear: 2010 },
      { text: "1990-05 | 15+ Double-Doubles", minDD2: 15, startYear: 1990, endYear: 2005 },
      { text: "2015-26 | West | Not Top 50 PPG Rank", conf: "West", maxPPGRank: 51, startYear: 2015, endYear: 2026 },
      { text: "2020-26 | Atlantic | Top 20 +/- Rank", div: "Atlantic", maxPMRank: 20, startYear: 2020, endYear: 2026 }
    ]
  }
];

const StatSlot = ({ slotNumber, config, onScoreUpdate, isLocked, setIsLocked, targetStat, onWrongGuess, nbaData }) => {
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState(null);
  const [error, setError] = useState("");
  const [showResults, setShowResults] = useState(false);

  const getStatValue = (s) => {
    if (!s) return 0;
    const gp = s.GP || 1;
    if (targetStat === "ppg") return (s.PTS || 0) / gp;
    return s[targetStat] || 0;
  };

  // Optimization: Only compute top answers when slot is locked to prevent lag/crashing
  const topAnswers = useMemo(() => {
    if (!isLocked || !nbaData) return [];
    return nbaData.filter((s) => {
      const year = parseInt(s.SEASON?.split("-")[0] || "0");
      return (
        year >= config.startYear && year <= config.endYear &&
        (config.conf ? TEAMS[config.conf]?.includes(s.TEAM_ABBREVIATION) : true) &&
        (config.div ? TEAMS[config.div]?.includes(s.TEAM_ABBREVIATION) : true) &&
        (config.max3PA ? (s.FG3A || 0) <= config.max3PA : true) &&
        (config.minFT ? (s.FT_PCT || 0) >= config.minFT : true) &&
        (config.maxPlusMinus ? (s.PLUS_MINUS || 0) <= config.maxPlusMinus : true) &&
        (config.minDD2 ? (s.DD2 || 0) >= config.minDD2 : true) &&
        (config.maxPPGRank ? (s.PTS_RANK || 999) >= config.maxPPGRank : true) &&
        (config.maxPMRank ? (s.PLUS_MINUS_RANK || 999) <= config.maxPMRank : true)
      );
    }).sort((a, b) => getStatValue(b) - getStatValue(a)).slice(0, 5);
  }, [isLocked, config, targetStat, nbaData]);

  const filteredResults = useMemo(() => {
    if (query.length < 3 || isLocked || !nbaData) return [];
    return nbaData.filter((row) => row.PLAYER_NAME?.toLowerCase().includes(query.toLowerCase())).slice(0, 25);
  }, [query, isLocked, nbaData]);

  const handleLock = () => {
    if (!selection) return;
    const s = selection;
    const year = parseInt(s.SEASON?.split("-")[0] || "0");
    const val = getStatValue(s);
    let currentError = "";

    if (year < config.startYear || year > config.endYear) currentError = "Outside Era!";
    else if (config.conf && !TEAMS[config.conf]?.includes(s.TEAM_ABBREVIATION)) currentError = "Wrong Conf!";
    else if (config.div && !TEAMS[config.div]?.includes(s.TEAM_ABBREVIATION)) currentError = "Wrong Div!";
    else if (config.max3PA && (s.FG3A || 0) > config.max3PA) currentError = `Too many 3PA!`;
    else if (config.minFT && (s.FT_PCT || 0) < config.minFT) currentError = `FT% too low!`;
    else if (config.maxPlusMinus && (s.PLUS_MINUS || 0) > config.maxPlusMinus) currentError = `+/- too high!`;
    else if (config.minDD2 && (s.DD2 || 0) < config.minDD2) currentError = `Not enough DD!`;
    else if (config.maxPPGRank && (s.PTS_RANK || 999) < config.maxPPGRank) currentError = `Scoring rank too high!`;
    else if (config.maxPMRank && (s.PLUS_MINUS_RANK || 999) > config.maxPMRank) currentError = `+/- rank too low!`;

    if (currentError) {
      setError(currentError);
      onWrongGuess();
      return;
    }
    onScoreUpdate(val);
    setIsLocked(selection);
  };

  return (
    <div style={{ border: isLocked ? "2px solid #4caf50" : error ? "2px solid #ff4444" : "1px solid #333", margin: "12px auto", padding: "15px", borderRadius: "12px", maxWidth: "380px", backgroundColor: isLocked ? "#0a1a0a" : "#161616" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
        <span style={{ color: "#888", fontSize: "0.7rem", fontWeight: "bold" }}>SLOT {slotNumber} • {config.text}</span>
        {isLocked && <span style={{ color: "#4caf50", fontWeight: "bold" }}>{getStatValue(isLocked).toFixed(1)}</span>}
      </div>
      {!isLocked ? (
        <div style={{ position: "relative" }}>
          <input placeholder="Search Player..." value={query} onChange={(e) => { setQuery(e.target.value); setShowResults(true); setError(""); setSelection(null); }} style={{ width: "100%", padding: "10px", borderRadius: "6px", backgroundColor: "#222", color: "white", border: "1px solid #444", boxSizing: "border-box" }} />
          {showResults && filteredResults.length > 0 && (
            <div style={{ position: "absolute", top: "45px", left: 0, right: 0, backgroundColor: "#222", borderRadius: "6px", border: "1px solid #444", zIndex: 10, maxHeight: "150px", overflowY: "auto" }}>
              {filteredResults.map((row, i) => (
                <div key={i} style={{ padding: "10px", cursor: "pointer", borderBottom: "1px solid #333", fontSize: "0.9rem" }} onClick={() => { setSelection(row); setQuery(`${row.PLAYER_NAME} (${row.SEASON})`); setShowResults(false); }}>
                  <b>{row.PLAYER_NAME}</b> ({row.SEASON})
                </div>
              ))}
            </div>
          )}
          {error && <p style={{ color: "#ff4444", fontSize: "0.75rem", marginTop: "8px" }}>{error}</p>}
          {selection && <button onClick={handleLock} style={{ width: "100%", marginTop: "10px", padding: "10px", backgroundColor: "#4caf50", color: "white", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>Lock Pick</button>}
        </div>
      ) : (
        <div>
          <div style={{ fontSize: "1rem" }}>{isLocked.PLAYER_NAME} <span style={{ color: "#666" }}>({isLocked.SEASON})</span></div>
          <div style={{ marginTop: "8px", borderTop: "1px solid #333", paddingTop: "5px" }}>
            <span style={{ fontSize: "0.6rem", color: "#555" }}>BEST MOVES:</span>
            {topAnswers.map((top, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: idx === 0 ? "#ffd700" : "#888" }}>
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
  const [nbaData, setNbaData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalScore, setTotalScore] = useState(0);
  const [lockedCount, setLockedCount] = useState(0);
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [slotsLocked, setSlotsLocked] = useState([null, null, null, null, null, null]);

  useEffect(() => {
    fetch("/balledge_full_dataset.json")
      .then((res) => res.json())
      .then((data) => {
        setNbaData(data);
        setLoading(false);
      })
      .catch((err) => { console.error(err); setLoading(false); });
  }, []);

  const currentChallenge = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return CHALLENGES.find(c => c.date === today) || CHALLENGES[0];
  }, []);

  const maxPossibleScore = useMemo(() => {
    if (!nbaData.length) return 0;
    return currentChallenge.prompts.reduce((acc, config) => {
      const best = nbaData.filter((s) => {
        const year = parseInt(s.SEASON?.split("-")[0] || "0");
        return (
          year >= config.startYear && year <= config.endYear &&
          (config.conf ? TEAMS[config.conf]?.includes(s.TEAM_ABBREVIATION) : true) &&
          (config.div ? TEAMS[config.div]?.includes(s.TEAM_ABBREVIATION) : true) &&
          (config.max3PA ? (s.FG3A || 0) <= config.max3PA : true) &&
          (config.minFT ? (s.FT_PCT || 0) >= config.minFT : true) &&
          (config.maxPlusMinus ? (s.PLUS_MINUS || 0) <= config.maxPlusMinus : true) &&
          (config.minDD2 ? (s.DD2 || 0) >= config.minDD2 : true) &&
          (config.maxPPGRank ? (s.PTS_RANK || 999) >= config.maxPPGRank : true) &&
          (config.maxPMRank ? (s.PLUS_MINUS_RANK || 999) <= config.maxPMRank : true)
        );
      }).sort((a, b) => (b.FG3M || 0) - (a.FG3M || 0))[0];
      return acc + (best?.FG3M || 0);
    }, 0);
  }, [nbaData, currentChallenge]);

  const efficiency = Math.max(0, ((totalScore / (maxPossibleScore || 1)) * 100) - (wrongGuesses * 2)).toFixed(1);

  if (loading) return <div style={{ color: "white", textAlign: "center", marginTop: "50px" }}>Scouting...</div>;

  return (
    <div style={{ backgroundColor: "#121212", color: "white", minHeight: "100vh", padding: "15px", fontFamily: "sans-serif", textAlign: "center" }}>
      <h1 style={{ letterSpacing: "1px", fontSize: "1.5rem" }}>BALLEDGEMAXXING</h1>
      <div style={{ backgroundColor: "#333", display: "inline-block", padding: "4px 12px", borderRadius: "10px", marginBottom: "15px" }}>
        <span style={{ fontSize: "0.6rem", color: "#4caf50", fontWeight: "bold" }}>GOAL: MAX {STAT_LABELS[currentChallenge.stat]}</span>
      </div>
      <div style={{ position: "sticky", top: 0, backgroundColor: "#121212", padding: "10px", zIndex: 100 }}>
        <h2 style={{ color: "#4caf50", fontSize: "2rem", margin: 0 }}>{totalScore.toFixed(0)}</h2>
        <span style={{ fontSize: "0.5rem", color: "#888" }}>MISSES: {wrongGuesses}</span>
      </div>
      <div style={{ marginTop: "15px", paddingBottom: "80px" }}>
        {currentChallenge.prompts.map((config, index) => (
          <StatSlot key={index} slotNumber={index + 1} config={config} targetStat={currentChallenge.stat} nbaData={nbaData} isLocked={slotsLocked[index]} onWrongGuess={() => setWrongGuesses(prev => prev + 1)} setIsLocked={(selection) => {
            const newLocks = [...slotsLocked];
            newLocks[index] = selection;
            setSlotsLocked(newLocks);
            setLockedCount(prev => prev + 1);
          }} onScoreUpdate={(val) => setTotalScore(prev => prev + val)} />
        ))}
      </div>
      {lockedCount === 6 && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: "#1e1e1e", padding: "20px", borderTop: "2px solid #4caf50" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>EFFICIENCY: {efficiency}%</h3>
          <button onClick={() => {
            navigator.clipboard.writeText(`Balledgemaxxing 🏀\nTotal: ${totalScore.toFixed(0)} ${STAT_LABELS[currentChallenge.stat]}\nEfficiency: ${efficiency}%`);
            alert("Copied!");
          }} style={{ padding: "10px 20px", backgroundColor: "#4caf50", color: "white", border: "none", borderRadius: "20px", fontWeight: "bold" }}>SHARE</button>
        </div>
      )}
    </div>
  );
}
