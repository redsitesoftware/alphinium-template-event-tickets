/**
 * OrganiserService
 * API calls for organiser-facing event management (CRUD + attendance stats).
 * All endpoints require a valid JWT token from useAuth().
 */

import { STRAPI_URL } from '../config';

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
// Mock fallback (used when STRAPI_URL is not configured)
// ---------------------------------------------------------------------------

function mockGetEvents() {
  return [
    {
      id: 1,
      name: 'Demo Event',
      description: 'A sample event for preview mode.',
      date: '2025-12-01',
      venue: 'Demo Venue',
      bannerImageUrl: '',
      refundPolicy: 'no_refunds',
    },
  ];
}

function mockGetAttendees(_eventId, filters = {}) {
  const all = [
    { name: 'Alice Chen',   email: 'alice@example.com',   ticketType: 'General Admission', checkedIn: true,  uuid: 'QR-MOCK-001' },
    { name: 'Bob Nguyen',   email: 'bob@example.com',     ticketType: 'VIP',               checkedIn: false, uuid: 'QR-MOCK-002' },
    { name: 'Carol Smith',  email: 'carol@example.com',   ticketType: 'General Admission', checkedIn: true,  uuid: 'QR-MOCK-003' },
    { name: 'David Park',   email: 'david@example.com',   ticketType: 'VIP',               checkedIn: true,  uuid: 'QR-MOCK-004' },
    { name: 'Emma Johnson', email: 'emma@example.com',    ticketType: 'General Admission', checkedIn: false, uuid: 'QR-MOCK-005' },
  ];
  let result = all;
  if (filters.ticketType) {
    result = result.filter(a => a.ticketType === filters.ticketType);
  }
  if (filters.checkedIn != null) {
    const wantCheckedIn = filters.checkedIn === true || filters.checkedIn === 'true';
    result = result.filter(a => a.checkedIn === wantCheckedIn);
  }
  return { attendees: result, total: result.length };
}

function mockMessageAttendees(_eventId, _subject, _body) {
  return { success: true, sent: 5 };
}

export const OrganiserService = {
  /**
   * List events owned by the authenticated organiser.
   * @param {string} token  JWT from useAuth()
   * @returns {Promise<Array>}
   */
  async getEvents(token) {
    if (!STRAPI_URL) return mockGetEvents();

    const response = await fetch(`${STRAPI_URL}/api/organiser/events`, {
      method: 'GET',
      headers: authHeaders(token),
    });
    return handleResponse(response);
  },

  /**
   * Create a new event.
   * @param {{ name, description, date, venue, bannerImageUrl, refundPolicy }} data
   * @param {string} token
   * @returns {Promise<object>}
   */
  async createEvent(data, token) {
    const response = await fetch(`${STRAPI_URL}/api/organiser/events`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ data }),
    });
    return handleResponse(response);
  },

  /**
   * Update an existing event.
   * @param {string|number} id
   * @param {{ name, description, date, venue, bannerImageUrl, refundPolicy }} data
   * @param {string} token
   * @returns {Promise<object>}
   */
  async updateEvent(id, data, token) {
    const response = await fetch(`${STRAPI_URL}/api/organiser/events/${id}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({ data }),
    });
    return handleResponse(response);
  },

  /**
   * Delete an event.
   * @param {string|number} id
   * @param {string} token
   * @returns {Promise<void>}
   */
  async deleteEvent(id, token) {
    const response = await fetch(`${STRAPI_URL}/api/organiser/events/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
    }
  },

  /**
   * Fetch the attendee list for an event, with optional filters.
   *
   * @param {string|number} eventId
   * @param {{ ticketType?: string, checkedIn?: boolean }} [filters]
   * @param {string} token
   * @returns {Promise<{ attendees: Array<{ name, email, ticketType, checkedIn, uuid }>, total: number }>}
   */
  async getAttendees(eventId, filters = {}, token) {
    if (!STRAPI_URL) return mockGetAttendees(eventId, filters);

    const params = new URLSearchParams();
    if (filters.ticketType != null) params.set('ticketType', filters.ticketType);
    if (filters.checkedIn  != null) params.set('checkedIn',  String(filters.checkedIn));
    const qs = params.toString() ? `?${params.toString()}` : '';

    const response = await fetch(
      `${STRAPI_URL}/api/organiser/events/${encodeURIComponent(eventId)}/attendees${qs}`,
      { headers: authHeaders(token) },
    );
    return handleResponse(response);
  },

  /**
   * Send a message to all attendees of an event.
   *
   * @param {string|number} eventId
   * @param {string} subject
   * @param {string} body
   * @param {string} token
   * @returns {Promise<{ success: boolean, sent: number }>}
   */
  async messageAttendees(eventId, subject, body, token) {
    if (!STRAPI_URL) return mockMessageAttendees(eventId, subject, body);

    const response = await fetch(
      `${STRAPI_URL}/api/organiser/events/${encodeURIComponent(eventId)}/message`,
      {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ subject, body }),
      },
    );
    return handleResponse(response);
  },
};
