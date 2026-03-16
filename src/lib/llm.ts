import type { TrainingWeek, TrainingPlan, RaceAnalysis, UserInputs } from "./types";
import { exercises } from "./data";

const GITHUB_BASE_URL = "https://models.github.ai/inference";
const GITHUB_MODEL = "meta/Llama-4-Maverick-17B-128E-Instruct-FP8";
const ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-3-5-haiku-latest";

/** Build the system prompt with exercise library and rules */
function buildSystemPrompt(
  inputs: UserInputs,
  analysis: RaceAnalysis
): string {
  return `You are a Hyrox training plan generator. You create a complete 4-week training plan in a single response.

ATHLETE PROFILE:
- Division: ${inputs.division} ${inputs.gender}
- Age group: ${inputs.ageGroup}
- Current total: ${formatSecs(analysis.totalActual)}
- Target total: ${formatSecs(analysis.totalTarget)}
- Training days per week: ${inputs.trainingDays}
- Confidence: ${analysis.confidence}

TOP WEAKNESSES (biggest improvement opportunities):
${analysis.weaknesses.map((w, i) => `${i + 1}. ${w.category}: gap of ${formatSecs(w.gap)} (${formatSecs(w.actualTime)} → ${formatSecs(w.targetTime)})`).join("\n")}

EXERCISE LIBRARY (you MUST only select exercises from this list):
${JSON.stringify(compactExercises())}

PERIODIZATION:
- Base (Week 1): Higher volume, lower intensity. Aerobic base, movement patterns. Zone 2 runs dominant. General compound lifts.
- Build (Weeks 2-3): Intensity increases. Station-specific work at/above race weight. Tempo + interval runs. Compromised runs begin.
- Race Prep (Week 4): Volume drops ~30%. Race simulations. Interval runs at race pace. Progressive taper.

RULES:
- Max 5 exercises per session.
- Every session must include either exercises OR a run (or both).
- Exercise names must exactly match the exercise library above.
- Prioritize the athlete's weakest stations with more training volume.
- Respect the phase focus for the given week number.
- For Week 4, implement a taper: reduce volume by 30-40% vs Week 3.
- Tag each session with intensity: "low" (easy runs, mobility), "medium" (moderate strength, tempo runs), "high" (heavy strength, intervals, race simulations).

OUTPUT FORMAT: Return ONLY valid JSON matching this schema (no markdown, no explanation).
The response must be a JSON object with a "weeks" array containing all 4 weeks:
{
  "weeks": [
    {
      "week": <number 1-4>,
      "phase": "<Base|Build|Race Prep>",
      "sessions": [
        {
          "day": <1-based day number>,
          "focus": "<short description>",
          "intensity": "<low|medium|high>",
          "exercises": [
            {
              "name": "<exact exercise name from library>",
              "sets": <number>,
              "reps": "<string, e.g. '10', '20m', '60s'>",
              "rest": "<string, e.g. '60s', '2min'>"
            }
          ],
          "run": {
            "name": "<exact run name from library>",
            "type": "<easy_run|tempo_run|intervals|compromised_run>",
            "duration_minutes": <number, for easy/tempo runs>,
            "pace_per_km": "<string, e.g. '5:30'>",
            "reps": <number, for intervals>,
            "distance_m": <number, for intervals>,
            "rest_seconds": <number, for intervals>
          }
        }
      ]
    }
  ]
}`;
}

/** Call the LLM and parse the response into a full TrainingPlan */
export async function generatePlan(
  inputs: UserInputs,
  analysis: RaceAnalysis
): Promise<TrainingPlan> {
  const systemPrompt = buildSystemPrompt(inputs, analysis);
  const userPrompt = `Generate a complete 4-week training plan for this athlete. Include all 4 weeks (Base → Build → Build → Race Prep) with ${inputs.trainingDays} sessions per week. Return ONLY the JSON object with a "weeks" array.`;
  const provider = process.env.LLM_PROVIDER || "github";

  // Fail fast if no credentials are configured
  if (provider === "github" && !process.env.GITHUB_TOKEN) {
    throw new Error("No LLM provider configured. Set LLM_PROVIDER and the corresponding API key (GITHUB_TOKEN or ANTHROPIC_API_KEY).");
  }
  if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
    throw new Error("No LLM provider configured. Set ANTHROPIC_API_KEY for the Anthropic provider.");
  }

  let result: string;

  if (provider === "anthropic") {
    result = await callAnthropic(systemPrompt, userPrompt);
  } else {
    result = await callGitHub(systemPrompt, userPrompt);
  }

  // Parse and validate
  const parsed = parseJsonResponse(result);
  validatePlan(parsed);
  return parsed as TrainingPlan;
}

/** Call GitHub Models (OpenAI-compatible) */
async function callGitHub(system: string, user: string): Promise<string> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not set");

  const res = await fetch(`${GITHUB_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GITHUB_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0,
      max_tokens: 8192,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub Models API error: ${res.status} ${body}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("GitHub Models returned an unexpected response shape (no content in choices[0])");
  }
  return content;
}

/** Call Anthropic API (Claude 3.5 Haiku) */
async function callAnthropic(system: string, user: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch(ANTHROPIC_BASE_URL, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 8192,
      temperature: 0,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API error: ${res.status} ${body}`);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("Anthropic API returned an unexpected response shape (no text in content[0])");
  }
  return text;
}

/** Extract JSON from LLM response (handles markdown code blocks) */
function parseJsonResponse(raw: string): unknown {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("LLM returned invalid JSON");
  }
}

/** Basic schema validation for the full training plan */
function validatePlan(data: unknown): void {
  const plan = data as Record<string, unknown>;

  if (!Array.isArray(plan.weeks) || plan.weeks.length !== 4) {
    throw new Error(`Expected 4 weeks, got ${Array.isArray(plan.weeks) ? plan.weeks.length : "no weeks array"}`);
  }

  for (let i = 0; i < plan.weeks.length; i++) {
    const week = plan.weeks[i] as Record<string, unknown>;
    const expectedWeek = i + 1;

    if (typeof week.week !== "number" || week.week !== expectedWeek) {
      throw new Error(`Expected week ${expectedWeek}, got ${week.week}`);
    }

    if (!["Base", "Build", "Race Prep"].includes(week.phase as string)) {
      throw new Error(`Week ${expectedWeek}: invalid phase "${week.phase}"`);
    }

    if (!Array.isArray(week.sessions) || week.sessions.length === 0) {
      throw new Error(`Week ${expectedWeek} must have at least one session`);
    }

    for (const session of week.sessions as Record<string, unknown>[]) {
      const exList = session.exercises as unknown[];
      if (Array.isArray(exList) && exList.length > 5) {
        throw new Error(`Week ${expectedWeek}: max 5 exercises per session`);
      }
      if (!["low", "medium", "high"].includes(session.intensity as string)) {
        throw new Error(`Week ${expectedWeek}: session missing valid intensity (got "${session.intensity}")`);
      }
    }
  }
}

/** Extract just name + category from exercise library to reduce prompt tokens */
function compactExercises(): Record<string, string[]> {
  const raw = exercises as Record<string, unknown>;
  const result: Record<string, string[]> = {};

  for (const section of ["stations", "running", "general"] as const) {
    const group = raw[section];
    if (!group || typeof group !== "object") continue;

    for (const [category, items] of Object.entries(group as Record<string, unknown>)) {
      if (Array.isArray(items)) {
        result[category] = items.map((e: Record<string, string>) => e.name).filter(Boolean);
      }
    }
  }
  return result;
}

function formatSecs(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.round(s % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
