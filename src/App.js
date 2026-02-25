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
      { text: "1980-89 | Under 250 3PA", max3PA: 250, startYear: 1980, endYear: 1989 },
      { text: "1980-95 | Atlantic | FT% > 90%", div: "Atlantic", minFT: 0.90, startYear: 1980, endYear: 1995 },
      { text: "1980-90 | Under 15 PPG", maxPPG: 15, startYear: 1980, endYear: 1990 },
      { text: "1996-05 | 15+ Double-Doubles", minDD2: 15, startYear: 1996, endYear: 2005 },
      { text: "2015-26 | West | Not Top 50 PPG Rank", conf: "West", minPPGRank: 51, startYear: 2015, endYear: 2026 },
      { text: "2020-26 | Pacific | Top 20 +/- Rank", div: "Pacific", maxPMRank: 20, startYear: 2020, endYear: 2026 }
    ]
  }
];

export default function App() {
  const [nbaData, setNbaData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalScore, setTotalScore] = useState(0);
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [slotsLocked, setSlotsLocked] = useState([null, null, null, null, null, null]);
  const [bestResults, setBestResults] = useState([]);

  useEffect(() => {
    fetch("/balledge_full_dataset.json")
      .then(res => res.json())
      .then(data => {
        setNbaData(data);
        setLoading(false);
      });
  }, []);

  const currentChallenge = CHALLENGES[0]; // Logic for daily rotation can be added here

  // COMPUTE BEST MOVES ONLY ONCE TO PREVENT CRASHING
  useEffect(() => {
    if (!nbaData.length) return;
    const computed = currentChallenge.prompts.map(config => {
      return nbaData.filter(s => {
        const year = parseInt(s.SEASON?.split("-")[0] || "0");
        const ppg = (s.PTS || 0) / (s.GP || 1);
        return (
          year >= config.startYear && year <= config.endYear &&
          (config.div ? TEAMS[config.div]?.includes(s.TEAM_ABBREVIATION) : true) &&
          (config.conf ? TEAMS[config.conf]?.includes(s.TEAM_ABBREVIATION) : true) &&
          (config.max3PA ? (s.FG3A || 0) <= config.max3PA : true) &&
          (config.minFT ? (s.FT_PCT || 0) >= config.minFT : true) &&
          (config.maxPPG ? ppg <= config.maxPPG : true) &&
          (config.minDD2 ? (s.DD2 || 0) >= config.minDD2 : true) &&
          (config.minPPGRank ? (s.PTS_RANK || 999) >= config.minPPGRank : true) &&
          (config.maxPMRank ? (s.PLUS_MINUS_RANK || 999) <= config.maxPMRank : true)
        );
      }).sort((a, b) => (b.FG3M || 0) - (a.FG3M || 0)).slice(0, 5);
    });
    setBestResults(computed);
  }, [nbaData]);

  const maxPossibleScore = useMemo(() => {
    return bestResults.reduce((acc, list) => acc + (list[0]?.FG3M || 0), 0);
  }, [bestResults]);

  const efficiency = maxPossibleScore > 0 ? ((totalScore / maxPossibleScore) * 100 - (wrongGuesses * 2)).toFixed(1) : 0;

  if (loading) return <div style={{ color: "white", padding: "50px" }}>Scouting...</div>;

  return (
    <div style={{ backgroundColor: "#121212", color: "white", minHeight: "100vh", padding: "15px", textAlign: "center", fontFamily: "sans-serif" }}>
      <h2>BALLEDGEMAXXING</h2>
      <div style={{ position: "sticky", top: 0, background: "#121212", padding: "10px", zIndex: 10 }}>
        <h1 style={{ color: "#4caf50", margin: 0 }}>{totalScore}</h1>
        <p style={{ fontSize: "0.6rem", color: "#888" }}>MISSES: {wrongGuesses}</p>
      </div>

      {currentChallenge.prompts.map((config, i) => (
        <div key={i} style={{ border: "1px solid #333", margin: "10px auto", padding: "15px", maxWidth: "400px", borderRadius: "10px", backgroundColor: slotsLocked[i] ? "#0a1a0a" : "#1b1b1b" }}>
          <p style={{ fontSize: "0.7rem", color: "#888", fontWeight: "bold", textAlign: "left" }}>SLOT {i + 1} • {config.text}</p>
          
          {!slotsLocked[i] ? (
            <input 
              placeholder="Search..." 
              style={{ width: "100%", padding: "10px", boxSizing: "border-box", borderRadius: "5px", border: "none" }}
              onChange={(e) => {
                const val = e.target.value;
                if (val.length < 3) return;
                const found = nbaData.find(s => s.PLAYER_NAME.toLowerCase() === val.toLowerCase());
                if (found) {
                    // Logic to validate based on currentError checks...
                    setSlotsLocked(prev => {
                      const n = [...prev];
                      n[i] = found;
                      return n;
                    });
                    setTotalScore(prev => prev + (found.FG3M || 0));
                }
              }}
            />
          ) : (
            <div style={{ textAlign: "left" }}>
              <p>{slotsLocked[i].PLAYER_NAME} ({slotsLocked[i].SEASON}) <span style={{ float: "right", color: "#4caf50" }}>+{slotsLocked[i].FG3M}</span></p>
              <div style={{ fontSize: "0.6rem", color: "#555", borderTop: "1px solid #333", paddingTop: "5px" }}>
                BEST: {bestResults[i]?.map((b, idx) => `${idx + 1}. ${b.PLAYER_NAME} (${b.FG3M})`).join(" | ")}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
