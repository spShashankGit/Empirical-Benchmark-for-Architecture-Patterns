import { DependencyError } from './errors.js';
import type { CheckoutPorts, RequestContext } from './ports.js';
import type { CheckoutFailureReason, CheckoutRequest, CheckoutResult } from './model.js';
import { calculateTotalCents, toReservationLines } from './rules.js';

/**
 * The checkout workflow, written once and shared by every implementation.
 *
 * This is the central fairness device of the benchmark. Both the modular
 * monolith and the microservices build run *this* function; they differ only in
 * the adapters they pass in. An in-process call and an HTTP call satisfy the
 * same port interface, so any measured difference comes from the boundary
 * itself rather than from one implementation being written better than the
 * other.
 *
 * The deliberate limitation: this holds the orchestration logic constant, which
 * is what we want when measuring the cost of a boundary. It does not capture
 * the ways real microservices diverge over time (independent data models,
 * per-service business rules, teams drifting apart). Those belong in the
 * evolution scenarios, not here.
 */
export async function runCheckout(
  request: CheckoutRequest,
  ports: CheckoutPorts,
): Promise<CheckoutResult> {
  const ctx: RequestContext = { correlationId: request.correlationId };

  const fail = (reason: CheckoutFailureReason, message: string): CheckoutResult => ({
    status: 'failure',
    correlationId: ctx.correlationId,
    reason,
    message,
  });

  try {
    const cart = await ports.cart.getCart(request.cartId, ctx);
    if (!cart) {
      return fail('cart_not_found', `No cart with id ${request.cartId}`);
    }
    if (cart.items.length === 0) {
      return fail('cart_empty', `Cart ${request.cartId} has no items`);
    }

    const totalCents = calculateTotalCents(cart.items);

    const reservation = await ports.inventory.reserve(
      cart.cartId,
      toReservationLines(cart.items),
      ctx,
    );
    if (!reservation.ok) {
      return fail('out_of_stock', `Out of stock: ${reservation.unavailable.join(', ')}`);
    }
    const reservationId = reservation.reservation.reservationId;

    let authorizationId: string;
    try {
      const authorization = await ports.payment.authorize(cart.cartId, totalCents, ctx);
      if (!authorization.ok) {
        await releaseQuietly(ports, reservationId, ctx);
        return fail('payment_declined', authorization.declineReason);
      }
      authorizationId = authorization.authorization.authorizationId;
    } catch (error) {
      await releaseQuietly(ports, reservationId, ctx);
      throw error;
    }

    try {
      const order = await ports.order.create(
        {
          cartId: cart.cartId,
          customerId: cart.customerId,
          items: cart.items,
          totalCents,
          reservationId,
          authorizationId,
        },
        ctx,
      );

      return {
        status: 'success',
        correlationId: ctx.correlationId,
        orderId: order.orderId,
        totalCents,
      };
    } catch (error) {
      await voidQuietly(ports, authorizationId, ctx);
      await releaseQuietly(ports, reservationId, ctx);
      if (error instanceof DependencyError) {
        return fail('order_creation_failed', error.message);
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof DependencyError) {
      return fail('dependency_unavailable', error.message);
    }
    throw error;
  }
}

/**
 * Compensation must never mask the original failure, so these swallow their
 * errors — but they report them, because a failed compensation is exactly the
 * inconsistency the benchmark is looking for.
 */
async function releaseQuietly(
  ports: CheckoutPorts,
  reservationId: string,
  ctx: RequestContext,
): Promise<void> {
  try {
    await ports.inventory.release(reservationId, ctx);
  } catch (error) {
    ports.observer?.compensationFailed('release_reservation', reservationId, error, ctx);
  }
}

async function voidQuietly(
  ports: CheckoutPorts,
  authorizationId: string,
  ctx: RequestContext,
): Promise<void> {
  try {
    await ports.payment.void(authorizationId, ctx);
  } catch (error) {
    ports.observer?.compensationFailed('void_authorization', authorizationId, error, ctx);
  }
}
