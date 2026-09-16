# Running a benchmark

## Local, unpinned (development only)

Fine for checking that a change works. Not fine for numbers you intend to quote:
nothing is isolated and the load generator competes with the system under test.

```bash
npm install && npm run build

npm run start:monolith                 # :3000
npm run start:microservices            # :4000  (five processes)

npm run bench -- --target=http://127.0.0.1:3000 --impl=modular-monolith --profile=baseline
```

### Profiles

| Profile | Requests | Concurrency | Warmup |
|---|---|---|---|
| `smoke` | 100 | 8 | 50 |
| `baseline` | 1,000 | 32 | 200 |
| `baseline-5k` | 5,000 | 64 | 500 |

Override any of them: `--requests=`, `--concurrency=`, `--warmup=`, `--seed=`.

## Measured runs

Use containers so both architectures get the same resource budget. The compose
file gives the monolith 2.0 CPUs and the five services 0.4 each — the same total.

```bash
docker compose build

docker compose up -d monolith
npm run bench -- --target=http://127.0.0.1:3000 --impl=modular-monolith --profile=baseline
docker compose down

docker compose up -d cart inventory payment order checkout-api
npm run bench -- --target=http://127.0.0.1:4000 --impl=microservices --profile=baseline
docker compose down
```

Run only one architecture at a time. If both are up, they compete for the same
cores and neither number means anything.

### Protocol for numbers you will publish

1. Idle machine. No browser, no editor indexing, no background sync.
2. Record the resource budget: set `BENCH_CPU_LIMIT` and `BENCH_MEMORY_LIMIT` so
   they land in the result file.
3. Interleave: A, B, A, B, A, B — at least three runs each. Machine conditions
   drift, and running all of A then all of B turns that drift into a fake result.
4. Compare spreads before differences. If repeats of one build vary by more than
   the gap between builds, you have measured noise.
5. Keep the result JSON. It records the git commit, so a run stays traceable to
   the code that produced it.

Ideally the load generator runs on a different machine from the system under
test. Until then, treat throughput ceilings as understated for both builds.

## Failure scenarios

Both architectures accept the same fault-injection body, so one script drives
both. Against the microservices build the checkout API fans the request out to
the owning service.

```bash
TARGET=http://127.0.0.1:3000   # or :4000

# Payment outage
curl -X POST $TARGET/admin/faults -H 'content-type: application/json' \
  -d '{"module":"payment","unavailable":true}'

# Inventory slowdown
curl -X POST $TARGET/admin/faults -H 'content-type: application/json' \
  -d '{"module":"inventory","latencyMs":250}'

# Flaky order service
curl -X POST $TARGET/admin/faults -H 'content-type: application/json' \
  -d '{"module":"order","failureRate":0.1}'

# Business declines (payment only)
curl -X POST $TARGET/admin/faults -H 'content-type: application/json' \
  -d '{"module":"payment","declineRate":0.25}'

curl -X POST $TARGET/admin/faults -H 'content-type: application/json' -d '{"reset":true}'
```

Write down the expected behaviour **before** running a scenario. A scenario whose
expectation is written afterwards tends to confirm whatever happened.

### Consistency anomalies

`GET /admin/anomalies` lists compensating actions that themselves failed —
payments authorized with no order, stock reserved for a checkout that never
completed. This count is a headline result, not a footnote: it is where
distributed builds are expected to pay a price the monolith does not.

## Interpreting outcomes

The runner separates *the system refused this checkout* from *the system broke*:

| Outcome | HTTP | Counts as error? |
|---|---|---|
| `success` | 201 | no |
| `out_of_stock`, `payment_declined`, `cart_empty` | 422 | no — correct business behaviour |
| `cart_not_found` | 404 | no |
| `order_creation_failed`, `dependency_unavailable` | 503 | yes |
| `transport_error` | — | yes |

Counting a declined payment as an error would make a healthy architecture look
unreliable.
