import type { PersistedTrainingState } from "./types";

const STORAGE_KEY = "hyrox-training-state";
const CURRENT_VERSION = 1;

/** Save training state to localStorage */
export function saveTrainingState(state: PersistedTrainingState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

/** Load training state from localStorage. Returns null if missing or incompatible version. */
export function loadTrainingState(): PersistedTrainingState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedTrainingState;
    if (parsed.version !== CURRENT_VERSION) {
      // Incompatible version — clear and return null
      clearTrainingState();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Clear training state from localStorage */
export function clearTrainingState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silently fail
  }
}
