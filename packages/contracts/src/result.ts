/**
 * The benchmark result schema.
 *
 * Every run writes one of these. Keeping the shape stable is what makes runs
 * comparable over time, so treat changes here as breaking and bump
 * `schemaVersion`.
 */
export const RESULT_SCHEMA_VERSION = 1;

export interface RunEnvironment {
  nodeVersion: string;
  platform: string;
  arch: string;
  cpuModel: string;
  cpuCount: number;
  totalMemoryBytes: number;
  /** Set this when running under pinned container resources. */
  containerCpuLimit?: string;
  containerMemoryLimit?: string;
}

export interface WorkloadConfig {
  profile: string;
  requests: number;
  concurrency: number;
  warmupRequests: number;
  /** Seed for cart selection, so two runs hit the same carts in the same order. */
  seed: number;
}

export interface LatencyStats {
  count: number;
  minMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  meanMs: number;
  stdDevMs: number;
}

export interface BenchmarkResult {
  schemaVersion: number;
  runId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;

  /** Which architecture was under test, e.g. "modular-monolith". */
  implementation: string;
  target: string;
  gitCommit: string | null;

  environment: RunEnvironment;
  workload: WorkloadConfig;

  throughputRps: number;
  latency: LatencyStats;

  /** Successful checkouts over total attempts. */
  successRate: number;
  /** Transport or 5xx failures over total attempts. This is the error rate. */
  errorRate: number;

  /** Counts keyed by CheckoutFailureReason, plus "transport_error". */
  outcomes: Record<string, number>;
  /** Counts keyed by HTTP status code. */
  statusCodes: Record<string, number>;

  notes?: string;
}
