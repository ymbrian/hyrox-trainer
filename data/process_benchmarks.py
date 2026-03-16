#!/usr/bin/env python3
"""
Process Hyrox race results into percentile benchmark tables.

Input:  hyrox_results.csv (Kaggle dataset by jgug05, Seasons 4-6, 2021-2023)
Output: benchmarks.json   (percentile tables segmented by division + age group)

Usage:
    python process_benchmarks.py
"""

import json
import pathlib
import sys

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
DATA_DIR = pathlib.Path(__file__).parent
CSV_PATH = DATA_DIR / "hyrox_results.csv"
OUT_PATH = DATA_DIR / "benchmarks.json"

# The 8 Hyrox stations in order
STATION_NAMES = [
    "SkiErg",
    "Sled Push",
    "Sled Pull",
    "Burpee Broad Jump",
    "Rowing",
    "Farmers Carry",
    "Sandbag Lunges",
    "Wall Balls",
]

# Column names for the 16 splits (8 runs + 8 work stations) + roxzone
RUN_COLS  = [f"run_{i}" for i in range(1, 9)]
WORK_COLS = [f"work_{i}" for i in range(1, 9)]
ROXZONE_COLS = [f"roxzone_{i}" for i in range(1, 9)]
SPLIT_COLS = []
SPLIT_LABELS = []
for i in range(8):
    SPLIT_COLS.append(RUN_COLS[i])
    SPLIT_LABELS.append(f"Run {i+1}")
    SPLIT_COLS.append(WORK_COLS[i])
    SPLIT_LABELS.append(STATION_NAMES[i])

# Roxzone columns (tracked separately — not trainable but needed for target time distribution)
ROXZONE_AGG_COL = "roxzone_time"

# Target age group bins (user-specified)
AGE_BINS = [
    "16-24", "25-29", "30-34", "35-39", "40-44",
    "45-49", "50-54", "55-59", "60-64", "65+",
]

# Map every raw age_group value to one of our target bins.
# Wider bins (e.g. 16-29, 30-39) get mapped to the lower 5-year slice —
# this is imprecise but the best we can do without birth dates.
AGE_GROUP_MAP = {
    "16-24": "16-24",
    "16-29": "25-29",   # most 16-29 athletes cluster 25-29
    "25-29": "25-29",
    "30-34": "30-34",
    "30-39": "35-39",   # conservative: map wide bin to upper half
    "35-39": "35-39",
    "40-44": "40-44",
    "40-49": "45-49",
    "40+":   "40-44",
    "45-49": "45-49",
    "50-54": "50-54",
    "50-59": "55-59",
    "55-59": "55-59",
    "60-64": "60-64",
    "60-69": "65+",
    "65-69": "65+",
    "70-74": "65+",
    "75-79": "65+",
    "80-84": "65+",
    "U40":   "35-39",   # "Under 40" in some events
}
# Anything not in this map (MHE, MME, WHE, WWE, M40+, W40+, W60+, M60+, X40+)
# are special categories we'll skip.

# Divisions we care about
VALID_DIVISIONS = {"open", "pro"}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def time_str_to_seconds(t: str) -> float:
    """Convert 'H:MM:SS' or 'HH:MM:SS' to total seconds. Returns NaN on failure."""
    if pd.isna(t) or not isinstance(t, str):
        return np.nan
    parts = t.strip().split(":")
    if len(parts) != 3:
        return np.nan
    try:
        h, m, s = int(parts[0]), int(parts[1]), int(parts[2])
        return h * 3600 + m * 60 + s
    except ValueError:
        return np.nan


def seconds_to_mmss(s: float) -> str:
    """Convert seconds to M:SS or MM:SS display string."""
    if pd.isna(s) or s < 0:
        return "--"
    total = int(round(s))
    mins = total // 60
    secs = total % 60
    return f"{mins}:{secs:02d}"


