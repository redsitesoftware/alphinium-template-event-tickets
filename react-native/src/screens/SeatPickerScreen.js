/**
 * SeatPickerScreen
 * Section picker shown between EventScreen (ticket type selection) and
 * CheckoutScreen.  Allows buyers to choose a named section (Floor,
 * Mezzanine, Balcony, VIP Pit) or tap "Best Available" for auto-assignment.
 *
 * Flow:
 *   1. Screen loads and fetches sections with availability counts.
 *   2. User taps a section (or "Best Available").
 *   3. A 10-minute reservation hold is created via SeatMapService.reserve().
 *   4. A countdown timer is displayed in the header.
 *   5. On expiry the hold is cleared and the user is sent back to EventScreen.
 *   6. "Continue to Checkout" dispatches GO_CHECKOUT.
 *   7. "Back" releases the hold (if active) and returns to EventScreen.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useStore, EVENTS } from '../store/ticketStore';
import { SeatMapService } from '../services/SeatMapService';

const HOLD_DURATION_MS = 10 * 60 * 1000; // 10 minutes

function formatCountdown(msRemaining) {
  if (msRemaining <= 0) return '0:00';
  const totalSec = Math.ceil(msRemaining / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function SeatPickerScreen() {
  const { state, dispatch } = useStore();
  const eventId = state.selectedEvent;
  const event = EVENTS.find(e => e.id === eventId);
  const accent = event?.accent ?? '#818CF8';

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reserving, setReserving] = useState(false);

  // Local hold timer — msRemaining drives the countdown display
  const [msRemaining, setMsRemaining] = useState(null);
  const timerRef = useRef(null);
  const pollRef = useRef(null);

  // -------------------------------------------------------------------------
  // Load sections on mount
  // -------------------------------------------------------------------------
  const loadSections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await SeatMapService.getSections(eventId);
      setSections(data);
    } catch (err) {
      setError(err.message || 'Failed to load seat map');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  // -------------------------------------------------------------------------
  // Availability polling (every 15 seconds)
  // -------------------------------------------------------------------------
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const availability = await SeatMapService.getAvailability(eventId);
        setSections(prev =>
          prev.map(s => {
            const update = availability.find(a => a.sectionId === s.id);
            if (!update) return s;
            return { ...s, available: update.available, reserved: update.reserved, sold: update.sold };
          }),
        );
      } catch {
        // Silently ignore polling errors — data may be stale but not blocking
      }
    }, 15000);
    return () => clearInterval(pollRef.current);
  }, [eventId]);

  // -------------------------------------------------------------------------
  // Countdown timer — ticks every second while a hold is active
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (state.reservationExpiry) {
      const tick = () => {
        const remaining = state.reservationExpiry - Date.now();
        if (remaining <= 0) {
          setMsRemaining(0);
          clearInterval(timerRef.current);
          handleHoldExpired();
        } else {
          setMsRemaining(remaining);
        }
      };
      tick();
      timerRef.current = setInterval(tick, 1000);
    } else {
      setMsRemaining(null);
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [state.reservationExpiry]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleHoldExpired() {
    Alert.alert(
      'Hold Expired',
      'Your seat reservation has expired. Please select a section again.',
      [{ text: 'OK', onPress: () => dispatch({ type: 'CLEAR_RESERVATION' }) }],
    );
  }

  // -------------------------------------------------------------------------
  // Release hold when navigating back
  // -------------------------------------------------------------------------
  async function handleBack() {
    if (state.reservationId) {
      try {
        await SeatMapService.releaseReservation(eventId, state.reservationId);
      } catch {
        // Best-effort release — don't block navigation
      }
    }
    dispatch({ type: 'BACK' });
  }

  // -------------------------------------------------------------------------
  // Select a section and create a reservation hold
  // -------------------------------------------------------------------------
  async function handleSelectSection(sectionId) {
    if (reserving) return;

    // Release any existing hold before creating a new one
    if (state.reservationId) {
      try {
        await SeatMapService.releaseReservation(eventId, state.reservationId);
      } catch {
        // Best-effort
      }
      dispatch({ type: 'CLEAR_RESERVATION' });
    }

    setReserving(true);
    try {
      dispatch({ type: 'SELECT_SECTION', sectionId });
      const reservation = await SeatMapService.reserve(eventId, sectionId, state.qty);
      dispatch({
        type: 'SET_RESERVATION',
        reservationId: reservation.reservationId,
        expiresAt: reservation.expiresAt,
      });
    } catch (err) {
      dispatch({ type: 'SELECT_SECTION', sectionId: null });
      Alert.alert('Reservation Failed', err.message || 'Could not reserve this section. Please try again.');
    } finally {
      setReserving(false);
    }
  }

  // -------------------------------------------------------------------------
  // Best Available auto-assign
  // -------------------------------------------------------------------------
  async function handleBestAvailable() {
    const bestId = SeatMapService.bestAvailable(sections);
    if (!bestId) {
      Alert.alert('Sold Out', 'All sections are currently sold out or fully reserved.');
      return;
    }
    await handleSelectSection(bestId);
  }

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------
  function sectionStatus(s) {
    const available = s.available ?? Math.max(0, s.capacity - s.sold - s.reserved);
    if (available === 0) return { label: 'SOLD OUT', color: '#EF4444' };
    if (available <= 10) return { label: `Only ${available} left`, color: '#F59E0B' };
    return { label: `${available} available`, color: '#10B981' };
  }

  const selectedSection = sections.find(s => s.id === state.selectedSection);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={handleBack} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.title}>Choose Section</Text>
          {msRemaining != null && (
            <View style={[s.timerPill, msRemaining < 60000 && s.timerPillUrgent]}>
              <Text style={s.timerText}>
                ⏱ Hold expires in {formatCountdown(msRemaining)}
              </Text>
            </View>
          )}
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Body */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={accent} />
          <Text style={s.loadingText}>Loading seat map…</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text style={s.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={[s.retryBtn, { borderColor: accent }]} onPress={loadSections}>
            <Text style={[s.retryBtnText, { color: accent }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          {/* Event context strip */}
          <View style={[s.contextStrip, { backgroundColor: event?.color + '30' ?? '#1E1E2E' }]}>
            <Text style={s.contextEmoji}>{event?.emoji ?? '🎟️'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.contextName} numberOfLines={1}>{event?.name ?? 'Event'}</Text>
              <Text style={s.contextMeta}>
                {state.qty}× {state.selectedTicket} · {event?.date ?? ''}
              </Text>
            </View>
          </View>

          {/* Best Available button */}
          <TouchableOpacity
            style={[s.bestAvailBtn, { borderColor: accent }, reserving && s.disabledBtn]}
            onPress={handleBestAvailable}
            disabled={reserving}
            activeOpacity={0.8}
          >
            <Text style={[s.bestAvailText, { color: accent }]}>
              ✨ Best Available — auto-select
            </Text>
            <Text style={s.bestAvailSub}>
              We'll pick the best section with most availability
            </Text>
          </TouchableOpacity>

          <Text style={s.orLabel}>— or choose a section —</Text>

          {/* Section cards */}
          {sections.map(sec => {
            const status = sectionStatus(sec);
            const isSelected = state.selectedSection === sec.id;
            const isSoldOut = status.label === 'SOLD OUT';
            const available = sec.available ?? Math.max(0, sec.capacity - sec.sold - sec.reserved);
            const soldPct = sec.capacity > 0 ? (sec.sold + sec.reserved) / sec.capacity : 0;

            return (
              <TouchableOpacity
                key={sec.id}
                style={[
                  s.sectionCard,
                  isSelected && { borderColor: accent, backgroundColor: accent + '18' },
                  isSoldOut && s.sectionCardDisabled,
                ]}
                onPress={() => !isSoldOut && handleSelectSection(sec.id)}
                disabled={isSoldOut || reserving}
                activeOpacity={0.85}
              >
                {/* Left: emoji + name */}
                <View style={[s.sectionIcon, { backgroundColor: sec.color + '30' }]}>
                  <Text style={s.sectionEmoji}>{sec.emoji ?? '🪑'}</Text>
                </View>

                <View style={s.sectionBody}>
                  <View style={s.sectionTitleRow}>
                    <Text style={[s.sectionName, isSoldOut && s.textFaded]}>
                      {sec.name}
                    </Text>
                    <Text style={[s.sectionStatus, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>

                  {/* Capacity bar */}
                  <View style={s.barBg}>
                    <View
                      style={[
                        s.barFill,
                        {
                          width: `${Math.min(100, Math.round(soldPct * 100))}%`,
                          backgroundColor: soldPct > 0.9 ? '#EF4444' : sec.color ?? accent,
                        },
                      ]}
                    />
                  </View>

                  <View style={s.statsRow}>
                    <Text style={s.statText}>{sec.sold} sold</Text>
                    <Text style={[s.statText, { color: '#F59E0B' }]}>{sec.reserved} reserved</Text>
                    <Text style={[s.statText, { color: available === 0 ? '#EF4444' : '#10B981' }]}>
                      {available} free
                    </Text>
                  </View>
                </View>

                {/* Radio */}
                <View style={[s.radioOuter, isSelected && { borderColor: accent }]}>
                  {isSelected && <View style={[s.radioInner, { backgroundColor: accent }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Sticky CTA */}
      {state.selectedSection && !loading && (
        <View style={s.stickyBar}>
          <View style={{ flex: 1 }}>
            <Text style={s.stickyLabel}>
              {selectedSection ? `📍 ${selectedSection.name}` : '📍 Section selected'}
            </Text>
            {msRemaining != null && (
              <Text style={[s.stickyTimer, msRemaining < 60000 && { color: '#EF4444' }]}>
                Hold: {formatCountdown(msRemaining)}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[s.continueBtn, { backgroundColor: accent }, reserving && s.disabledBtn]}
            onPress={() => dispatch({ type: 'GO_CHECKOUT' })}
            disabled={reserving}
            activeOpacity={0.88}
          >
            <Text style={s.continueBtnText}>Continue →</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0F1A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E2E',
  },
  backBtn: { width: 60 },
  backText: { color: '#818CF8', fontSize: 15, fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 4 },
  title: { fontSize: 17, fontWeight: '800', color: '#fff' },
  timerPill: {
    backgroundColor: '#1E1E2E',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#374151',
  },
  timerPillUrgent: { borderColor: '#EF4444', backgroundColor: '#EF444420' },
  timerText: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { color: '#6B7280', marginTop: 12, fontSize: 14 },
  errorText: { color: '#EF4444', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryBtn: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryBtnText: { fontWeight: '700', fontSize: 14 },
  list: { padding: 16, gap: 12, paddingBottom: 120 },
  contextStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  contextEmoji: { fontSize: 28 },
  contextName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  contextMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  bestAvailBtn: {
    borderWidth: 2,
    borderRadius: 14,
    borderStyle: 'dashed',
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  bestAvailText: { fontSize: 16, fontWeight: '700' },
  bestAvailSub: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
  orLabel: { textAlign: 'center', fontSize: 13, color: '#4B5563', marginVertical: 4 },
  sectionCard: {
    backgroundColor: '#1E1E2E',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#374151',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionCardDisabled: { opacity: 0.45 },
  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionEmoji: { fontSize: 24 },
  sectionBody: { flex: 1, gap: 6 },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  sectionStatus: { fontSize: 12, fontWeight: '700' },
  textFaded: { color: '#6B7280' },
  barBg: { height: 5, backgroundColor: '#374151', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statText: { fontSize: 11, color: '#6B7280' },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1E1E2E',
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#374151',
    gap: 12,
  },
  stickyLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },
  stickyTimer: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  continueBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  continueBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  disabledBtn: { opacity: 0.5 },
});
