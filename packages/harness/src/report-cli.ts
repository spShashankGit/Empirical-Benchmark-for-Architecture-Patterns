import { readFile } from 'node:fs/promises';
import type { BenchmarkResult } from '@arch-bench/contracts';
import { compareResults } from './report.js';

async function main(): Promise<void> {
  const files = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  if (files.length === 0) {
    console.error('Usage: npm run report -- <result.json> <result.json> [...]');
    process.exit(1);
  }

  const results: BenchmarkResult[] = [];
  for (const file of files) {
    results.push(JSON.parse(await readFile(file, 'utf8')) as BenchmarkResult);
  }

  console.log(compareResults(results));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
