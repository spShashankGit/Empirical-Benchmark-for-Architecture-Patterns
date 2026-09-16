import type { Order, OrderPort } from '@arch-bench/domain';
import { createFaultController, type FaultController } from '@arch-bench/testkit';
import { createIdFactory } from './ids.js';

export interface OrderModule {
  port: OrderPort;
  faults: FaultController;
  count(): number;
}

export function createOrderModule(): OrderModule {
  const orders = new Map<string, Order>();
  const nextId = createIdFactory('ORD');
  const faults = createFaultController('order', 44);

  return {
    faults,
    count: () => orders.size,
    port: {
      async create(input) {
        await faults.gate();
        const order: Order = {
          orderId: nextId(),
          createdAt: new Date().toISOString(),
          ...input,
        };
        orders.set(order.orderId, order);
        return order;
      },
    },
  };
}
