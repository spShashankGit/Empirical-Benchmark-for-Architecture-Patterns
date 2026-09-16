/**
 * The shared domain model.
 *
 * Every architecture implementation in this benchmark speaks these types.
 * If two implementations disagree about the domain, their numbers are not
 * comparable, so this file is deliberately the single source of truth.
 */

export interface Product {
  sku: string;
  name: string;
  unitPriceCents: number;
}

export interface CartItem {
  sku: string;
  quantity: number;
  unitPriceCents: number;
}

export interface Cart {
  cartId: string;
  customerId: string;
  items: CartItem[];
}

export interface ReservationLine {
  sku: string;
  quantity: number;
}

export interface InventoryReservation {
  reservationId: string;
  cartId: string;
  lines: ReservationLine[];
}

export interface PaymentAuthorization {
  authorizationId: string;
  cartId: string;
  amountCents: number;
}

export interface Order {
  orderId: string;
  cartId: string;
  customerId: string;
  items: CartItem[];
  totalCents: number;
  reservationId: string;
  authorizationId: string;
  createdAt: string;
}

export interface CheckoutRequest {
  cartId: string;
  customerId: string;
  correlationId: string;
}

/**
 * Failure reasons are part of the contract, not free text. The failure mix is
 * a measured signal: two architectures can have the same error *rate* while
 * failing for very different reasons.
 */
export type CheckoutFailureReason =
  | 'cart_not_found'
  | 'cart_empty'
  | 'out_of_stock'
  | 'payment_declined'
  | 'order_creation_failed'
  | 'dependency_unavailable';

export type CheckoutResult =
  | {
      status: 'success';
      correlationId: string;
      orderId: string;
      totalCents: number;
    }
  | {
      status: 'failure';
      correlationId: string;
      reason: CheckoutFailureReason;
      message: string;
    };
