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

export const OrganiserService = {
  /**
   * List events owned by the authenticated organiser.
   * @param {string} token  JWT from useAuth()
   * @returns {Promise<Array>}
   */
  async getEvents(token) {
    const response = await fetch(`${STRAPI_URL}/api/organiser/events`, {
      method: 'GET',
      headers: authHeaders(token),
    });
    return handleResponse(response);
  },

  /**
   * Create a new event.
   * @param {{ name, description, date, venue, bannerImageUrl }} data
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
   * @param {{ name, description, date, venue, bannerImageUrl }} data
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
};
