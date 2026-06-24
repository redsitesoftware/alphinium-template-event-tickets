import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useStore } from '../store/ticketStore';
import { EventsService } from '../services/EventsService';

const CATS = ['All', 'Music', 'Sports', 'Comedy', 'Arts', 'Food', 'Networking', 'Tech', 'Family'];

// Normalise Strapi v4 { id, attributes: {...} } or flat object from static store
function normaliseEvent(item) {
  if (item.attributes) {
    return { id: item.id, ...item.attributes };
  }
  return item;
}

export default function HomeScreen() {
  const { state, dispatch } = useStore();
  const [cat, setCat] = useState('All');
  const [search, setSearch] = useState('');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Debounce search to avoid firing on every keystroke
  const searchTimeout = useRef(null);

  const fetchEvents = useCallback(async ({ category, searchQuery, silent } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params = {};
      if (category && category !== 'All') params.category = category;
      if (searchQuery) params.search = searchQuery;
      const result = await EventsService.getEvents(params);
      const raw = Array.isArray(result) ? result : (result?.data ?? []);
      setEvents(raw.map(normaliseEvent));
    } catch (err) {
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchEvents({ category: cat, searchQuery: search });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch when category changes
  useEffect(() => {
    fetchEvents({ category: cat, searchQuery: search });
  }, [cat]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearchChange(text) {
    setSearch(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchEvents({ category: cat, searchQuery: text });
    }, 400);
  }

  function handleSearchSubmit() {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    fetchEvents({ category: cat, searchQuery: search });
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents({ category: cat, searchQuery: search, silent: true });
  }, [cat, search, fetchEvents]);

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.logo}>🎟️ Tickets</Text>
          <Text style={s.sub}>Powered by alphinium-payments</Text>
        </View>
        <TouchableOpacity
          style={s.walletBtn}
          onPress={() => dispatch({ type: 'VIEW_TICKET', ticketId: state.wallet[0]?.id })}
        >
          <Text style={s.walletText}>🎫 Wallet ({state.wallet.length})</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={s.searchContainer}>
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={handleSearchChange}
          onSubmitEditing={handleSearchSubmit}
          placeholder="Search events…"
          placeholderTextColor="#6B7280"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <ScrollView
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
        }
      >
        {/* Category filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.catScroll}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
        >
          {CATS.map(c => (
            <TouchableOpacity
              key={c}
              style={[s.catPill, cat === c && s.catActive]}
              onPress={() => setCat(c)}
            >
              <Text style={[s.catText, cat === c && s.catTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Body */}
        {loading && !refreshing ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={s.loadingText}>Loading events…</Text>
          </View>
        ) : error ? (
          <View style={s.center}>
            <Text style={s.errorText}>⚠️ {error}</Text>
            <TouchableOpacity
              style={s.retryBtn}
              onPress={() => fetchEvents({ category: cat, searchQuery: search })}
            >
              <Text style={s.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : events.length === 0 ? (
          <View style={s.center}>
            <Text style={s.emptyEmoji}>📭</Text>
            <Text style={s.emptyText}>No events found</Text>
            <Text style={s.emptySubText}>
              {search ? `No results for "${search}"` : 'Check back soon!'}
            </Text>
          </View>
        ) : (
          <View style={{ padding: 16, gap: 14 }}>
            {events.map(event => {
              const sold = event.sold ?? 0;
              const capacity = event.capacity ?? 0;
              const soldPct = capacity > 0 ? sold / capacity : 0;
              const almostSoldOut = soldPct > 0.9;
              const tickets = event.tickets ?? [];
              const prices = tickets.map(t => t.price ?? t.attributes?.price).filter(Boolean);
              const lowestPrice = prices.length ? Math.min(...prices) : null;

              return (
                <TouchableOpacity
                  key={event.id}
                  style={s.eventCard}
                  onPress={() => dispatch({ type: 'VIEW_EVENT', eventId: event.id })}
                  activeOpacity={0.88}
                >
                  <View style={[s.eventBanner, { backgroundColor: event.color ?? '#1E1E2E' }]}>
                    <Text style={s.eventEmoji}>{event.emoji ?? '🎟️'}</Text>
                    <View style={s.eventCatBadge}>
                      <Text style={s.eventCatText}>{event.category ?? '—'}</Text>
                    </View>
                    {almostSoldOut && (
                      <View style={s.soldOutBadge}>
                        <Text style={s.soldOutText}>🔥 Almost Full</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.eventInfo}>
                    <Text style={s.eventName}>{event.name}</Text>
                    <View style={s.eventMeta}>
                      {event.date ? <Text style={s.metaText}>📅 {event.date}</Text> : null}
                      {event.time ? <Text style={s.metaText}>🕐 {event.time}</Text> : null}
                    </View>
                    {event.venue ? <Text style={s.metaText}>📍 {event.venue}</Text> : null}
                    {capacity > 0 && (
                      <>
                        <View style={s.capacityBar}>
                          <View
                            style={[
                              s.capacityFill,
                              {
                                width: `${soldPct * 100}%`,
                                backgroundColor: almostSoldOut ? '#EF4444' : (event.accent ?? '#6366F1'),
                              },
                            ]}
                          />
                        </View>
                        <View style={s.eventFooter}>
                          <Text style={s.eventSold}>
                            {(capacity - sold).toLocaleString()} tickets left
                          </Text>
                          {lowestPrice != null && (
                            <Text style={[s.eventPrice, { color: event.accent ?? '#818CF8' }]}>
                              From ${lowestPrice}
                            </Text>
                          )}
                        </View>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={s.addonCallout}>
          <Text style={s.addonTitle}>🎟️ alphinium-payments + alphinium-auth</Text>
          <Text style={s.addonText}>
            Sell tickets for any event. QR scan at door. Instant payout via Stripe. Add to any
            alphinium app as an addon.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0F1A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1E1E2E' },
  logo: { fontSize: 22, fontWeight: '900', color: '#fff' },
  sub: { fontSize: 11, color: '#6366F1' },
  walletBtn: { backgroundColor: '#1E1E2E', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  walletText: { color: '#A5B4FC', fontSize: 13, fontWeight: '600' },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#0F0F1A', borderBottomWidth: 1, borderBottomColor: '#1E1E2E' },
  searchInput: { backgroundColor: '#1E1E2E', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#fff', borderWidth: 1, borderColor: '#374151' },
  catScroll: { backgroundColor: '#0F0F1A', borderBottomWidth: 1, borderBottomColor: '#1E1E2E' },
  catPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: '#1E1E2E' },
  catActive: { backgroundColor: '#6366F1' },
  catText: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  catTextActive: { color: '#fff' },
  center: { paddingTop: 60, alignItems: 'center', paddingHorizontal: 32 },
  loadingText: { color: '#6B7280', marginTop: 12, fontSize: 14 },
  errorText: { color: '#EF4444', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#6366F1', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 6 },
  emptySubText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  eventCard: { backgroundColor: '#1E1E2E', borderRadius: 16, overflow: 'hidden' },
  eventBanner: { height: 120, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  eventEmoji: { fontSize: 56 },
  eventCatBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  eventCatText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  soldOutBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#EF4444', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  soldOutText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  eventInfo: { padding: 16 },
  eventName: { fontSize: 17, fontWeight: '800', color: '#fff', marginBottom: 8 },
  eventMeta: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  metaText: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  capacityBar: { height: 4, backgroundColor: '#374151', borderRadius: 2, overflow: 'hidden', marginVertical: 10 },
  capacityFill: { height: 4, borderRadius: 2 },
  eventFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventSold: { fontSize: 12, color: '#9CA3AF' },
  eventPrice: { fontSize: 16, fontWeight: '900' },
  addonCallout: { margin: 16, backgroundColor: '#1E1E2E', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#6366F1' + '40' },
  addonTitle: { fontSize: 14, fontWeight: '800', color: '#818CF8', marginBottom: 6 },
  addonText: { fontSize: 13, color: '#6B7280', lineHeight: 20 },
});
