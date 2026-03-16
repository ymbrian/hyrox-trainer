"use client";

import { useState } from "react";

interface Props {
  onNext: (startDate: string) => void;
  onBack: () => void;
}

/** Get next Monday as YYYY-MM-DD */
function getNextMonday(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  d.setDate(d.getDate() + daysUntilMonday);
  return toISO(d);
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function StartDateStep({ onNext, onBack }: Props) {
  const [value, setValue] = useState(getNextMonday());
  const [error, setError] = useState("");

  // Compute end date for display
  const endDateDisplay = value
    ? (() => {
        const end = new Date(value + "T00:00:00");
        end.setDate(end.getDate() + 27);
        return formatDisplayDate(toISO(end));
      })()
    : "";

  function handleSubmit() {
    const d = new Date(value + "T00:00:00");
    if (isNaN(d.getTime())) {
      setError("Please select a valid date.");
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) {
      setError("Start date must be today or in the future.");
      return;
    }
    setError("");
    onNext(value);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">When Do You Start?</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Pick the first day of your 4-week training plan. We&apos;ll schedule your sessions and rest days from this date.
      </p>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Start Date
        </label>
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-3 text-sm"
        />
        {value && (
          <p className="text-xs text-zinc-400">
            {formatDisplayDate(value)} &mdash; training ends {endDateDisplay}
          </p>
        )}
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
          Start Training
        </button>
      </div>
    </div>
  );
}
