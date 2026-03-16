"use client";

import type { RaceAnalysis } from "@/lib/types";

interface Props {
  analysis: RaceAnalysis;
}

/** Format seconds as "m:ss" */
function formatTime(seconds: number): string {
  const m = Math.floor(Math.abs(seconds) / 60);
  const s = Math.round(Math.abs(seconds) % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const CONFIDENCE_TEXT = {
  conservative: "a conservative",
  realistic: "a realistic",
  aggressive: "an aggressive",
};

export default function AnalysisSummary({ analysis }: Props) {
  const totalGap = analysis.totalActual - analysis.totalTarget;
  const { strengths, weaknesses, confidence } = analysis;

  // Calculate how much of the gap the top 2 weaknesses represent
  const top2Gap = weaknesses.slice(0, 2).reduce((sum, w) => sum + w.gap, 0);
  const top2Pct = totalGap > 0 ? Math.round((top2Gap / totalGap) * 100) : 0;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
        Summary Analysis
      </h3>

      <div className="text-sm text-zinc-700 dark:text-zinc-300 space-y-2">
        {/* Overall assessment */}
        <p>
          You need to improve by{" "}
          <span className="font-semibold">{formatTime(totalGap)}</span> to hit
          your target &mdash; {CONFIDENCE_TEXT[confidence]} goal.
        </p>

        {/* Strengths */}
        {strengths.length > 0 && (
          <p>
            You&apos;re strong at{" "}
            {strengths.map((s, i) => (
              <span key={s.category}>
                {i > 0 && (i === strengths.length - 1 ? " and " : ", ")}
                <span className="font-semibold">{s.category}</span>
              </span>
            ))}
            , already ahead of target pace.
          </p>
        )}

        {/* Weaknesses */}
        {weaknesses.length > 0 && (
          <p>
            Your biggest opportunities are{" "}
            {weaknesses.map((w, i) => (
              <span key={w.category}>
                {i > 0 && (i === weaknesses.length - 1 ? " and " : ", ")}
                <span className="font-semibold">{w.category}</span>
              </span>
            ))}
            .
          </p>
        )}

        {/* Actionable insight */}
        {weaknesses.length >= 2 && totalGap > 0 && (
          <p>
            Improving just{" "}
            <span className="font-semibold">{weaknesses[0].category}</span> and{" "}
            <span className="font-semibold">{weaknesses[1].category}</span> by a
            combined{" "}
            <span className="font-semibold">{formatTime(top2Gap)}</span> would
            close {top2Pct}% of your gap.
          </p>
        )}
      </div>
    </div>
  );
}
