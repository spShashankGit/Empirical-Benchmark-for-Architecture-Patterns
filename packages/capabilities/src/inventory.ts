import type { InventoryPort, InventoryReservation, ReservationLine } from '@arch-bench/domain';
import { buildSeedData, createFaultController, type FaultController } from '@arch-bench/testkit';
import { createIdFactory } from './ids.js';

export interface InventoryModule {
  port: InventoryPort;
  faults: FaultController;
}

export function createInventoryModule(): InventoryModule {
  const { stock } = buildSeedData();
  const available = new Map<string, number>(Object.entries(stock));
  const reservations = new Map<string, InventoryReservation>();
  const nextId = createIdFactory('RES');
  const faults = createFaultController('inventory', 22);

  return {
    faults,
    port: {
      async reserve(cartId, lines: ReservationLine[]) {
        await faults.gate();

        const unavailable = lines
          .filter((line) => (available.get(line.sku) ?? 0) < line.quantity)
          .map((line) => line.sku);
        if (unavailable.length > 0) {
          return { ok: false, unavailable };
        }

        // Single-threaded event loop: no await between the check above and the
        // decrement below, so this is atomic here. The service build cannot make
        // that assumption, which is itself part of what the benchmark shows.
        for (const line of lines) {
          available.set(line.sku, (available.get(line.sku) ?? 0) - line.quantity);
        }

        const reservation: InventoryReservation = {
          reservationId: nextId(),
          cartId,
          lines,
        };
        reservations.set(reservation.reservationId, reservation);
        return { ok: true, reservation };
      },

      async release(reservationId) {
        await faults.gate();
        const reservation = reservations.get(reservationId);
        if (!reservation) return;
        for (const line of reservation.lines) {
          available.set(line.sku, (available.get(line.sku) ?? 0) + line.quantity);
        }
        reservations.delete(reservationId);
      },
    },
  };
}
