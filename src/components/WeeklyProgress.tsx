"use client";

import type { Phase } from "@/lib/types";

interface Props {
  weekNumber: number;
  phase: Phase;
  completedCount: number;
  totalCount: number;
}

const PHASE_COLORS = {
  Base: "bg-blue-500",
  Build: "bg-amber-500",
  "Race Prep": "bg-green-500",
};

export default function WeeklyProgress({
  weekNumber,
  phase,
  completedCount,
  totalCount,
}: Props) {
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          Week {weekNumber} · {phase}
        </span>
        <span className="text-zinc-500">
          {completedCount}/{totalCount} sessions
        </span>
      </div>
      <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${PHASE_COLORS[phase]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
