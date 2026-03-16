"use client";

import { useState, useEffect } from "react";
import type { UserInputs, RaceAnalysis, TrainingPlan } from "@/lib/types";
import { loadTrainingState, saveTrainingState, clearTrainingState } from "@/lib/storage";
import ProfileStep from "@/components/steps/ProfileStep";
import SplitsStep from "@/components/steps/SplitsStep";
import TargetStep from "@/components/steps/TargetStep";
import TrainingDaysStep from "@/components/steps/TrainingDaysStep";
import StartDateStep from "@/components/steps/StartDateStep";
import AnalysisView from "@/components/AnalysisView";
import PlanView from "@/components/PlanView";
import TodayView from "@/components/TodayView";

type Step =
  | "profile"
  | "splits"
  | "target"
  | "days"
  | "analysis"
  | "plan"
  | "startDate"
  | "training";

export default function Home() {
  const [step, setStep] = useState<Step>("profile");
  const [inputs, setInputs] = useState<Partial<UserInputs>>({});
  const [analysis, setAnalysis] = useState<RaceAnalysis | null>(null);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [completedSessions, setCompletedSessions] = useState<
    Record<string, boolean>
  >({});
  const [hydrated, setHydrated] = useState(false);

  // Auto-resume from localStorage on mount, or load mock data if present
  useEffect(() => {
    const saved = loadTrainingState();
    if (saved) {
      setInputs(saved.inputs);
      setAnalysis(saved.analysis);
      setPlan(saved.plan);
      setStartDate(saved.startDate);
      setCompletedSessions(saved.completedSessions);
      setStep("training");
    }

    // Dev: check for mock inputs in sessionStorage (set via browser console)
    if (!saved && process.env.NODE_ENV === "development") {
      const mockRaw = sessionStorage.getItem("__mock_inputs");
      if (mockRaw) {
        try {
          const mock = JSON.parse(mockRaw) as UserInputs;
          setInputs(mock);
          setStep("analysis");
        } catch { /* ignore */ }
      }
    }

    setHydrated(true);
  }, []);

  // Don't render until hydration check completes (prevents flash of profile step)
  if (!hydrated) return null;

  function handleToggleComplete(key: string) {
    setCompletedSessions((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Persist to localStorage
      if (inputs.division && analysis && plan && startDate) {
        saveTrainingState({
          version: 1,
          inputs: inputs as UserInputs,
          analysis,
          plan,
          startDate,
          completedSessions: next,
        });
      }
      return next;
    });
  }

  function handleStartTraining(date: string) {
    setStartDate(date);
    // Persist full state
    if (inputs.division && analysis && plan) {
      saveTrainingState({
        version: 1,
        inputs: inputs as UserInputs,
        analysis,
        plan,
        startDate: date,
        completedSessions: {},
      });
    }
    setStep("training");
  }

  function handleStartOver() {
    clearTrainingState();
    setStep("profile");
    setInputs({});
    setAnalysis(null);
    setPlan(null);
    setStartDate("");
    setCompletedSessions({});
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight">
            Hyrox Training Plan Generator
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {step === "profile" && (
          <ProfileStep
            initial={inputs}
            onNext={(data) => {
              setInputs((prev) => ({ ...prev, ...data }));
              setStep("splits");
            }}
          />
        )}

        {step === "splits" && (
          <SplitsStep
            onNext={(splits) => {
              setInputs((prev) => ({ ...prev, splits }));
              setStep("target");
            }}
            onBack={() => setStep("profile")}
          />
        )}

        {step === "target" && (
          <TargetStep
            totalActual={
              inputs.splits
                ? Object.values(inputs.splits).reduce((a, b) => a + b, 0)
                : 0
            }
            onNext={(actualRaceTime, targetTime) => {
              setInputs((prev) => ({ ...prev, actualRaceTime, targetTime }));
              setStep("days");
            }}
            onBack={() => setStep("splits")}
          />
        )}

        {step === "days" && (
          <TrainingDaysStep
            onNext={(trainingDays) => {
              const full = { ...inputs, trainingDays } as UserInputs;
              setInputs(full);
              setStep("analysis");
            }}
            onBack={() => setStep("target")}
          />
        )}

        {step === "analysis" &&
          inputs.division &&
          inputs.splits &&
          inputs.targetTime && (
            <AnalysisView
              inputs={inputs as UserInputs}
              analysis={analysis}
              setAnalysis={setAnalysis}
              onGenerate={() => setStep("plan")}
              onBack={() => setStep("days")}
            />
          )}

        {step === "plan" && analysis && (
          <PlanView
            inputs={inputs as UserInputs}
            analysis={analysis}
            plan={plan}
            setPlan={setPlan}
            onBack={() => setStep("analysis")}
            onStartTraining={() => setStep("startDate")}
          />
        )}

        {step === "startDate" && (
          <StartDateStep
            onNext={handleStartTraining}
            onBack={() => setStep("plan")}
          />
        )}

        {step === "training" && plan && startDate && typeof inputs.trainingDays === "number" && (
          <TodayView
            plan={plan}
            startDate={startDate}
            trainingDays={inputs.trainingDays}
            completedSessions={completedSessions}
            onToggleComplete={handleToggleComplete}
            onStartOver={handleStartOver}
          />
        )}
      </main>
    </div>
  );
}
