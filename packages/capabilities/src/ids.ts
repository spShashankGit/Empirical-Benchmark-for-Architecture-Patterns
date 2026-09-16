/**
 * Monotonic ids. Cheaper than randomUUID and deterministic per process, which
 * keeps id generation from showing up in the latency measurement.
 */
export function createIdFactory(prefix: string): () => string {
  let counter = 0;
  return () => `${prefix}-${(counter += 1)}`;
}
