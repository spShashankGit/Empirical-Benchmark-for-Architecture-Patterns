import type { CheckoutResult } from '@arch-bench/domain';

/**
 * The public checkout API. Both implementations expose exactly this, so the
 * workload runner cannot tell them apart without being told which it is
 * pointed at.
 */
export const CHECKOUT_PATH = '/checkout';
export const HEALTH_PATH = '/health';
export const FAULTS_PATH = '/admin/faults';
export const CORRELATION_HEADER = 'x-correlation-id';

export interface CheckoutHttpRequest {
  cartId: string;
  customerId: string;
}

export type CheckoutHttpResponse = CheckoutResult;

/**
 * HTTP status is derived from the outcome so that the workload runner can
 * separate "the system correctly refused this checkout" from "the system
 * broke". Counting a declined payment as an error would make a healthy
 * architecture look unreliable.
 */
export function statusCodeFor(result: CheckoutResult): number {
  if (result.status === 'success') return 201;
  switch (result.reason) {
    case 'cart_not_found':
      return 404;
    case 'cart_empty':
    case 'out_of_stock':
    case 'payment_declined':
      return 422;
    case 'order_creation_failed':
    case 'dependency_unavailable':
      return 503;
  }
}
