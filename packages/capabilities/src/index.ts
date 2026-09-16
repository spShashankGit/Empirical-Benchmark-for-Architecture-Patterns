/**
 * The four business capabilities, implemented once.
 *
 * The modular monolith wires these directly as in-process ports. Each
 * microservice wraps exactly one of them in an HTTP server. Identical business
 * code on both sides means a measured difference is attributable to the
 * boundary, not to one build being better written.
 *
 * Storage is in-memory for the first benchmark. That is a real limitation —
 * it removes database contention, which is one of the places a monolith and a
 * set of services genuinely diverge. Adding a real database is tracked in the
 * roadmap and should land before any headline result is published.
 */
export * from './cart.js';
export * from './inventory.js';
export * from './payment.js';
export * from './order.js';
export * from './ids.js';
