import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, TextInput, ScrollView } from 'react-native';
import { useStore, EVENTS } from '../store/ticketStore';

export default function CheckoutScreen() {
  const { state, dispatch } = useStore();
  const event = EVENTS.find(e => e.id === state.selectedEvent);
  const ticket = event?.tickets.find(t => t.type === state.selectedTicket);
  const total = (ticket?.price || 0) * state.qty;
  const [name, setName] = useState('Dan Smith');
  const [email, setEmail] = useState('dan@example.com');
  const [card, setCard] = useState('•••• •••• •••• 4242');
  const [processing, setProcessing] = useState(false);

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
        {/* Order summary */}
        <View style={[s.summaryCard, { borderColor: event?.accent + '40' }]}>
          <Text style={s.summaryTitle}>Order Summary</Text>
          <View style={s.summaryRow}>
            <Text style={s.summaryEmoji}>{event?.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.summaryEvent}>{event?.name}</Text>
              <Text style={s.summaryMeta}>{state.qty}× {ticket?.label}</Text>
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
  summaryDate: { fontSize: 12, color: '#6B7280', marginTop: 2 },
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
