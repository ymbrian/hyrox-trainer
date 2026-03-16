/**
 * Mock race performance data for local testing.
 *
 * Usage: paste the console.log output into your browser console
 * while on the app's profile page, then refresh.
 *
 * This skips form entry and jumps straight to the analysis page.
 */

const mockInputs = {
  division: "Open" as const,
  gender: "Men" as const,
  ageGroup: "30-34" as const,
  splits: {
    "Run 1": 295, "SkiErg": 268,
    "Run 2": 302, "Sled Push": 230,
    "Run 3": 298, "Sled Pull": 215,
    "Run 4": 310, "Burpee Broad Jump": 355,
    "Run 5": 305, "Rowing": 248,
    "Run 6": 315, "Farmers Carry": 185,
    "Run 7": 308, "Sandbag Lunges": 442,
    "Run 8": 300, "Wall Balls": 295,
  },
  actualRaceTime: 5100, // 1:25:00
  targetTime: 4500,     // 1:15:00
  trainingDays: 4,
};

console.log("// Paste this into your browser console to skip to the analysis page:\n");
console.log(`window.__MOCK_INPUTS = ${JSON.stringify(mockInputs)};`);
