"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import type { TrainingPlan, ScheduledSession } from "@/lib/types";
import { scheduleTraining, todayISO, getWeekIndex } from "@/lib/scheduler";
import SessionCard from "./SessionCard";
import WeeklyProgress from "./WeeklyProgress";

interface Props {
  plan: TrainingPlan;
  startDate: string;
  trainingDays: number;
  completedSessions: Record<string, boolean>;
  onToggleComplete: (key: string) => void;
  onStartOver: () => void;
}

function formatDateShort(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function TodayView({
  plan,
  startDate,
  trainingDays,
  completedSessions,
  onToggleComplete,
  onStartOver,
}: Props) {
  const schedule = useMemo(
    () => scheduleTraining(plan, startDate, trainingDays, completedSessions),
    [plan, startDate, trainingDays, completedSessions]
  );

  const [today, setToday] = useState(todayISO());
  const [viewDate, setViewDate] = useState(today);

  // Refresh "today" when the tab regains focus (handles midnight rollover)
  const refreshToday = useCallback(() => {
    const now = todayISO();
    setToday((prev) => {
      if (prev !== now) {
        setViewDate((vd) => (vd === prev ? now : vd));
        return now;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    document.addEventListener("visibilitychange", refreshToday);
    return () => document.removeEventListener("visibilitychange", refreshToday);
  }, [refreshToday]);

  // Find session for the viewed date
  const currentSession = schedule.find((s) => s.calendarDate === viewDate) ?? null;

  // Current week info
  const weekIdx = getWeekIndex(startDate, viewDate);
  const clampedWeekIdx = Math.max(0, Math.min(weekIdx, plan.weeks.length - 1));
  const currentWeek = plan.weeks[clampedWeekIdx];
  const weekSessions = schedule.filter((s) => s.weekIndex === clampedWeekIdx);
  const weekCompleted = weekSessions.filter((s) => s.completed).length;

  // Plan date range
  const planEnd = new Date(startDate + "T00:00:00");
  planEnd.setDate(planEnd.getDate() + 27); // 4 weeks
  const planEndISO = toISO(planEnd);

  // Navigate between days
  function shiftDate(days: number) {
    const d = new Date(viewDate + "T00:00:00");
    d.setDate(d.getDate() + days);
    const newDate = toISO(d);
    // Clamp to plan range
    if (newDate < startDate || newDate > planEndISO) return;
    setViewDate(newDate);
  }

  const isToday = viewDate === today;
  const isBeforePlan = viewDate < startDate;
  const isAfterPlan = viewDate > planEndISO;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {isToday ? "Today's Workout" : formatDateShort(viewDate)}
        </h2>
        {!isToday && (
          <button
            onClick={() => setViewDate(today)}
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition"
          >
            Go to Today
          </button>
        )}
      </div>

      {/* Weekly Progress */}
      {currentWeek && (
        <WeeklyProgress
          weekNumber={clampedWeekIdx + 1}
          phase={currentWeek.phase}
          completedCount={weekCompleted}
          totalCount={weekSessions.length}
        />
      )}

      {/* Day Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => shiftDate(-1)}
          disabled={viewDate <= startDate}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        >
          ← Prev
        </button>
        <span className="text-sm text-zinc-500">
          {formatDateShort(viewDate)}
          {isToday && " (today)"}
        </span>
        <button
          onClick={() => shiftDate(1)}
          disabled={viewDate >= planEndISO}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        >
          Next →
        </button>
      </div>

      {/* Session or Rest Day */}
      {isBeforePlan || isAfterPlan ? (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <p className="text-zinc-500">
            {isBeforePlan
              ? "Training hasn't started yet."
              : "Training plan complete! 🎉"}
          </p>
        </div>
      ) : currentSession ? (
        <SessionCard
          session={currentSession.session}
          completed={currentSession.completed}
          onToggleComplete={() =>
            onToggleComplete(`w${currentSession.weekIndex}s${currentSession.sessionIndex}`)
          }
        />
      ) : (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <p className="text-2xl mb-2">🧘</p>
          <p className="text-zinc-600 dark:text-zinc-400 font-medium">Rest Day</p>
          <p className="text-sm text-zinc-400 mt-1">
            Recovery is part of the plan. Take it easy today.
          </p>
        </div>
      )}

      {/* Overall progress */}
      <div className="text-center text-xs text-zinc-400">
        {schedule.filter((s) => s.completed).length} / {schedule.length} total
        sessions completed
      </div>

      {/* Start Over */}
      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <button
          onClick={onStartOver}
          className="text-sm text-zinc-400 hover:text-red-500 transition"
        >
          Start Over
        </button>
        <span className="text-xs text-zinc-300 dark:text-zinc-600 ml-2">
          Progress is stored locally in this browser
        </span>
      </div>
    </div>
  );
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}
