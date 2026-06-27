/**
 * EventsService
 * Fetches public and authenticated event data from Strapi.
 * Replaces hardcoded static EVENTS from ticketStore.
 *
 * Strapi v4 response shape:
 *   { data: [...], meta: { pagination: { page, pageSize, total } } }
 * Each item: { id, attributes: { name, description, date, ... } }
 *
 * Follows StripeService.js pattern: STRAPI_URL from config, Bearer auth header,
 * try/catch per method.
 */

import { STRAPI_URL } from '../config';
import { EVENTS as MOCK_EVENTS } from '../store/ticketStore';

/**
 * Build Strapi v4 filter query string from params object.
 * Supports: category, dateFrom, dateTo, location, priceMin, priceMax, search, page, pageSize
 */
function buildQuery(params = {}) {
  const parts = [];

  if (params.search) {
    parts.push(`filters[$or][0][name][$containsi]=${encodeURIComponent(params.search)}`);
    parts.push(`filters[$or][1][description][$containsi]=${encodeURIComponent(params.search)}`);
  }
  if (params.category) {
    parts.push(`filters[category][$eq]=${encodeURIComponent(params.category)}`);
  }
  if (params.dateFrom) {
    parts.push(`filters[date][$gte]=${encodeURIComponent(params.dateFrom)}`);
  }
  if (params.dateTo) {
    parts.push(`filters[date][$lte]=${encodeURIComponent(params.dateTo)}`);
  }
  if (params.location) {
    parts.push(`filters[venue][$containsi]=${encodeURIComponent(params.location)}`);
  }
  if (params.priceMin != null) {
    parts.push(`filters[tickets][price][$gte]=${params.priceMin}`);
  }
  if (params.priceMax != null) {
    parts.push(`filters[tickets][price][$lte]=${params.priceMax}`);
  }

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 25;
  parts.push(`pagination[page]=${page}`);
  parts.push(`pagination[pageSize]=${pageSize}`);

  // Populate nested ticket relations
  parts.push('populate=tickets');

  return parts.length ? `?${parts.join('&')}` : '';
}

export const EventsService = {
  /**
   * List events with optional filtering, search and pagination.
   * Public endpoint — token optional.
   *
   * @param {object} params  Optional: { category, dateFrom, dateTo, location, priceMin, priceMax, search, page, pageSize }
   * @param {string} [token] JWT from useAuth() — optional for public listing
   * @returns {Promise<{ data: Array, meta: object }>}
   */
  async getEvents(params = {}, token) {
    // No Strapi configured — return filtered mock data for demo/preview
    if (!STRAPI_URL) {
      let events = MOCK_EVENTS;
      if (params.category && params.category !== 'All') {
        events = events.filter(e => e.category === params.category);
      }
      if (params.search) {
        const q = params.search.toLowerCase();
        events = events.filter(e =>
          e.name.toLowerCase().includes(q) ||
          (e.description || '').toLowerCase().includes(q),
        );
      }
      return { data: events, meta: { pagination: { total: events.length } } };
    }

    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const qs = buildQuery(params);
      const response = await fetch(`${STRAPI_URL}/api/events${qs}`, { headers });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || result.error || 'Failed to fetch events');
      }

      return result;
    } catch (error) {
      console.error('EventsService.getEvents error:', error);
      throw error;
    }
  },

  /**
   * Fetch full detail for a single event.
   * Public endpoint — token optional.
   *
   * @param {string|number} id
   * @param {string} [token]
   * @returns {Promise<object>}  Strapi v4: { id, attributes: { name, ... } }
   */
  async getEventById(id, token) {
    // No Strapi configured — return mock event for demo/preview
    if (!STRAPI_URL) {
      return MOCK_EVENTS.find(e => e.id === id) ?? null;
    }

    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${STRAPI_URL}/api/events/${id}?populate=tickets`,
        { headers },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || result.error || `Failed to fetch event ${id}`);
      }

      return result.data ?? result;
    } catch (error) {
      console.error('EventsService.getEventById error:', error);
      throw error;
    }
  },
};

export default EventsService;
