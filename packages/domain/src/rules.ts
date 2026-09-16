import type { CartItem, ReservationLine } from './model.js';

export function calculateTotalCents(items: readonly CartItem[]): number {
  return items.reduce((total, item) => total + item.unitPriceCents * item.quantity, 0);
}

export function toReservationLines(items: readonly CartItem[]): ReservationLine[] {
  return items.map((item) => ({ sku: item.sku, quantity: item.quantity }));
}
