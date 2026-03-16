import { NextRequest, NextResponse } from "next/server";
import { generatePlan } from "@/lib/llm";
import type { UserInputs, RaceAnalysis } from "@/lib/types";

interface RequestBody {
  inputs: UserInputs;
  analysis: RaceAnalysis;
}

/** Simple in-memory rate limiter: max 10 requests per IP per minute */
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { inputs, analysis } = body;

  if (!inputs || !analysis) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  // Retry up to 3 times on schema validation failure
  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const plan = await generatePlan(inputs, analysis);
      return NextResponse.json(plan);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      // Only retry on validation/parse errors, not API auth errors
      if (attempt === MAX_RETRIES || message.includes("API error")) {
        return NextResponse.json(
          { error: message },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({ error: "Failed after retries" }, { status: 500 });
}
