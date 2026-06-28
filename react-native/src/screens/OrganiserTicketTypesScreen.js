/**
 * OrganiserTicketTypesScreen
 * Lists all ticket type tiers for a specific event and lets the organiser
 * create, edit, or delete tiers.
 *
 * Displays per-tier quantity tracking: sold / reserved / available.
 * Supports free tiers (price = 0) and hidden (invite-only) tiers.
 *
 * Props:
 *   event   — event object with at least { id, name }
 *   token   — JWT from useAuth()
 *   onBack  — callback to return to the event list / dashboard
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
  RefreshControl,
} from 'react-native';
import { TicketTypeService } from '../services/TicketTypeService';
import OrganiserTicketTypeFormScreen from './OrganiserTicketTypeFormScreen';
import { colors, spacing, radius } from '../theme';

export default function OrganiserTicketTypesScreen({ event, token, onBack }) {
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  // undefined = list view, null = create, object = edit
  const [editingTier, setEditingTier] = useState(undefined);

  const fetchTicketTypes = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const data = await TicketTypeService.getTicketTypes(event.id, token);
        setTicketTypes(Array.isArray(data) ? data : (data?.data ?? []));
      } catch (err) {
        setError(err.message || 'Failed to load ticket types');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [event.id, token],
  );

  React.useEffect(() => {
    fetchTicketTypes();
  }, [fetchTicketTypes]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTicketTypes(true);
  }, [fetchTicketTypes]);

  // Show the create / edit form
  if (editingTier !== undefined) {
    return (
      <OrganiserTicketTypeFormScreen
        eventId={event.id}
        ticketType={editingTier}
        token={token}
        onSaved={() => {
          setEditingTier(undefined);
          fetchTicketTypes();
        }}
        onDeleted={() => {
          setEditingTier(undefined);
          fetchTicketTypes();
        }}
        onBack={() => setEditingTier(undefined)}
      />
    );
  }

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.title}>🎫 Ticket Tiers</Text>
          <Text style={s.subtitle} numberOfLines={1}>
            {event.name || 'Event'}
          </Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => setEditingTier(null)}
          activeOpacity={0.8}
        >
          <Text style={s.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Body */}
      {loading && !refreshing ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Loading tiers…</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text style={s.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => fetchTicketTypes()}>
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
          {ticketTypes.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🎟️</Text>
              <Text style={s.emptyText}>No ticket tiers yet</Text>
              <Text style={s.emptySubText}>
                Tap "+ Add" to create your first tier (GA, VIP, etc.)
              </Text>
            </View>
          ) : (
            ticketTypes.map((tier) => {
              const attrs = tier.attributes || tier;
              const id = tier.id ?? tier._id;

              const sold = attrs.sold ?? 0;
              const reserved = attrs.reserved ?? 0;
              const quantity = attrs.quantity ?? 0;
              const available = attrs.available ?? Math.max(0, quantity - sold - reserved);
              const soldPct = quantity > 0 ? (sold + reserved) / quantity : 0;
              const price = attrs.price ?? 0;
              const isFree = price === 0;
              const isHidden = attrs.visibility === 'hidden';

              return (
                <TouchableOpacity
                  key={id}
                  style={s.card}
                  onPress={() => setEditingTier({ id, ...attrs })}
                  activeOpacity={0.85}
                >
                  <View style={s.cardHeader}>
                    <View style={s.tierNameRow}>
                      <Text style={s.tierName}>{attrs.name || 'Unnamed Tier'}</Text>
                      {isHidden && (
                        <View style={s.hiddenBadge}>
                          <Text style={s.hiddenBadgeText}>🔒 Invite-Only</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[s.price, isFree && s.priceFree]}>
                      {isFree ? 'FREE' : `$${price.toFixed(2)}`}
                    </Text>
                  </View>

                  {attrs.description ? (
                    <Text style={s.description} numberOfLines={2}>
                      {attrs.description}
                    </Text>
                  ) : null}

                  {/* Sale window */}
                  {(attrs.saleStart || attrs.saleEnd) ? (
                    <Text style={s.saleWindow}>
                      🗓️ {attrs.saleStart || '—'} → {attrs.saleEnd || '—'}
                    </Text>
                  ) : null}

                  {/* Quantity tracking bar */}
                  <View style={s.qtySection}>
                    <View style={s.qtyRow}>
                      <Text style={s.qtyLabel}>Sold</Text>
                      <Text style={s.qtyLabel}>Reserved</Text>
                      <Text style={s.qtyLabel}>Available</Text>
                    </View>
                    <View style={s.qtyRow}>
                      <Text style={s.qtyVal}>{sold.toLocaleString()}</Text>
                      <Text style={[s.qtyVal, { color: colors.warning }]}>
                        {reserved.toLocaleString()}
                      </Text>
                      <Text style={[s.qtyVal, { color: available === 0 ? colors.error : colors.success }]}>
                        {available === 0 ? 'SOLD OUT' : available.toLocaleString()}
                      </Text>
                    </View>
                    <View style={s.barBg}>
                      <View
                        style={[
                          s.barFill,
                          {
                            width: `${Math.min(100, Math.round(soldPct * 100))}%`,
                            backgroundColor: soldPct > 0.9 ? colors.error : colors.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={s.qtyTotal}>
                      {sold.toLocaleString()} / {quantity.toLocaleString()} sold
                    </Text>
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
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.surface,
  },
  backBtn: { width: 60 },
  backText: { color: colors.primaryLight, fontSize: 14, fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.round,
    width: 60,
    alignItems: 'center',
  },
  addBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: { color: colors.textMuted, marginTop: spacing.sm, fontSize: 14 },
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
  retryBtnText: { color: colors.white, fontWeight: '600', fontSize: 14 },
  list: { padding: spacing.md, gap: spacing.md },
  empty: { alignItems: 'center', paddingTop: spacing.xxl },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.sm },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tierNameRow: { flex: 1, gap: spacing.xs },
  tierName: { fontSize: 16, fontWeight: '700', color: colors.text },
  hiddenBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  hiddenBadgeText: { fontSize: 11, color: colors.textMuted },
  price: { fontSize: 18, fontWeight: '800', color: colors.accent },
  priceFree: { color: colors.success },
  description: { fontSize: 13, color: colors.textSub, lineHeight: 18 },
  saleWindow: { fontSize: 12, color: colors.textMuted },
  qtySection: { gap: 4 },
  qtyRow: { flexDirection: 'row', justifyContent: 'space-between' },
  qtyLabel: { fontSize: 11, color: colors.textMuted, flex: 1, textAlign: 'center' },
  qtyVal: { fontSize: 13, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center' },
  barBg: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.round,
    overflow: 'hidden',
    marginVertical: 4,
  },
  barFill: { height: 6, borderRadius: radius.round },
  qtyTotal: { fontSize: 11, color: colors.textMuted },
  cardFooter: { alignItems: 'flex-end' },
  editHint: { fontSize: 12, color: colors.primaryLight },
});
