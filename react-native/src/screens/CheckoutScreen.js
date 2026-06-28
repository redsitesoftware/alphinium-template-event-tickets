import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, TextInput, ScrollView, Alert } from 'react-native';
import { useStore, EVENTS } from '../store/ticketStore';
import { SeatMapService } from '../services/SeatMapService';

function formatCountdown(msRemaining) {
  if (msRemaining <= 0) return '0:00';
  const totalSec = Math.ceil(msRemaining / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function CheckoutScreen() {
  const { state, dispatch } = useStore();
  const event = EVENTS.find(e => e.id === state.selectedEvent);
  const ticket = event?.tickets.find(t => t.type === state.selectedTicket);
  const total = (ticket?.price || 0) * state.qty;
  const [name, setName] = useState('Dan Smith');
  const [email, setEmail] = useState('dan@example.com');
  const [card, setCard] = useState('•••• •••• •••• 4242');
  const [processing, setProcessing] = useState(false);

  // Countdown for active seat reservation hold
  const [msRemaining, setMsRemaining] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (state.reservationExpiry) {
      const tick = () => {
        const remaining = state.reservationExpiry - Date.now();
        if (remaining <= 0) {
          setMsRemaining(0);
          clearInterval(timerRef.current);
          Alert.alert(
            'Hold Expired',
            'Your seat reservation has expired. Please choose a section again.',
            [{ text: 'OK', onPress: () => dispatch({ type: 'CLEAR_RESERVATION' }) }],
          );
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

  const pay = () => {
    setProcessing(true);
    setTimeout(() => dispatch({ type: 'CONFIRM_PURCHASE' }), 2000);
  };

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => dispatch({ type: 'BACK' })}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <Text style={s.title}>Checkout</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        {/* Reservation hold banner */}
        {msRemaining != null && (
          <View style={[s.holdBanner, msRemaining < 60000 && s.holdBannerUrgent]}>
            <Text style={[s.holdBannerText, msRemaining < 60000 && { color: '#EF4444' }]}>
              ⏱ Seat held for {formatCountdown(msRemaining)} — complete purchase before it expires
            </Text>
          </View>
        )}

        {/* Order summary */}
        <View style={[s.summaryCard, { borderColor: event?.accent + '40' }]}>
          <Text style={s.summaryTitle}>Order Summary</Text>
          <View style={s.summaryRow}>
            <Text style={s.summaryEmoji}>{event?.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.summaryEvent}>{event?.name}</Text>
              <Text style={s.summaryMeta}>{state.qty}× {ticket?.label}</Text>
              {state.selectedSection && (
                <Text style={s.summarySection}>📍 Section: {state.selectedSection}</Text>
              )}
              <Text style={s.summaryDate}>{event?.date} · {event?.time}</Text>
            </View>
            <Text style={[s.summaryTotal, { color: event?.accent }]}>${total.toFixed(2)}</Text>
          </View>
          <View style={s.divider} />
          <View style={s.summaryFooter}>
            <Text style={s.summaryLabel}>Total</Text>
            <Text style={[s.summaryFinalPrice, { color: event?.accent }]}>${total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Contact */}
        <Text style={s.sectionLabel}>Contact Details</Text>
        <View style={s.inputGroup}>
          <Text style={s.inputLabel}>Full Name</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholderTextColor="#6B7280" />
          <Text style={s.inputLabel}>Email</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail} keyboardType="email-address" placeholderTextColor="#6B7280" />
        </View>

        {/* Payment */}
        <Text style={s.sectionLabel}>Payment · alphinium-payments</Text>
        <View style={s.inputGroup}>
          <Text style={s.inputLabel}>Card Number</Text>
          <TextInput style={s.input} value={card} onChangeText={setCard} placeholderTextColor="#6B7280" />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.inputLabel}>Expiry</Text>
              <TextInput style={s.input} value="12/28" placeholderTextColor="#6B7280" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.inputLabel}>CVC</Text>
              <TextInput style={s.input} value="•••" placeholderTextColor="#6B7280" />
            </View>
          </View>
        </View>

        {/* Trust */}
        <View style={s.trustRow}>
          {['🔒 Secure', '⚡ Instant tickets', '↩️ Refund policy'].map(t => (
            <Text key={t} style={s.trustText}>{t}</Text>
          ))}
        </View>
      </ScrollView>

      <View style={s.payBar}>
        <TouchableOpacity style={[s.payBtn, { backgroundColor: event?.accent }, processing && { opacity: 0.7 }]}
          onPress={pay} disabled={processing} activeOpacity={0.88}>
          <Text style={s.payBtnText}>{processing ? '⏳ Processing...' : `Pay $${total.toFixed(2)}`}</Text>
        </TouchableOpacity>
        <Text style={s.poweredBy}>Powered by Stripe via alphinium-payments</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0F1A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1E1E2E' },
  back: { color: '#818CF8', fontSize: 15, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff' },
  summaryCard: { backgroundColor: '#1E1E2E', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1 },
  summaryTitle: { fontSize: 14, fontWeight: '800', color: '#9CA3AF', marginBottom: 14 },
  summaryRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  summaryEmoji: { fontSize: 28 },
  summaryEvent: { fontSize: 15, fontWeight: '700', color: '#fff' },
  summaryMeta: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  summarySection: { fontSize: 12, color: '#818CF8', marginTop: 2, fontWeight: '600' },
  summaryDate: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  holdBanner: {
    backgroundColor: '#1E1E2E',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  holdBannerUrgent: { borderColor: '#EF4444', backgroundColor: '#EF444418' },
  holdBannerText: { color: '#9CA3AF', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  summaryTotal: { fontSize: 18, fontWeight: '900' },
  divider: { height: 1, backgroundColor: '#374151', marginVertical: 12 },
  summaryFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 15, fontWeight: '700', color: '#fff' },
  summaryFinalPrice: { fontSize: 20, fontWeight: '900' },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#9CA3AF', marginBottom: 10 },
  inputGroup: { backgroundColor: '#1E1E2E', borderRadius: 14, padding: 16, marginBottom: 20, gap: 8 },
  inputLabel: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  input: { backgroundColor: '#374151', borderRadius: 8, padding: 12, color: '#fff', fontSize: 15 },
  trustRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  trustText: { fontSize: 12, color: '#6B7280' },
  payBar: { padding: 16, backgroundColor: '#0F0F1A', borderTopWidth: 1, borderTopColor: '#1E1E2E' },
  payBtn: { borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 8 },
  payBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  poweredBy: { fontSize: 11, color: '#374151', textAlign: 'center' },
});
