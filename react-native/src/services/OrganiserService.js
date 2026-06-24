/**
 * OrganiserService
 * Handles organiser-facing event management API calls.
 * Follows the same Bearer token auth pattern as StripeService.js.
 *
 * Token is obtained from the @alphinium/auth AuthContext via useAuth():
 *   const { jwt } = useAuth();
 */

import { STRAPI_URL } from '../config';

export const OrganiserService = {
  /**
   * Get all events owned by the authenticated organiser,
   * including attendance stats per event.
   * GET /api/organiser/events
   *
   * @param {string} token  JWT from useAuth()
   * @returns {Promise<Array>}
   */
  async getEvents(token) {
    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${STRAPI_URL}/api/organiser/events`, {
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch organiser events');
      }

      return data;
    } catch (error) {
      console.error('OrganiserService.getEvents error:', error);
      throw error;
    }
  },

  /**
   * Create a new event.
   * POST /api/organiser/events
   *
   * @param {{ name: string, description: string, date: string, venue: string, bannerImage: string }} data
   * @param {string} token  JWT from useAuth()
   * @returns {Promise<object>}
   */
  async createEvent(data, token) {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${STRAPI_URL}/api/organiser/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ data }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create event');
      }

      return result;
    } catch (error) {
      console.error('OrganiserService.createEvent error:', error);
      throw error;
    }
  },

  /**
   * Update an existing event.
   * PUT /api/organiser/events/:id
   *
   * @param {string|number} id
   * @param {{ name: string, description: string, date: string, venue: string, bannerImage: string }} data
   * @param {string} token  JWT from useAuth()
   * @returns {Promise<object>}
   */
  async updateEvent(id, data, token) {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${STRAPI_URL}/api/organiser/events/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ data }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update event');
      }

      return result;
    } catch (error) {
      console.error('OrganiserService.updateEvent error:', error);
      throw error;
    }
  },

  /**
   * Delete (cancel) an event.
   * DELETE /api/organiser/events/:id
   *
   * @param {string|number} id
   * @param {string} token  JWT from useAuth()
   * @returns {Promise<void>}
   */
  async deleteEvent(id, token) {
    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${STRAPI_URL}/api/organiser/events/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Failed to delete event (HTTP ${response.status})`);
      }
    } catch (error) {
      console.error('OrganiserService.deleteEvent error:', error);
      throw error;
    }
  },
};

export default OrganiserService;
