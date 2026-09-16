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
import {
  createCartAdapter,
  createInventoryAdapter,
  createOrderAdapter,
  createPaymentAdapter,
  createPools,
  type ServiceUrls,
} from './adapters.js';

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? '0.0.0.0';

const urls: ServiceUrls = {
  cart: process.env.CART_URL ?? 'http://127.0.0.1:4001',
  inventory: process.env.INVENTORY_URL ?? 'http://127.0.0.1:4002',
  payment: process.env.PAYMENT_URL ?? 'http://127.0.0.1:4003',
  order: process.env.ORDER_URL ?? 'http://127.0.0.1:4004',
};

const pools = createPools(urls);

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

// Identical to the monolith's wiring except that every port is an HTTP call.
const ports: CheckoutPorts = {
  cart: createCartAdapter(pools),
  inventory: createInventoryAdapter(pools),
  payment: createPaymentAdapter(pools),
  order: createOrderAdapter(pools),
  observer,
};

const app = Fastify({ logger: process.env.LOG_LEVEL ? { level: process.env.LOG_LEVEL } : false });

app.get(HEALTH_PATH, async () => ({
  status: 'ok',
  implementation: 'microservices',
  service: 'checkout-api',
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

/**
 * Fault control is fanned out to the owning service so that a scenario script
 * can post the same body to either architecture. Without this, every failure
 * scenario would need two versions and they would drift apart.
 */
const serviceUrlByModule: Record<string, string> = {
  cart: urls.cart,
  inventory: urls.inventory,
  payment: urls.payment,
  order: urls.order,
};

app.get(FAULTS_PATH, async () => {
  const entries = await Promise.all(
    Object.entries(serviceUrlByModule).map(async ([name, url]) => {
      const response = await fetch(`${url}${FAULTS_PATH}`);
      return [name, await response.json()] as const;
    }),
  );
  return Object.fromEntries(entries);
});

app.post<{ Body: { module?: string; reset?: boolean } & Record<string, unknown> }>(
  FAULTS_PATH,
  async (request, reply) => {
    const { module, reset, ...patch } = request.body ?? {};

    if (reset) {
      await Promise.all(
        Object.values(serviceUrlByModule).map((url) =>
          fetch(`${url}${FAULTS_PATH}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ reset: true }),
          }),
        ),
      );
      anomalies.length = 0;
      return { reset: true };
    }

    const url = module ? serviceUrlByModule[module] : undefined;
    if (!url) {
      return reply.status(400).send({
        error: `Unknown module "${module}". Expected one of: ${Object.keys(serviceUrlByModule).join(', ')}`,
      });
    }

    const response = await fetch(`${url}${FAULTS_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    });
    return response.json();
  },
);

app.get('/admin/anomalies', async () => ({ count: anomalies.length, anomalies }));

app
  .listen({ port: PORT, host: HOST })
  .then(() => console.log(`[checkout-api] listening on http://${HOST}:${PORT}`))
  .catch((error) => { console.error(error); process.exit(1); });