def seconds_to_hmmss(s: float) -> str:
    """Convert seconds to H:MM:SS display string."""
    if pd.isna(s) or s < 0:
        return "--"
    total = int(round(s))
    hrs = total // 3600
    mins = (total % 3600) // 60
    secs = total % 60
    return f"{hrs}:{mins:02d}:{secs:02d}"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=" * 70)
    print("HYROX BENCHMARK PROCESSOR")
    print("=" * 70)

    # --- Load ---
    df = pd.read_csv(CSV_PATH, dtype=str)
    print(f"\nLoaded {len(df):,} rows from {CSV_PATH.name}")

    # --- Filter divisions ---
    df = df[df["division"].isin(VALID_DIVISIONS)].copy()
    print(f"After filtering to open/pro: {len(df):,} rows")

    # --- Map age groups ---
    df["age_bin"] = df["age_group"].map(AGE_GROUP_MAP)
    unmapped = df["age_bin"].isna().sum()
    print(f"Unmapped age groups dropped: {unmapped:,}")
    df = df.dropna(subset=["age_bin"])
    print(f"After age group mapping: {len(df):,} rows")

    # --- Build division_gender key ---
    # "Open Men", "Open Women", "Pro Men", "Pro Women"
    def div_gender(row):
        d = row["division"].capitalize()
        g = "Men" if row["gender"] == "male" else "Women"
        return f"{d} {g}"

    df["segment"] = df.apply(div_gender, axis=1)
    print(f"\nSegments found: {sorted(df['segment'].unique())}")

    # --- Convert all time columns to seconds ---
    time_cols_all = ["total_time"] + SPLIT_COLS + [ROXZONE_AGG_COL] + ROXZONE_COLS
    for col in time_cols_all:
        df[col + "_s"] = df[col].apply(time_str_to_seconds)

    # --- Filter out DNF / zero splits ---
    # Any row where a split is 0 seconds or NaN → drop
    split_s_cols = [c + "_s" for c in SPLIT_COLS]
    before = len(df)
    mask_valid = pd.Series(True, index=df.index)
    for col in split_s_cols:
        mask_valid &= df[col].notna() & (df[col] > 0)
    # Also require valid total_time
    mask_valid &= df["total_time_s"].notna() & (df["total_time_s"] > 0)
    df = df[mask_valid].copy()
    print(f"Dropped {before - len(df):,} rows with zero/missing splits")
    print(f"Clean dataset: {len(df):,} rows")

    # --- Summary stats ---
    print(f"\n--- RECORDS PER SEGMENT ---")
    seg_counts = df["segment"].value_counts().sort_index()
    for seg, cnt in seg_counts.items():
        print(f"  {seg}: {cnt:,}")

    print(f"\n--- RECORDS PER AGE BIN ---")
    age_counts = df["age_bin"].value_counts()
    # Sort by our defined order
    for ab in AGE_BINS:
        cnt = age_counts.get(ab, 0)
        print(f"  {ab}: {cnt:,}")

    # --- Compute benchmarks ---
    print(f"\nComputing percentiles...")
    benchmarks = {}
    percentiles = [25, 50, 75]

    for segment in sorted(df["segment"].unique()):
        benchmarks[segment] = {}
        for age_bin in AGE_BINS:
            subset = df[(df["segment"] == segment) & (df["age_bin"] == age_bin)]
            if len(subset) < 5:
                # Too few records for meaningful percentiles
                continue

            entry = {
                "n": int(len(subset)),
                "splits": {},
                "total_time": {},
            }

            # Total time percentiles
            for p in percentiles:
                val = float(np.percentile(subset["total_time_s"], p))
                entry["total_time"][f"p{p}"] = round(val)
                entry["total_time"][f"p{p}_display"] = seconds_to_hmmss(val)

            # Per-split percentiles + pct of total
            median_total = float(np.percentile(subset["total_time_s"], 50))

            for col, label in zip(SPLIT_COLS, SPLIT_LABELS):
                col_s = col + "_s"
                split_data = {}
                for p in percentiles:
                    val = float(np.percentile(subset[col_s], p))
                    split_data[f"p{p}"] = round(val)
                    split_data[f"p{p}_display"] = seconds_to_mmss(val)

                median_split = float(np.percentile(subset[col_s], 50))
                split_data["pct_of_total"] = round(median_split / median_total * 100, 1)

                entry["splits"][label] = split_data

            # Roxzone aggregate
            roxzone_col_s = ROXZONE_AGG_COL + "_s"
            roxzone_valid = subset[roxzone_col_s].dropna()
            if len(roxzone_valid) >= 5:
                rox_data = {}
                for p in percentiles:
                    val = float(np.percentile(roxzone_valid, p))
                    rox_data[f"p{p}"] = round(val)
                    rox_data[f"p{p}_display"] = seconds_to_mmss(val)
                median_rox = float(np.percentile(roxzone_valid, 50))
                rox_data["pct_of_total"] = round(median_rox / median_total * 100, 1)
                entry["roxzone"] = rox_data

            benchmarks[segment][age_bin] = entry

    # --- Write JSON ---
    output = {
        "meta": {
            "source": "Kaggle jgug05/hyrox-results (CC BY 4.0)",
            "seasons": "4-6 (2021-2023)",
            "total_records": int(len(df)),
            "generated_by": "process_benchmarks.py",
            "notes": "Times in seconds. p25 = faster/better, p75 = slower. pct_of_total = median split / median total * 100.",
        },
        "segments": list(benchmarks.keys()),
        "age_bins": AGE_BINS,
        "benchmarks": benchmarks,
    }

    with open(OUT_PATH, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nWrote {OUT_PATH} ({OUT_PATH.stat().st_size / 1024:.0f} KB)")

    # --- Print example segment ---
    example_seg = "Open Men"
    example_age = "30-34"
    print(f"\n{'=' * 70}")
    print(f"EXAMPLE: {example_seg} / {example_age}")
    print(f"{'=' * 70}")
    ex = benchmarks.get(example_seg, {}).get(example_age)
    if ex:
        print(f"  Sample size: {ex['n']}")
        print(f"\n  Total Time:")
        print(f"    {'Percentile':<12} {'Seconds':>8} {'Display':>10}")
        for p in percentiles:
            print(f"    p{p:<11} {ex['total_time'][f'p{p}']:>8,}  {ex['total_time'][f'p{p}_display']:>10}")

        print(f"\n  {'Split':<22} {'p25':>8} {'p50':>8} {'p75':>8} {'% of total':>10}")
        print(f"  {'-'*22} {'-'*8} {'-'*8} {'-'*8} {'-'*10}")
        for label in SPLIT_LABELS:
            s = ex["splits"][label]
            print(f"  {label:<22} {s['p25_display']:>8} {s['p50_display']:>8} {s['p75_display']:>8} {s['pct_of_total']:>9.1f}%")
    else:
        print(f"  No data for this segment.")

    print(f"\n{'=' * 70}")
    print("Done.")


if __name__ == "__main__":
    main()
