/**
 * CheckoutScreen
 * Full Stripe payment checkout for ticket purchases.
 *
 * Payment methods:
 *   Card        — manual card entry (delegates to CheckoutService)
 *   Apple Pay   — simulated Apple Pay sheet (real integration requires
 *                 @stripe/stripe-react-native native module)
 *   Google Pay  — simulated Google Pay sheet (same requirement)
 *
 * Flow:
 *   1. Screen displays order summary with fee breakdown (pass-through or absorbed).
 *   2. Buyer fills contact details and selects a payment method.
 *   3. Tapping "Pay" calls CheckoutService.createPaymentIntent().
 *   4. On success the clientSecret is used to confirm the payment.
 *   5. CheckoutService.confirmBooking() is called server-side.
 *   6. CONFIRM_PURCHASE action is dispatched → wallet entry created → TicketScreen.
 *   7. On any failure SeatMapService.releaseReservation() is called and the
 *      buyer is shown an error with a retry option.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useStore, EVENTS } from '../store/ticketStore';
import { SeatMapService } from '../services/SeatMapService';
import { CheckoutService, calcOrderAmounts } from '../services/CheckoutService';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAYMENT_METHODS = [
  { id: 'card',       label: 'Card',        emoji: '💳' },
  { id: 'apple_pay',  label: 'Apple Pay',   emoji: '🍎' },
  { id: 'google_pay', label: 'Google Pay',  emoji: '🔵' },
];

// Payment flow stages used to drive UI state
const STAGE = {
  IDLE:       'idle',
  CREATING:   'creating',    // calling createPaymentIntent
  CONFIRMING: 'confirming',  // calling confirmBooking
  FAILED:     'failed',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCountdown(msRemaining) {
  if (msRemaining <= 0) return '0:00';
  const totalSec = Math.ceil(msRemaining / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CheckoutScreen() {
  const { state, dispatch } = useStore();
  const event = EVENTS.find(e => e.id === state.selectedEvent);
  const ticket = event?.tickets.find(t => t.type === state.selectedTicket);

  const feeMode = event?.feeMode ?? 'absorb';
  const subtotal = (ticket?.price || 0) * state.qty;
  const { fee, total } = calcOrderAmounts(subtotal, feeMode);

  // Form state
  const [name, setName] = useState('Dan Smith');
  const [email, setEmail] = useState('dan@example.com');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('123');
  const [paymentMethod, setPaymentMethod] = useState('card');

  // Payment flow state
  const [stage, setStage] = useState(STAGE.IDLE);
  const [paymentError, setPaymentError] = useState(null);

  // Reservation hold countdown
  const [msRemaining, setMsRemaining] = useState(null);
  const timerRef = useRef(null);

  // -------------------------------------------------------------------------
  // Hold countdown
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Release reservation on unmount if payment was not completed
  // -------------------------------------------------------------------------
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    return () => {
      // Only release if we're navigating away without completing payment
      // (completed payment clears reservationId in the store reducer)
      if (stateRef.current.reservationId && stateRef.current.phase === 'checkout') {
        SeatMapService.releaseReservation(
          stateRef.current.selectedEvent,
          stateRef.current.reservationId,
        ).catch(() => {});
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Payment handler
  // -------------------------------------------------------------------------
  async function handlePay() {
    if (!name.trim() || !email.trim()) {
      setPaymentError('Please fill in your name and email.');
      return;
    }
    if (paymentMethod === 'card' && (!cardNumber.trim() || !expiry.trim() || !cvc.trim())) {
      setPaymentError('Please fill in your card details.');
      return;
    }

    setPaymentError(null);
    setStage(STAGE.CREATING);

    let intentId = null;

    try {
      // Step 1: Create PaymentIntent
      const cart = {
        eventId: state.selectedEvent,
        ticketType: state.selectedTicket,
        qty: state.qty,
        sectionId: state.selectedSection ?? null,
        reservationId: state.reservationId ?? null,
        subtotal,
        feeMode,
        totalCents: Math.round(total * 100),
        buyerName: name.trim(),
        buyerEmail: email.trim(),
        paymentMethod,
      };

      const intent = await CheckoutService.createPaymentIntent(cart);
      intentId = intent.id;
      dispatch({ type: 'SET_PAYMENT_INTENT', paymentIntentId: intentId });

      // Step 2: Confirm payment (in production this is done via Stripe.js
      // presentPaymentSheet / confirmPayment using intent.clientSecret)
      setStage(STAGE.CONFIRMING);
      const booking = await CheckoutService.confirmBooking(intentId);

      // Step 3: Dispatch purchase confirmed — wallet entry created, navigate to TicketScreen
      const confirmedTicket = booking.tickets?.[0] ?? {};
      dispatch({
        type: 'CONFIRM_PURCHASE',
        totalPaid: total,
        qrCode: confirmedTicket.qrCode,
        bookingId: booking.bookingId,
      });

    } catch (err) {
      setStage(STAGE.FAILED);
      setPaymentError(err.message || 'Payment failed. Please try again.');

      // Release seat reservation so it becomes available again
      if (state.reservationId) {
        SeatMapService.releaseReservation(state.selectedEvent, state.reservationId)
          .then(() => dispatch({ type: 'CLEAR_RESERVATION' }))
          .catch(() => dispatch({ type: 'CLEAR_RESERVATION' }));
      }

      // Release the intent if we managed to create one
      if (intentId) {
        CheckoutService.releaseIntent(intentId).catch(() => {});
      }
    }
  }

  // -------------------------------------------------------------------------
  // Simulated Apple Pay / Google Pay handlers
  // -------------------------------------------------------------------------
  function handleWalletPay(method) {
    setPaymentMethod(method);
    // In production: call Stripe.presentApplePay() or Stripe.presentGooglePay()
    // with the PaymentIntent clientSecret. Here we show a simulation prompt.
    Alert.alert(
      method === 'apple_pay' ? '🍎 Apple Pay' : '🔵 Google Pay',
      `${method === 'apple_pay' ? 'Apple Pay' : 'Google Pay'} will charge $${total.toFixed(2)} for ${state.qty}× ${state.selectedTicket}.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setPaymentMethod('card') },
        { text: 'Confirm', onPress: handlePay },
      ],
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  const isBusy = stage === STAGE.CREATING || stage === STAGE.CONFIRMING;
  const accent = event?.accent ?? '#818CF8';

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => dispatch({ type: 'BACK' })} disabled={isBusy}>
          <Text style={[s.back, isBusy && s.disabledText]}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Checkout</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }}>

        {/* Reservation hold banner */}
        {msRemaining != null && (
          <View style={[s.holdBanner, msRemaining < 60000 && s.holdBannerUrgent]}>
            <Text style={[s.holdBannerText, msRemaining < 60000 && { color: '#EF4444' }]}>
              ⏱ Seat held for {formatCountdown(msRemaining)} — complete purchase before it expires
            </Text>
          </View>
        )}

        {/* Error banner */}
        {paymentError && (
          <View style={s.errorBanner}>
            <Text style={s.errorBannerText}>⚠️ {paymentError}</Text>
          </View>
        )}

        {/* Order summary */}
        <View style={[s.summaryCard, { borderColor: accent + '40' }]}>
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
          </View>

          <View style={s.divider} />

          {/* Line items */}
          <View style={s.lineItemRow}>
            <Text style={s.lineItemLabel}>Subtotal</Text>
            <Text style={s.lineItemValue}>${subtotal.toFixed(2)}</Text>
          </View>
          {feeMode === 'pass' && (
            <View style={s.lineItemRow}>
              <Text style={s.lineItemLabel}>Service fee (2.9% + $0.30)</Text>
              <Text style={[s.lineItemValue, { color: '#9CA3AF' }]}>${fee.toFixed(2)}</Text>
            </View>
          )}
          {feeMode === 'absorb' && (
            <View style={s.lineItemRow}>
              <Text style={[s.lineItemLabel, { color: '#10B981' }]}>Service fee</Text>
              <Text style={[s.lineItemValue, { color: '#10B981' }]}>Included ✓</Text>
            </View>
          )}
          <View style={[s.divider, { marginTop: 8 }]} />
          <View style={s.summaryFooter}>
            <Text style={s.summaryLabel}>Total</Text>
            <Text style={[s.summaryFinalPrice, { color: accent }]}>${total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Contact details */}
        <Text style={s.sectionLabel}>Contact Details</Text>
        <View style={s.inputGroup}>
          <Text style={s.inputLabel}>Full Name</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholderTextColor="#6B7280"
            editable={!isBusy}
          />
          <Text style={s.inputLabel}>Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#6B7280"
            editable={!isBusy}
          />
        </View>

        {/* Payment method selector */}
        <Text style={s.sectionLabel}>Payment Method</Text>
        <View style={s.methodRow}>
          {PAYMENT_METHODS.map(m => (
            <TouchableOpacity
              key={m.id}
              style={[
                s.methodBtn,
                paymentMethod === m.id && { borderColor: accent, backgroundColor: accent + '18' },
              ]}
              onPress={() => setPaymentMethod(m.id)}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              <Text style={s.methodEmoji}>{m.emoji}</Text>
              <Text style={[s.methodLabel, paymentMethod === m.id && { color: accent }]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Card fields — shown only when 'card' is selected */}
        {paymentMethod === 'card' && (
          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>Card Number</Text>
            <TextInput
              style={s.input}
              value={cardNumber}
              onChangeText={setCardNumber}
              keyboardType="number-pad"
              maxLength={19}
              placeholderTextColor="#6B7280"
              editable={!isBusy}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.inputLabel}>Expiry (MM/YY)</Text>
                <TextInput
                  style={s.input}
                  value={expiry}
                  onChangeText={setExpiry}
                  keyboardType="number-pad"
                  maxLength={5}
                  placeholderTextColor="#6B7280"
                  editable={!isBusy}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.inputLabel}>CVC</Text>
                <TextInput
                  style={s.input}
                  value={cvc}
                  onChangeText={setCvc}
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                  placeholderTextColor="#6B7280"
                  editable={!isBusy}
                />
              </View>
            </View>
          </View>
        )}

        {/* Apple Pay / Google Pay info strip */}
        {paymentMethod !== 'card' && (
          <View style={s.walletInfo}>
            <Text style={s.walletInfoText}>
              {paymentMethod === 'apple_pay'
                ? '🍎 Tap Pay to complete with Apple Pay'
                : '🔵 Tap Pay to complete with Google Pay'}
            </Text>
            <Text style={s.walletInfoSub}>
              Your device will prompt for biometric or passcode confirmation.
            </Text>
          </View>
        )}

        {/* Trust row */}
        <View style={s.trustRow}>
          {['🔒 Secure', '⚡ Instant tickets', '↩️ Refund policy'].map(t => (
            <Text key={t} style={s.trustText}>{t}</Text>
          ))}
        </View>

        {/* Stage indicator */}
        {isBusy && (
          <View style={s.stageRow}>
            <ActivityIndicator size="small" color={accent} />
            <Text style={s.stageText}>
              {stage === STAGE.CREATING
                ? 'Creating secure payment…'
                : 'Confirming your booking…'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky pay bar */}
      <View style={s.payBar}>
        <TouchableOpacity
          style={[
            s.payBtn,
            { backgroundColor: accent },
            isBusy && s.payBtnDisabled,
          ]}
          onPress={
            paymentMethod === 'card'
              ? handlePay
              : () => handleWalletPay(paymentMethod)
          }
          disabled={isBusy}
          activeOpacity={0.88}
        >
          {isBusy ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={s.payBtnText}>
              {paymentMethod === 'apple_pay'
                ? `🍎 Pay $${total.toFixed(2)}`
                : paymentMethod === 'google_pay'
                ? `🔵 Pay $${total.toFixed(2)}`
                : `Pay $${total.toFixed(2)}`}
            </Text>
          )}
        </TouchableOpacity>
        <Text style={s.poweredBy}>Powered by Stripe · alphinium-payments</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0F1A' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E2E',
  },
  back: { color: '#818CF8', fontSize: 15, fontWeight: '600' },
  disabledText: { opacity: 0.4 },
  title: { fontSize: 18, fontWeight: '800', color: '#fff' },
  holdBanner: {
    backgroundColor: '#1E1E2E',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#374151',
  },
  holdBannerUrgent: { borderColor: '#EF4444', backgroundColor: '#EF444418' },
  holdBannerText: { color: '#9CA3AF', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  errorBanner: {
    backgroundColor: '#EF444418',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorBannerText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  summaryCard: {
    backgroundColor: '#1E1E2E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  summaryTitle: { fontSize: 14, fontWeight: '800', color: '#9CA3AF', marginBottom: 14 },
  summaryRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  summaryEmoji: { fontSize: 28 },
  summaryEvent: { fontSize: 15, fontWeight: '700', color: '#fff' },
  summaryMeta: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  summarySection: { fontSize: 12, color: '#818CF8', marginTop: 2, fontWeight: '600' },
  summaryDate: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#374151', marginVertical: 12 },
  lineItemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  lineItemLabel: { fontSize: 13, color: '#9CA3AF' },
  lineItemValue: { fontSize: 13, color: '#E5E7EB', fontWeight: '600' },
  summaryFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 15, fontWeight: '700', color: '#fff' },
  summaryFinalPrice: { fontSize: 20, fontWeight: '900' },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#9CA3AF', marginBottom: 10 },
  inputGroup: {
    backgroundColor: '#1E1E2E',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    gap: 8,
  },
  inputLabel: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  input: { backgroundColor: '#374151', borderRadius: 8, padding: 12, color: '#fff', fontSize: 15 },
  methodRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  methodBtn: {
    flex: 1,
    backgroundColor: '#1E1E2E',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#374151',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  methodEmoji: { fontSize: 22 },
  methodLabel: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  walletInfo: {
    backgroundColor: '#1E1E2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 4,
  },
  walletInfoText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  walletInfoSub: { fontSize: 12, color: '#6B7280' },
  trustRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  trustText: { fontSize: 12, color: '#6B7280' },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  stageText: { fontSize: 13, color: '#9CA3AF' },
  payBar: {
    padding: 16,
    backgroundColor: '#0F0F1A',
    borderTopWidth: 1,
    borderTopColor: '#1E1E2E',
  },
  payBtn: { borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 8 },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  poweredBy: { fontSize: 11, color: '#374151', textAlign: 'center' },
});
