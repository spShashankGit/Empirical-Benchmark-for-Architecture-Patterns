# Empirical Benchmark for Architecture Patterns

Architecture debates are usually settled by opinion and anecdote. This project
tries to settle a narrow slice of one with measurements.

The method: implement **the same business workflow** in two architectural
styles, run **the same workload** against both, and publish the numbers along
with everything that could have biased them.

The first benchmark compares a **modular monolith** against **microservices**
for an e-commerce checkout. The question is not "which is better" but:

> At what traffic, failure, and change conditions do microservices produce
> enough benefit to justify their added operational cost?

## Status

Early. The harness runs end to end and both builds serve identical checkout
behaviour, but **no result here is publishable yet** — see
[Known limitations](#known-limitations).

## How the comparison is kept fair

The single most important design decision in this repo:

- `packages/domain` holds the checkout workflow, written **once**. Both builds
  call the same `runCheckout` function.
- `packages/capabilities` holds the cart, inventory, payment and order logic,
  written **once**. The monolith wires them in process; each microservice wraps
  one of them in HTTP.
- The only real difference between the two builds is the **boundary**: an
  in-process call versus an HTTP call.

That makes a measured difference attributable to the architecture rather than to
one build being written better than the other. It is also a deliberate
limitation — it holds orchestration constant, so it does not capture how real
services diverge over time. Those effects belong in the evolution scenarios.

## Layout

```
packages/
  domain/         shared model, ports, and the checkout workflow
  capabilities/   cart, inventory, payment, order — one implementation each
  contracts/      HTTP API shapes and the benchmark result schema
  testkit/        deterministic seed data and fault injection
  harness/        workload runner and report generator
implementations/
  modular-monolith/   one process, in-process module calls
  microservices/      cart, inventory, payment, order, checkout-api
results/          benchmark output (git-ignored)
docs/             design, roadmap, and how to run a benchmark
```

## Quick start

```bash
npm install
npm run build
npm test

# terminal 1 — pick one
npm run start:monolith        # http://127.0.0.1:3000
npm run start:microservices   # http://127.0.0.1:4000

# terminal 2
npm run bench -- --target=http://127.0.0.1:3000 --impl=modular-monolith --profile=baseline
npm run report -- results/<a>.json results/<b>.json
```

For measured runs use `docker compose`, which pins CPU and memory so the two
builds get the same resource budget. See [docs/running-a-benchmark.md](docs/running-a-benchmark.md).

## Failure scenarios

Every module and service exposes the same fault-injection endpoint, so one
scenario script drives both architectures:

```bash
curl -X POST http://127.0.0.1:3000/admin/faults \
  -H 'content-type: application/json' \
  -d '{"module":"payment","unavailable":true}'
```

Knobs: `latencyMs`, `failureRate`, `declineRate`, `unavailable`. Send
`{"reset":true}` to clear.

## Known limitations

Read these before quoting any number from this repo.

- **No database.** Storage is in-memory, which removes database contention —
  one of the places the two architectures genuinely diverge.
- **Single-machine.** Both builds and the load generator share one host, so the
  generator competes with the system under test for CPU.
- **Closed-loop load model.** Fixed concurrency, not fixed arrival rate. Real
  traffic does not wait politely for a reply before sending the next request.
- **One run proves nothing.** Interleave repeated runs (A, B, A, B) and check
  that the gap between builds exceeds the spread between repeats of one build.
- **No retries or circuit breakers** in the service build yet. Adding them
  changes latency, blast radius and consistency at once, so they need their own
  experiment rather than being switched on silently.

## Contributing

Ideas for which patterns to compare and which parameters to measure are very
welcome — please open a GitHub issue.

Design reasoning lives in [docs/design.md](docs/design.md); the sequenced plan
is in [docs/roadmap.md](docs/roadmap.md).

## License

MIT
