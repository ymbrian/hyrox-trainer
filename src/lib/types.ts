/** Division types for Hyrox races */
export type Division = "Open" | "Pro";
export type Gender = "Men" | "Women";

/** Age group bins matching benchmark data */
export const AGE_GROUPS = [
  "16-24", "25-29", "30-34", "35-39", "40-44",
  "45-49", "50-54", "55-59", "60-64", "65+"
] as const;
export type AgeGroup = typeof AGE_GROUPS[number];

/** The 16 timed splits in a Hyrox race (8 runs + 8 stations) */
export const SPLIT_NAMES = [
  "Run 1", "SkiErg",
  "Run 2", "Sled Push",
  "Run 3", "Sled Pull",
  "Run 4", "Burpee Broad Jump",
  "Run 5", "Rowing",
  "Run 6", "Farmers Carry",
  "Run 7", "Sandbag Lunges",
  "Run 8", "Wall Balls",
] as const;
export type SplitName = typeof SPLIT_NAMES[number];

/** Station-only names (for exercise library keys) */
export const STATION_NAMES = [
  "SkiErg", "Sled Push", "Sled Pull", "Burpee Broad Jump",
  "Rowing", "Farmers Carry", "Sandbag Lunges", "Wall Balls",
] as const;
export type StationName = typeof STATION_NAMES[number];

/** The 10 analysis categories: 8 stations + Running + Roxzone */
export const CATEGORY_NAMES = [
  ...STATION_NAMES,
  "Running",
  "Roxzone",
] as const;
export type CategoryName = typeof CATEGORY_NAMES[number];

/** User-entered split times in seconds */
export type SplitTimes = Record<SplitName, number>;

/** Benchmark percentile data for a single split */
export interface SplitBenchmark {
  p25: number;
  p50: number;
  p75: number;
  pct_of_total: number;
}

/** User inputs collected across the form flow */
export interface UserInputs {
  division: Division;
  gender: Gender;
  ageGroup: AgeGroup;
  splits: SplitTimes;
  actualRaceTime: number; // official finish time in seconds (includes Roxzone)
  targetTime: number; // total target time in seconds
  trainingDays: number; // 3-6
}

/** Gap analysis result for a single split */
export interface SplitAnalysis {
  split: SplitName;
  actualTime: number;
  targetTime: number;
  gap: number; // positive = slower than target
  pctOfTotal: number;
}

/** Gap analysis result for a category (station, Running, or Roxzone) */
export interface CategoryAnalysis {
  category: string;
  actualTime: number;
  targetTime: number;
  gap: number; // positive = slower than target
}

/** Full race analysis output */
export interface RaceAnalysis {
  totalActual: number;
  totalTarget: number;
  confidence: "aggressive" | "realistic" | "conservative";
  splits: SplitAnalysis[]; // 16 individual splits (for detail table)
  categories: CategoryAnalysis[]; // 10 categories (for summary/chart)
  strengths: CategoryAnalysis[]; // top 3 categories ahead of target
  weaknesses: CategoryAnalysis[]; // top 3 categories behind target
}

/** Training plan phase */
export type Phase = "Base" | "Build" | "Race Prep";

/** A single exercise prescription in a training session */
export interface ExercisePrescription {
  name: string;
  sets: number;
  reps: string; // e.g. "10", "20m", "60s"
  rest: string; // e.g. "60s", "2min"
  notes?: string;
}

/** A run prescription in a training session */
export interface RunPrescription {
  name: string;
  type: "easy_run" | "tempo_run" | "intervals" | "compromised_run";
  duration_minutes?: number;
  pace_per_km?: string;
  reps?: number;
  distance_m?: number;
  rest_seconds?: number;
  rounds?: number;
  station?: string;
}

/** Session intensity level for rest day scheduling */
export type Intensity = "low" | "medium" | "high";

/** A single training session */
export interface TrainingSession {
  day: number;
  focus: string;
  intensity: Intensity;
  exercises: ExercisePrescription[];
  run?: RunPrescription;
}

/** A single week of the training plan */
export interface TrainingWeek {
  week: number;
  phase: Phase;
  sessions: TrainingSession[];
}

/** Complete 4-week training plan */
export interface TrainingPlan {
  weeks: TrainingWeek[];
}

/** A session mapped to a calendar date */
export interface ScheduledSession {
  weekIndex: number;
  sessionIndex: number;
  session: TrainingSession;
  calendarDate: string; // ISO date "2026-03-17"
  completed: boolean;
}

/** Persisted training state for localStorage */
export interface PersistedTrainingState {
  version: 1;
  inputs: UserInputs;
  analysis: RaceAnalysis;
  plan: TrainingPlan;
  startDate: string; // ISO date
  completedSessions: Record<string, boolean>; // key: "w0s1" (week 0, session 1)
}
