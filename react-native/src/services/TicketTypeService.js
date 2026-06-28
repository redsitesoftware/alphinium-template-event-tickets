/**
 * TicketTypeService
 * API calls for organiser-facing ticket type management.
 * Covers tiered pricing (GA, VIP, Early Bird, Group, etc.) per event.
 * All write endpoints require a valid JWT token from useAuth().
 *
 * Endpoints:
 *   GET    /api/organiser/events/:id/ticket-types
 *   POST   /api/organiser/events/:id/ticket-types
 *   PUT    /api/organiser/events/:id/ticket-types/:tid
 *   DELETE /api/organiser/events/:id/ticket-types/:tid
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

export const TicketTypeService = {
  /**
   * List all ticket types (tiers) for an event.
   * Response includes per-tier quantity tracking: sold, reserved, available.
   * @param {string|number} eventId
   * @param {string} token  JWT from useAuth()
   * @returns {Promise<Array<TicketType>>}
   */
  async getTicketTypes(eventId, token) {
    const response = await fetch(
      `${STRAPI_URL}/api/organiser/events/${eventId}/ticket-types`,
      {
        method: 'GET',
        headers: authHeaders(token),
      },
    );
    return handleResponse(response);
  },

  /**
   * Create a new ticket type tier for an event.
   * @param {string|number} eventId
   * @param {TicketTypePayload} data
   * @param {string} token
   * @returns {Promise<TicketType>}
   *
   * TicketTypePayload shape:
   *   name        {string}  — e.g. "General Admission", "VIP", "Early Bird"
   *   price       {number}  — in cents or zero for free tickets
   *   quantity    {number}  — total tickets in this tier
   *   description {string}  — perks / what's included
   *   saleStart   {string}  — ISO date string (optional)
   *   saleEnd     {string}  — ISO date string (optional)
   *   visibility  {'public'|'hidden'}  — hidden = invite-only
   */
  async createTicketType(eventId, data, token) {
    const response = await fetch(
      `${STRAPI_URL}/api/organiser/events/${eventId}/ticket-types`,
      {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ data }),
      },
    );
    return handleResponse(response);
  },

  /**
   * Update an existing ticket type tier.
   * @param {string|number} eventId
   * @param {string|number} ticketTypeId
   * @param {Partial<TicketTypePayload>} data
   * @param {string} token
   * @returns {Promise<TicketType>}
   */
  async updateTicketType(eventId, ticketTypeId, data, token) {
    const response = await fetch(
      `${STRAPI_URL}/api/organiser/events/${eventId}/ticket-types/${ticketTypeId}`,
      {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ data }),
      },
    );
    return handleResponse(response);
  },

  /**
   * Delete a ticket type tier.
   * @param {string|number} eventId
   * @param {string|number} ticketTypeId
   * @param {string} token
   * @returns {Promise<void>}
   */
  async deleteTicketType(eventId, ticketTypeId, token) {
    const response = await fetch(
      `${STRAPI_URL}/api/organiser/events/${eventId}/ticket-types/${ticketTypeId}`,
      {
        method: 'DELETE',
        headers: authHeaders(token),
      },
    );
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
    }
  },
};
