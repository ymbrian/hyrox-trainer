import benchmarksRaw from "../../data/benchmarks.json";
import exercisesRaw from "../../data/exercises.json";

/** Raw benchmark JSON shape */
interface BenchmarkFile {
  meta: unknown;
  segments: string[];
  age_bins: string[];
  benchmarks: Record<string, Record<string, {
    n: number;
    splits: Record<string, {
      p25: number;
      p50: number;
      p75: number;
      pct_of_total: number;
    }>;
    total_time: { p25: number; p50: number; p75: number };
    roxzone: { p25: number; p50: number; p75: number; pct_of_total: number };
  }>>;
}

const raw = benchmarksRaw as unknown as BenchmarkFile;

/** Pre-computed benchmark percentiles by segment → age group */
export const benchmarks = raw.benchmarks;

/** Curated exercise library — LLM selects from this, does not invent */
export const exercises = exercisesRaw;

/**
 * Build the segment key used in benchmarks.
 * Format: "Open Men", "Pro Women", etc.
 */
export function segmentKey(division: string, gender: string): string {
  return `${division} ${gender}`;
}
