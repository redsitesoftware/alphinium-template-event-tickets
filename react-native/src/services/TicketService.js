/**
 * TicketService
 * Ticket verification, confirmation email resend, and PDF download API layer.
 *
 * Endpoints:
 *   GET    /api/tickets/:uuid            — verify ticket validity
 *   POST   /api/tickets/:uuid/email      — send / resend confirmation email with QR + event details
 *   GET    /api/tickets/:uuid/pdf        — returns a short-lived URL (or base64) PDF for download
 *   POST   /api/tickets/batch-verify     — (optional) verify multiple UUIDs at once (scanner use)
 *
 * Mock fallback:
 *   When STRAPI_URL is not configured the service simulates all responses in-memory,
 *   consistent with the mock patterns in CheckoutService.js and SeatMapService.js.
 *
 * UUID convention:
 *   Each ticket's identifier is the `qrCode` field stored in the wallet entry,
 *   e.g. "QR-NEON-GA-2841" or "QR-E1-GA-1234".
 *   The verify endpoint accepts this value directly as the `:uuid` path parameter.
 */

import { STRAPI_URL } from '../config';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build request headers for authenticated API calls.
 * @returns {Record<string, string>}
 */
function authHeaders() {
  return { 'Content-Type': 'application/json' };
}

/**
 * Assert the response is OK, then parse and return JSON.
 * Throws an Error with the server's `message` field (or a generic status string)
 * if the response status is not in the 2xx range.
 *
 * @param {Response} res
 * @returns {Promise<any>}
 */
async function handleResponse(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Mock state
// ---------------------------------------------------------------------------

/**
 * Track which UUIDs have had an email resent during this session.
 * Reset on module reload (page refresh) — acceptable for demo/preview mode.
 */
const _mockEmailsSent = new Set();

/**
 * Simulate ticket verification.
 * First UUID in the mock wallet ('QR-NEON-GA-2841') is pre-seeded as valid.
 * Anything else that starts with 'QR-' is also treated as valid to support
 * tickets purchased during the same demo session.
 *
 * @param {string} uuid
 * @returns {{ uuid: string, status: 'valid'|'scanned'|'invalid', ticket: object }}
 */
function mockGetTicket(uuid) {
  const isKnown = uuid && uuid.startsWith('QR-') && uuid.length >= 8;
  return {
    uuid,
    status: isKnown ? 'valid' : 'invalid',
    ticket: isKnown
      ? {
          uuid,
          holderName: 'Dan Smith',
          holderEmail: 'dan@example.com',
          checkedIn: false,
          checkedInAt: null,
        }
      : null,
  };
}

/**
 * Simulate confirmation email send/resend.
 *
 * @param {string} uuid
 * @returns {{ success: boolean, message: string, alreadySent: boolean }}
 */
function mockResendEmail(uuid) {
  const alreadySent = _mockEmailsSent.has(uuid);
  _mockEmailsSent.add(uuid);
  return {
    success: true,
    message: alreadySent
      ? 'Confirmation email re-sent successfully.'
      : 'Confirmation email sent successfully.',
    alreadySent,
  };
}

/**
 * Simulate PDF download URL generation.
 * Returns a short-lived (1 hour) URL pointing to the tickets subdomain.
 *
 * @param {string} uuid
 * @returns {{ url: string, expiresAt: string }}
 */
function mockGetPdf(uuid) {
  return {
    url: `https://tickets.alphinium.dev/pdf/${encodeURIComponent(uuid)}`,
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  };
}

/**
 * Simulate batch verification for a list of UUIDs.
 *
 * @param {string[]} uuids
 * @returns {{ results: Array<{ uuid: string, status: string }> }}
 */
function mockBatchVerify(uuids) {
  return {
    results: uuids.map(uuid => ({
      uuid,
      status: uuid && uuid.startsWith('QR-') && uuid.length >= 8 ? 'valid' : 'invalid',
    })),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const TicketService = {
  /**
   * Verify a ticket by its QR code / UUID.
   *
   * @param {string} uuid  QR code value (e.g. "QR-E1-GA-2841")
   * @returns {Promise<{
   *   uuid: string,
   *   status: 'valid' | 'scanned' | 'invalid',
   *   ticket: {
   *     uuid: string,
   *     holderName: string,
   *     holderEmail: string,
   *     checkedIn: boolean,
   *     checkedInAt: string | null,
   *   } | null
   * }>}
   */
  async getTicket(uuid) {
    if (!STRAPI_URL) return mockGetTicket(uuid);

    const res = await fetch(`${STRAPI_URL}/api/tickets/${encodeURIComponent(uuid)}`, {
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  /**
   * Send or resend the confirmation email for a ticket.
   * The email contains the QR code PNG and full event details.
   *
   * @param {string} uuid  QR code value
   * @returns {Promise<{ success: boolean, message: string, alreadySent: boolean }>}
   */
  async resendEmail(uuid) {
    if (!STRAPI_URL) return mockResendEmail(uuid);

    const res = await fetch(`${STRAPI_URL}/api/tickets/${encodeURIComponent(uuid)}/email`, {
      method: 'POST',
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  /**
   * Get a short-lived PDF download URL for a ticket.
   * The URL is valid for 1 hour after generation.
   *
   * @param {string} uuid  QR code value
   * @returns {Promise<{ url: string, expiresAt: string }>}
   */
  async getPdf(uuid) {
    if (!STRAPI_URL) return mockGetPdf(uuid);

    const res = await fetch(`${STRAPI_URL}/api/tickets/${encodeURIComponent(uuid)}/pdf`, {
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  /**
   * Batch-verify multiple ticket UUIDs in a single request.
   * Useful for scanner bulk operations.
   *
   * @param {string[]} uuids  Array of QR code values to verify
   * @returns {Promise<{ results: Array<{ uuid: string, status: 'valid'|'scanned'|'invalid' }> }>}
   */
  async batchVerify(uuids) {
    if (!STRAPI_URL) return mockBatchVerify(uuids);

    const res = await fetch(`${STRAPI_URL}/api/tickets/batch-verify`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ uuids }),
    });
    return handleResponse(res);
  },
};
