#!/usr/bin/env node
/**
 * Starts the five microservices as child processes.
 *
 * Deliberately dependency-free so that running the benchmark never requires
 * installing a process manager. For measured runs prefer docker compose, which
 * pins CPU and memory per container.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const services = [
  { name: 'cart', dir: 'cart', port: 4001 },
  { name: 'inventory', dir: 'inventory', port: 4002 },
  { name: 'payment', dir: 'payment', port: 4003 },
  { name: 'order', dir: 'order', port: 4004 },
  { name: 'checkout-api', dir: 'checkout-api', port: 4000 },
];

const children = services.map((service) => {
  const entry = resolve(root, 'implementations/microservices', service.dir, 'dist/server.js');
  const child = spawn(process.execPath, [entry], {
    env: { ...process.env, PORT: String(service.port) },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  child.on('exit', (code) => {
    console.error(`[${service.name}] exited with code ${code}`);
    shutdown(code ?? 1);
  });
  return child;
});

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
