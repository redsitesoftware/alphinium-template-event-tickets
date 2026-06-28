/**
 * SeatMapService
 * API calls for seat map / section selection and reservation holds.
 *
 * Endpoints:
 *   GET  /api/events/:id/seat-map             — fetch sections for an event
 *   POST /api/events/:id/seat-map/reserve     — create 10-minute reservation hold
 *   DELETE /api/events/:id/seat-map/reserve/:reservationId — release hold
 *   GET  /api/events/:id/seat-map/availability — real-time availability snapshot
 *
 * When STRAPI_URL is not configured the service falls back to in-memory
 * mock state so the feature works in demo/preview mode without a backend.
 */

import { STRAPI_URL } from '../config';

// ---------------------------------------------------------------------------
// Mock in-memory store (used when STRAPI_URL is not configured)
// ---------------------------------------------------------------------------

/** Default sections used as a fallback for events that declare hasSeatMap=true */
export const DEFAULT_SECTIONS = [
  { id: 's-floor',     name: 'Floor',        emoji: '🎵', capacity: 500, sold: 312, reserved: 28, color: '#7C3AED' },
  { id: 's-mezz',      name: 'Mezzanine',    emoji: '🏟️', capacity: 300, sold: 180, reserved: 15, color: '#0EA5E9' },
  { id: 's-balcony',   name: 'Balcony',      emoji: '🔭', capacity: 200, sold: 45,  reserved: 10, color: '#10B981' },
  { id: 's-vip-pit',   name: 'VIP Pit',      emoji: '⭐', capacity: 80,  sold: 62,  reserved: 8,  color: '#F59E0B' },
];

/** In-memory reservation map: reservationId → { sectionId, eventId, expiresAt } */
const _mockReservations = {};

let _mockSectionState = null;

function getMockSections() {
  if (!_mockSectionState) {
    _mockSectionState = DEFAULT_SECTIONS.map(s => ({ ...s }));
  }
  // Sync reserved counts from active mock reservations
  const now = Date.now();
  const activeBySectionId = {};
  for (const [rId, r] of Object.entries(_mockReservations)) {
    if (r.expiresAt > now) {
      activeBySectionId[r.sectionId] = (activeBySectionId[r.sectionId] || 0) + r.qty;
    } else {
      delete _mockReservations[rId];
    }
  }
  return _mockSectionState.map(s => ({
    ...s,
    reserved: activeBySectionId[s.id] ?? s.reserved,
    available: s.capacity - s.sold - (activeBySectionId[s.id] ?? s.reserved),
  }));
}

function generateReservationId() {
  return 'res-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now();
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

export const SeatMapService = {
  /**
   * Fetch the sections / seat map for an event.
   * Returns an array of section objects with availability counts.
   *
   * @param {string|number} eventId
   * @param {string} [token]
   * @returns {Promise<Array<Section>>}
   *
   * Section shape:
   *   id        {string}
   *   name      {string}  — e.g. "Floor", "Mezzanine", "Balcony", "VIP Pit"
   *   emoji     {string}
   *   capacity  {number}
   *   sold      {number}
   *   reserved  {number}  — currently held (not yet purchased)
   *   available {number}  — capacity - sold - reserved
   *   color     {string}  — hex accent colour for the section card
   */
  async getSections(eventId, token) {
    if (!STRAPI_URL) {
      return getMockSections();
    }

    const response = await fetch(
      `${STRAPI_URL}/api/events/${eventId}/seat-map`,
      { method: 'GET', headers: authHeaders(token) },
    );
    const data = await handleResponse(response);
    return Array.isArray(data) ? data : (data?.data ?? []);
  },

  /**
   * Poll real-time availability for all sections of an event.
   * Lightweight endpoint — safe to call every few seconds.
   *
   * @param {string|number} eventId
   * @param {string} [token]
   * @returns {Promise<Array<{ sectionId, available, reserved, sold }>>}
   */
  async getAvailability(eventId, token) {
    if (!STRAPI_URL) {
      return getMockSections().map(s => ({
        sectionId: s.id,
        available: s.available,
        reserved: s.reserved,
        sold: s.sold,
      }));
    }

    const response = await fetch(
      `${STRAPI_URL}/api/events/${eventId}/seat-map/availability`,
      { method: 'GET', headers: authHeaders(token) },
    );
    const data = await handleResponse(response);
    return Array.isArray(data) ? data : (data?.data ?? []);
  },

  /**
   * Create a 10-minute reservation hold on a section.
   * Prevents double-booking while the buyer is in checkout.
   *
   * @param {string|number} eventId
   * @param {string} sectionId
   * @param {number} qty  Number of seats to hold
   * @param {string} [token]
   * @returns {Promise<Reservation>}
   *
   * Reservation shape:
   *   reservationId  {string}
   *   sectionId      {string}
   *   qty            {number}
   *   expiresAt      {number}  — Unix timestamp (ms)
   */
  async reserve(eventId, sectionId, qty, token) {
    if (!STRAPI_URL) {
      const reservationId = generateReservationId();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
      _mockReservations[reservationId] = { sectionId, eventId, qty, expiresAt };
      return { reservationId, sectionId, qty, expiresAt };
    }

    const response = await fetch(
      `${STRAPI_URL}/api/events/${eventId}/seat-map/reserve`,
      {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ data: { sectionId, qty } }),
      },
    );
    return handleResponse(response);
  },

  /**
   * Release a reservation hold (e.g. user cancels checkout or goes back).
   *
   * @param {string|number} eventId
   * @param {string} reservationId
   * @param {string} [token]
   * @returns {Promise<void>}
   */
  async releaseReservation(eventId, reservationId, token) {
    if (!STRAPI_URL) {
      delete _mockReservations[reservationId];
      return;
    }

    const response = await fetch(
      `${STRAPI_URL}/api/events/${eventId}/seat-map/reserve/${reservationId}`,
      { method: 'DELETE', headers: authHeaders(token) },
    );
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
    }
  },

  /**
   * Auto-select the best available section (lowest price with most availability).
   * Returns the section ID of the best pick, or null if all sections are full.
   *
   * @param {Array<Section>} sections
   * @returns {string|null}
   */
  bestAvailable(sections) {
    const available = sections.filter(s => (s.available ?? 0) > 0);
    if (available.length === 0) return null;
    // Prefer the section with the most availability
    return available.sort((a, b) => (b.available ?? 0) - (a.available ?? 0))[0].id;
  },
};
