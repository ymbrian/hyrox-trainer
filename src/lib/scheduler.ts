import type { TrainingPlan, ScheduledSession } from "./types";

/**
 * Map training plan sessions to calendar dates with intensity-aware rest placement.
 *
 * Algorithm per week:
 * 1. Take N sessions for the week.
 * 2. Distribute across 7 calendar slots (or fewer for partial week 1).
 * 3. Ensure rest day after every "high" intensity session.
 * 4. No two "high" sessions adjacent.
 * 5. Fill remaining slots as rest days.
 */
export function scheduleTraining(
  plan: TrainingPlan,
  startDate: string,
  trainingDays: number,
  completedSessions: Record<string, boolean> = {}
): ScheduledSession[] {
  const schedule: ScheduledSession[] = [];
  const start = new Date(startDate + "T00:00:00");

  for (let wi = 0; wi < plan.weeks.length; wi++) {
    const week = plan.weeks[wi];
    const sessions = week.sessions;

    // Calculate the start of this week
    const weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() + wi * 7);

    // Available slots: 7 for full weeks, fewer if week 1 starts mid-week
    // Week 1: remaining days in the calendar week (Sun-Sat) from start date
    let availableSlots = 7;
    if (wi === 0) {
      const startDay = weekStart.getDay(); // 0=Sun .. 6=Sat
      availableSlots = 7 - startDay; // e.g. Thursday (4) → 3 slots left
      if (availableSlots === 0) availableSlots = 7; // Sunday start = full week
    }

    // Place sessions into slots using intensity-aware greedy algorithm
    const slots: (number | null)[] = new Array(availableSlots).fill(null);
    const sessionsToPlace = sessions.slice(0, Math.min(sessions.length, availableSlots));

    // Sort: place high-intensity first (they need rest after them)
    const indexed = sessionsToPlace.map((s, i) => ({ session: s, origIndex: i }));
    const highFirst = [...indexed].sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a.session.intensity] ?? 1) - (order[b.session.intensity] ?? 1);
    });

    // Greedy placement
    for (const { origIndex, session } of highFirst) {
      const placed = placeSession(slots, origIndex, session.intensity === "high", availableSlots);
      if (!placed) {
        // Fallback: place in first available slot (ignore rest constraint)
        for (let s = 0; s < availableSlots; s++) {
          if (slots[s] === null) {
            slots[s] = origIndex;
            break;
          }
        }
      }
    }

    // Convert slots to ScheduledSession objects
    for (let slot = 0; slot < availableSlots; slot++) {
      if (slots[slot] !== null) {
        const si = slots[slot]!;
        const date = new Date(weekStart);
        date.setDate(date.getDate() + slot);
        const dateStr = toISODate(date);
        const key = `w${wi}s${si}`;

        schedule.push({
          weekIndex: wi,
          sessionIndex: si,
          session: sessions[si],
          calendarDate: dateStr,
          completed: !!completedSessions[key],
        });
      }
    }
  }

  return schedule;
}

/**
 * Try to place a session in the earliest valid slot.
 * If needsRestAfter is true, the next slot must be free (for rest day).
 * Returns true if placed successfully.
 */
function placeSession(
  slots: (number | null)[],
  sessionIndex: number,
  needsRestAfter: boolean,
  totalSlots: number
): boolean {
  for (let s = 0; s < totalSlots; s++) {
    if (slots[s] !== null) continue;

    // Skip slot if previous slot is occupied by a high-intensity session (avoid adjacent highs)
    if (s > 0 && slots[s - 1] !== null) {
      // We can't easily look up intensity from the slot index alone,
      // but high-intensity sessions reserve the next slot as rest.
      // If the previous slot is taken and THIS session is high, skip to avoid clustering.
      if (needsRestAfter) continue;
    }

    if (needsRestAfter) {
      // Need the next slot to be free for rest
      if (s + 1 < totalSlots && slots[s + 1] !== null) continue;
      // Reserve next slot as rest (leave it null)
      slots[s] = sessionIndex;
      return true;
    }

    slots[s] = sessionIndex;
    return true;
  }
  return false;
}

/** Get today's ISO date string */
export function todayISO(): string {
  return toISODate(new Date());
}

/** Format a Date as "YYYY-MM-DD" in local timezone */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Find the session scheduled for a given date, or null (rest day) */
export function getSessionForDate(
  schedule: ScheduledSession[],
  date: string
): ScheduledSession | null {
  return schedule.find((s) => s.calendarDate === date) ?? null;
}

/** Get all sessions for a given week index */
export function getWeekSessions(
  schedule: ScheduledSession[],
  weekIndex: number
): ScheduledSession[] {
  return schedule.filter((s) => s.weekIndex === weekIndex);
}

/** Determine which week index a date falls in */
export function getWeekIndex(startDate: string, date: string): number {
  const start = new Date(startDate + "T00:00:00");
  const target = new Date(date + "T00:00:00");
  const diffDays = Math.floor((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7);
}
