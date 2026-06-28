import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Linking, ActivityIndicator, Alert } from 'react-native';
import { useStore, EVENTS } from '../store/ticketStore';
import { generateQRMatrix } from '../utils/qrGenerator';
import { TicketService } from '../services/TicketService';

// Module size in pixels — 29 modules × 8px = 232px total
const QR_MODULE_SIZE = 8;

/**
 * Renders a spec-compliant, scannable QR code for `code`.
 * Uses generateQRMatrix() from qrGenerator — deterministic per-ticket.
 */
function QRCode({ code }) {
  const matrix = useMemo(() => generateQRMatrix(code), [code]);
  return (
    <View style={{ backgroundColor: '#fff', padding: 10, borderRadius: 12, alignItems: 'center' }}>
      {matrix.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {row.map((dark, c) => (
            <View
              key={c}
              style={{
                width: QR_MODULE_SIZE,
                height: QR_MODULE_SIZE,
                backgroundColor: dark ? '#000' : '#fff',
              }}
            />
          ))}
        </View>
      ))}
      <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 6, letterSpacing: 2 }}>{code}</Text>
    </View>
  );
}

/**
 * Per-ticket action state: null | 'loading' | 'done' | 'error'
 * Keyed by ticket.id.
 */
function useTicketActions() {
  const [emailState, setEmailState]       = useState({});
  const [pdfState, setPdfState]           = useState({});
  const [refundState, setRefundState]     = useState({}); // { [id]: { status, loading, result } }
  const [transferState, setTransferState] = useState({}); // { [id]: 'loading' | 'done' | 'error' }
  const [transferredQr, setTransferredQr] = useState({}); // { [id]: newUuid }

  async function handleResendEmail(ticket) {
    setEmailState(prev => ({ ...prev, [ticket.id]: 'loading' }));
    try {
      await TicketService.resendEmail(ticket.qrCode);
      setEmailState(prev => ({ ...prev, [ticket.id]: 'done' }));
    } catch {
      setEmailState(prev => ({ ...prev, [ticket.id]: 'error' }));
    }
  }

  async function handleDownloadPdf(ticket) {
    setPdfState(prev => ({ ...prev, [ticket.id]: 'loading' }));
    try {
      const { url } = await TicketService.getPdf(ticket.qrCode);
      await Linking.openURL(url);
      setPdfState(prev => ({ ...prev, [ticket.id]: 'done' }));
    } catch {
      setPdfState(prev => ({ ...prev, [ticket.id]: 'error' }));
    }
  }

  function handleRequestRefund(ticket) {
    Alert.alert(
      'Request Refund',
      'Are you sure you want to request a refund for this ticket? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Refund',
          style: 'destructive',
          onPress: async () => {
            setRefundState(prev => ({ ...prev, [ticket.id]: { loading: true } }));
            try {
              const result = await TicketService.requestRefund(ticket.qrCode);
              setRefundState(prev => ({ ...prev, [ticket.id]: { loading: false, result } }));
              const statusMsg =
                result.status === 'approved' ? 'Your refund has been approved.' :
                result.status === 'rejected' ? `Refund rejected${result.reason ? `: ${result.reason}` : '.'}` :
                'Your refund request is pending review.';
              Alert.alert('Refund Request', statusMsg);
            } catch (err) {
              setRefundState(prev => ({ ...prev, [ticket.id]: { loading: false, error: true } }));
              Alert.alert('Error', err.message || 'Could not submit refund request. Please try again.');
            }
          },
        },
      ],
    );
  }

  function handleTransferTicket(ticket) {
    Alert.prompt(
      'Transfer Ticket',
      'Enter the email address of the new ticket holder.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          onPress: async (email) => {
            const trimmed = (email ?? '').trim();
            if (!trimmed) {
              Alert.alert('Email required', 'Please enter a valid email address.');
              return;
            }
            setTransferState(prev => ({ ...prev, [ticket.id]: 'loading' }));
            try {
              const result = await TicketService.transferTicket(ticket.qrCode, trimmed);
              setTransferState(prev => ({ ...prev, [ticket.id]: 'done' }));
              setTransferredQr(prev => ({ ...prev, [ticket.id]: result.newUuid }));
              Alert.alert(
                'Ticket Transferred',
                result.message || `Ticket transferred to ${trimmed}. A new QR code has been issued.`,
              );
            } catch (err) {
              setTransferState(prev => ({ ...prev, [ticket.id]: 'error' }));
              Alert.alert('Error', err.message || 'Could not transfer ticket. Please try again.');
            }
          },
        },
      ],
      'plain-text',
      '',
      'email-address',
    );
  }

  return {
    emailState, pdfState,
    refundState, transferState, transferredQr,
    handleResendEmail, handleDownloadPdf,
    handleRequestRefund, handleTransferTicket,
  };
}

