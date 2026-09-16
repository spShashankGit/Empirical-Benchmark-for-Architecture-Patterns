import type { Cart, CartItem, Product } from '@arch-bench/domain';
import { createRandom } from './random.js';

export interface SeedOptions {
  seed?: number;
  productCount?: number;
  cartCount?: number;
  /** Deliberately generous so baseline runs never hit incidental stockouts. */
  stockPerSku?: number;
}

export interface SeedData {
  products: Product[];
  carts: Cart[];
  stock: Record<string, number>;
}

export const DEFAULT_SEED_OPTIONS: Required<SeedOptions> = {
  seed: 20260101,
  productCount: 200,
  cartCount: 1000,
  stockPerSku: 1_000_000,
};

const pad = (n: number, width: number) => String(n).padStart(width, '0');

/**
 * Builds the identical catalogue and cart set used by every implementation.
 *
 * Both builds seed from this function, so a checkout of CART-0042 buys the same
 * items at the same prices no matter which architecture serves it.
 */
export function buildSeedData(options: SeedOptions = {}): SeedData {
  const { seed, productCount, cartCount, stockPerSku } = { ...DEFAULT_SEED_OPTIONS, ...options };
  const random = createRandom(seed);

  const products: Product[] = [];
  const stock: Record<string, number> = {};
  for (let i = 1; i <= productCount; i += 1) {
    const sku = `SKU-${pad(i, 4)}`;
    products.push({
      sku,
      name: `Product ${pad(i, 4)}`,
      unitPriceCents: 500 + Math.floor(random() * 9500),
    });
    stock[sku] = stockPerSku;
  }

  const carts: Cart[] = [];
  for (let i = 1; i <= cartCount; i += 1) {
    const itemCount = 1 + Math.floor(random() * 3);
    const items: CartItem[] = [];
    const chosen = new Set<string>();

    while (items.length < itemCount) {
      const product = products[Math.floor(random() * products.length)]!;
      if (chosen.has(product.sku)) continue;
      chosen.add(product.sku);
      items.push({
        sku: product.sku,
        quantity: 1 + Math.floor(random() * 3),
        unitPriceCents: product.unitPriceCents,
      });
    }

    carts.push({
      cartId: `CART-${pad(i, 4)}`,
      customerId: `CUST-${pad(i, 4)}`,
      items,
    });
  }

  return { products, carts, stock };
}

/** Cart ids in stable order, used by the workload runner to pick request targets. */
export function seededCartIds(options: SeedOptions = {}): string[] {
  const count = options.cartCount ?? DEFAULT_SEED_OPTIONS.cartCount;
  return Array.from({ length: count }, (_, i) => `CART-${pad(i + 1, 4)}`);
}
