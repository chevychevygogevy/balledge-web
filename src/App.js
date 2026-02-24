import React, { useState, useMemo, useEffect } from "react";
import "./styles.css";
import NBA_DATA from "./balledge_full_dataset.json";

const TEAMS = {
  Atlantic: ["BOS", "PHI", "NYK", "BKN", "TOR", "NJN"],
  Pacific: ["GSW", "LAL", "LAC", "PHX", "SAC"],
  East: [
    "BOS",
    "PHI",
    "NYK",
    "BKN",
    "TOR",
    "NJN",
    "CHI",
    "CLE",
    "DET",
    "IND",
    "MIL",
    "ATL",
    "CHA",
    "MIA",
    "ORL",
    "WAS",
  ],
  West: [
    "GSW",
    "LAL",
    "LAC",
    "PHX",
    "SAC",
    "DEN",
    "MIN",
    "OKC",
    "POR",
    "UTA",
    "DAL",
    "HOU",
    "MEM",
    "NOP",
    "SAS",
    "SEA",
    "CHH",
    "NOK",
  ],
};

// Map your targetStat key to a human-readable label
const STAT_LABELS = {
  ppg: "Points Per Game",
  rpg: "Rebounds Per Game",
  apg: "Assists Per Game",
  FG3M: "Total 3-Pointers",
  STL: "Total Steals",
  BLK: "Total Blocks",
};

const formatSeason = (year) => {
  const nextYearShort = (year + 1).toString().slice(-2);
  return `${year}-${nextYearShort}`;
};

