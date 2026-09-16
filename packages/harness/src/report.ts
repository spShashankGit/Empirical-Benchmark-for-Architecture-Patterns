import type { BenchmarkResult } from '@arch-bench/contracts';

/** Renders a side-by-side markdown comparison of two or more runs. */
export function compareResults(results: readonly BenchmarkResult[]): string {
  if (results.length === 0) return 'No results to compare.\n';

  const header = ['Metric', ...results.map((r) => r.implementation)];
  const rows: string[][] = [
    ['Profile', ...results.map((r) => r.workload.profile)],
    ['Requests', ...results.map((r) => String(r.workload.requests))],
    ['Concurrency', ...results.map((r) => String(r.workload.concurrency))],
    ['Throughput (req/s)', ...results.map((r) => r.throughputRps.toFixed(1))],
    ['p50 (ms)', ...results.map((r) => r.latency.p50Ms.toFixed(2))],
    ['p95 (ms)', ...results.map((r) => r.latency.p95Ms.toFixed(2))],
    ['p99 (ms)', ...results.map((r) => r.latency.p99Ms.toFixed(2))],
    ['max (ms)', ...results.map((r) => r.latency.maxMs.toFixed(2))],
    ['std dev (ms)', ...results.map((r) => r.latency.stdDevMs.toFixed(2))],
    ['Success rate', ...results.map((r) => pct(r.successRate))],
    ['Error rate', ...results.map((r) => pct(r.errorRate))],
  ];

  const outcomeKeys = [...new Set(results.flatMap((r) => Object.keys(r.outcomes)))].sort();
  for (const key of outcomeKeys) {
    rows.push([`outcome: ${key}`, ...results.map((r) => String(r.outcomes[key] ?? 0))]);
  }

  const lines = [
    '# Benchmark comparison',
    '',
    `Generated ${new Date().toISOString()}`,
    '',
    table(header, rows),
    '',
    '## Runs',
    '',
    ...results.map(
      (r) =>
        `- **${r.implementation}** — run \`${r.runId}\`, commit \`${r.gitCommit ?? 'unknown'}\`, ` +
        `${r.environment.cpuCount}x ${r.environment.cpuModel}, node ${r.environment.nodeVersion}`,
    ),
    '',
    '## Reading this',
    '',
    'Numbers from a single run of each build are an observation, not a result.',
    'Before drawing a conclusion, run each build several times in an interleaved',
    'order (A, B, A, B) on an otherwise idle machine and check that the gap',
    'between builds is larger than the spread between repeats of the same build.',
    '',
  ];

  return lines.join('\n');
}

function table(header: readonly string[], rows: readonly string[][]): string {
  const out = [
    `| ${header.join(' | ')} |`,
    `|${header.map(() => '---').join('|')}|`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ];
  return out.join('\n');
}

const pct = (value: number) => `${(value * 100).toFixed(2)}%`;
