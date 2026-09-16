import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import { runCheckout, type AnomalyObserver, type CheckoutPorts } from '@arch-bench/domain';
import {
  CHECKOUT_PATH,
  CORRELATION_HEADER,
  FAULTS_PATH,
  HEALTH_PATH,
  statusCodeFor,
  type CheckoutHttpRequest,
} from '@arch-bench/contracts';
import type { FaultController } from '@arch-bench/testkit';
import {
  createCartModule,
  createInventoryModule,
  createPaymentModule,
  createOrderModule,
} from '@arch-bench/capabilities';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';

const cart = createCartModule();
const inventory = createInventoryModule();
const payment = createPaymentModule();
const order = createOrderModule();

const faultControllers: Record<string, FaultController> = {
  cart: cart.faults,
  inventory: inventory.faults,
  payment: payment.faults,
  order: order.faults,
};

const anomalies: Array<{ action: string; subjectId: string; correlationId: string; error: string }> = [];
const observer: AnomalyObserver = {
  compensationFailed(action, subjectId, error, ctx) {
    anomalies.push({
      action,
      subjectId,
      correlationId: ctx.correlationId,
      error: error instanceof Error ? error.message : String(error),
    });
  },
};

const ports: CheckoutPorts = {
  cart: cart.port,
  inventory: inventory.port,
  payment: payment.port,
  order: order.port,
  observer,
};

// Logging is off by default: a synchronous log line per request would be a
// measurement artifact, and it would not cost the two architectures equally.
const app = Fastify({ logger: process.env.LOG_LEVEL ? { level: process.env.LOG_LEVEL } : false });

app.get(HEALTH_PATH, async () => ({
  status: 'ok',
  implementation: 'modular-monolith',
  orders: order.count(),
  anomalies: anomalies.length,
}));

app.post<{ Body: CheckoutHttpRequest }>(CHECKOUT_PATH, async (request, reply) => {
  const correlationId =
    (request.headers[CORRELATION_HEADER] as string | undefined) ?? randomUUID();

  const result = await runCheckout(
    {
      cartId: request.body.cartId,
      customerId: request.body.customerId,
      correlationId,
    },
    ports,
  );

  reply.header(CORRELATION_HEADER, correlationId);
  return reply.status(statusCodeFor(result)).send(result);
});

app.get(FAULTS_PATH, async () =>
  Object.fromEntries(Object.entries(faultControllers).map(([name, c]) => [name, c.get()])),
);

app.post<{ Body: { module?: string; reset?: boolean } & Record<string, unknown> }>(
  FAULTS_PATH,
  async (request, reply) => {
    const { module, reset, ...patch } = request.body ?? {};

    if (reset) {
      for (const controller of Object.values(faultControllers)) controller.reset();
      anomalies.length = 0;
      return { reset: true };
    }

    const controller = module ? faultControllers[module] : undefined;
    if (!controller) {
      return reply.status(400).send({
        error: `Unknown module "${module}". Expected one of: ${Object.keys(faultControllers).join(', ')}`,
      });
    }
    return controller.set(patch as never);
  },
);

app.get('/admin/anomalies', async () => ({ count: anomalies.length, anomalies }));

app
  .listen({ port: PORT, host: HOST })
  .then(() => console.log(`[modular-monolith] listening on http://${HOST}:${PORT}`))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
