"use client";

import { useState } from "react";
import { SPLIT_NAMES, type SplitName, type SplitTimes } from "@/lib/types";

interface Props {
  onNext: (splits: SplitTimes) => void;
  onBack: () => void;
}

/** Convert "mm:ss" string to total seconds, or NaN if invalid */
function parseTime(str: string): number {
  const parts = str.split(":");
  if (parts.length !== 2) return NaN;
  const [m, s] = parts.map(Number);
  if (isNaN(m) || isNaN(s) || s < 0 || s >= 60 || m < 0) return NaN;
  return m * 60 + s;
}

/** Format seconds as "m:ss" */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SplitsStep({ onNext, onBack }: Props) {
  // Initialize all splits as empty strings for the user to fill in
  const [values, setValues] = useState<Record<SplitName, string>>(
    Object.fromEntries(SPLIT_NAMES.map((s) => [s, ""])) as Record<SplitName, string>
  );
  const [error, setError] = useState("");

  function handleSubmit() {
    const parsed: Partial<SplitTimes> = {};
    for (const name of SPLIT_NAMES) {
      const secs = parseTime(values[name]);
      if (isNaN(secs) || secs <= 0) {
        setError(`Invalid time for ${name}. Use mm:ss format (e.g. 4:30).`);
        return;
      }
      parsed[name] = secs;
    }
    setError("");
    onNext(parsed as SplitTimes);
  }

  const total = SPLIT_NAMES.reduce((sum, name) => {
    const s = parseTime(values[name]);
    return sum + (isNaN(s) ? 0 : s);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your Split Times</h2>
        {total > 0 && (
          <span className="text-sm text-zinc-500">
            Total: {formatTime(total)}
          </span>
        )}
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Enter each split from your most recent Hyrox race in mm:ss format.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SPLIT_NAMES.map((name) => (
          <div key={name} className="flex items-center gap-3">
            <label className="w-40 text-sm font-medium text-zinc-700 dark:text-zinc-300 shrink-0">
              {name}
            </label>
            <input
              type="text"
              placeholder="m:ss"
              value={values[name]}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [name]: e.target.value }))
              }
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
            />
          </div>
        ))}
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
          Next: Set Target Time
        </button>
      </div>
    </div>
  );
}
