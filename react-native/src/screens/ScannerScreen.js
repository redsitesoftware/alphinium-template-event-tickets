import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Animated } from 'react-native';
import { useStore, EVENTS } from '../store/ticketStore';

export default function ScannerScreen() {
  const { state, dispatch } = useStore();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const lineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(lineAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(lineAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
    ])).start();
  }, []);

  const scanned = state.scanned;
  const scannedEvent = scanned ? EVENTS.find(e => e.id === scanned.eventId) : null;

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => dispatch({ type: 'GO_HOME' })}><Text style={s.back}>← Close</Text></TouchableOpacity>
        <Text style={s.title}>Ticket Scanner</Text>
        <View style={{ width: 60 }} />
      </View>

      {!scanned ? (
        <View style={s.scanArea}>
          <View style={s.viewfinder}>
            <View style={[s.corner, s.tl]} /><View style={[s.corner, s.tr]} />
            <View style={[s.corner, s.bl]} /><View style={[s.corner, s.br]} />
            <Animated.View style={[s.scanLine, { transform: [{ translateY: lineAnim.interpolate({ inputRange: [0, 1], outputRange: [-100, 100] }) }] }]} />
            <Text style={{ fontSize: 48, opacity: 0.3 }}>📱</Text>
          </View>
          <Text style={s.scanLabel}>Scan attendee QR code at entry</Text>
          <TouchableOpacity style={s.simBtn} onPress={() => dispatch({ type: 'SIMULATE_SCAN' })}>
            <Text style={s.simBtnText}>✅ Simulate Valid Ticket Scan</Text>
          </TouchableOpacity>
          <Text style={s.demoNote}>Demo mode: tap above to simulate a scan</Text>
        </View>
      ) : (
        <View style={s.resultArea}>
          <View style={[s.resultCard, { borderColor: scannedEvent?.accent }]}>
            <View style={[s.resultHeader, { backgroundColor: '#22C55E' }]}>
              <Text style={s.checkmark}>✓</Text>
              <Text style={s.validTitle}>VALID TICKET</Text>
            </View>
            <View style={s.resultBody}>
              <Text style={s.resultEmoji}>{scannedEvent?.emoji}</Text>
              <Text style={s.resultEvent}>{scannedEvent?.name}</Text>
              <Text style={s.resultType}>{scanned.qty}× {scanned.type}</Text>
              <Text style={s.resultQR}>{scanned.qrCode}</Text>
              <View style={s.resultDetails}>
                <View style={s.resultDetail}><Text style={s.rdLabel}>Date</Text><Text style={s.rdValue}>{scannedEvent?.date}</Text></View>
                <View style={s.resultDetail}><Text style={s.rdLabel}>Qty</Text><Text style={s.rdValue}>{scanned.qty}</Text></View>
                <View style={s.resultDetail}><Text style={s.rdLabel}>Paid</Text><Text style={s.rdValue}>${scanned.totalPaid}</Text></View>
              </View>
            </View>
          </View>
          <TouchableOpacity style={s.nextBtn} onPress={() => dispatch({ type: 'GO_SCANNER' })}>
            <Text style={s.nextBtnText}>Scan Next Ticket →</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0F1A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  back: { color: '#818CF8', fontSize: 15, fontWeight: '600' },
  title: { color: '#fff', fontSize: 17, fontWeight: '700' },
  scanArea: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 },
  viewfinder: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: '#6366F1', borderWidth: 4 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanLine: { position: 'absolute', width: '100%', height: 2, backgroundColor: '#6366F1', opacity: 0.8 },
  scanLabel: { color: '#9CA3AF', fontSize: 14, textAlign: 'center' },
  simBtn: { backgroundColor: '#22C55E', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  simBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  demoNote: { color: '#374151', fontSize: 11, textAlign: 'center' },
  resultArea: { flex: 1, padding: 20, justifyContent: 'center', gap: 16 },
  resultCard: { backgroundColor: '#1E1E2E', borderRadius: 20, overflow: 'hidden', borderWidth: 2 },
  resultHeader: { padding: 20, alignItems: 'center', gap: 8 },
  checkmark: { fontSize: 40, color: '#fff' },
  validTitle: { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  resultBody: { padding: 20, alignItems: 'center', gap: 6 },
  resultEmoji: { fontSize: 48 },
  resultEvent: { fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center' },
  resultType: { fontSize: 14, color: '#9CA3AF' },
  resultQR: { fontSize: 11, color: '#374151', letterSpacing: 2, marginTop: 4 },
  resultDetails: { flexDirection: 'row', gap: 24, marginTop: 12 },
  resultDetail: { alignItems: 'center' },
  rdLabel: { fontSize: 10, color: '#6B7280' },
  rdValue: { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 2 },
  nextBtn: { backgroundColor: '#6366F1', borderRadius: 14, padding: 16, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
