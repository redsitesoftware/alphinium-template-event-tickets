/**
 * WaitlistService
 * Join and query waitlists for sold-out events.
 *
 * Endpoints:
 *   POST /api/events/:id/waitlist            — join waitlist for a ticket type
 *   GET  /api/events/:id/waitlist/position   — get caller's position in waitlist
 *   GET  /api/events/:id/waitlist            — get full waitlist length (organiser use)
 *
 * Mock fallback:
 *   When STRAPI_URL is not configured the service returns realistic in-memory
 *   responses so the feature works in demo/preview mode.
 */

import { STRAPI_URL } from '../config';

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Mock fallbacks
// ---------------------------------------------------------------------------

function mockJoinWaitlist(_eventId, _ticketTypeId, _holderEmail) {
  return { success: true, position: 3, message: 'You are #3 on the waitlist.' };
}

function mockGetWaitlistPosition(_eventId, _holderEmail) {
  return { position: 3, total: 10 };
}

function mockGetWaitlistLength(_eventId) {
  return { total: 5, entries: [] };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const WaitlistService = {
  /**
   * Join the waitlist for a sold-out ticket type.
   *
   * @param {string|number} eventId
   * @param {string|number} ticketTypeId
   * @param {string}        holderEmail
   * @returns {Promise<{ success: boolean, position: number, message: string }>}
   */
  async joinWaitlist(eventId, ticketTypeId, holderEmail) {
    if (!STRAPI_URL) return mockJoinWaitlist(eventId, ticketTypeId, holderEmail);

    const res = await fetch(`${STRAPI_URL}/api/events/${encodeURIComponent(eventId)}/waitlist`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ ticketTypeId, holderEmail }),
    });
    return handleResponse(res);
  },

  /**
   * Get the caller's current position on the waitlist.
   *
   * @param {string|number} eventId
   * @param {string}        holderEmail
   * @returns {Promise<{ position: number, total: number }>}
   */
  async getWaitlistPosition(eventId, holderEmail) {
    if (!STRAPI_URL) return mockGetWaitlistPosition(eventId, holderEmail);

    const query = `email=${encodeURIComponent(holderEmail)}`;
    const res = await fetch(
      `${STRAPI_URL}/api/events/${encodeURIComponent(eventId)}/waitlist/position?${query}`,
      { headers: authHeaders() },
    );
    return handleResponse(res);
  },

  /**
   * Get the full waitlist for an event (organiser use).
   * Passes optional JWT so the organiser endpoint can enforce access control.
   *
   * @param {string|number} eventId
   * @param {string}        [token]  JWT from useAuth() — required for real API calls
   * @returns {Promise<{ total: number, entries: Array<{ email: string, ticketTypeId: string, joinedAt: string }> }>}
   */
  async getWaitlistLength(eventId, token) {
    if (!STRAPI_URL) return mockGetWaitlistLength(eventId);

    const res = await fetch(
      `${STRAPI_URL}/api/events/${encodeURIComponent(eventId)}/waitlist`,
      { headers: authHeaders(token) },
    );
    return handleResponse(res);
  },
};
