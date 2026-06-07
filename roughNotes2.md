| Area | What To Compare / Test | Example Scenario | Main Question | Parameters / Signals |
|---|---|---|---|---|
| Architecture comparison | Layered Monolith vs Modular Monolith | Order management system | Does clear module separation improve maintainability without distributed complexity? | change effort, coupling, test time, build time, defect rate |
| Architecture comparison | Modular Monolith vs Microservices | E-commerce checkout | When does service separation become worth the operational cost? | latency, deployment independence, fault isolation, infra cost, debugging time |
| Architecture comparison | Microservices vs Event-Driven Architecture | Payment, inventory, shipping workflow | Does async communication improve scalability and resilience? | throughput, recovery behavior, consistency delay, message failure handling |
| Architecture comparison | REST Services vs CQRS | Product catalog or reporting system | Does separating reads and writes improve performance? | read latency, write latency, query complexity, data freshness |
| Architecture comparison | CRUD Architecture vs Event Sourcing | Banking ledger or audit-heavy system | Is full history worth the added complexity? | auditability, storage growth, replay time, debugging effort |
| Architecture comparison | Monolith vs Serverless | Image processing or scheduled jobs | Does serverless reduce ops burden for bursty workloads? | cold start latency, cost per request, operational effort, vendor lock-in |
| Architecture comparison | Synchronous APIs vs Async Messaging | Order placement workflow | What happens when downstream systems fail or slow down? | failure isolation, retry success, user-facing latency, complexity |
| Architecture comparison | Hexagonal / Clean Architecture vs Traditional Layered | Business-rule-heavy app | Does dependency isolation make change easier? | testability, mocking effort, adapter complexity, change impact |
| Benchmark parameter | Latency | Any user-facing API | How fast does the system respond? | p50, p95, p99 response time |
| Benchmark parameter | Throughput | High-volume API or event stream | How much work can the system handle? | requests/events processed per second |
| Benchmark parameter | Scalability | Growing users, orders, or data volume | How well does performance hold as load increases? | performance change as traffic/data/services increase |
| Benchmark parameter | Fault Isolation | Dependency outage | Does one failure break the whole system? | behavior when DB, service, queue, or network fails |
| Benchmark parameter | Consistency | Order/payment/inventory flow | How fresh and correct is the data? | stale reads, lost updates, eventual consistency delay |
| Benchmark parameter | Maintainability | Add or change one feature | How easy is the system to modify? | files/modules touched, code churn, time to implement |
| Benchmark parameter | Testability | Business-rule-heavy workflow | How easy is it to verify behavior? | unit/integration test count, setup time, flaky tests |
| Benchmark parameter | Deployment Complexity | Release or rollback | How hard is it to ship safely? | number of deployable units, rollback time, config complexity |
| Benchmark parameter | Observability | Production debugging | How easy is it to understand system behavior? | logs, traces, metrics, time to find root cause |
| Benchmark parameter | Cost | Normal and peak traffic | How expensive is it to run? | compute, storage, network, managed service cost |
| Benchmark parameter | Cognitive Load | New developer onboarding | How hard is the architecture to understand? | onboarding time, number of concepts/tools required |
| Benchmark parameter | Coupling | Feature change across modules/services | How dependent are parts of the system on each other? | shared database usage, direct calls, circular dependencies |
| Benchmark design check | Same Domain Model | Same app implemented multiple ways | Are the results actually comparable? | same entities, workflows, business rules |
| Benchmark design check | Same Workload | Same traffic and data profile | Are all patterns tested under equal conditions? | same read/write ratio, traffic spikes, data size |
| Benchmark design check | Clear Acceptance Criteria | Before running the benchmark | What does “better” mean? | faster, cheaper, safer, easier to change, easier to operate |
| Benchmark design check | Operational Reality | Running the system locally and in production | Does the architecture work outside diagrams? | deployment, monitoring, rollback, debugging effort |
| Benchmark design check | Failure Scenarios | Partial outage or slow dependency | How does the system behave under stress? | retries, timeouts, degraded mode, recovery time |
| Benchmark design check | Team Size Assumption | Solo, small team, large team | Does the pattern fit the people using it? | coordination cost, ownership clarity, release independence |
| Benchmark design check | Data Ownership | Multiple modules/services using data | Is ownership clear or shared? | database boundaries, schema ownership, duplicate data |
| Benchmark design check | Evolution Over Time | Add a second or third feature later | Does the architecture stay easy to change? | change effort over multiple iterations, regression rate |