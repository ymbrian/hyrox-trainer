"use client";

import type { TrainingSession } from "@/lib/types";

interface Props {
  session: TrainingSession;
  completed: boolean;
  onToggleComplete: () => void;
  dateLabel?: string;
}

const INTENSITY_BADGE = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function SessionCard({
  session,
  completed,
  onToggleComplete,
  dateLabel,
}: Props) {
  return (
    <div
      className={`rounded-lg border p-4 space-y-3 transition ${
        completed
          ? "border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{session.focus}</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              INTENSITY_BADGE[session.intensity ?? "medium"]
            }`}
          >
            {session.intensity ?? "medium"}
          </span>
        </div>
        {dateLabel && (
          <span className="text-xs text-zinc-400">{dateLabel}</span>
        )}
      </div>

      {/* Exercises */}
      {session.exercises.length > 0 && (
        <div className="space-y-1.5">
          {session.exercises.map((ex, i) => (
            <div
              key={`${ex.name}-${i}`}
              className="flex items-baseline justify-between text-sm"
            >
              <span className="text-zinc-700 dark:text-zinc-300">{ex.name}</span>
              <span className="text-xs text-zinc-500 shrink-0 ml-2">
                {ex.sets} × {ex.reps} | Rest: {ex.rest}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Run */}
      {session.run && (
        <div className="text-sm border-t border-zinc-100 dark:border-zinc-800 pt-2">
          <span className="text-zinc-700 dark:text-zinc-300 font-medium">
            {session.run.name}
          </span>
          <span className="text-xs text-zinc-500 ml-2">
            {session.run.duration_minutes && `${session.run.duration_minutes}min`}
            {session.run.pace_per_km && ` @ ${session.run.pace_per_km}/km`}
            {session.run.reps &&
              session.run.distance_m &&
              `${session.run.reps} × ${session.run.distance_m}m`}
            {session.run.rest_seconds && ` | ${session.run.rest_seconds}s rest`}
          </span>
        </div>
      )}

      {/* Complete toggle */}
      <button
        onClick={onToggleComplete}
        className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition ${
          completed
            ? "bg-green-600 text-white hover:bg-green-700"
            : "border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        }`}
      >
        {completed ? "✓ Completed" : "Mark Complete"}
      </button>
    </div>
  );
}
