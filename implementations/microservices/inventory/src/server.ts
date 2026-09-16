import Fastify from 'fastify';
import { DependencyError, type ReservationLine } from '@arch-bench/domain';
import { createInventoryModule } from '@arch-bench/capabilities';
import { FAULTS_PATH, HEALTH_PATH } from '@arch-bench/contracts';

const PORT = Number(process.env.PORT ?? 4002);
const HOST = process.env.HOST ?? '0.0.0.0';

const inventory = createInventoryModule();
const app = Fastify({ logger: process.env.LOG_LEVEL ? { level: process.env.LOG_LEVEL } : false });

app.setErrorHandler((error, _request, reply) => {
  const message = error instanceof Error ? error.message : String(error);
  return reply.status(error instanceof DependencyError ? 503 : 500).send({ error: message });
});

app.get(HEALTH_PATH, async () => ({ status: 'ok', service: 'inventory' }));

app.post<{ Body: { cartId: string; lines: ReservationLine[] } }>(
  '/reservations',
  async (request, reply) => {
    const outcome = await inventory.port.reserve(request.body.cartId, request.body.lines, {
      correlationId: '',
    });
    // 409 rather than an error status: a stockout is a correct business answer,
    // and the workload runner must not count it as an error.
    return reply.status(outcome.ok ? 201 : 409).send(outcome);
  },
);

app.delete<{ Params: { reservationId: string } }>(
  '/reservations/:reservationId',
  async (request, reply) => {
    await inventory.port.release(request.params.reservationId, { correlationId: '' });
    return reply.status(204).send();
  },
);

app.get(FAULTS_PATH, async () => inventory.faults.get());
app.post<{ Body: Record<string, unknown> & { reset?: boolean } }>(FAULTS_PATH, async (request) => {
  const { reset, ...patch } = request.body ?? {};
  return reset ? inventory.faults.reset() : inventory.faults.set(patch as never);
});

app
  .listen({ port: PORT, host: HOST })
  .then(() => console.log(`[inventory] listening on http://${HOST}:${PORT}`))
  .catch((error) => { console.error(error); process.exit(1); });
