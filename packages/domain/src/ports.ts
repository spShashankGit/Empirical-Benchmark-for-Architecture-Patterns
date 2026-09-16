import type {
  Cart,
  CartItem,
  InventoryReservation,
  PaymentAuthorization,
  Order,
  ReservationLine,
} from './model.js';

/** Travels with every call so one checkout can be followed across processes. */
export interface RequestContext {
  correlationId: string;
}

export type ReserveOutcome =
  | { ok: true; reservation: InventoryReservation }
  | { ok: false; unavailable: string[] };

export type AuthorizeOutcome =
  | { ok: true; authorization: PaymentAuthorization }
  | { ok: false; declineReason: string };

export interface CreateOrderInput {
  cartId: string;
  customerId: string;
  items: CartItem[];
  totalCents: number;
  reservationId: string;
  authorizationId: string;
}

export interface CartPort {
  getCart(cartId: string, ctx: RequestContext): Promise<Cart | null>;
}

export interface InventoryPort {
  reserve(cartId: string, lines: ReservationLine[], ctx: RequestContext): Promise<ReserveOutcome>;
  release(reservationId: string, ctx: RequestContext): Promise<void>;
}

export interface PaymentPort {
  authorize(cartId: string, amountCents: number, ctx: RequestContext): Promise<AuthorizeOutcome>;
  void(authorizationId: string, ctx: RequestContext): Promise<void>;
}

export interface OrderPort {
  create(input: CreateOrderInput, ctx: RequestContext): Promise<Order>;
}

/**
 * A compensating action (releasing stock, voiding an authorization) that itself
 * failed. These are the consistency anomalies the benchmark reports: money
 * authorized with no order, or stock reserved for a checkout that never
 * completed. Distributed builds are expected to produce more of them, and
 * "how many more" is one of the results worth publishing.
 */
export interface AnomalyObserver {
  compensationFailed(
    action: 'release_reservation' | 'void_authorization',
    subjectId: string,
    error: unknown,
    ctx: RequestContext,
  ): void;
}

export interface CheckoutPorts {
  cart: CartPort;
  inventory: InventoryPort;
  payment: PaymentPort;
  order: OrderPort;
  observer?: AnomalyObserver;
}
