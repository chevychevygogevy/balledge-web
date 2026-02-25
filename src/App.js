import React, { useState, useMemo } from "react";
import "./styles.css";
import { Analytics } from "@vercel/analytics/react";
import NBA_DATA from "./balledge_full_dataset.json";

const TEAMS = {
  Atlantic: ["BOS", "PHI", "NYK", "BKN", "TOR", "NJN"],
  Pacific: ["GSW", "LAL", "LAC", "PHX", "SAC"],
  East: ["BOS", "PHI", "NYK", "BKN", "TOR", "NJN", "CHI", "CLE", "DET", "IND", "MIL", "ATL", "CHA", "MIA", "ORL", "WAS", "CHH", "SYR", "PHW"],
  West: ["GSW", "LAL", "LAC", "PHX", "SAC", "DEN", "MIN", "OKC", "POR", "UTA", "DAL", "HOU", "MEM", "NOP", "SAS", "SEA", "NOK", "KCK", "SDC", "SFW", "STL"],
};

const STAT_LABELS = { ppg: "Points Per Game", rpg: "Rebounds Per Game", apg: "Assists Per Game", FG3M: "Total 3-Pointers", STL: "Total Steals", BLK: "Total Blocks" };

const CHALLENGES = [
  {
    date: "2026-02-26",
    stat: "FG3M",
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

const StatSlot = ({ slotNumber, config, onScoreUpdate, isLocked, setIsLocked, targetStat, onWrongGuess }) => {
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState(null);
  const [error, setError] = useState("");
  const [showResults, setShowResults] = useState(false);

  const getStatValue = (s) => {
    if (!s) return 0;
    const gp = s.GP || 1;
    if (targetStat === "ppg") return (s.PTS || 0) / gp;
    if (targetStat === "rpg") return (s.REB || 0) / gp;
    if (targetStat === "apg") return (s.AST || 0) / gp;
    return s[targetStat] || 0;
  };

  const topAnswers = useMemo(() => {
    if (!isLocked) return [];
    return NBA_DATA.filter((s) => {
      const year = parseInt(s.SEASON?.split("-")[0] || "0");
      const firstName = s.PLAYER_NAME?.split(" ")[0] || "";
      return (
        year >= config.startYear && year <= config.endYear &&
        (config.startsWith ? firstName.startsWith(config.startsWith) : true) &&
        (config.conf ? TEAMS[config.conf]?.includes(s.TEAM_ABBREVIATION) : true) &&
        (config.div ? TEAMS[config.div]?.includes(s.TEAM_ABBREVIATION) : true) &&
        (config.maxAge ? (s.AGE || 99) <= config.maxAge : true) &&
        (config.maxGP ? (s.GP || 999) <= config.maxGP : true) &&
        (config.minWins ? (s.W || 0) >= config.minWins : true) &&
        (config.minFG ? (s.FG_PCT || 0) >= config.minFG : true) &&
        (config.min3PM ? (s.FG3M || 0) >= config.min3PM : true)
      );
    }).sort((a, b) => getStatValue(b) - getStatValue(a)).slice(0, 5);
  }, [isLocked, config, targetStat]);

  const filteredResults = useMemo(() => {
    if (query.length < 3 || isLocked) return [];
    return NBA_DATA.filter((row) => row.PLAYER_NAME?.toLowerCase().includes(query.toLowerCase())).slice(0, 50);
  }, [query, isLocked]);

  const handleLock = () => {
    if (!selection) return;
    const s = selection;
    const year = parseInt(s.SEASON?.split("-")[0] || "0");
    const val = getStatValue(s);
    const firstName = s.PLAYER_NAME?.split(" ")[0] || "";
    let currentError = "";

    if (year < config.startYear || year > config.endYear) currentError = "Outside Era!";
    else if (config.startsWith && !firstName.startsWith(config.startsWith)) currentError = "Wrong Name!";
    else if (config.conf && !TEAMS[config.conf]?.includes(s.TEAM_ABBREVIATION)) currentError = "Wrong Conference!";
    else if (config.max3PA && (s.FG3A || 0) > config.max3PA) currentError = `Too many attempts!`;
    else if (config.minFT && (s.FT_PCT || 0) < config.minFT) currentError = `Low FT%!`;
    else if (config.maxPlusMinus && (s.PLUS_MINUS || 0) > config.maxPlusMinus) currentError = `+/- too high!`;
    else if (config.minDD2 && (s.DD2 || 0) < config.minDD2) currentError = `Need more DD!`;
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
    <div style={{ border: isLocked ? "2px solid #4caf50" : error ? "2px solid #ff4444" : "1px solid #333", margin: "15px auto", padding: "20px", borderRadius: "16px", maxWidth: "400px", backgroundColor: isLocked ? "#0a1a0a" : "#161616" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
        <span style={{ color: "#888", fontSize: "0.75rem", fontWeight: "bold" }}>SLOT {slotNumber} • {config.text}</span>