export default function TicketScreen() {
  const { state, dispatch } = useStore();
  const wallet = state.wallet;
  const viewingId = state.selectedTicket;
  const viewing = wallet.find(t => t.id === viewingId) || wallet[0];
  const event = viewing ? EVENTS.find(e => e.id === viewing.eventId) : null;
  const { emailState, pdfState, refundState, transferState, transferredQr,
          handleResendEmail, handleDownloadPdf, handleRequestRefund, handleTransferTicket } = useTicketActions();

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
                  <QRCode code={transferredQr[ticket.id] ?? ticket.qrCode} />
                  {transferredQr[ticket.id] ? (
                    <Text style={[s.scanHint, { color: '#7C3AED' }]}>🔄 New QR — ticket transferred</Text>
                  ) : (
                    <Text style={s.scanHint}>Show this QR at the door</Text>
                  )}
                </View>

                {/* Ticket actions — email & PDF */}
                <View style={s.actionsRow}>
                  <TouchableOpacity
                    style={[s.actionBtn, emailState[ticket.id] === 'error' && s.actionBtnError]}
                    onPress={() => handleResendEmail(ticket)}
                    disabled={emailState[ticket.id] === 'loading'}
                  >
                    {emailState[ticket.id] === 'loading' ? (
                      <ActivityIndicator size="small" color="#818CF8" />
                    ) : (
                      <Text style={s.actionBtnText}>
                        {emailState[ticket.id] === 'done'  ? '✅ Email Sent'  :
                         emailState[ticket.id] === 'error' ? '⚠️ Retry Email' :
                         '✉️ Resend Email'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.actionBtn, pdfState[ticket.id] === 'error' && s.actionBtnError]}
                    onPress={() => handleDownloadPdf(ticket)}
                    disabled={pdfState[ticket.id] === 'loading'}
                  >
                    {pdfState[ticket.id] === 'loading' ? (
                      <ActivityIndicator size="small" color="#818CF8" />
                    ) : (
                      <Text style={s.actionBtnText}>
                        {pdfState[ticket.id] === 'done'  ? '✅ PDF Opened'   :
                         pdfState[ticket.id] === 'error' ? '⚠️ Retry PDF'    :
                         '📄 Download PDF'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Refund & Transfer — hidden for scanned/used tickets */}
                {ticket.status !== 'scanned' && (
                  <View style={s.actionsRow}>
                    {/* Refund button */}
                    {refundState[ticket.id]?.result ? (
                      <View style={[s.actionBtn, s.actionBtnInfo]}>
                        <Text style={[s.actionBtnText, { color: '#6B7280' }]}>
                          {refundState[ticket.id].result.status === 'approved' ? '✅ Refund Approved' :
                           refundState[ticket.id].result.status === 'rejected' ? '❌ Refund Rejected' :
                           '⏳ Refund Pending'}
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[s.actionBtn, s.actionBtnRefund,
                          refundState[ticket.id]?.loading && { opacity: 0.6 }]}
                        onPress={() => handleRequestRefund(ticket)}
                        disabled={!!refundState[ticket.id]?.loading}
                      >
                        {refundState[ticket.id]?.loading ? (
                          <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                          <Text style={[s.actionBtnText, { color: '#EF4444' }]}>💸 Request Refund</Text>
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Transfer button */}
                    {transferState[ticket.id] === 'done' ? (
                      <View style={[s.actionBtn, s.actionBtnInfo]}>
                        <Text style={[s.actionBtnText, { color: '#6B7280' }]}>✅ Transferred</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[s.actionBtn, s.actionBtnTransfer,
                          transferState[ticket.id] === 'loading' && { opacity: 0.6 }]}
                        onPress={() => handleTransferTicket(ticket)}
                        disabled={transferState[ticket.id] === 'loading'}
                      >
                        {transferState[ticket.id] === 'loading' ? (
                          <ActivityIndicator size="small" color="#7C3AED" />
                        ) : (
                          <Text style={[s.actionBtnText, { color: '#7C3AED' }]}>
                            {transferState[ticket.id] === 'error' ? '⚠️ Retry Transfer' : '🔄 Transfer Ticket'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                )}

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
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 8 },
  actionBtn: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', paddingVertical: 10, alignItems: 'center', justifyContent: 'center', minHeight: 40 },
  actionBtnError: { borderColor: '#F59E0B' },
  actionBtnRefund: { borderColor: '#FCA5A5' },
  actionBtnTransfer: { borderColor: '#C4B5FD' },
  actionBtnInfo: { borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },
});
