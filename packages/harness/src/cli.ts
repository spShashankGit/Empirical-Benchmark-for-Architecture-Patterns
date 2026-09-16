import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runWorkload, type RunOptions } from './runner.js';

/** Named workload profiles from the design doc. */
const PROFILES: Record<string, { requests: number; concurrency: number; warmupRequests: number }> = {
  smoke: { requests: 100, concurrency: 8, warmupRequests: 50 },
  baseline: { requests: 1000, concurrency: 32, warmupRequests: 200 },
  'baseline-5k': { requests: 5000, concurrency: 64, warmupRequests: 500 },
};

function parseArgs(argv: readonly string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (const entry of argv) {
    const match = /^--([^=]+)=(.*)$/.exec(entry);
    if (match) args[match[1]!] = match[2]!;
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const profileName = args.profile ?? 'baseline';
  const profile = PROFILES[profileName];
  if (!profile) {
    console.error(
      `Unknown profile "${profileName}". Available: ${Object.keys(PROFILES).join(', ')}`,
    );
    process.exit(1);
  }

  const options: RunOptions = {
    target: args.target ?? 'http://127.0.0.1:3000',
    implementation: args.impl ?? 'unknown',
    profile: profileName,
    requests: Number(args.requests ?? profile.requests),
    concurrency: Number(args.concurrency ?? profile.concurrency),
    warmupRequests: Number(args.warmup ?? profile.warmupRequests),
    seed: Number(args.seed ?? 20260101),
    notes: args.notes,
  };

  console.log(
    `Running ${options.profile}: ${options.requests} requests at concurrency ` +
      `${options.concurrency} against ${options.target} (${options.implementation})`,
  );

  const result = await runWorkload(options);

  const outDir = resolve(args.out ?? 'results');
  await mkdir(outDir, { recursive: true });
  const stamp = result.startedAt.replace(/[:.]/g, '-');
  const file = resolve(outDir, `${stamp}-${result.implementation}-${result.workload.profile}.json`);
  await writeFile(file, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  console.log('');
  console.log(`  throughput   ${result.throughputRps.toFixed(1)} req/s`);
  console.log(`  p50 / p95    ${result.latency.p50Ms.toFixed(2)} ms / ${result.latency.p95Ms.toFixed(2)} ms`);
  console.log(`  p99 / max    ${result.latency.p99Ms.toFixed(2)} ms / ${result.latency.maxMs.toFixed(2)} ms`);
  console.log(`  success      ${(result.successRate * 100).toFixed(2)}%`);
  console.log(`  errors       ${(result.errorRate * 100).toFixed(2)}%`);
  console.log(`  outcomes     ${JSON.stringify(result.outcomes)}`);
  console.log('');
  console.log(`Saved ${file}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
