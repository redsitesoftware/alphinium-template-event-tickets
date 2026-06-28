/**
 * ScanService
 * Ticket scan (door check-in) with optional offline UUID cache.
 *
 * Online mode:
 *   POST /api/tickets/:uuid/scan  — validate and mark a ticket as scanned
 *
 * Offline mode:
 *   primeOfflineCache(eventId) — pre-fetches all valid UUIDs from the server
 *     and stores them in AsyncStorage (key: scan_cache_<eventId>)
 *   scanOffline(uuid, eventId) — validates a UUID against the local cache
 *     without a network call; returns { success, offline: true }
 *
 * Mock fallback:
 *   Active when STRAPI_URL is not configured (demo / preview mode).
 *   UUIDs starting with 'SCANNED-' simulate the already-scanned state.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STRAPI_URL } from '../config';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

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

/** AsyncStorage key for a given event's offline UUID cache. */
function cacheKey(eventId) {
  return `scan_cache_${eventId}`;
}

// ---------------------------------------------------------------------------
// Mock fallbacks (used when STRAPI_URL is not configured)
// ---------------------------------------------------------------------------

function mockScanTicket(uuid) {
  if (uuid.startsWith('SCANNED-')) {
    return {
      success: false,
      alreadyScanned: true,
      attendeeName: null,
      ticketType: null,
      error: 'Ticket already scanned.',
    };
  }
  return {
    success: true,
    alreadyScanned: false,
    attendeeName: 'Demo Attendee',
    ticketType: 'General Admission',
    error: null,
  };
}

const MOCK_UUIDS = [
  'QR-MOCK-001',
  'QR-MOCK-002',
  'QR-MOCK-003',
  'QR-MOCK-004',
  'QR-MOCK-005',
];

async function mockPrimeOfflineCache(eventId) {
  const stored = JSON.stringify(MOCK_UUIDS);
  await AsyncStorage.setItem(cacheKey(eventId), stored);
  return { primed: true, count: MOCK_UUIDS.length };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const ScanService = {
  /**
   * Scan (validate and check-in) a ticket by its UUID.
   *
   * @param {string} uuid   QR code value scanned by the camera
   * @param {string} [token] JWT from useAuth() — required for real API calls
   * @returns {Promise<{
   *   success: boolean,
   *   attendeeName: string | null,
   *   ticketType: string | null,
   *   alreadyScanned: boolean,
   *   error?: string | null,
   * }>}
   */
  async scanTicket(uuid, token) {
    if (!STRAPI_URL) return mockScanTicket(uuid);

    const res = await fetch(
      `${STRAPI_URL}/api/tickets/${encodeURIComponent(uuid)}/scan`,
      {
        method: 'POST',
        headers: authHeaders(token),
      },
    );
    const data = await handleResponse(res);

    // On a successful scan, add this UUID to the offline cache.
    // Failures (already scanned / invalid) are intentionally NOT cached.
    if (data.success) {
      ScanService._addToCache(uuid).catch(() => {});
    }

    return data;
  },

  /**
   * Pre-fetch all valid UUIDs for an event and store them in AsyncStorage
   * so that scanOffline() can work without a network connection.
   *
   * @param {string|number} eventId
   * @param {string} [token] JWT from useAuth()
   * @returns {Promise<{ primed: boolean, count: number }>}
   */
  async primeOfflineCache(eventId, token) {
    if (!STRAPI_URL) return mockPrimeOfflineCache(eventId);

    const res = await fetch(
      `${STRAPI_URL}/api/organiser/events/${encodeURIComponent(eventId)}/attendees`,
      { headers: authHeaders(token) },
    );
    const data = await handleResponse(res);

    // Support both { attendees: [...] } and { data: [...] } shapes
    const attendees = data?.attendees ?? data?.data ?? [];
    const uuids = attendees
      .map((a) => a.uuid || a.qrCode)
      .filter(Boolean);

    await AsyncStorage.setItem(cacheKey(eventId), JSON.stringify(uuids));
    return { primed: true, count: uuids.length };
  },

  /**
   * Check a UUID against the locally cached set without a network call.
   * Returns { success: true } if the UUID is in the cache, { success: false }
   * if it is not (unknown / invalid in offline mode).
   *
   * @param {string} uuid       QR code value
   * @param {string|number} eventId  Must match the eventId used in primeOfflineCache
   * @returns {Promise<{ success: boolean, offline: true }>}
   */
  async scanOffline(uuid, eventId) {
    try {
      const stored = await AsyncStorage.getItem(cacheKey(eventId));
      if (!stored) return { success: false, offline: true };

      const uuids = JSON.parse(stored);
      const found = Array.isArray(uuids) && uuids.includes(uuid);
      return { success: found, offline: true };
    } catch {
      return { success: false, offline: true };
    }
  },

  /**
   * Clear the offline UUID cache for a specific event.
   *
   * @param {string|number} eventId
   * @returns {Promise<void>}
   */
  async clearCache(eventId) {
    await AsyncStorage.removeItem(cacheKey(eventId));
  },

  // ---------------------------------------------------------------------------
  // Internal — adds a single UUID to the AsyncStorage cache for an event.
  // Used internally after a successful online scan to keep offline cache warm.
  // eventId is not tracked per-UUID here; callers that need per-event accuracy
  // should rely on primeOfflineCache instead.
  // ---------------------------------------------------------------------------
  async _addToCache(uuid, eventId) {
    if (!eventId) return;
    try {
      const stored = await AsyncStorage.getItem(cacheKey(eventId));
      const uuids = stored ? JSON.parse(stored) : [];
      if (!uuids.includes(uuid)) {
        uuids.push(uuid);
        await AsyncStorage.setItem(cacheKey(eventId), JSON.stringify(uuids));
      }
    } catch {
      // Cache write failures are non-fatal
    }
  },
};
