# Design: Empirical Benchmark for Architecture Patterns

## Problem Statement

This project benchmarks software architecture patterns by implementing the same business workflow in multiple architectural styles and measuring the trade-offs under equal conditions.

The first benchmark compares a modular monolith against microservices for an e-commerce checkout workflow.

The goal is not to prove that one architecture is always better. The goal is to answer a narrower empirical question:

> At what traffic, team-size, failure, and change conditions do microservices produce enough benefit to justify their added operational cost?

## Benchmark Principles

The benchmark should be designed around fairness and repeatability.

- The compared systems must implement the same business behavior.
- The systems must run against the same workload, test data, and failure scenarios.
- The benchmark must define decision rules before results are collected.
- Runtime performance, operability, maintainability, and cost should all be measured.
- Human-measured signals must use a clear protocol to reduce subjectivity.
- Results should be reproducible on a documented local or cloud environment.

## First Benchmark Scope

The first benchmark is:

**Modular Monolith vs Microservices for E-commerce Checkout**

The shared business workflow includes:

1. A customer starts checkout with items in a cart.
2. The system validates item availability.
3. The system reserves inventory.
4. The system authorizes payment.
5. The system creates an order.
6. The system returns checkout success or failure.

The first version should stay intentionally small. A minimal end-to-end benchmark is more valuable than a large unfinished system.

## Shared Domain Model

Both implementations should use the same domain concepts:

- Cart
- Cart item
- Product
- Inventory reservation
- Payment authorization
- Order
- Checkout request
- Checkout result

Both implementations should support the same business rules:

- Checkout fails if any item is out of stock.
- Checkout fails if payment authorization fails.
- Inventory is reserved only for successful checkout attempts.
- An order is created only after inventory reservation and payment authorization succeed.
- Failed checkout attempts should be visible in logs and metrics.

Open decision: whether payment should be modeled as a local fake provider, an internal service, or a controllable test double.

## Architecture Implementations

### Modular Monolith

The modular monolith should be one deployable application with clear internal module boundaries.

Suggested modules:

- Cart
- Inventory
- Payment
- Order
- Checkout orchestration

The modular monolith can use in-process calls and a shared runtime. Database ownership still needs to be explicit. The preferred baseline is one database with schema boundaries per module, unless the implementation stack makes another choice simpler and well documented.

### Microservices

The microservices implementation should split the same responsibilities into separately deployable services.

Suggested services:

- Cart service
- Inventory service
- Payment service
- Order service
- Checkout API or orchestration service

Each service should own its data where practical. Cross-service calls, timeouts, retries, and failure behavior must be explicit because these are central to the comparison.

Open decision: whether the first microservices version should use synchronous HTTP only, or include asynchronous messaging for selected operations.

## Expected Control Flow

### Modular Monolith Flow

1. API receives checkout request.
2. Checkout module calls inventory module in process.
3. Checkout module calls payment module in process.
4. Checkout module calls order module in process.
5. Application returns checkout result.

### Microservices Flow

1. Checkout API receives checkout request.
2. Checkout API calls inventory service.
3. Checkout API calls payment service.
4. Checkout API calls order service.
5. Services emit logs and metrics with a shared correlation ID.
6. Checkout API returns checkout result.

The business result should be equivalent in both systems even if the internal coordination differs.

## Workload Profiles

Initial workload profiles:

| Profile | Description | Signals |
|---|---|---|
| Baseline | Fixed request batches at 100, 500, 1,000, and 5,000 checkouts | p50, p95, p99 latency, throughput, error rate |
| Ramp | Increase traffic until p95 latency or error rate violates the SLA | breaking point, resource saturation |
| Spike | Sudden traffic increase after steady state | recovery behavior, queueing, error rate |
| Mixed | Checkout traffic with reads for cart, product, and order status | read/write interference |

Open decision: the first SLA threshold. A starting candidate is p95 checkout latency below 500 ms with an error rate below 1% under baseline load.

## Failure Scenarios

Initial failure scenarios:

| Scenario | Procedure | Compare |
|---|---|---|
| Payment failure | Force payment authorization to fail for 5 minutes | failure blast radius, error handling, recovery time |
| Inventory slowdown | Add artificial delay to inventory lookup or reservation | checkout latency, timeout behavior |
| Order persistence failure | Make order creation fail temporarily | consistency, rollback or compensation behavior |
| Partial dependency outage | Stop one module dependency or service dependency | isolation, degraded behavior, observability |

