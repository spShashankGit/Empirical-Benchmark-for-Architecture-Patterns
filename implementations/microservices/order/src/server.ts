import Fastify from 'fastify';
import { DependencyError, type CreateOrderInput } from '@arch-bench/domain';
import { createOrderModule } from '@arch-bench/capabilities';
import { FAULTS_PATH, HEALTH_PATH } from '@arch-bench/contracts';

const PORT = Number(process.env.PORT ?? 4004);
const HOST = process.env.HOST ?? '0.0.0.0';

const order = createOrderModule();
const app = Fastify({ logger: process.env.LOG_LEVEL ? { level: process.env.LOG_LEVEL } : false });

app.setErrorHandler((error, _request, reply) => {
  const message = error instanceof Error ? error.message : String(error);
  return reply.status(error instanceof DependencyError ? 503 : 500).send({ error: message });
});

app.get(HEALTH_PATH, async () => ({ status: 'ok', service: 'order', orders: order.count() }));

app.post<{ Body: CreateOrderInput }>('/orders', async (request, reply) => {
  const created = await order.port.create(request.body, { correlationId: '' });
  return reply.status(201).send(created);
});

app.get(FAULTS_PATH, async () => order.faults.get());
app.post<{ Body: Record<string, unknown> & { reset?: boolean } }>(FAULTS_PATH, async (request) => {
  const { reset, ...patch } = request.body ?? {};
  return reset ? order.faults.reset() : order.faults.set(patch as never);
});

app
  .listen({ port: PORT, host: HOST })
  .then(() => console.log(`[order] listening on http://${HOST}:${PORT}`))
  .catch((error) => { console.error(error); process.exit(1); });
