/**
 * TicketService
 * Ticket verification, email resend, PDF download, refund, and transfer for purchased tickets.
 *
 * Endpoints:
 *   GET    /api/tickets/:uuid           — verify ticket (status, event, holder)
 *   POST   /api/tickets/:uuid/email     — resend confirmation email
 *   GET    /api/tickets/:uuid/pdf       — get PDF download URL
 *   POST   /api/tickets/:uuid/refund    — request a refund
 *   POST   /api/tickets/:uuid/transfer  — transfer ticket to a new email
 *
 * Mock fallback:
 *   When STRAPI_URL is not configured the service returns realistic in-memory
 *   responses so the feature works in demo/preview mode.
 */

import { STRAPI_URL } from '../config';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function authHeaders() {
  return { 'Content-Type': 'application/json' };
}

async function handleResponse(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Mock fallback
// ---------------------------------------------------------------------------

function mockGetTicket(uuid) {
  return {
    uuid,
    status: 'valid',
    holderName: 'Dan Smith',
    holderEmail: 'dan@example.com',
    checkedIn: false,
  };
}

function mockResendEmail(uuid) {
  return { success: true, message: 'Confirmation email sent.' };
}

function mockGetPdf(uuid) {
  // Return a data-URI placeholder so Linking.openURL has something to call
  return {
    url: `https://tickets.alphinium.dev/pdf/${encodeURIComponent(uuid)}`,
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  };
}

function mockRequestRefund(_uuid) {
  return { success: true, status: 'pending' };
}

function mockTransferTicket(_uuid, _newEmail) {
  return { success: true, newUuid: 'QR-TRANSFER-MOCK', message: 'Ticket transferred.' };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const TicketService = {
  /**
   * Verify a ticket by its QR code / UUID.
   *
   * @param {string} uuid  QR code value (e.g. "QR-E1-GA-2841")
   * @returns {Promise<{ uuid: string, status: string, holderName: string, checkedIn: boolean }>}
   */
  async getTicket(uuid) {
    if (!STRAPI_URL) return mockGetTicket(uuid);

    const res = await fetch(`${STRAPI_URL}/api/tickets/${encodeURIComponent(uuid)}`, {
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  /**
   * Trigger a confirmation email resend for the ticket.
   *
   * @param {string} uuid   QR code value
   * @returns {Promise<{ success: boolean, message: string }>}
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
   * Get a short-lived PDF download URL for the ticket.
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
   * Request a refund for a ticket.
   *
   * @param {string} uuid  QR code value
   * @returns {Promise<{ success: boolean, status: 'approved' | 'rejected' | 'pending', reason?: string }>}
   */
  async requestRefund(uuid) {
    if (!STRAPI_URL) return mockRequestRefund(uuid);

    const res = await fetch(`${STRAPI_URL}/api/tickets/${encodeURIComponent(uuid)}/refund`, {
      method: 'POST',
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  /**
   * Transfer a ticket to a new email address.
   * The backend invalidates the current UUID and issues a new one.
   *
   * @param {string} uuid      QR code value of the ticket to transfer
   * @param {string} newEmail  Recipient email address
   * @returns {Promise<{ success: boolean, newUuid: string, message: string }>}
   */
  async transferTicket(uuid, newEmail) {
    if (!STRAPI_URL) return mockTransferTicket(uuid, newEmail);

    const res = await fetch(`${STRAPI_URL}/api/tickets/${encodeURIComponent(uuid)}/transfer`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ newEmail }),
    });
    return handleResponse(res);
  },
};
