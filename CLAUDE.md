# Working on this repository

## What this project is

An empirical benchmark comparing software architecture patterns. The first
comparison is a modular monolith against microservices for e-commerce checkout.

The output is **trustworthy numbers**, not working software. That inverts some
normal priorities: a measurement artifact is a bug, and a convenience that
biases one build over the other is a serious bug.

## The fairness rule

Both architectures must run the **same** business logic:

- `packages/domain` — the checkout workflow (`runCheckout`), written once.
- `packages/capabilities` — cart, inventory, payment, order, written once.
- The builds differ only in the boundary: in-process calls vs HTTP.

Before adding anything to one implementation, ask whether it belongs in a shared
package instead. If logic must diverge, say so explicitly in a comment and in the
roadmap — an undocumented divergence silently invalidates every number the repo
produces.

## Things that quietly corrupt results

- Per-request logging. Off by default; it does not cost both builds equally.
- Missing connection pooling in the HTTP adapters — measures TCP setup, not
  architecture.
- Skipping warmup. JIT and connection setup land in the tail.
- Unpinned container resources. Comparing one process against five unconstrained
  ones measures the machine.
- Counting business failures as errors. A declined payment is the system working.
- Reporting a single run as a result.

## Conventions

- TypeScript, ESM, Node 22+. Relative imports carry the `.js` extension.
- npm workspaces; build with `tsc -b` from the root.
- Fastify for servers, undici for clients.
- Comments explain *why* a measurement decision was made, not what the code does.

## Commands

```bash
npm install
npm run build        # tsc -b across all packages
npm test             # vitest
npm run start:monolith
npm run start:microservices
npm run bench -- --target=<url> --impl=<name> --profile=baseline
npm run report -- results/<a>.json results/<b>.json
```

## Ports

| Component | Port |
|---|---|
| modular monolith | 3000 |
| checkout API | 4000 |
| cart | 4001 |
| inventory | 4002 |
| payment | 4003 |
| order | 4004 |

## Before publishing any number

Check `docs/roadmap.md` Phase 1. Repeat runs, interleaving, confidence
intervals, and a real database all need to land first. Until then results are
observations for development, not findings.
