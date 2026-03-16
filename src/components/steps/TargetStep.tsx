"use client";

import { useState, useMemo } from "react";
import { formatTime } from "./SplitsStep";

interface Props {
  totalActual: number; // sum of 16 splits in seconds
  onNext: (actualRaceTime: number, targetTime: number) => void;
  onBack: () => void;
}

/** Parse "h:mm:ss" or "mm:ss" to seconds */
function parseTarget(str: string): number {
  const parts = str.split(":").map(Number);
  if (parts.some(isNaN)) return NaN;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return NaN;
}

/** Format seconds as "h:mm:ss" */
function formatLongTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function TargetStep({ totalActual, onNext, onBack }: Props) {
  const [raceTimeValue, setRaceTimeValue] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [error, setError] = useState("");

  const raceTimeSecs = useMemo(() => parseTarget(raceTimeValue), [raceTimeValue]);
  const roxzone = useMemo(
    () => (!isNaN(raceTimeSecs) && raceTimeSecs > totalActual ? raceTimeSecs - totalActual : 0),
    [raceTimeSecs, totalActual]
  );

  function handleSubmit() {
    // Validate race time
    if (isNaN(raceTimeSecs) || raceTimeSecs <= 0) {
      setError("Enter a valid official finish time in h:mm:ss or mm:ss format.");
      return;
    }
    if (raceTimeSecs < totalActual) {
      setError(
        `Official finish time must be ≥ your splits total (${formatLongTime(totalActual)}). It includes Roxzone transitions.`
      );
      return;
    }

    // Validate target time
    const targetSecs = parseTarget(targetValue);
    if (isNaN(targetSecs) || targetSecs <= 0) {
      setError("Enter a valid target time in h:mm:ss or mm:ss format.");
      return;
    }
    if (targetSecs >= raceTimeSecs) {
      setError(
        `Your target must be faster than your official finish time (${formatLongTime(raceTimeSecs)}). You're better than that — aim higher!`
      );
      return;
    }

    setError("");
    onNext(raceTimeSecs, targetSecs);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Race Time &amp; Target</h2>

      {/* Official finish time */}
      <div className="space-y-2">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Your splits total:{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {formatLongTime(totalActual)}
          </span>
        </p>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Official Finish Time
        </label>
        <input
          type="text"
          placeholder="h:mm:ss (e.g. 1:20:00)"
          value={raceTimeValue}
          onChange={(e) => setRaceTimeValue(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-3 text-sm"
        />
        {roxzone > 0 && (
          <p className="text-xs text-zinc-400">
            Roxzone (deduced): {formatTime(roxzone)}
          </p>
        )}
      </div>

      {/* Target time */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Target Finish Time
        </label>
        <input
          type="text"
          placeholder="h:mm:ss (e.g. 1:15:00)"
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-3 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-3 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          className="flex-1 rounded-lg bg-zinc-900 dark:bg-white px-4 py-3 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition"
        >
          Next: Training Days
        </button>
      </div>
    </div>
  );
}
