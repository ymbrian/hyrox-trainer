import { benchmarks, segmentKey } from "./data";
import type {
  UserInputs,
  RaceAnalysis,
  SplitAnalysis,
  CategoryAnalysis,
  SplitName,
} from "./types";
import { SPLIT_NAMES, STATION_NAMES } from "./types";

/** Run split names in benchmark data */
const RUN_NAMES: SplitName[] = [
  "Run 1", "Run 2", "Run 3", "Run 4",
  "Run 5", "Run 6", "Run 7", "Run 8",
];

/**
 * Run gap analysis: compare user splits against target time
 * distributed proportionally using benchmark pct_of_total.
 *
 * Produces both:
 * - 16 individual split analyses (for detail table)
 * - 10 category analyses: 8 stations + Running (aggregate) + Roxzone
 */
export function analyzeRace(inputs: UserInputs): RaceAnalysis {
  const segment = segmentKey(inputs.division, inputs.gender);
  const ageBenchmarks = benchmarks[segment]?.[inputs.ageGroup];

  if (!ageBenchmarks) {
    throw new Error(
      `No benchmark data for ${segment} / ${inputs.ageGroup}`
    );
  }

  const splitData = ageBenchmarks.splits;
  const roxzoneBenchmark = ageBenchmarks.roxzone;
  if (!roxzoneBenchmark) {
    throw new Error(
      `No Roxzone benchmark data for ${segment} / ${inputs.ageGroup}`
    );
  }

  // Sum pct_of_total for ALL trainable categories (16 splits + Roxzone)
  let totalPctSum = 0;
  for (const name of SPLIT_NAMES) {
    const b = splitData[name];
    if (b) totalPctSum += b.pct_of_total;
  }
  totalPctSum += roxzoneBenchmark.pct_of_total;

  // pct_of_total values are percentages (e.g. 5.0 = 5%), convert to fraction
  const totalFraction = totalPctSum / 100;

  // Total trainable target = targetTime * total fraction
  const trainableTarget = inputs.targetTime * totalFraction;

  const splitsSum = Object.values(inputs.splits).reduce((a, b) => a + b, 0);

  // --- 16 individual split analyses (for detail table) ---
  const splits: SplitAnalysis[] = SPLIT_NAMES.map((name: SplitName) => {
    const b = splitData[name];
    const splitPct = b ? (b.pct_of_total / totalPctSum) : 1 / 17;
    const splitTarget = trainableTarget * splitPct;
    const actual = inputs.splits[name];
    return {
      split: name,
      actualTime: actual,
      targetTime: Math.round(splitTarget),
      gap: actual - Math.round(splitTarget),
      pctOfTotal: b?.pct_of_total ?? 0,
    };
  });

  // --- 10 category analyses ---
  const categories: CategoryAnalysis[] = [];

  // 8 station categories
  for (const station of STATION_NAMES) {
    const b = splitData[station];
    const pct = b ? (b.pct_of_total / totalPctSum) : 1 / 17;
    const target = trainableTarget * pct;
    const actual = inputs.splits[station];
    categories.push({
      category: station,
      actualTime: actual,
      targetTime: Math.round(target),
      gap: actual - Math.round(target),
    });
  }

  // Running category: aggregate Run 1-8
  const runActual = RUN_NAMES.reduce((sum, name) => sum + (inputs.splits[name] ?? 0), 0);
  const runPctSum = RUN_NAMES.reduce((sum, name) => sum + (splitData[name]?.pct_of_total ?? 0), 0);
  const runTarget = trainableTarget * (runPctSum / totalPctSum);
  categories.push({
    category: "Running",
    actualTime: runActual,
    targetTime: Math.round(runTarget),
    gap: runActual - Math.round(runTarget),
  });

  // Roxzone category: deduced from actual race time
  const roxzoneActual = inputs.actualRaceTime - splitsSum;
  const roxzoneTarget = trainableTarget * (roxzoneBenchmark.pct_of_total / totalPctSum);
  categories.push({
    category: "Roxzone",
    actualTime: roxzoneActual,
    targetTime: Math.round(roxzoneTarget),
    gap: roxzoneActual - Math.round(roxzoneTarget),
  });

  // Top 3 weaknesses by gap (positive gap = slower than target)
  const weaknesses = [...categories]
    .filter((c) => c.gap > 0)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3);

  // Top 3 strengths by gap (most negative gap = fastest vs target)
  const strengths = [...categories]
    .filter((c) => c.gap < 0)
    .sort((a, b) => a.gap - b.gap)
    .slice(0, 3);

  // Classify confidence based on total improvement needed
  const totalActual = inputs.actualRaceTime;
  const improvementPct = ((totalActual - inputs.targetTime) / totalActual) * 100;
  let confidence: RaceAnalysis["confidence"];
  if (improvementPct > 15) confidence = "aggressive";
  else if (improvementPct > 7) confidence = "realistic";
  else confidence = "conservative";

  return {
    totalActual,
    totalTarget: inputs.targetTime,
    confidence,
    splits,
    categories,
    strengths,
    weaknesses,
  };
}
