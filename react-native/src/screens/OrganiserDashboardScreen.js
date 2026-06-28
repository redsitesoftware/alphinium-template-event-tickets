/**
 * OrganiserDashboardScreen
 * Lists the organiser's events with attendance stats and a "+ Create Event" button.
 * Navigates to OrganiserEventFormScreen for create / edit.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@alphinium/auth';
import { OrganiserService } from '../services/OrganiserService';
import { WaitlistService } from '../services/WaitlistService';
import OrganiserEventFormScreen from './OrganiserEventFormScreen';
import { colors, spacing, radius } from '../theme';

export default function OrganiserDashboardScreen() {
  const { user, token } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [editingEvent, setEditingEvent] = useState(undefined); // undefined = dashboard, null = create, object = edit
  // Map of eventId → { checkedIn: number, total: number }
  const [checkInCounts, setCheckInCounts] = useState({});
  // Map of eventId → number (waitlist total)
  const [waitlistCounts, setWaitlistCounts] = useState({});

  const fetchCheckInCounts = useCallback(async (eventList) => {
    if (!eventList || eventList.length === 0) return;
    const results = await Promise.allSettled(
      eventList.map(async (evt) => {
        const id = evt.id ?? evt._id;
        const [checkedInRes, totalRes] = await Promise.allSettled([
          OrganiserService.getAttendees(id, { checkedIn: true }, token),
          OrganiserService.getAttendees(id, {}, token),
        ]);
        const checkedIn = checkedInRes.status === 'fulfilled'
          ? (checkedInRes.value?.meta?.checkedIn ?? checkedInRes.value?.meta?.total ?? 0)
          : 0;
        const total = totalRes.status === 'fulfilled'
          ? (totalRes.value?.meta?.total ?? 0)
          : 0;
        return { id, checkedIn, total };
      }),
    );
    const counts = {};
    results.forEach((r) => {
      if (r.status === 'fulfilled') {
        counts[r.value.id] = { checkedIn: r.value.checkedIn, total: r.value.total };
      }
    });
    setCheckInCounts(counts);
  }, [token]);

  const fetchWaitlistCounts = useCallback(async (eventList) => {
    if (!eventList || eventList.length === 0) return;
    const results = await Promise.allSettled(
      eventList.map(async (evt) => {
        const id = evt.id ?? evt._id;
        const res = await WaitlistService.getWaitlistLength(id);
        return { id, total: res?.total ?? 0 };
      }),
    );
    const counts = {};
    results.forEach((r) => {
      if (r.status === 'fulfilled') {
        counts[r.value.id] = r.value.total;
      }
    });
    setWaitlistCounts(counts);
  }, []);

  const fetchEvents = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await OrganiserService.getEvents(token);
      // Support both Strapi v4 { data: [...] } and plain array responses
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setEvents(list);
      fetchCheckInCounts(list);
      fetchWaitlistCounts(list);
    } catch (err) {
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, fetchCheckInCounts, fetchWaitlistCounts]);

  // Load on first mount
  React.useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Auto-refresh check-in and waitlist counts every 30 seconds while focused
  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(() => {
        if (events.length > 0) {
          fetchCheckInCounts(events);
          fetchWaitlistCounts(events);
        }
      }, 30_000);
      return () => clearInterval(interval);
    }, [events, fetchCheckInCounts, fetchWaitlistCounts]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents(true);
  }, [fetchEvents]);

  // Show form screen (create or edit)
  if (editingEvent !== undefined) {
    return (
      <OrganiserEventFormScreen
        event={editingEvent}
        token={token}
        onSaved={() => {
          setEditingEvent(undefined);
          fetchEvents();
        }}
        onDeleted={() => {
          setEditingEvent(undefined);
          fetchEvents();
        }}
        onBack={() => setEditingEvent(undefined)}
      />
    );
  }

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>🎟️ My Events</Text>
          <Text style={s.subtitle}>
            {user?.username || user?.email || 'Organiser'} · manage your events
          </Text>
        </View>
        <TouchableOpacity
          style={s.createBtn}
          onPress={() => setEditingEvent(null)}
          activeOpacity={0.8}
        >
          <Text style={s.createBtnText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      {/* Body */}
      {loading && !refreshing ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Loading events…</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text style={s.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => fetchEvents()}>
            <Text style={s.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {events.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>📭</Text>
              <Text style={s.emptyText}>No events yet</Text>
              <Text style={s.emptySubText}>Tap "+ Create" to add your first event</Text>
            </View>
          ) : (
            events.map((evt) => {
              const attrs = evt.attributes || evt; // Strapi v4 vs flat
              const id = evt.id ?? evt._id;
              const sold = attrs.sold ?? 0;
              const capacity = attrs.capacity ?? 0;
              const soldPct = capacity > 0 ? sold / capacity : 0;
              const attendancePct = Math.round(soldPct * 100);

              return (
                <TouchableOpacity
                  key={id}
                  style={s.card}
                  onPress={() => setEditingEvent({ id, ...attrs })}
                  activeOpacity={0.85}
                >
                  {/* Banner */}
                  {attrs.bannerImageUrl ? (
                    <View style={s.bannerPlaceholder}>
                      <Text style={s.bannerUrl} numberOfLines={1}>
                        🖼️ {attrs.bannerImageUrl}
                      </Text>
                    </View>
                  ) : (
                    <View style={[s.bannerPlaceholder, { backgroundColor: colors.card }]}>
                      <Text style={s.bannerEmoji}>🎟️</Text>
                    </View>
                  )}

                  <View style={s.cardBody}>
                    <Text style={s.eventName} numberOfLines={1}>
                      {attrs.name || 'Untitled Event'}
                    </Text>
                    <View style={s.metaRow}>
                      <Text style={s.metaText}>📅 {attrs.date || '—'}</Text>
                      <Text style={s.metaText}>📍 {attrs.venue || '—'}</Text>
                    </View>

                    {/* Attendance stats */}
                    <View style={s.statsRow}>
                      <Text style={s.statsLabel}>Attendance</Text>
                      <Text style={[s.statsPct, { color: soldPct > 0.9 ? colors.error : colors.success }]}>
                        {attendancePct}%
                      </Text>
                    </View>
                    <View style={s.barBg}>
                      <View
                        style={[
                          s.barFill,
                          {
                            width: `${attendancePct}%`,
                            backgroundColor: soldPct > 0.9 ? colors.error : colors.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={s.ticketCount}>
                      {sold.toLocaleString()} / {capacity.toLocaleString()} tickets sold
                    </Text>

                    {/* Check-in count */}
                    {(() => {
                      const ci = checkInCounts[id];
                      return ci != null ? (
                        <View style={s.checkInRow}>
                          <Text style={s.checkInIcon}>✅</Text>
                          <Text style={s.checkInText}>
                            {ci.checkedIn} / {ci.total} checked in
                          </Text>
                        </View>
                      ) : null;
                    })()}

                    {/* Waitlist count — only shown when total > 0 */}
                    {(() => {
                      const wl = waitlistCounts[id];
                      return wl != null && wl > 0 ? (
                        <View style={s.waitlistRow}>
                          <Text style={s.waitlistIcon}>🕐</Text>
                          <Text style={s.waitlistText}>
                            {wl} on waitlist
                          </Text>
                        </View>
                      ) : null;
                    })()}
                  </View>

                  <View style={s.cardFooter}>
                    <Text style={s.editHint}>Tap to edit →</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  createBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.round,
  },
  createBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontSize: 14,
  },
  errorText: {
    color: colors.error,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.round,
  },
  retryBtnText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  list: {
    padding: spacing.md,
    gap: spacing.md,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  bannerPlaceholder: {
    height: 60,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  bannerUrl: {
    color: colors.textMuted,
    fontSize: 12,
  },
  bannerEmoji: {
    fontSize: 28,
  },
  cardBody: {
    padding: spacing.md,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSub,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  statsPct: {
    fontSize: 12,
    fontWeight: '700',
  },
  barBg: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.round,
    overflow: 'hidden',
    marginBottom: 4,
  },
  barFill: {
    height: 6,
    borderRadius: radius.round,
  },
  ticketCount: {
    fontSize: 11,
    color: colors.textMuted,
  },
  checkInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  checkInIcon: {
    fontSize: 11,
  },
  checkInText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.success,
  },
  waitlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  waitlistIcon: {
    fontSize: 11,
  },
  waitlistText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSub,
  },
  cardFooter: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    alignItems: 'flex-end',
  },
  editHint: {
    fontSize: 12,
    color: colors.primaryLight,
  },
});
