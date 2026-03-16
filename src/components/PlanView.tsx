"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { UserInputs, RaceAnalysis, TrainingPlan, TrainingWeek } from "@/lib/types";

interface Props {
  inputs: UserInputs;
  analysis: RaceAnalysis;
  plan: TrainingPlan | null;
  setPlan: (p: TrainingPlan) => void;
  onBack: () => void;
  onStartTraining: () => void;
}

const PHASE_COLORS = {
  Base: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Build: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  "Race Prep": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const INTENSITY_BADGE = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function PlanView({ inputs, analysis, plan, setPlan, onBack, onStartTraining }: Props) {
  const [loading, setLoading] = useState(!plan);
  const [weeks, setWeeks] = useState<TrainingWeek[]>(plan?.weeks ?? []);
  const [error, setError] = useState("");
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const cancelledRef = useRef(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setError("");
    cancelledRef.current = false;

    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs, analysis }),
      });

      if (cancelledRef.current) return;

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to generate training plan");
      }

      const planData: TrainingPlan = await res.json();
      setWeeks(planData.weeks);
      setPlan(planData);
    } catch (err: unknown) {
      if (!cancelledRef.current && err instanceof Error) {
        setError(err.message);
      }
    } finally {
      if (!cancelledRef.current) {
        setLoading(false);
      }
    }
  }, [inputs, analysis, setPlan]);

  useEffect(() => {
    if (plan) return;
    generate();
    return () => { cancelledRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your 4-Week Training Plan</h2>
        {loading && (
          <span className="text-sm text-zinc-500 animate-pulse">
            Generating your plan...
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Weeks — show as they arrive */}
      <div className="space-y-3">
        {weeks.map((week) => (
          <div
            key={week.week}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden"
          >
            <button
              onClick={() =>
                setExpandedWeek(expandedWeek === week.week ? null : week.week)
              }
              className="flex w-full items-center justify-between p-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900 transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">Week {week.week}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    PHASE_COLORS[week.phase]
                  }`}
                >
                  {week.phase}
                </span>
              </div>
              <span className="text-sm text-zinc-400">
                {week.sessions.length} sessions
              </span>
            </button>

            {expandedWeek === week.week && (
              <div className="border-t border-zinc-100 dark:border-zinc-800 p-4 space-y-4">
                {week.sessions.map((session, si) => (
                  <div key={si} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium">
                        Day {session.day}: {session.focus}
                      </h4>
                      {session.intensity && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            INTENSITY_BADGE[session.intensity]
                          }`}
                        >
                          {session.intensity}
                        </span>
                      )}
                    </div>

                    {/* Exercises */}
                    {session.exercises.length > 0 && (
                      <div className="space-y-1 pl-4">
                        {session.exercises.map((ex, ei) => (
                          <div
                            key={ei}
                            className="flex items-baseline justify-between text-sm"
                          >
                            <span className="text-zinc-700 dark:text-zinc-300">
                              {ex.name}
                            </span>
                            <span className="text-xs text-zinc-500 shrink-0 ml-2">
                              {ex.sets} × {ex.reps} | Rest: {ex.rest}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Run */}
                    {session.run && (
                      <div className="pl-4 text-sm">
                        <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                          {session.run.name}
                        </span>
                        <span className="text-xs text-zinc-500 ml-2">
                          {session.run.duration_minutes &&
                            `${session.run.duration_minutes}min`}
                          {session.run.pace_per_km &&
                            ` @ ${session.run.pace_per_km}/km`}
                          {session.run.reps &&
                            session.run.distance_m &&
                            `${session.run.reps} × ${session.run.distance_m}m`}
                          {session.run.rest_seconds &&
                            ` | ${session.run.rest_seconds}s rest`}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-3 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        >
          Back
        </button>
        {!loading && weeks.length > 0 && (
          <button
            onClick={onStartTraining}
            className="flex-1 rounded-lg bg-zinc-900 dark:bg-white px-4 py-3 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition"
          >
            Start Training →
          </button>
        )}
      </div>
    </div>
  );
}
