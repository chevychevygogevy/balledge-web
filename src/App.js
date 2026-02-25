import React, { useState, useMemo, useEffect } from "react";
import "./styles.css";

const TEAMS = {
  Atlantic: ["BOS", "PHI", "NYK", "BKN", "TOR", "NJN"],
  Pacific: ["GSW", "LAL", "LAC", "PHX", "SAC"],
  East: ["BOS", "PHI", "NYK", "BKN", "TOR", "NJN", "CHI", "CLE", "DET", "IND", "MIL", "ATL", "CHA", "MIA", "ORL", "WAS", "CHH", "SYR", "PHW"],
  West: ["GSW", "LAL", "LAC", "PHX", "SAC", "DEN", "MIN", "OKC", "POR", "UTA", "DAL", "HOU", "MEM", "NOP", "SAS", "SEA", "NOK", "KCK", "SDC", "SFW", "STL"],
};

const CHALLENGES = [
  {
    date: "2026-02-26",
    stat: "FG3M",
    prompts: [
      { text: "1997-05 | Under 250 3PA", max3PA: 250, startYear: 1997, endYear: 2005 },
      { text: "2010-26 | Pacific | FT% > 90%", div: "Pacific", minFT: 0.90, startYear: 2010, endYear: 2026 },
      { text: "1997-10 | East | Negative +/-", conf: "East", maxPlusMinus: -0.1, startYear: 1997, endYear: 2010 },
      { text: "2000-15 | 15+ Double-Doubles", minDD2: 15, startYear: 2000, endYear: 2015 },
      { text: "2015-26 | West | Not Top 50 PPG Rank", conf: "West", minPPGRank: 51, startYear: 2015, endYear: 2026 },
      { text: "2020-26 | Atlantic | Top 20 +/- Rank", div: "Atlantic", maxPMRank: 20, startYear: 2020, endYear: 2026 }
    ]
  }
];

