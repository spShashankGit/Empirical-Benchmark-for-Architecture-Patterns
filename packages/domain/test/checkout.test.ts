import { describe, expect, it, vi } from 'vitest';
import { runCheckout } from '../src/checkout.js';
import { DependencyError } from '../src/errors.js';
import type { CheckoutPorts } from '../src/ports.js';
import type { Cart } from '../src/model.js';

const cart: Cart = {
  cartId: 'CART-0001',
  customerId: 'CUST-0001',
  items: [
    { sku: 'SKU-0001', quantity: 2, unitPriceCents: 1000 },
    { sku: 'SKU-0002', quantity: 1, unitPriceCents: 500 },
  ],
};

function createPorts(overrides: Partial<CheckoutPorts> = {}): CheckoutPorts {
  return {
    cart: { getCart: vi.fn(async () => cart) },
    inventory: {
      reserve: vi.fn(async () => ({
        ok: true as const,
        reservation: { reservationId: 'RES-1', cartId: cart.cartId, lines: [] },
      })),
      release: vi.fn(async () => {}),
    },
    payment: {
      authorize: vi.fn(async (cartId: string, amountCents: number) => ({
        ok: true as const,
        authorization: { authorizationId: 'AUTH-1', cartId, amountCents },
      })),
      void: vi.fn(async () => {}),
    },
    order: {
      create: vi.fn(async (input) => ({
        orderId: 'ORD-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        ...input,
      })),
    },
    ...overrides,
  };
}

const request = { cartId: cart.cartId, customerId: cart.customerId, correlationId: 'corr-1' };

describe('runCheckout', () => {
  it('creates an order and charges the cart total', async () => {
    const ports = createPorts();
    const result = await runCheckout(request, ports);

    expect(result).toMatchObject({ status: 'success', orderId: 'ORD-1', totalCents: 2500 });
    expect(ports.payment.authorize).toHaveBeenCalledWith(cart.cartId, 2500, expect.anything());
  });

  it('fails without reserving when the cart is missing', async () => {
    const ports = createPorts({ cart: { getCart: vi.fn(async () => null) } });
    const result = await runCheckout(request, ports);

    expect(result).toMatchObject({ status: 'failure', reason: 'cart_not_found' });
    expect(ports.inventory.reserve).not.toHaveBeenCalled();
  });

  it('does not authorize payment when stock is unavailable', async () => {
    const ports = createPorts({
      inventory: {
        reserve: vi.fn(async () => ({ ok: false as const, unavailable: ['SKU-0001'] })),
        release: vi.fn(async () => {}),
      },
    });
    const result = await runCheckout(request, ports);

    expect(result).toMatchObject({ status: 'failure', reason: 'out_of_stock' });
    expect(ports.payment.authorize).not.toHaveBeenCalled();
  });

  it('releases the reservation when payment is declined', async () => {
    const ports = createPorts({
      payment: {
        authorize: vi.fn(async () => ({ ok: false as const, declineReason: 'card_declined' })),
        void: vi.fn(async () => {}),
      },
    });
    const result = await runCheckout(request, ports);

    expect(result).toMatchObject({ status: 'failure', reason: 'payment_declined' });
    expect(ports.inventory.release).toHaveBeenCalledWith('RES-1', expect.anything());
  });

  it('voids the authorization and releases stock when the order cannot be created', async () => {
    const ports = createPorts({
      order: {
        create: vi.fn(async () => {
          throw new DependencyError('order', 'unavailable');
        }),
      },
    });
    const result = await runCheckout(request, ports);

    expect(result).toMatchObject({ status: 'failure', reason: 'order_creation_failed' });
    expect(ports.payment.void).toHaveBeenCalledWith('AUTH-1', expect.anything());
    expect(ports.inventory.release).toHaveBeenCalledWith('RES-1', expect.anything());
  });

  it('records an anomaly when compensation itself fails', async () => {
    const compensationFailed = vi.fn();
    const ports = createPorts({
      payment: {
        authorize: vi.fn(async () => ({ ok: false as const, declineReason: 'card_declined' })),
        void: vi.fn(async () => {}),
      },
      inventory: {
        reserve: vi.fn(async () => ({
          ok: true as const,
          reservation: { reservationId: 'RES-1', cartId: cart.cartId, lines: [] },
        })),
        release: vi.fn(async () => {
          throw new DependencyError('inventory', 'unavailable');
        }),
      },
      observer: { compensationFailed },
    });

    await runCheckout(request, ports);

    expect(compensationFailed).toHaveBeenCalledWith(
      'release_reservation',
      'RES-1',
      expect.any(DependencyError),
      expect.anything(),
    );
  });

  it('reports a dependency outage as dependency_unavailable', async () => {
    const ports = createPorts({
      cart: {
        getCart: vi.fn(async () => {
          throw new DependencyError('cart', 'unavailable');
        }),
      },
    });

    expect(await runCheckout(request, ports)).toMatchObject({
      status: 'failure',
      reason: 'dependency_unavailable',
    });
  });
});
