"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { UserInputs } from "@/lib/types";
import { STATION_NAMES } from "@/lib/types";
import { benchmarks, segmentKey } from "@/lib/data";

interface Props {
  inputs: UserInputs;
}

/** Axis labels for the spider chart */
const AXIS_NAMES = [...STATION_NAMES, "Runs", "Roxzone"] as const;

/** Short labels for better chart readability */
const SHORT_LABELS: Record<string, string> = {
  "SkiErg": "SkiErg",
  "Sled Push": "Sled Push",
  "Sled Pull": "Sled Pull",
  "Burpee Broad Jump": "Burpees",
  "Rowing": "Rowing",
  "Farmers Carry": "Farmers",
  "Sandbag Lunges": "Lunges",
  "Wall Balls": "Wall Balls",
  "Runs": "Runs",
  "Roxzone": "Roxzone",
};

/** Run split names in the benchmark data */
const RUN_NAMES = [
  "Run 1", "Run 2", "Run 3", "Run 4",
  "Run 5", "Run 6", "Run 7", "Run 8",
] as const;

/**
 * Map a user's time to a 0-100 scale based on benchmark percentiles.
 *
 * Scale (lower time = better = outer ring):
 *   - p75 (slowest) = 25 (inner ring)
 *   - p50 (median)  = 50 (middle ring)
 *   - p25 (fastest)  = 75 (second outer ring)
 *   - Faster than p25 = up to 100 (outermost)
 *   - Slower than p75 = down to 0 (center)
 *
 * Linear interpolation between percentile bands.
 * Note: lower time = faster = higher score (inverted scale).
 */
function timeToScore(time: number, p25: number, p50: number, p75: number): number {
  if (time <= p25) {
    // Faster than p25 — scale from 75 to 100
    // Use p25-to-p50 band width as reference for extrapolation
    const band = p50 - p25;
    if (band === 0) return 100;
    const extra = (p25 - time) / band;
    return Math.min(100, 75 + extra * 25);
  }
  if (time <= p50) {
    // Between p25 and p50 — scale from 50 to 75
    const band = p50 - p25;
    if (band === 0) return 62.5;
    const pct = (p50 - time) / band;
    return 50 + pct * 25;
  }
  if (time <= p75) {
    // Between p50 and p75 — scale from 25 to 50
    const band = p75 - p50;
    if (band === 0) return 37.5;
    const pct = (p75 - time) / band;
    return 25 + pct * 25;
  }
  // Slower than p75 — scale from 0 to 25
  const band = p75 - p50;
  if (band === 0) return 0;
  const extra = (time - p75) / band;
  return Math.max(0, 25 - extra * 25);
}

interface ChartDataPoint {
  axis: string;
  user: number;
  p25: number;
  p50: number;
  p75: number;
}

export default function SpiderChart({ inputs }: Props) {
  const segment = segmentKey(inputs.division, inputs.gender);
  const ageBenchmarks = benchmarks[segment]?.[inputs.ageGroup];

  if (!ageBenchmarks) return null;

  const splitData = ageBenchmarks.splits;
  const roxzone = ageBenchmarks.roxzone;

  const chartData: ChartDataPoint[] = AXIS_NAMES.map((axis) => {
    const label = SHORT_LABELS[axis] || axis;

    let userTime: number;
    let p25: number;
    let p50: number;
    let p75: number;

    if (axis === "Runs") {
      // Collapse all 8 runs
      userTime = RUN_NAMES.reduce((sum, name) => sum + (inputs.splits[name] ?? 0), 0);
      p25 = RUN_NAMES.reduce((sum, name) => sum + (splitData[name]?.p25 ?? 0), 0);
      p50 = RUN_NAMES.reduce((sum, name) => sum + (splitData[name]?.p50 ?? 0), 0);
      p75 = RUN_NAMES.reduce((sum, name) => sum + (splitData[name]?.p75 ?? 0), 0);
    } else if (axis === "Roxzone") {
      // Roxzone = official finish time - sum of 16 splits
      const splitsSum = Object.values(inputs.splits).reduce((a, b) => a + b, 0);
      userTime = inputs.actualRaceTime - splitsSum;
      p25 = roxzone.p25;
      p50 = roxzone.p50;
      p75 = roxzone.p75;
    } else {
      // Station split
      userTime = inputs.splits[axis] ?? 0;
      p25 = splitData[axis]?.p25 ?? 0;
      p50 = splitData[axis]?.p50 ?? 0;
      p75 = splitData[axis]?.p75 ?? 0;
    }

    return {
      axis: label,
      user: round(timeToScore(userTime, p25, p50, p75)),
      p25: 75,  // Fixed ring — p25 is always at 75
      p50: 50,  // Fixed ring — p50 is always at 50
      p75: 25,  // Fixed ring — p75 is always at 25
    };
  });

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
      <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
        Performance vs Benchmarks
      </h3>
      <p className="text-xs text-zinc-400 mb-4">
        Outer = faster · Inner = slower · Relative to your division &amp; age group
      </p>
      <ResponsiveContainer width="100%" height={350}>
        <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#a1a1aa" strokeOpacity={0.3} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fontSize: 11, fill: "#71717a" }}
          />
          {/* Benchmark rings — fixed concentric circles */}
          <Radar
            name="p75 (slow)"
            dataKey="p75"
            stroke="#ef4444"
            fill="none"
            strokeWidth={1}
            strokeDasharray="6 3"
          />
          <Radar
            name="p50 (median)"
            dataKey="p50"
            stroke="#eab308"
            fill="none"
            strokeWidth={1}
            strokeDasharray="6 3"
          />
          <Radar
            name="p25 (fast)"
            dataKey="p25"
            stroke="#22c55e"
            fill="none"
            strokeWidth={1}
            strokeDasharray="6 3"
          />
          {/* User — variable shape on top */}
          <Radar
            name="You"
            dataKey="user"
            stroke="#18181b"
            fill="#18181b"
            fillOpacity={0.12}
            strokeWidth={2.5}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
