import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useStore, EVENTS } from '../store/ticketStore';

function QRCode({ code, color }) {
  // Fake QR grid using unicode blocks
  const grid = Array.from({ length: 7 }, (_, r) =>
    Array.from({ length: 7 }, (_, c) => Math.random() > 0.5 ? 1 : 0)
  );
  // Override corners (mandatory QR pattern)
  [[0,0],[0,1],[1,0],[0,5],[0,6],[1,6],[5,0],[6,0],[6,1],[5,6],[6,6],[6,5]].forEach(([r,c]) => { if(grid[r]) grid[r][c] = 1; });
  return (
    <View style={{ gap: 3, backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'center' }}>
      {grid.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 3 }}>
          {row.map((cell, c) => (
            <View key={c} style={{ width: 18, height: 18, backgroundColor: cell ? color : '#fff', borderRadius: 2 }} />
          ))}
        </View>
      ))}
      <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 8, letterSpacing: 2 }}>{code}</Text>
    </View>
  );
}

export default function TicketScreen() {
  const { state, dispatch } = useStore();
  const wallet = state.wallet;
  const viewingId = state.selectedTicket;
  const viewing = wallet.find(t => t.id === viewingId) || wallet[0];
  const event = viewing ? EVENTS.find(e => e.id === viewing.eventId) : null;

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => dispatch({ type: 'GO_HOME' })}><Text style={s.back}>← Events</Text></TouchableOpacity>
        <Text style={s.title}>My Tickets</Text>
        <TouchableOpacity onPress={() => dispatch({ type: 'GO_SCANNER' })}><Text style={s.scannerLink}>🔍 Scan</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {wallet.map(ticket => {
          const ev = EVENTS.find(e => e.id === ticket.eventId);
          const isViewing = ticket.id === viewingId;
          return (
            <TouchableOpacity key={ticket.id} style={[s.ticketCard, { borderColor: ev?.accent + '60' }]}
              onPress={() => dispatch({ type: 'VIEW_TICKET', ticketId: ticket.id })}>
              {/* Ticket header */}
              <View style={[s.ticketHeader, { backgroundColor: ev?.color }]}>
                <Text style={s.ticketEmoji}>{ev?.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.ticketEvent}>{ev?.name}</Text>
                  <Text style={s.ticketType}>{ticket.qty}× {ticket.type}</Text>
                </View>
                <View style={s.validBadge}><Text style={s.validText}>VALID</Text></View>
              </View>

              {/* Ticket details */}
              <View style={s.ticketBody}>
                <View style={s.detailsRow}>
                  <View style={s.detail}><Text style={s.detailLabel}>Date</Text><Text style={s.detailValue}>{ev?.date}</Text></View>
                  <View style={s.detail}><Text style={s.detailLabel}>Time</Text><Text style={s.detailValue}>{ev?.time}</Text></View>
                  <View style={s.detail}><Text style={s.detailLabel}>Qty</Text><Text style={s.detailValue}>{ticket.qty}</Text></View>
                  <View style={s.detail}><Text style={s.detailLabel}>Paid</Text><Text style={s.detailValue}>${ticket.totalPaid}</Text></View>
                </View>

                {/* Perforation */}
                <View style={s.perforation}>
                  {Array.from({length: 18}).map((_, i) => <View key={i} style={s.perf} />)}
                </View>

                {/* QR Code */}
                <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                  <QRCode code={ticket.qrCode} color={ev?.color || '#000'} />
                  <Text style={s.scanHint}>Show this QR at the door</Text>
                </View>

                <Text style={s.venue}>📍 {ev?.venue}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0F1A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1E1E2E' },
  back: { color: '#818CF8', fontSize: 15, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff' },
  scannerLink: { color: '#818CF8', fontSize: 14, fontWeight: '600' },
  ticketCard: { backgroundColor: '#1E1E2E', borderRadius: 20, overflow: 'hidden', marginBottom: 20, borderWidth: 1 },
  ticketHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  ticketEmoji: { fontSize: 36 },
  ticketEvent: { fontSize: 16, fontWeight: '800', color: '#fff' },
  ticketType: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  validBadge: { backgroundColor: '#22C55E', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  validText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  ticketBody: { backgroundColor: '#fff', padding: 16 },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  detail: { alignItems: 'center' },
  detailLabel: { fontSize: 10, color: '#9CA3AF', marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  perforation: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, marginHorizontal: -16 },
  perf: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#0F0F1A' },
  scanHint: { fontSize: 12, color: '#9CA3AF', marginTop: 8 },
  venue: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 8 },
});