const StatSlot = ({ slotNumber, config, onScoreUpdate, isLocked, setIsLocked, targetStat, onWrongGuess, nbaData }) => {
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState(null);
  const [error, setError] = useState("");
  const [showResults, setShowResults] = useState(false);

  const filteredResults = useMemo(() => {
    if (query.length < 3 || isLocked || !nbaData) return [];
    return nbaData.filter((row) => row.PLAYER_NAME?.toLowerCase().includes(query.toLowerCase())).slice(0, 20);
  }, [query, isLocked, nbaData]);

  // Only calculate Best Moves when the slot is actually locked to save memory
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

  const handleLock = () => {
    if (!selection) return;
    const s = selection;
    const year = parseInt(s.SEASON?.split("-")[0] || "0");
    let currentError = "";

    if (year < config.startYear || year > config.endYear) currentError = "Wrong Era!";
    else if (config.div && !TEAMS[config.div]?.includes(s.TEAM_ABBREVIATION)) currentError = "Wrong Division!";
    else if (config.conf && !TEAMS[config.conf]?.includes(s.TEAM_ABBREVIATION)) currentError = "Wrong Conference!";
    else if (config.max3PA && (s.FG3A || 0) > config.max3PA) currentError = "Too many 3PA!";
    else if (config.minFT && (s.FT_PCT || 0) < config.minFT) currentError = "FT% too low!";
    else if (config.maxPlusMinus && (s.PLUS_MINUS || 0) > config.maxPlusMinus) currentError = "+/- too high!";
    else if (config.minDD2 && (s.DD2 || 0) < config.minDD2) currentError = "Need more DD!";
    else if (config.minPPGRank && (s.PTS_RANK || 999) < config.minPPGRank) currentError = "Scoring rank too high!";
    else if (config.maxPMRank && (s.PLUS_MINUS_RANK || 999) > config.maxPMRank) currentError = "+/- rank too low!";

    if (currentError) {
      setError(currentError);
      onWrongGuess();
      return;
    }
    onScoreUpdate(selection[targetStat] || 0);
    setIsLocked(selection);
  };

  return (
    <div style={{ border: isLocked ? "2px solid #4caf50" : "1px solid #333", margin: "10px auto", padding: "15px", maxWidth: "400px", borderRadius: "10px", backgroundColor: "#1b1b1b" }}>
      <p style={{ fontSize: "0.7rem", color: "#888", textAlign: "left", margin: "0 0 10px 0" }}>SLOT {slotNumber} • {config.text}</p>
      {!isLocked ? (
        <div style={{ position: "relative" }}>
          <input 
            placeholder="Search..." 
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowResults(true); setError(""); setSelection(null); }}
            style={{ width: "100%", padding: "10px", boxSizing: "border-box", borderRadius: "5px", border: "1px solid #444", background: "#222", color: "white" }}
          />
          {showResults && filteredResults.length > 0 && (
            <div style={{ position: "absolute", top: "42px", left: 0, right: 0, background: "#222", border: "1px solid #444", zIndex: 10, maxHeight: "150px", overflowY: "auto" }}>
              {filteredResults.map((r, i) => (
                <div key={i} style={{ padding: "10px", borderBottom: "1px solid #333", cursor: "pointer", fontSize: "0.9rem" }} onClick={() => { setSelection(r); setQuery(`${r.PLAYER_NAME} (${r.SEASON})`); setShowResults(false); }}>
                  {r.PLAYER_NAME} ({r.SEASON})
                </div>
              ))}
            </div>
          )}
          {error && <p style={{ color: "#ff4444", fontSize: "0.7rem", marginTop: "5px" }}>{error}</p>}
          {selection && <button onClick={handleLock} style={{ width: "100%", marginTop: "10px", padding: "10px", background: "#4caf50", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>SUBMIT SCOUT</button>}
        </div>
      ) : (
        <div style={{ textAlign: "left" }}>
          <p style={{ margin: 0 }}><b>{isLocked.PLAYER_NAME}</b> <span style={{ float: "right", color: "#4caf50" }}>+{isLocked[targetStat]}</span></p>
          <div style={{ fontSize: "0.6rem", color: "#555", marginTop: "5px" }}>
            BEST: {bestMoves.map(m => `${m.PLAYER_NAME} (${m[targetStat]})`).join(" | ")}
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
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [slotsLocked, setSlotsLocked] = useState([null, null, null, null, null, null]);

  useEffect(() => {
    fetch("/balledge_full_dataset.json")
      .then(res => res.json())
      .then(data => { setNbaData(data); setLoading(false); });
  }, []);

  if (loading) return <div style={{ color: "white", textAlign: "center", padding: "50px" }}>Scouting...</div>;

  return (
    <div style={{ backgroundColor: "#121212", color: "white", minHeight: "100vh", padding: "15px", textAlign: "center", fontFamily: "sans-serif" }}>
      <h2 style={{ letterSpacing: "2px" }}>BALLEDGEMAXXING</h2>
      <div style={{ position: "sticky", top: 0, background: "#121212", padding: "10px", zIndex: 10 }}>
        <h1 style={{ color: "#4caf50", margin: 0, fontSize: "3rem" }}>{totalScore}</h1>
        <p style={{ fontSize: "0.6rem", color: "#888" }}>MISSES: {wrongGuesses}</p>
      </div>
      {CHALLENGES[0].prompts.map((config, i) => (
        <StatSlot 
          key={i} 
          slotNumber={i + 1} 
          config={config} 
          targetStat={CHALLENGES[0].stat} 
          nbaData={nbaData} 
          isLocked={slotsLocked[i]} 
          setIsLocked={(s) => {
            const n = [...slotsLocked];
            n[i] = s;
            setSlotsLocked(n);
          }}
          onScoreUpdate={(v) => setTotalScore(prev => prev + v)}
          onWrongGuess={() => setWrongGuesses(prev => prev + 1)}
        />
      ))}
    </div>
  );
}
