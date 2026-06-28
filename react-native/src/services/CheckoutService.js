/**
 * CheckoutService
 * Stripe payment checkout for ticket purchases.
 *
 * Endpoints:
 *   POST   /api/checkout                        — create PaymentIntent for cart
 *   POST   /api/checkout/:intentId/confirm      — server-side booking confirmation
 *   DELETE /api/checkout/:intentId              — release intent (payment failed/cancelled)
 *   GET    /api/checkout/:intentId/status       — poll payment + booking status
 *
 * Mock fallback:
 *   When STRAPI_URL is not configured the service simulates the full payment
 *   flow in-memory so the feature works in demo/preview mode.
 *
 * Fee modes (configurable per event):
 *   'absorb' — platform absorbs Stripe fee; buyer pays face value only
 *   'pass'   — Stripe fee (2.9% + $0.30) passed through to buyer
 */

import { STRAPI_URL } from '../config';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Stripe processing fee rate applied when feeMode === 'pass' */
export const STRIPE_FEE_RATE = 0.029;
export const STRIPE_FEE_FIXED = 0.30;

// ---------------------------------------------------------------------------
// Fee calculation helpers (exported so UI can display them)
// ---------------------------------------------------------------------------

/**
 * Calculate the Stripe processing fee for a given subtotal.
 * @param {number} subtotal  Pre-fee amount in dollars
 * @returns {number}  Fee in dollars (rounded to 2 dp)
 */
export function calcStripeFee(subtotal) {
  return parseFloat((subtotal * STRIPE_FEE_RATE + STRIPE_FEE_FIXED).toFixed(2));
}

/**
 * Return the total a buyer pays given a subtotal and fee mode.
 * @param {number} subtotal
 * @param {'absorb'|'pass'} feeMode
 * @returns {{ subtotal: number, fee: number, total: number }}
 */
export function calcOrderAmounts(subtotal, feeMode = 'absorb') {
  const fee = feeMode === 'pass' ? calcStripeFee(subtotal) : 0;
  return {
    subtotal,
    fee,
    total: parseFloat((subtotal + fee).toFixed(2)),
  };
}

// ---------------------------------------------------------------------------
// Mock state
// ---------------------------------------------------------------------------

let _mockIntentCounter = 1000;
const _mockIntents = {};

function createMockIntent(cart) {
  const id = 'pi_mock_' + (_mockIntentCounter++);
  const intent = {
    id,
    clientSecret: id + '_secret_mock',
    status: 'requires_payment_method',
    amount: cart.totalCents,
    currency: 'aud',
    cart,
    createdAt: Date.now(),
  };
  _mockIntents[id] = intent;
  return intent;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(response) {
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const CheckoutService = {
  /**
   * Create a Stripe PaymentIntent for the current cart.
   * Returns the intent ID and clientSecret needed by the Stripe Payment Element.
   *
   * @param {CartPayload} cart
   * @param {string} [token]
   * @returns {Promise<PaymentIntentResult>}
   *
   * CartPayload shape:
   *   eventId       {string}
   *   ticketType    {string}   — e.g. "GA", "VIP"
   *   qty           {number}
   *   sectionId     {string|null}
   *   reservationId {string|null}
   *   subtotal      {number}   — in dollars
   *   feeMode       {'absorb'|'pass'}
   *   totalCents    {number}   — total charged in cents (subtotal + fee if pass-through)
   *   buyerName     {string}
   *   buyerEmail    {string}
   *
   * PaymentIntentResult shape:
   *   id            {string}   — pi_xxx
   *   clientSecret  {string}   — pi_xxx_secret_xxx (used by Stripe.js)
   *   status        {string}   — 'requires_payment_method' | 'requires_action' | 'succeeded'
   *   amount        {number}   — in cents
   */
  async createPaymentIntent(cart, token) {
    if (!STRAPI_URL) {
      await new Promise(r => setTimeout(r, 600)); // Simulate network
      return createMockIntent(cart);
    }

    const response = await fetch(`${STRAPI_URL}/api/checkout`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ data: cart }),
    });
    return handleResponse(response);
  },

  /**
   * Confirm a booking server-side after Stripe reports payment success.
   * This is the client-initiated counterpart to the Stripe webhook; the backend
   * should validate the PaymentIntent status with Stripe before confirming.
   *
   * @param {string} paymentIntentId
   * @param {string} [token]
   * @returns {Promise<BookingConfirmation>}
   *
   * BookingConfirmation shape:
   *   bookingId  {string}
   *   status     {'confirmed'}
   *   tickets    {Array<{ qrCode, type, section, qty }>}
   */
  async confirmBooking(paymentIntentId, token) {
    if (!STRAPI_URL) {
      await new Promise(r => setTimeout(r, 800));
      const intent = _mockIntents[paymentIntentId];
      if (intent) intent.status = 'succeeded';
      return {
        bookingId: 'BK-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        status: 'confirmed',
        tickets: [{
          qrCode: 'QR-' + paymentIntentId.toUpperCase().slice(-8) + '-' + Math.floor(Math.random() * 9000 + 1000),
          type: intent?.cart?.ticketType ?? 'GA',
          section: intent?.cart?.sectionId ?? null,
          qty: intent?.cart?.qty ?? 1,
        }],
      };
    }

    const response = await fetch(`${STRAPI_URL}/api/checkout/${paymentIntentId}/confirm`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    return handleResponse(response);
  },

  /**
   * Poll the payment + booking status for a PaymentIntent.
   * Used after redirect-based payments (e.g. 3DS, bank redirects).
   *
   * @param {string} paymentIntentId
   * @param {string} [token]
   * @returns {Promise<{ paymentStatus: string, bookingStatus: string }>}
   */
  async getStatus(paymentIntentId, token) {
    if (!STRAPI_URL) {
      const intent = _mockIntents[paymentIntentId];
      return {
        paymentStatus: intent?.status ?? 'unknown',
        bookingStatus: intent?.status === 'succeeded' ? 'confirmed' : 'pending',
      };
    }

    const response = await fetch(
      `${STRAPI_URL}/api/checkout/${paymentIntentId}/status`,
      { method: 'GET', headers: authHeaders(token) },
    );
    return handleResponse(response);
  },

  /**
   * Release/cancel a PaymentIntent when payment fails or the buyer cancels.
   * The backend should also release any seat reservation held against this intent.
   *
   * @param {string} paymentIntentId
   * @param {string} [token]
   * @returns {Promise<void>}
   */
  async releaseIntent(paymentIntentId, token) {
    if (!STRAPI_URL) {
      if (_mockIntents[paymentIntentId]) {
        _mockIntents[paymentIntentId].status = 'canceled';
      }
      return;
    }

    const response = await fetch(`${STRAPI_URL}/api/checkout/${paymentIntentId}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
    }
  },
};
