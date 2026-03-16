"use client";

import { useState } from "react";
import type { Division, Gender, AgeGroup, UserInputs } from "@/lib/types";
import { AGE_GROUPS } from "@/lib/types";

interface Props {
  initial: Partial<UserInputs>;
  onNext: (data: { division: Division; gender: Gender; ageGroup: AgeGroup }) => void;
}

export default function ProfileStep({ initial, onNext }: Props) {
  const [division, setDivision] = useState<Division>(initial.division ?? "Open");
  const [gender, setGender] = useState<Gender>(initial.gender ?? "Men");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(initial.ageGroup ?? "30-34");

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Your Profile</h2>

      {/* Division */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Division</legend>
        <div className="flex gap-3">
          {(["Open", "Pro"] as Division[]).map((d) => (
            <button
              key={d}
              onClick={() => setDivision(d)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                division === d
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                  : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Gender */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Gender</legend>
        <div className="flex gap-3">
          {(["Men", "Women"] as Gender[]).map((g) => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                gender === g
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                  : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Age Group */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Age Group</legend>
        <select
          value={ageGroup}
          onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
        >
          {AGE_GROUPS.map((ag) => (
            <option key={ag} value={ag}>
              {ag}
            </option>
          ))}
        </select>
      </fieldset>

      <button
        onClick={() => onNext({ division, gender, ageGroup })}
        className="w-full rounded-lg bg-zinc-900 dark:bg-white px-4 py-3 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition"
      >
        Next: Enter Split Times
      </button>
    </div>
  );
}
