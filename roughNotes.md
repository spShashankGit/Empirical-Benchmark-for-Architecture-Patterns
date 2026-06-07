**Architecture Pattern Comparisons**

| Comparison to Test | Example Scenario | Main Question | Parameters to Measure |
|---|---|---|---|
| Layered Monolith vs Modular Monolith | Order management system | Does clear module separation improve maintainability without distributed complexity? | change effort, coupling, test time, build time, defect rate |
| Modular Monolith vs Microservices | E-commerce checkout | When does service separation become worth the operational cost? | latency, deployment independence, fault isolation, infra cost, debugging time |
| Microservices vs Event-Driven Architecture | Payment, inventory, shipping workflow | Does async communication improve scalability and resilience? | throughput, recovery behavior, consistency delay, message failure handling |
| REST Services vs CQRS | Product catalog or reporting system | Does separating reads and writes improve performance? | read latency, write latency, query complexity, data freshness |
| CRUD Architecture vs Event Sourcing | Banking ledger or audit-heavy system | Is full history worth the added complexity? | auditability, storage growth, replay time, debugging effort |
| Monolith vs Serverless | Image processing or scheduled jobs | Does serverless reduce ops burden for bursty workloads? | cold start latency, cost per request, operational effort, vendor lock-in |
| Synchronous APIs vs Async Messaging | Order placement workflow | What happens when downstream systems fail or slow down? | failure isolation, retry success, user-facing latency, complexity |
| Hexagonal/Clean Architecture vs Traditional Layered | Business-rule-heavy app | Does dependency isolation make change easier? | testability, mocking effort, adapter complexity, change impact |

**Parameters to Test**

| Parameter | What It Tells You | Example Measurement |
|---|---|---|
| Latency | User-perceived speed | p50, p95, p99 response time |
| Throughput | Load-handling capacity | requests/events processed per second |
| Scalability | How well the system grows | performance change as users/data/services increase |
| Fault Isolation | Whether one failure breaks everything | behavior when DB, service, queue, or network fails |
| Consistency | How correct/fresh data remains | stale reads, lost updates, eventual consistency delay |
| Maintainability | Ease of changing the system | files/modules touched for one feature change |
| Testability | Ease of verifying behavior | unit/integration test count, setup time, flaky tests |
| Deployment Complexity | Effort to release safely | number of deployable units, rollback time, config complexity |
| Observability | Ease of understanding production behavior | logs, traces, metrics, debugging time |
| Cost | Runtime and operational cost | compute, storage, network, managed service cost |
| Cognitive Load | How hard the architecture is to understand | onboarding time, number of concepts/tools required |
| Coupling | Degree of dependency between parts | shared database usage, direct calls, circular dependencies |

**What Else To Look For**

| Area | Why It Matters |
|---|---|
| Same Domain Model | Each pattern should solve the same business problem, otherwise results are not comparable. |
| Same Workload | Use identical read/write ratios, traffic spikes, data size, and failure scenarios. |
| Clear Acceptance Criteria | Define what “better” means before testing: faster, cheaper, safer, easier to change, etc. |
| Operational Reality | Include deployment, monitoring, rollback, local development, and debugging effort. |
| Failure Scenarios | Architecture quality often shows up during partial failure, not happy-path performance. |
| Team Size Assumption | Microservices may help large teams but hurt small teams; include this context. |
| Data Ownership | Check whether the pattern encourages clean ownership or creates shared-database coupling. |
| Evolution Over Time | Test how easy it is to add a feature after the initial implementation. |

A good benchmark should compare architecture patterns against the **same business problem**, same workload, and same quality goals. Otherwise the comparison becomes opinion-based.