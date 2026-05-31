import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useStore, EVENTS } from '../store/ticketStore';

const CATS = ['All', 'Festival', 'Conference', 'Music', 'Comedy', 'Keynote'];

export default function HomeScreen() {
  const { state, dispatch } = useStore();
  const [cat, setCat] = useState('All');
  const filtered = cat === 'All' ? EVENTS : EVENTS.filter(e => e.category === cat);

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <View>
          <Text style={s.logo}>🎟️ Tickets</Text>
          <Text style={s.sub}>Powered by alphinium-payments</Text>
        </View>
        <TouchableOpacity style={s.walletBtn} onPress={() => dispatch({ type: 'VIEW_TICKET', ticketId: state.wallet[0]?.id })}>
          <Text style={s.walletText}>🎫 Wallet ({state.wallet.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView stickyHeaderIndices={[0]}>
        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}>
          {CATS.map(c => (
            <TouchableOpacity key={c} style={[s.catPill, cat === c && s.catActive]} onPress={() => setCat(c)}>
              <Text style={[s.catText, cat === c && s.catTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ padding: 16, gap: 14 }}>
          {filtered.map(event => {
            const soldPct = event.sold / event.capacity;
            const almostSoldOut = soldPct > 0.9;
            const lowestPrice = Math.min(...event.tickets.map(t => t.price));
            return (
              <TouchableOpacity key={event.id} style={s.eventCard} onPress={() => dispatch({ type: 'VIEW_EVENT', eventId: event.id })} activeOpacity={0.88}>
                <View style={[s.eventBanner, { backgroundColor: event.color }]}>
                  <Text style={s.eventEmoji}>{event.emoji}</Text>
                  <View style={s.eventCatBadge}><Text style={s.eventCatText}>{event.category}</Text></View>
                  {almostSoldOut && <View style={s.soldOutBadge}><Text style={s.soldOutText}>🔥 Almost Full</Text></View>}
                </View>
                <View style={s.eventInfo}>
                  <Text style={s.eventName}>{event.name}</Text>
                  <View style={s.eventMeta}>
                    <Text style={s.metaText}>📅 {event.date}</Text>
                    <Text style={s.metaText}>🕐 {event.time}</Text>
                  </View>
                  <Text style={s.metaText}>📍 {event.venue}</Text>
                  <View style={s.capacityBar}>
                    <View style={[s.capacityFill, { width: `${soldPct * 100}%`, backgroundColor: almostSoldOut ? '#EF4444' : event.accent }]} />
                  </View>
                  <View style={s.eventFooter}>
                    <Text style={s.eventSold}>{(event.capacity - event.sold).toLocaleString()} tickets left</Text>
                    <Text style={[s.eventPrice, { color: event.accent }]}>From ${lowestPrice}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={s.addonCallout}>
          <Text style={s.addonTitle}>🎟️ alphinium-payments + alphinium-auth</Text>
          <Text style={s.addonText}>Sell tickets for any event. QR scan at door. Instant payout via Stripe. Add to any alphinium app as an addon.</Text>
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
  catScroll: { backgroundColor: '#0F0F1A', borderBottomWidth: 1, borderBottomColor: '#1E1E2E' },
  catPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: '#1E1E2E' },
  catActive: { backgroundColor: '#6366F1' },
  catText: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  catTextActive: { color: '#fff' },
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
