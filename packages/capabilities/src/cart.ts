import type { Cart, CartPort } from '@arch-bench/domain';
import { buildSeedData, createFaultController, type FaultController } from '@arch-bench/testkit';

export interface CartModule {
  port: CartPort;
  faults: FaultController;
}

export function createCartModule(): CartModule {
  const { carts } = buildSeedData();
  const byId = new Map<string, Cart>(carts.map((cart) => [cart.cartId, cart]));
  const faults = createFaultController('cart', 11);

  return {
    faults,
    port: {
      async getCart(cartId) {
        await faults.gate();
        return byId.get(cartId) ?? null;
      },
    },
  };
}
