import Fastify from 'fastify';
import { DependencyError } from '@arch-bench/domain';
import { createPaymentModule } from '@arch-bench/capabilities';
import { FAULTS_PATH, HEALTH_PATH } from '@arch-bench/contracts';

const PORT = Number(process.env.PORT ?? 4003);
const HOST = process.env.HOST ?? '0.0.0.0';

const payment = createPaymentModule();
const app = Fastify({ logger: process.env.LOG_LEVEL ? { level: process.env.LOG_LEVEL } : false });

app.setErrorHandler((error, _request, reply) => {
  const message = error instanceof Error ? error.message : String(error);
  return reply.status(error instanceof DependencyError ? 503 : 500).send({ error: message });
});

app.get(HEALTH_PATH, async () => ({ status: 'ok', service: 'payment' }));

app.post<{ Body: { cartId: string; amountCents: number } }>(
  '/authorizations',
  async (request, reply) => {
    const outcome = await payment.port.authorize(request.body.cartId, request.body.amountCents, {
      correlationId: '',
    });
    // 402 is a business decline, not a failure of the system.
    return reply.status(outcome.ok ? 201 : 402).send(outcome);
  },
);

app.delete<{ Params: { authorizationId: string } }>(
  '/authorizations/:authorizationId',
  async (request, reply) => {
    await payment.port.void(request.params.authorizationId, { correlationId: '' });
    return reply.status(204).send();
  },
);

app.get(FAULTS_PATH, async () => payment.faults.get());
app.post<{ Body: Record<string, unknown> & { reset?: boolean } }>(FAULTS_PATH, async (request) => {
  const { reset, ...patch } = request.body ?? {};
  return reset ? payment.faults.reset() : payment.faults.set(patch as never);
});

app
  .listen({ port: PORT, host: HOST })
  .then(() => console.log(`[payment] listening on http://${HOST}:${PORT}`))
  .catch((error) => { console.error(error); process.exit(1); });
