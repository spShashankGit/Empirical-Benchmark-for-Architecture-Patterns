import type { PaymentAuthorization, PaymentPort } from '@arch-bench/domain';
import { createFaultController, type FaultController } from '@arch-bench/testkit';
import { createIdFactory } from './ids.js';

export interface PaymentModule {
  port: PaymentPort;
  faults: FaultController;
}

/**
 * A controllable test double rather than a real provider.
 *
 * The design doc left this open. A double is the right call: a real sandbox
 * provider would add uncontrolled network latency to both builds and drown the
 * signal we are trying to measure.
 */
export function createPaymentModule(): PaymentModule {
  const authorizations = new Map<string, PaymentAuthorization>();
  const nextId = createIdFactory('AUTH');
  const faults = createFaultController('payment', 33);

  return {
    faults,
    port: {
      async authorize(cartId, amountCents) {
        await faults.gate();
        if (faults.shouldDecline()) {
          return { ok: false, declineReason: 'card_declined (injected)' };
        }
        const authorization: PaymentAuthorization = {
          authorizationId: nextId(),
          cartId,
          amountCents,
        };
        authorizations.set(authorization.authorizationId, authorization);
        return { ok: true, authorization };
      },

      async void(authorizationId) {
        await faults.gate();
        authorizations.delete(authorizationId);
      },
    },
  };
}
