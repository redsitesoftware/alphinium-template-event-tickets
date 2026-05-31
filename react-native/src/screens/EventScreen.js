import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useStore, EVENTS } from '../store/ticketStore';

export default function EventScreen() {
  const { state, dispatch } = useStore();
  const event = EVENTS.find(e => e.id === state.selectedEvent);
  if (!event) return null;
  const soldPct = event.sold / event.capacity;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: '#0F0F1A' }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => dispatch({ type: 'GO_HOME' })}><Text style={s.back}>← Events</Text></TouchableOpacity>
        <TouchableOpacity style={s.scannerBtn} onPress={() => dispatch({ type: 'GO_SCANNER' })}><Text style={s.scannerText}>🔍 Scanner</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <View style={[s.hero, { backgroundColor: event.color }]}>
          <Text style={s.heroEmoji}>{event.emoji}</Text>
          <View style={s.heroCat}><Text style={s.heroCatText}>{event.category}</Text></View>
        </View>

        <View style={{ padding: 20 }}>
          <Text style={s.eventName}>{event.name}</Text>
          <View style={s.infoGrid}>
            {[
              { icon: '📅', label: 'Date', value: event.date },
              { icon: '🕐', label: 'Time', value: event.time },
              { icon: '📍', label: 'Venue', value: event.venue },
              { icon: '👥', label: 'Capacity', value: `${event.sold.toLocaleString()} / ${event.capacity.toLocaleString()} sold` },
            ].map(row => (
              <View key={row.label} style={s.infoRow}>
                <Text style={s.infoIcon}>{row.icon}</Text>
                <View>
                  <Text style={s.infoLabel}>{row.label}</Text>
                  <Text style={s.infoValue}>{row.value}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Capacity bar */}
          <View style={s.capacitySection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={s.capacityLabel}>Tickets sold</Text>
              <Text style={[s.capacityPct, { color: soldPct > 0.9 ? '#EF4444' : event.accent }]}>{Math.round(soldPct * 100)}%</Text>
            </View>
            <View style={s.barBg}>
              <View style={[s.barFill, { width: `${soldPct * 100}%`, backgroundColor: soldPct > 0.9 ? '#EF4444' : event.accent }]} />
            </View>
          </View>

          {/* Ticket types */}
          <Text style={s.sectionTitle}>Select Tickets</Text>
          {event.tickets.map(ticket => {
            const selected = state.selectedTicket === ticket.type;
            return (
              <TouchableOpacity
                key={ticket.type}
                style={[s.ticketOption, selected && { borderColor: event.accent, backgroundColor: event.color + '20' }]}
                onPress={() => dispatch({ type: 'SELECT_TICKET', ticketType: ticket.type })}
              >
                <View style={s.ticketLeft}>
                  <Text style={s.ticketLabel}>{ticket.label}</Text>
                  <Text style={s.ticketAvail}>{ticket.available} available</Text>
                </View>
                <View style={s.ticketRight}>
                  <Text style={[s.ticketPrice, { color: event.accent }]}>${ticket.price}</Text>
                  <View style={[s.radioOuter, selected && { borderColor: event.accent }]}>
                    {selected && <View style={[s.radioInner, { backgroundColor: event.accent }]} />}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Qty selector */}
          {state.selectedTicket && (
            <View style={s.qtyRow}>
              <Text style={s.qtyLabel}>Quantity</Text>
              <View style={s.qtyControls}>
                {[1,2,3,4,5].map(q => (
                  <TouchableOpacity key={q} style={[s.qtyBtn, state.qty === q && { backgroundColor: event.accent }]}
                    onPress={() => dispatch({ type: 'SET_QTY', qty: q })}>
                    <Text style={[s.qtyBtnText, state.qty === q && { color: '#fff' }]}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      {state.selectedTicket && (() => {
        const ticket = event.tickets.find(t => t.type === state.selectedTicket);
        const total = (ticket?.price || 0) * state.qty;
        return (
          <View style={s.stickyBar}>
            <View>
              <Text style={s.totalLabel}>{state.qty}× {state.selectedTicket}</Text>
              <Text style={[s.totalPrice, { color: event.accent }]}>${total.toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={[s.buyBtn, { backgroundColor: event.accent }]} onPress={() => dispatch({ type: 'GO_CHECKOUT' })}>
              <Text style={s.buyBtnText}>Buy Now →</Text>
            </TouchableOpacity>
          </View>
        );
      })()}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  back: { color: '#818CF8', fontSize: 15, fontWeight: '600' },
  scannerBtn: { backgroundColor: '#1E1E2E', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  scannerText: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
  hero: { height: 160, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  heroEmoji: { fontSize: 80 },
  heroCat: { position: 'absolute', bottom: 12, left: 16, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  heroCatText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  eventName: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 16 },
  infoGrid: { backgroundColor: '#1E1E2E', borderRadius: 14, padding: 16, gap: 14, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoIcon: { fontSize: 18, width: 24 },
  infoLabel: { fontSize: 11, color: '#6B7280', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#E5E7EB', fontWeight: '600' },
  capacitySection: { marginBottom: 20 },
  capacityLabel: { fontSize: 13, color: '#9CA3AF' },
  capacityPct: { fontSize: 13, fontWeight: '700' },
  barBg: { height: 6, backgroundColor: '#374151', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#fff', marginBottom: 12 },
  ticketOption: { backgroundColor: '#1E1E2E', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 2, borderColor: '#374151', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ticketLeft: { flex: 1 },
  ticketLabel: { fontSize: 15, fontWeight: '700', color: '#fff' },
  ticketAvail: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  ticketRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ticketPrice: { fontSize: 18, fontWeight: '900' },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#374151', alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  qtyLabel: { fontSize: 15, fontWeight: '700', color: '#fff' },
  qtyControls: { flexDirection: 'row', gap: 8 },
  qtyBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E1E2E', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { color: '#9CA3AF', fontWeight: '700', fontSize: 16 },
  stickyBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#1E1E2E', flexDirection: 'row', padding: 16, alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#374151' },
  totalLabel: { fontSize: 12, color: '#9CA3AF' },
  totalPrice: { fontSize: 22, fontWeight: '900' },
  buyBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  buyBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
