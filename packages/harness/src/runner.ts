import { Pool } from 'undici';
import { execSync } from 'node:child_process';
import { cpus, totalmem } from 'node:os';
import { randomUUID } from 'node:crypto';
import {
  CHECKOUT_PATH,
  CORRELATION_HEADER,
  RESULT_SCHEMA_VERSION,
  type BenchmarkResult,
  type RunEnvironment,
  type WorkloadConfig,
} from '@arch-bench/contracts';
import { createRandom, seededCartIds } from '@arch-bench/testkit';
import { summarize } from './stats.js';

export interface RunOptions {
  target: string;
  implementation: string;
  profile: string;
  requests: number;
  concurrency: number;
  warmupRequests: number;
  seed: number;
  notes?: string;
}

interface Attempt {
  latencyMs: number;
  statusCode: number;
  outcome: string;
  isError: boolean;
  isSuccess: boolean;
}

export async function runWorkload(options: RunOptions): Promise<BenchmarkResult> {
  const pool = new Pool(options.target, {
    connections: Math.max(options.concurrency, 16),
    headersTimeout: 30_000,
    bodyTimeout: 30_000,
  });

  const cartIds = seededCartIds();
  const random = createRandom(options.seed);
  const pickCart = () => cartIds[Math.floor(random() * cartIds.length)]!;

  // Warmup is discarded. Without it the first requests carry JIT and connection
  // setup costs, which would land entirely in the tail and make whichever build
  // we measured first look worse.
  await drive(pool, options.warmupRequests, options.concurrency, pickCart);

  const startedAt = new Date();
  const startHr = process.hrtime.bigint();
  const attempts = await drive(pool, options.requests, options.concurrency, pickCart);
  const durationMs = Number(process.hrtime.bigint() - startHr) / 1e6;
  const finishedAt = new Date();

  await pool.close();

  const outcomes: Record<string, number> = {};
  const statusCodes: Record<string, number> = {};
  let errors = 0;
  let successes = 0;

  for (const attempt of attempts) {
    outcomes[attempt.outcome] = (outcomes[attempt.outcome] ?? 0) + 1;
    const key = String(attempt.statusCode);
    statusCodes[key] = (statusCodes[key] ?? 0) + 1;
    if (attempt.isError) errors += 1;
    if (attempt.isSuccess) successes += 1;
  }

  const workload: WorkloadConfig = {
    profile: options.profile,
    requests: options.requests,
    concurrency: options.concurrency,
    warmupRequests: options.warmupRequests,
    seed: options.seed,
  };

  return {
    schemaVersion: RESULT_SCHEMA_VERSION,
    runId: randomUUID(),
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: Math.round(durationMs),
    implementation: options.implementation,
    target: options.target,
    gitCommit: readGitCommit(),
    environment: readEnvironment(),
    workload,
    throughputRps: Math.round((attempts.length / (durationMs / 1000)) * 100) / 100,
    latency: summarize(attempts.map((a) => a.latencyMs)),
    successRate: round4(successes / attempts.length),
    errorRate: round4(errors / attempts.length),
    outcomes,
    statusCodes,
    notes: options.notes,
  };
}

/**
 * Fixed-concurrency closed loop: `concurrency` workers each send a request,
 * wait for the answer, then send the next. This measures how the system behaves
 * with a fixed number of clients rather than at a fixed arrival rate. An open
 * model (fixed RPS, queueing on the client) shows different and often more
 * realistic saturation behaviour and is tracked as follow-up work.
 */
async function drive(
  pool: Pool,
  total: number,
  concurrency: number,
  pickCart: () => string,
): Promise<Attempt[]> {
  if (total <= 0) return [];

  const attempts: Attempt[] = new Array(total);
  let issued = 0;

  const worker = async () => {
    for (;;) {
      const index = issued;
      if (index >= total) return;
      issued += 1;
      attempts[index] = await attempt(pool, pickCart());
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker));
  return attempts;
}

async function attempt(pool: Pool, cartId: string): Promise<Attempt> {
  const correlationId = randomUUID();
  const body = JSON.stringify({ cartId, customerId: cartId.replace('CART', 'CUST') });
  const start = process.hrtime.bigint();

  try {
    const response = await pool.request({
      method: 'POST',
      path: CHECKOUT_PATH,
      headers: { 'content-type': 'application/json', [CORRELATION_HEADER]: correlationId },
      body,
    });
    const text = await response.body.text();
    const latencyMs = Number(process.hrtime.bigint() - start) / 1e6;

    let outcome = 'unknown';
    try {
      const parsed = JSON.parse(text) as { status?: string; reason?: string };
      outcome = parsed.status === 'success' ? 'success' : (parsed.reason ?? 'unknown');
    } catch {
      outcome = 'unparseable_response';
    }

    return {
      latencyMs,
      statusCode: response.statusCode,
      outcome,
      // A declined payment or a stockout is the system working correctly.
      // Only 5xx and transport failures count against the error rate.
      isError: response.statusCode >= 500,
      isSuccess: response.statusCode === 201,
    };
  } catch (error) {
    return {
      latencyMs: Number(process.hrtime.bigint() - start) / 1e6,
      statusCode: 0,
      outcome: 'transport_error',
      isError: true,
      isSuccess: false,
    };
  }
}

function readEnvironment(): RunEnvironment {
  const cpuList = cpus();
  return {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    cpuModel: cpuList[0]?.model ?? 'unknown',
    cpuCount: cpuList.length,
    totalMemoryBytes: totalmem(),
    containerCpuLimit: process.env.BENCH_CPU_LIMIT,
    containerMemoryLimit: process.env.BENCH_MEMORY_LIMIT,
  };
}

function readGitCommit(): string | null {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

const round4 = (value: number) => Math.round(value * 10000) / 10000;