const StatSlot = ({
  slotNumber,
  config,
  onScoreUpdate,
  isLocked,
  setIsLocked,
  targetStat,
}) => {
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState(null);
  const [error, setError] = useState("");
  const [showResults, setShowResults] = useState(false);

  // Helper to get value based on stat type
  const getStatValue = (s) =>
    targetStat === "ppg"
      ? s.PTS / s.GP
      : targetStat === "rpg"
      ? s.REB / s.GP
      : targetStat === "apg"
      ? s.AST / s.GP
      : s[targetStat];

  const topAnswers = useMemo(() => {
    if (!isLocked) return [];
    return NBA_DATA.filter((s) => {
      const year = parseInt(s.SEASON.split("-")[0]);
      const firstName = s.PLAYER_NAME.split(" ")[0];
      const yearMatch = year >= config.startYear && year <= config.endYear;
      const nameMatch = config.startsWith
        ? firstName.startsWith(config.startsWith)
        : true;
      const confMatch = config.conf
        ? TEAMS[config.conf].includes(s.TEAM_ABBREVIATION)
        : true;
      const divMatch = config.div
        ? TEAMS[config.div].includes(s.TEAM_ABBREVIATION)
        : true;
      const ageMatch = config.maxAge ? s.AGE <= config.maxAge : true;
      const gpMatch = config.maxGP ? s.GP <= config.maxGP : true;
      const winMatch = config.minWins ? s.W >= config.minWins : true;
      const fgMatch = config.minFG ? s.FG_PCT >= config.minFG : true;
      const threeMatch = config.min3PM ? s.FG3M >= config.min3PM : true;
      return (
        yearMatch &&
        nameMatch &&
        confMatch &&
        divMatch &&
        ageMatch &&
        gpMatch &&
        winMatch &&
        fgMatch &&
        threeMatch
      );
    })
      .sort((a, b) => getStatValue(b) - getStatValue(a))
      .slice(0, 5);
  }, [isLocked, config, targetStat]);

  const filteredResults = useMemo(() => {
    if (query.length < 3 || isLocked) return [];
    return NBA_DATA.filter((row) =>
      row.PLAYER_NAME.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 50);
  }, [query, isLocked]);

  const handleLock = () => {
    if (!selection) return;
    const s = selection;
    const year = parseInt(s.SEASON.split("-")[0]);
    const val = getStatValue(s);
    const firstName = s.PLAYER_NAME.split(" ")[0];

    if (year < config.startYear || year > config.endYear) {
      setError(
        `Outside Era! Use ${formatSeason(config.startYear)} to ${formatSeason(
          config.endYear
        )}.`
      );
      return;
    }
    if (config.startsWith && !firstName.startsWith(config.startsWith)) {
      setError(`First name must start with "${config.startsWith}".`);
      return;
    }
    if (config.conf && !TEAMS[config.conf].includes(s.TEAM_ABBREVIATION)) {
      setError(`Wrong Conference!`);
      return;
    }
    if (config.div && !TEAMS[config.div].includes(s.TEAM_ABBREVIATION)) {
      setError(`Wrong Division!`);
      return;
    }
    if (config.maxAge && s.AGE > config.maxAge) {
      setError(`Too old! (${s.AGE})`);
      return;
    }
    if (config.maxGP && s.GP > config.maxGP) {
      setError(`Too many games! (${s.GP})`);
      return;
    }
    if (config.minWins && s.W < config.minWins) {
      setError(`Need ${config.minWins} wins.`);
      return;
    }
    if (config.minFG && s.FG_PCT < config.minFG) {
      setError(`Low FG%!`);
      return;
    }
    if (config.min3PM && s.FG3M < config.min3PM) {
      setError(`Need ${config.min3PM} 3PM.`);
      return;
    }

    onScoreUpdate(val);
    setIsLocked(selection);
    setError("");
    setShowResults(false);
  };

  return (
    <div
      style={{
        border: isLocked
          ? "2px solid #4caf50"
          : error
          ? "2px solid #ff4444"
          : "1px solid #333",
        margin: "15px auto",
        padding: "20px",
        borderRadius: "16px",
        maxWidth: "400px",
        backgroundColor: isLocked ? "#0a1a0a" : "#161616",
        textAlign: "left",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <span
          style={{ color: "#888", fontSize: "0.75rem", fontWeight: "bold" }}
        >
          SLOT {slotNumber} • {config.text}
          <br />
          <span style={{ color: "#444" }}>
            {formatSeason(config.startYear)} - {formatSeason(config.endYear)}
          </span>
        </span>
        {isLocked && (
          <span
            style={{ color: "#4caf50", fontWeight: "bold", fontSize: "1.2rem" }}
          >
            {getStatValue(isLocked).toFixed(targetStat.includes("pg") ? 1 : 0)}
          </span>
        )}
      </div>
      {!isLocked ? (
        <div style={{ position: "relative" }}>
          <input
            placeholder="Search Player..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowResults(true);
              setError("");
              setSelection(null);
            }}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              backgroundColor: "#222",
              color: "white",
              border: "1px solid #444",
              boxSizing: "border-box",
            }}
          />
          {showResults && filteredResults.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "50px",
                left: 0,
                right: 0,
                backgroundColor: "#222",
                borderRadius: "8px",
                border: "1px solid #444",
                zIndex: 10,
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              {filteredResults.map((row, i) => (
                <div
                  key={i}
                  style={{
                    padding: "12px",
                    cursor: "pointer",
                    borderBottom: "1px solid #333",
                    color: "white",
                  }}
                  onClick={() => {
                    setSelection(row);
                    setQuery(`${row.PLAYER_NAME} (${row.SEASON})`);
                    setShowResults(false);
                  }}
                >
                  <b>{row.PLAYER_NAME}</b> ({row.SEASON})
                </div>
              ))}
            </div>
          )}
          {error && (
            <p
              style={{
                color: "#ff4444",
                fontSize: "0.8rem",
                marginTop: "10px",
              }}
            >
              {error}
            </p>
          )}
          {selection && (
            <button
              onClick={handleLock}
              style={{
                width: "100%",
                marginTop: "15px",
                padding: "12px",
                backgroundColor: "#4caf50",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Submit
            </button>
          )}
        </div>
      ) : (
        <div>
          <div style={{ fontSize: "1.1rem", marginBottom: "10px" }}>
            {isLocked.PLAYER_NAME}{" "}
            <span style={{ color: "#666" }}>({isLocked.SEASON})</span>
          </div>
          <div style={{ borderTop: "1px solid #333", paddingTop: "10px" }}>
            <span
              style={{ fontSize: "0.7rem", color: "#555", fontWeight: "bold" }}
            >
              BEST POSSIBLE MOVES:
            </span>
            {topAnswers.map((top, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.8rem",
                  color: idx === 0 ? "#ffd700" : "#888",
                  marginTop: "4px",
                }}
              >
                <span>
                  {idx + 1}. {top.PLAYER_NAME} ({top.SEASON})
                </span>
                <span>
                  {getStatValue(top).toFixed(targetStat.includes("pg") ? 1 : 0)}
                </span>
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
  const [slotsLocked, setSlotsLocked] = useState([
    null,
    null,
    null,
    null,
    null,
    null,
  ]);

  // CONFIGURATION: Set the target stat for the day here
  const todayStat = "ppg"; // options: ppg, rpg, apg, FG3M, STL, BLK

  const dailyPrompts = [
    {
      text: "East | First Name 'D'",
      conf: "East",
      startsWith: "D",
      startYear: 2000,
      endYear: 2009,
    },
    {
      text: "Pacific | Age < 23",
      div: "Pacific",
      maxAge: 22,
      startYear: 2010,
      endYear: 2019,
    },
    {
      text: "NBA | GP < 40",
      team: null,
      maxGP: 39,
      startYear: 2015,
      endYear: 2023,
    },
    {
      text: "Atlantic | Wins > 50",
      div: "Atlantic",
      minWins: 51,
      startYear: 1996,
      endYear: 2023,
    },
    {
      text: "West | FG% > 55%",
      conf: "West",
      minFG: 0.55,
      startYear: 2005,
      endYear: 2014,
    },
    {
      text: "Any | 3PM > 200",
      team: null,
      min3PM: 201,
      startYear: 2016,
      endYear: 2023,
    },
  ];

  const maxPossibleScore = useMemo(() => {
    return dailyPrompts.reduce((acc, config) => {
      const best = NBA_DATA.filter((s) => {
        const year = parseInt(s.SEASON.split("-")[0]);
        const firstName = s.PLAYER_NAME.split(" ")[0];
        return (
          year >= config.startYear &&
          year <= config.endYear &&
          (config.startsWith
            ? firstName.startsWith(config.startsWith)
            : true) &&
          (config.conf
            ? TEAMS[config.conf].includes(s.TEAM_ABBREVIATION)
            : true) &&
          (config.div
            ? TEAMS[config.div].includes(s.TEAM_ABBREVIATION)
            : true) &&
          (config.maxAge ? s.AGE <= config.maxAge : true) &&
          (config.maxGP ? s.GP <= config.maxGP : true) &&
          (config.minWins ? s.W >= config.minWins : true) &&
          (config.minFG ? s.FG_PCT >= config.minFG : true) &&
          (config.min3PM ? s.FG3M >= config.min3PM : true)
        );
      }).sort((a, b) => {
        const valA =
          todayStat === "ppg"
            ? a.PTS / a.GP
            : todayStat === "rpg"
            ? a.REB / a.GP
            : todayStat === "apg"
            ? a.AST / a.GP
            : a[todayStat];
        const valB =
          todayStat === "ppg"
            ? b.PTS / b.GP
            : todayStat === "rpg"
            ? b.REB / b.GP
            : todayStat === "apg"
            ? b.AST / b.GP
            : b[todayStat];
        return valB - valA;
      })[0];
      const bestVal = best
        ? todayStat === "ppg"
          ? best.PTS / best.GP
          : todayStat === "rpg"
          ? best.REB / best.GP
          : todayStat === "apg"
          ? best.AST / best.GP
          : best[todayStat]
        : 0;
      return acc + bestVal;
    }, 0);
  }, [todayStat]);

  const efficiency = ((totalScore / maxPossibleScore) * 100).toFixed(1);

  const shareScore = () => {
    const text = `Balledgemaxxing 🏀\nGoal: Maximize ${
      STAT_LABELS[todayStat]
    }\nTotal: ${totalScore.toFixed(
      1
    )}\nEfficiency: ${efficiency}%\nCan you beat me?`;
    navigator.clipboard.writeText(text);
    alert("Stats copied to clipboard!");
  };

  return (
    <div
      style={{
        backgroundColor: "#121212",
        color: "white",
        minHeight: "100vh",
        padding: "20px",
        fontFamily: "sans-serif",
        textAlign: "center",
      }}
    >
      <h1 style={{ letterSpacing: "2px", margin: "10px 0" }}>BALLEDGEMAXXING</h1>

      {/* NEW STAT INDICATOR */}
      <div
        style={{
          display: "inline-block",
          backgroundColor: "#333",
          padding: "4px 12px",
          borderRadius: "12px",
          marginBottom: "15px",
        }}
      >
        <span
          style={{ fontSize: "0.7rem", color: "#4caf50", fontWeight: "bold" }}
        >
          TODAY'S GOAL: MAXIMIZE {STAT_LABELS[todayStat].toUpperCase()}
        </span>
      </div>

      <div
        style={{
          position: "sticky",
          top: "0",
          backgroundColor: "#121212",
          padding: "15px 0",
          zIndex: 100,
          borderBottom: "1px solid #333",
        }}
      >
        <h2 style={{ color: "#4caf50", margin: 0, fontSize: "2.5rem" }}>
          {totalScore.toFixed(todayStat.includes("pg") ? 1 : 0)}
        </h2>
        <span
          style={{
            fontSize: "0.7rem",
            color: "#888",
            textTransform: "uppercase",
          }}
        >
          Current Total {todayStat.toUpperCase()}
        </span>
      </div>

      <div style={{ marginTop: "20px", paddingBottom: "120px" }}>
        {dailyPrompts.map((config, index) => (
          <StatSlot
            key={index}
            slotNumber={index + 1}
            config={config}
            targetStat={todayStat}
            isLocked={slotsLocked[index]}
            setIsLocked={(selection) => {
              const newLocks = [...slotsLocked];
              newLocks[index] = selection;
              setSlotsLocked(newLocks);
              setLockedCount((prev) => prev + 1);
            }}
            onScoreUpdate={(val) => setTotalScore((prev) => prev + val)}
          />
        ))}
      </div>

      {lockedCount === 6 && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "#1e1e1e",
            padding: "25px",
            borderTop: "3px solid #4caf50",
            boxShadow: "0 -10px 40px rgba(0,0,0,0.8)",
            zIndex: 1000,
          }}
        >
          <h3 style={{ margin: "0 0 10px 0", letterSpacing: "1px" }}>
            FINAL BOX SCORE
          </h3>
          <p style={{ fontSize: "1.4rem", margin: "5px 0" }}>
            Efficiency:{" "}
            <span style={{ color: "#4caf50", fontWeight: "bold" }}>
              {efficiency}%
            </span>
          </p>
          <p style={{ color: "#888", fontSize: "0.9rem" }}>
            Total: {totalScore.toFixed(1)} / {maxPossibleScore.toFixed(1)}{" "}
            Possible {todayStat.toUpperCase()}
          </p>
          <button
            onClick={shareScore}
            style={{
              marginTop: "15px",
              padding: "12px 25px",
              backgroundColor: "#4caf50",
              color: "white",
              border: "none",
              borderRadius: "25px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            SHARE RESULTS 📋
          </button>
        </div>
      )}
    </div>
  );
}