Each failure scenario should define expected behavior before it is run.

## Change And Evolution Scenarios

Architecture value often appears during change, not only during steady-state performance.

Initial change scenarios:

| Scenario | Procedure | Compare |
|---|---|---|
| Inventory rule change | Change reservation logic | files touched, modules/services touched, tests changed |
| Coupon support | Add a discount step to checkout | code churn, regression failures, coordination cost |
| Refund support | Add post-order refund behavior | data ownership, service boundaries, test effort |
| Split shipment | Allow one checkout to create multiple fulfillments | model flexibility, coupling, migration effort |

Human-time measurements should use a written protocol: same task description, same starting state, same acceptance tests, and recorded start/end times.

## Metrics

The benchmark should collect both machine-measured and process-measured metrics.

Machine-measured metrics:

- p50, p95, and p99 checkout latency
- Throughput in requests per second
- Error rate
- CPU and memory usage
- Database usage
- Network overhead
- Recovery time after failure
- Consistency anomalies, if any

Process-measured metrics:

- Number of deployable units changed
- Deployment time
- Rollback time
- Files changed
- Modules or services touched
- Test count and test runtime
- Debugging time for seeded bugs
- Configuration count
- Required local development steps

Cost signals:

- Runtime units
- Database instances or schemas
- Network traffic
- Required infrastructure services
- Estimated cost per 1,000 checkouts

## Decision Rules

Decision rules should be written before collecting results.

Initial candidate rules:

- Microservices are justified only if they reduce deployment scope or failure blast radius by at least 50% without pushing p95 latency, error rate, or cost beyond the agreed threshold.
- Modular monolith is preferred if it delivers similar scalability with lower latency, lower cost, simpler debugging, and fewer operational moving parts.
- If results are mixed, the benchmark should report the conditions where each architecture performs better instead of declaring a universal winner.

## Tooling And Runtime Environment

The tooling is still undecided. The design should choose tools that make repeatable measurement easy.

Decisions needed:

- Implementation language and framework
- Database engine
- Load-test tool
- Metrics format
- Log and trace format
- Local orchestration approach
- CI workflow
- Result report format

Suggested implementation direction:

- Use containers for repeatable local execution.
- Use one command to start each implementation.
- Use one command to run the same benchmark suite against either implementation.
- Store benchmark outputs as structured files that can be compared over time.

## Results Format

Each benchmark run should produce a structured result directory.

Suggested contents:

- run metadata
- architecture under test
- git commit
- environment information
- workload configuration
- scenario configuration
- latency and throughput metrics
- resource metrics
- error summary
- logs or links to logs
- final comparison summary

The exact schema should be defined before implementation starts.

## Reproducibility Requirements

A reader should be able to reproduce a benchmark run without guessing.

Required documentation:

- How to install dependencies
- How to start the modular monolith
- How to start the microservices system
- How to seed test data
- How to run each workload profile
- How to run each failure scenario
- How to read the generated results

## Known Limitations

This benchmark will not prove that an architecture is universally better.

Important limitations:

- A small checkout workflow may not represent all real business systems.
- Human-time measurements are useful but naturally noisy.
- Results depend on implementation quality and tooling choices.
- Microservices benefits may depend heavily on team size and organizational boundaries.
- Local benchmark results may differ from production cloud behavior.

These limitations should be documented with the results instead of hidden.

## Future Comparisons

After the first benchmark is working end to end, the same harness can be extended to other comparisons:

- Layered monolith vs modular monolith
- Microservices vs event-driven architecture
- REST services vs CQRS
- CRUD architecture vs event sourcing
- Monolith vs serverless
- Synchronous APIs vs asynchronous messaging
- Hexagonal architecture vs traditional layered architecture

The benchmark harness should support future comparisons, but the first implementation should optimize for finishing one fair comparison.

## Recommended Next Steps

1. Update the README with the project goal and first benchmark scope.
2. Choose the implementation stack and benchmark tooling.
3. Define the checkout API and result schema.
4. Define the benchmark result schema.
5. Build the modular monolith implementation.
6. Build the microservices implementation.
7. Implement the shared workload runner.
8. Add the first failure scenario.
9. Generate the first comparison report.
