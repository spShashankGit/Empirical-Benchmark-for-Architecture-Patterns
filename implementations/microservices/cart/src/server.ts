import Fastify from 'fastify';
import { DependencyError } from '@arch-bench/domain';
import { createCartModule } from '@arch-bench/capabilities';
import { FAULTS_PATH, HEALTH_PATH } from '@arch-bench/contracts';

const PORT = Number(process.env.PORT ?? 4001);
const HOST = process.env.HOST ?? '0.0.0.0';

const cart = createCartModule();
const app = Fastify({ logger: process.env.LOG_LEVEL ? { level: process.env.LOG_LEVEL } : false });

// An injected fault becomes a 503 so the caller sees it as a dependency
// problem, matching how the monolith surfaces the same fault in process.
app.setErrorHandler((error, _request, reply) => {
  const message = error instanceof Error ? error.message : String(error);
  return reply.status(error instanceof DependencyError ? 503 : 500).send({ error: message });
});

app.get(HEALTH_PATH, async () => ({ status: 'ok', service: 'cart' }));

app.get<{ Params: { cartId: string } }>('/carts/:cartId', async (request, reply) => {
  const found = await cart.port.getCart(request.params.cartId, { correlationId: '' });
  if (!found) return reply.status(404).send({ error: 'cart_not_found' });
  return found;
});

app.get(FAULTS_PATH, async () => cart.faults.get());
app.post<{ Body: Record<string, unknown> & { reset?: boolean } }>(FAULTS_PATH, async (request) => {
  const { reset, ...patch } = request.body ?? {};
  return reset ? cart.faults.reset() : cart.faults.set(patch as never);
});

app
  .listen({ port: PORT, host: HOST })
  .then(() => console.log(`[cart] listening on http://${HOST}:${PORT}`))
  .catch((error) => { console.error(error); process.exit(1); });
