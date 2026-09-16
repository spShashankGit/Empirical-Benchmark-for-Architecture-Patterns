# Roadmap

Sequenced so that each step leaves the benchmark in a runnable state. The
ordering principle: **close the credibility gaps before adding scope.** A second
comparison built on a methodology nobody trusts is worth less than one
comparison nobody can poke a hole in.

## Done

- [x] Shared domain model, ports, and a single `runCheckout` used by both builds
- [x] Shared capability implementations (cart, inventory, payment, order)
- [x] Modular monolith over in-process calls
- [x] Microservices build: four capability services plus a checkout API
- [x] Deterministic seed data identical in both builds
- [x] Fault injection with one API that drives both architectures
- [x] Workload runner, result schema, comparison report
- [x] Resource-pinned docker compose
- [x] Unit tests for the checkout workflow including compensation paths

## Phase 1 — make the numbers trustworthy

Nothing should be published before this phase is complete.

- [ ] **Repeat-run support.** `--repeat=N` with interleaved A/B execution and
      aggregate statistics across runs. Right now a single run invites exactly
      the over-reading the project exists to fight.
- [ ] **Report confidence intervals**, not just point estimates. Add a spread
      column and refuse to declare a difference smaller than the noise.
- [ ] **Open-loop load model** (`--rate=`) alongside the current closed loop.
      Fixed concurrency hides queueing behaviour that real traffic exposes.
- [ ] **Separate the load generator** from the system under test, or at minimum
      measure and report the generator's own CPU use.
- [ ] **Resource metrics in results**: per-container CPU, memory, and the
      microservices build's network bytes. The infra-cost story needs these.
- [ ] **A real database.** In-memory storage removes contention, which is one of
      the genuine divergence points. Postgres — one instance with a schema per
      module for the monolith, one schema per service for the services build.

## Phase 2 — the scenarios that actually decide the question

Latency is the least interesting thing being measured here. These matter more.

- [ ] **Scenario runner**: scripted failure scenarios with expectations declared
      up front, producing a result file like the workload runner does.
- [ ] **Blast radius measurement.** Under a payment outage, what fraction of
      non-payment operations still succeed? This is the metric most likely to
      favour microservices, and it is currently unmeasured.
- [ ] **Recovery time** after a dependency returns.
- [ ] **Consistency anomaly counts** as a first-class reported metric.
- [ ] **Ramp profile** — increase load until the SLA breaks, report the breaking
      point for each build.
- [ ] **Spike profile** — step change after steady state.
- [ ] **Timeout and retry experiment.** Retries change latency, blast radius and
      consistency simultaneously, so they get their own run rather than being
      silently enabled in the baseline.

## Phase 3 — change and evolution

The place architecture claims are usually made, and rarely tested.

- [ ] **Deployment scope metric**: for a given change, how many deployable units
      must be rebuilt and redeployed? Automate it from the dependency graph
      rather than counting by hand.
- [ ] **Evolution scenarios** from the design doc — coupon, refund, split
      shipment — each implemented in both builds and measured for files touched,
      units redeployed, and test churn.
- [ ] **Protocol for human-timed metrics.** Debugging time and change effort with
      one developer and no blinding are anecdote, not data. Either design this
      properly (multiple participants, seeded bugs, randomized order) or report
      the automated proxies and say plainly why the human numbers are absent.

## Phase 4 — publish

- [ ] First full comparison report with methodology, raw results, and a limits
      section written before the conclusions.
- [ ] CI: build, typecheck, test, and a smoke benchmark on every PR.
- [ ] Publish results in the repo so runs are comparable over time.

## Later — more comparisons

Only once the first comparison is complete and credible. The harness is already
shaped for these; each needs a new implementation pair, not a new harness.

- Layered monolith vs modular monolith
- Microservices vs event-driven architecture
- REST vs CQRS
- CRUD vs event sourcing
- Synchronous vs asynchronous messaging
- Hexagonal vs traditional layered

## Open questions

- **SLA threshold.** Candidate: p95 checkout under 500 ms with error rate below
  1% at baseline. Needs to be fixed before ramp tests, not after.
- **Does the shared-orchestration design under-report the cost of
  microservices?** It holds coordination logic constant, which is right for
  isolating boundary cost but may flatter the distributed build. Worth an
  explicit note in any published result.
- **Should a second runtime be benchmarked?** Replicating in a second language
  would turn "your results are an artifact of your stack" from a limitation into
  a finding.
