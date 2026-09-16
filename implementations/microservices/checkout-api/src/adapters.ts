import { Pool } from 'undici';
import {
  DependencyError,
  type CartPort,
  type InventoryPort,
  type OrderPort,
  type PaymentPort,
} from '@arch-bench/domain';
import { CORRELATION_HEADER } from '@arch-bench/contracts';

/**
 * HTTP adapters for the four capability services.
 *
 * These are the only thing that differs from the modular monolith. Everything
 * about them is therefore a measurement decision:
 *
 * - Connection pooling is on. Without it every checkout would pay for TCP
 *   handshakes and the comparison would measure our client setup rather than
 *   the architecture.
 * - Timeouts are explicit and configurable, because timeout behaviour is one of
 *   the things the failure scenarios are meant to expose.
 * - There are no retries yet. Retries change latency, blast radius and
 *   consistency all at once, so they belong in their own experiment rather than
 *   being switched on silently in the baseline.
 */

const TIMEOUT_MS = Number(process.env.DEPENDENCY_TIMEOUT_MS ?? 2000);
const CONNECTIONS = Number(process.env.DEPENDENCY_POOL_SIZE ?? 128);

function createPool(baseUrl: string): Pool {
  return new Pool(baseUrl, {
    connections: CONNECTIONS,
    headersTimeout: TIMEOUT_MS,
    bodyTimeout: TIMEOUT_MS,
  });
}

export interface ServiceUrls {
  cart: string;
  inventory: string;
  payment: string;
  order: string;
}

export function createPools(urls: ServiceUrls) {
  return {
    cart: createPool(urls.cart),
    inventory: createPool(urls.inventory),
    payment: createPool(urls.payment),
    order: createPool(urls.order),
  };
}

export type Pools = ReturnType<typeof createPools>;

interface CallOptions {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  correlationId: string;
  body?: unknown;
  /** Status codes that carry a meaningful answer rather than a failure. */
  expect: number[];
}

async function call(
  pool: Pool,
  dependency: string,
  options: CallOptions,
): Promise<{ status: number; body: unknown }> {
  let response;
  try {
    response = await pool.request({
      method: options.method,
      path: options.path,
      headers: {
        'content-type': 'application/json',
        [CORRELATION_HEADER]: options.correlationId,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    throw new DependencyError(dependency, 'request failed', error);
  }

  const text = await response.body.text();
  if (!options.expect.includes(response.statusCode)) {
    throw new DependencyError(
      dependency,
      `unexpected status ${response.statusCode}: ${text.slice(0, 200)}`,
    );
  }

  return { status: response.statusCode, body: text.length > 0 ? JSON.parse(text) : null };
}

export function createCartAdapter(pools: Pools): CartPort {
  return {
    async getCart(cartId, ctx) {
      const { status, body } = await call(pools.cart, 'cart', {
        method: 'GET',
        path: `/carts/${encodeURIComponent(cartId)}`,
        correlationId: ctx.correlationId,
        expect: [200, 404],
      });
      return status === 404 ? null : (body as never);
    },
  };
}

export function createInventoryAdapter(pools: Pools): InventoryPort {
  return {
    async reserve(cartId, lines, ctx) {
      const { body } = await call(pools.inventory, 'inventory', {
        method: 'POST',
        path: '/reservations',
        correlationId: ctx.correlationId,
        body: { cartId, lines },
        expect: [201, 409],
      });
      return body as never;
    },
    async release(reservationId, ctx) {
      await call(pools.inventory, 'inventory', {
        method: 'DELETE',
        path: `/reservations/${encodeURIComponent(reservationId)}`,
        correlationId: ctx.correlationId,
        expect: [204],
      });
    },
  };
}

export function createPaymentAdapter(pools: Pools): PaymentPort {
  return {
    async authorize(cartId, amountCents, ctx) {
      const { body } = await call(pools.payment, 'payment', {
        method: 'POST',
        path: '/authorizations',
        correlationId: ctx.correlationId,
        body: { cartId, amountCents },
        expect: [201, 402],
      });
      return body as never;
    },
    async void(authorizationId, ctx) {
      await call(pools.payment, 'payment', {
        method: 'DELETE',
        path: `/authorizations/${encodeURIComponent(authorizationId)}`,
        correlationId: ctx.correlationId,
        expect: [204],
      });
    },
  };
}

export function createOrderAdapter(pools: Pools): OrderPort {
  return {
    async create(input, ctx) {
      const { body } = await call(pools.order, 'order', {
        method: 'POST',
        path: '/orders',
        correlationId: ctx.correlationId,
        body: input,
        expect: [201],
      });
      return body as never;
    },
  };
}
