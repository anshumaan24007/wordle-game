import "./styles.css";
import { useState, useEffect } from "react";
import { wordsData } from "./wordsData";

const API_URL = "https://api.frontendexpert.io/api/fe/wordle-words";
const WORD_LENGTH = 5;

export default function App() {
  const [solution, setSolution] = useState("");
  const [guesses, setGuesses] = useState(() => Array(6).fill(null));
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameStatus, setGameStatus] = useState("playing"); // 'playing', 'won', 'lost'

  const [stats, setStats] = useState(() => {
    return (
      JSON.parse(localStorage.getItem("stats")) || {
        gamesPlayed: 0,
        gamesWon: 0,
        currentStreak: 0,
        maxStreak: 0,
      }
    );
  });

  const [keyStatuses, setKeyStatuses] = useState({});

  const validateWord = (guess) => {
    let result = [];
    let guessChar = guess.split("");
    let solutionChar = solution.split("");

    let solutionUsed = Array(WORD_LENGTH).fill(false);
    let letterStatus = Array(WORD_LENGTH).fill("absent");

    for (let i = 0; i < WORD_LENGTH; i++) {
      if (guessChar[i] === solutionChar[i]) {
        letterStatus[i] = "correct";
        solutionUsed[i] = true;
      }
    }

    for (let i = 0; i < WORD_LENGTH; i++) {
      if (letterStatus[i] !== "correct") {
        for (let j = 0; j < WORD_LENGTH; j++) {
          if (!solutionUsed[j] && guessChar[i] === solutionChar[j]) {
            letterStatus[i] = "present";
            solutionUsed[j] = true;
            break;
          }
        }
      }
    }

    for (let i = 0; i < WORD_LENGTH; i++) {
      result.push({
        letter: guessChar[i],
        status: letterStatus[i],
      });
    }

    return result;
  };

  const submitGuess = (guess) => {
    if (gameStatus !== "playing") return;

    const idx = guesses.findIndex((val) => val === null);
    if (idx === -1) return;

    const guessUpper = guess.toUpperCase();
    const validated = validateWord(guessUpper);
    const updatedGuesses = [...guesses];
    updatedGuesses[idx] = validated;
    setGuesses(updatedGuesses);
    setCurrentGuess("");

    // Update keyStatuses
    const newKeyStatuses = { ...keyStatuses };
    validated.forEach(({ letter, status }) => {
      const currentStatus = newKeyStatuses[letter];
      if (
        currentStatus !== "correct" &&
        (currentStatus !== "present" || status === "correct")
      ) {
        newKeyStatuses[letter] = status;
      }
    });
    setKeyStatuses(newKeyStatuses);

    const isCorrect = guessUpper === solution;
    const isLast = idx === guesses.length - 1;

    let newStats = { ...stats, gamesPlayed: stats.gamesPlayed + 1 };

    if (isCorrect) {
      setGameStatus("won");
      newStats.gamesWon++;
      newStats.currentStreak++;
      newStats.maxStreak = Math.max(newStats.maxStreak, newStats.currentStreak);
    } else if (isLast) {
      setGameStatus("lost");
      newStats.currentStreak = 0;
    }

    setStats(newStats);
    localStorage.setItem("stats", JSON.stringify(newStats));
  };

  const handleKeyDown = (e) => {
    if (gameStatus !== "playing") return;

    if (/^[a-zA-Z]$/.test(e.key) && currentGuess.length < WORD_LENGTH) {
      setCurrentGuess((prev) => prev + e.key.toUpperCase());
    } else if (e.key === "Backspace") {
      setCurrentGuess((prev) => prev.slice(0, -1));
    } else if (e.key === "Enter" && currentGuess.length === WORD_LENGTH) {
      submitGuess(currentGuess);
    }
  };

  const handleVirtualKeyPress = (key) => {
    if (gameStatus !== "playing") return;

    if (key === "ENTER" && currentGuess.length === WORD_LENGTH) {
      submitGuess(currentGuess);
    } else if (key === "BACKSPACE") {
      setCurrentGuess((prev) => prev.slice(0, -1));
    } else if (/^[A-Z]$/.test(key) && currentGuess.length < WORD_LENGTH) {
      setCurrentGuess((prev) => prev + key);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentGuess, guesses, gameStatus]);

  useEffect(() => {
    const fetchWord = async () => {
      // const response = await fetch(API_URL);
      const data = wordsData;
      setSolution(data[Math.floor(Math.random() * data.length)]);
    };
    fetchWord();
  }, []);

  return (
    <div className="outer">
      <h1 className="title">WORDLE</h1>

      <div className="board">
        {guesses.map((guess, i) => {
          const currentGuessIndex = guesses.findIndex((val) => val === null);
          const isCurrentGuess = i === currentGuessIndex;

          return (
            <Line
              key={i}
              guess={
                isCurrentGuess
                  ? currentGuess
                      .padEnd(WORD_LENGTH)
                      .split("")
                      .map((l) => ({ letter: l, status: "" }))
                  : guess
              }
            />
          );
        })}
      </div>

      <Keyboard onKeyPress={handleVirtualKeyPress} keyStatuses={keyStatuses} />

      <div className="result">
        {gameStatus === "won" && (
          <div className="banner success">🎉 You won!</div>
        )}
        {gameStatus === "lost" && (
          <div className="banner failure">
            💀 The word was <strong>{solution}</strong>
          </div>
        )}
      </div>

      <div className="stats">
        <p>Played: {stats.gamesPlayed}</p>
        <p>Wins: {stats.gamesWon}</p>
        <p>Current Streak: {stats.currentStreak}</p>
        <p>Max Streak: {stats.maxStreak}</p>
      </div>
    </div>
  );
}

function Line({ guess }) {
  return (
    <div className="row">
      {Array.from({ length: WORD_LENGTH }).map((_, i) => {
        const letterObj = guess?.[i] || { letter: "", status: "" };
        const className = `tile ${letterObj.status} ${
          letterObj.status ? "flip" : ""
        }`;
        return (
          <div key={i} className={className}>
            {letterObj.letter}
          </div>
        );
      })}
    </div>
  );
}

const KEYS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

function Keyboard({ onKeyPress, keyStatuses }) {
  return (
    <div className="keyboard">
      {KEYS.map((row, i) => (
        <div key={i} className="keyboard-row">
          {row.split("").map((key) => {
            const status = keyStatuses[key];
            const className = `key ${status || ""}`;
            return (
              <button
                key={key}
                className={className}
                onClick={() => onKeyPress(key)}
              >
                {key}
              </button>
            );
          })}
        </div>
      ))}
      <div className="keyboard-row">
        <button className="key special" onClick={() => onKeyPress("ENTER")}>
          ENTER
        </button>
        <button className="key special" onClick={() => onKeyPress("BACKSPACE")}>
          ⌫
        </button>
      </div>
    </div>
  );
}
