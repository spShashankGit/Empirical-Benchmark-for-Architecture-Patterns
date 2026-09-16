import type { LatencyStats } from '@arch-bench/contracts';

/**
 * Percentiles use nearest-rank on a sorted copy. Simple and unambiguous — worth
 * more here than interpolation, because the number has to mean the same thing
 * in every run we ever compare.
 */
export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const rank = Math.ceil((p / 100) * sorted.length);
  const index = Math.min(Math.max(rank - 1, 0), sorted.length - 1);
  return sorted[index]!;
}

export function summarize(samples: readonly number[]): LatencyStats {
  if (samples.length === 0) {
    return { count: 0, minMs: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0, maxMs: 0, meanMs: 0, stdDevMs: 0 };
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  const variance =
    sorted.reduce((sum, value) => sum + (value - mean) ** 2, 0) / sorted.length;

  return {
    count: sorted.length,
    minMs: round(sorted[0]!),
    p50Ms: round(percentile(sorted, 50)),
    p95Ms: round(percentile(sorted, 95)),
    p99Ms: round(percentile(sorted, 99)),
    maxMs: round(sorted[sorted.length - 1]!),
    meanMs: round(mean),
    stdDevMs: round(Math.sqrt(variance)),
  };
}

const round = (value: number) => Math.round(value * 1000) / 1000;
