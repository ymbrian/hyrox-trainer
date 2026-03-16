"use client";

import { useState } from "react";

interface Props {
  onNext: (days: number) => void;
  onBack: () => void;
}

export default function TrainingDaysStep({ onNext, onBack }: Props) {
  const [days, setDays] = useState(4);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Training Days Per Week</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        How many days per week can you train?
      </p>

      <div className="flex gap-3">
        {[3, 4, 5, 6].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition ${
              days === d
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400"
            }`}
          >
            {d} days
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-3 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        >
          Back
        </button>
        <button
          onClick={() => onNext(days)}
          className="flex-1 rounded-lg bg-zinc-900 dark:bg-white px-4 py-3 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition"
        >
          Analyze My Race
        </button>
      </div>
    </div>
  );
}
