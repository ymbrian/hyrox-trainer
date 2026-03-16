"use client";

import { useEffect } from "react";
import type { UserInputs, RaceAnalysis } from "@/lib/types";
import { analyzeRace } from "@/lib/analysis";
import { formatTime } from "./steps/SplitsStep";
import SpiderChart from "./SpiderChart";
import AnalysisSummary from "./AnalysisSummary";

interface Props {
  inputs: UserInputs;
  analysis: RaceAnalysis | null;
  setAnalysis: (a: RaceAnalysis) => void;
  onGenerate: () => void;
  onBack: () => void;
}

const CONFIDENCE_LABELS = {
  conservative: { label: "Conservative", color: "text-green-600" },
  realistic: { label: "Realistic", color: "text-yellow-600" },
  aggressive: { label: "Aggressive", color: "text-red-600" },
};

export default function AnalysisView({
  inputs,
  analysis,
  setAnalysis,
  onGenerate,
  onBack,
}: Props) {
  // Compute analysis on mount if not already computed
  useEffect(() => {
    if (!analysis) {
      setAnalysis(analyzeRace(inputs));
    }
  }, [inputs, analysis, setAnalysis]);

  if (!analysis) return null;

  const conf = CONFIDENCE_LABELS[analysis.confidence];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Race Analysis</h2>
        <span className={`text-sm font-medium ${conf.color}`}>
          {conf.label} target
        </span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Current</p>
          <p className="text-2xl font-bold mt-1">{formatLong(analysis.totalActual)}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Target</p>
          <p className="text-2xl font-bold mt-1">{formatLong(analysis.totalTarget)}</p>
        </div>
      </div>

      {/* Summary Analysis */}
      <AnalysisSummary analysis={analysis} />

      {/* Spider Chart */}
      <SpiderChart inputs={inputs} />

      {/* Weaknesses */}
      {analysis.weaknesses.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
            Biggest Improvement Opportunities
          </h3>
          {analysis.weaknesses.map((w, i) => (
            <div
              key={w.category}
              className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 p-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900 text-xs font-bold text-red-700 dark:text-red-300">
                  {i + 1}
                </span>
                <span className="text-sm font-medium">{w.category}</span>
              </div>
              <div className="text-right">
                <span className="text-sm text-red-600">+{formatTime(w.gap)}</span>
                <span className="text-xs text-zinc-400 ml-2">
                  {formatTime(w.actualTime)} → {formatTime(w.targetTime)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full split table */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
          View all splits
        </summary>
        <div className="mt-3 space-y-1">
          {analysis.splits.map((s) => (
            <div
              key={s.split}
              className="flex items-center justify-between py-1.5 text-sm border-b border-zinc-100 dark:border-zinc-800 last:border-0"
            >
              <span className="text-zinc-600 dark:text-zinc-400">{s.split}</span>
              <div className="flex items-center gap-4">
                <span>{formatTime(s.actualTime)}</span>
                <span className="text-zinc-400">→</span>
                <span>{formatTime(s.targetTime)}</span>
                <span
                  className={`w-16 text-right text-xs font-medium ${
                    s.gap > 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {s.gap > 0 ? "+" : ""}
                  {formatTime(Math.abs(s.gap))}
                </span>
              </div>
            </div>
          ))}
        </div>
      </details>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-3 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        >
          Back
        </button>
        <button
          onClick={onGenerate}
          className="flex-1 rounded-lg bg-zinc-900 dark:bg-white px-4 py-3 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition"
        >
          Generate Training Plan
        </button>
      </div>
    </div>
  );
}

function formatLong(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
