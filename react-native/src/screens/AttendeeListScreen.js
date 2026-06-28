/**
 * AttendeeListScreen
 * View, filter, export, and message attendees for an organiser event.
 *
 * Navigation params:
 *   eventId   — the event ID to load attendees for
 *   eventName — display name of the event (shown in header)
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Modal,
  TextInput,
  Share,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '@alphinium/auth';
import { OrganiserService } from '../services/OrganiserService';
import { colors, spacing, radius } from '../theme';

// ---------------------------------------------------------------------------
// Ticket type options shown in the filter picker
// ---------------------------------------------------------------------------
const TICKET_TYPE_OPTIONS = ['All', 'General Admission', 'VIP'];

// Check-in filter options
const CHECKIN_OPTIONS = [
  { label: 'All',              value: null },
  { label: '✅ Checked In',   value: true },
  { label: '⬜ Not Checked In', value: false },
];

// ---------------------------------------------------------------------------
// Helper — build CSV string from attendee list
// ---------------------------------------------------------------------------
function buildCsv(attendees) {
  const header = 'Name,Email,Ticket Type,Checked In';
  const rows = attendees.map((a) => {
    const name       = `"${(a.name       || '').replace(/"/g, '""')}"`;
    const email      = `"${(a.email      || '').replace(/"/g, '""')}"`;
    const ticketType = `"${(a.ticketType || '').replace(/"/g, '""')}"`;
    const checkedIn  = a.checkedIn ? 'Yes' : 'No';
    return `${name},${email},${ticketType},${checkedIn}`;
  });
  return [header, ...rows].join('\n');
}

// ---------------------------------------------------------------------------
// AttendeeListScreen
// ---------------------------------------------------------------------------
export default function AttendeeListScreen({ route, navigation }) {
  const { eventId, eventName } = route?.params ?? {};
  const { token } = useAuth();

  // --- Attendee list state ---
  const [attendees, setAttendees] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Filter state ---
  const [ticketTypeFilter, setTicketTypeFilter] = useState('All');
  const [checkedInFilter, setCheckedInFilter] = useState(null); // null = All

  // --- Message modal state ---
  const [msgVisible, setMsgVisible] = useState(false);
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgSending, setMsgSending] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch attendees whenever filters change
  // ---------------------------------------------------------------------------
  const fetchAttendees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (ticketTypeFilter !== 'All') filters.ticketType = ticketTypeFilter;
      if (checkedInFilter !== null)   filters.checkedIn  = checkedInFilter;

      const result = await OrganiserService.getAttendees(eventId, filters, token);
      // Support both { attendees: [...], total } and { data: [...], meta: { total } } shapes
      const list = result?.attendees ?? result?.data ?? [];
      const count = result?.total ?? result?.meta?.total ?? list.length;
      setAttendees(list);
      setTotal(count);
    } catch (err) {
      setError(err.message || 'Failed to load attendees');
    } finally {
      setLoading(false);
    }
  }, [eventId, token, ticketTypeFilter, checkedInFilter]);

  useEffect(() => {
    fetchAttendees();
  }, [fetchAttendees]);

  // ---------------------------------------------------------------------------
  // CSV export
  // ---------------------------------------------------------------------------
  const handleExportCsv = useCallback(async () => {
    if (attendees.length === 0) {
      Alert.alert('No Data', 'There are no attendees to export with the current filters.');
      return;
    }
    const csv = buildCsv(attendees);
    try {
      await Share.share({
        title: `${eventName || 'Event'} — Attendees.csv`,
        message: csv,
      });
    } catch (err) {
      Alert.alert('Export Failed', err.message || 'Could not share the CSV.');
    }
  }, [attendees, eventName]);

  // ---------------------------------------------------------------------------
  // Message attendees
  // ---------------------------------------------------------------------------
  const handleSendMessage = useCallback(async () => {
    if (!msgSubject.trim()) {
      Alert.alert('Missing Subject', 'Please enter a subject.');
      return;
    }
    if (!msgBody.trim()) {
      Alert.alert('Missing Body', 'Please enter a message body.');
      return;
    }
    setMsgSending(true);
    try {
      const result = await OrganiserService.messageAttendees(eventId, msgSubject.trim(), msgBody.trim(), token);
      const sent = result?.sent ?? total;
      setMsgVisible(false);
      setMsgSubject('');
      setMsgBody('');
      Alert.alert('Message Sent', `Your message was sent to ${sent} attendee${sent !== 1 ? 's' : ''}.`);
    } catch (err) {
      Alert.alert('Send Failed', err.message || 'Could not send the message.');
    } finally {
      setMsgSending(false);
    }
  }, [eventId, token, msgSubject, msgBody, total]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const renderAttendee = useCallback(({ item, index }) => (
    <View style={[s.attendeeRow, index % 2 === 1 && s.attendeeRowAlt]}>
      <View style={s.attendeeLeft}>
        <Text style={s.attendeeName} numberOfLines={1}>{item.name || '—'}</Text>
        <Text style={s.attendeeEmail} numberOfLines={1}>{item.email || '—'}</Text>
        <Text style={s.attendeeTicketType}>{item.ticketType || '—'}</Text>
      </View>
      <View style={s.attendeeRight}>
        <Text style={[s.checkInBadge, item.checkedIn ? s.badgeChecked : s.badgeUnchecked]}>
          {item.checkedIn ? '✅' : '⬜'}
        </Text>
      </View>
    </View>
  ), []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation?.goBack()} activeOpacity={0.7}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>
            👥 Attendees
          </Text>
          {eventName ? (
            <Text style={s.headerSubtitle} numberOfLines={1}>{eventName}</Text>
          ) : null}
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.actionBtn} onPress={handleExportCsv} activeOpacity={0.8}>
            <Text style={s.actionBtnText}>📤 CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, s.actionBtnPrimary]} onPress={() => setMsgVisible(true)} activeOpacity={0.8}>
            <Text style={[s.actionBtnText, s.actionBtnPrimaryText]}>✉️ Message</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter bar */}
      <View style={s.filterBar}>
        {/* Ticket type filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterRow}>
          {TICKET_TYPE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[s.filterChip, ticketTypeFilter === opt && s.filterChipActive]}
              onPress={() => setTicketTypeFilter(opt)}
              activeOpacity={0.7}
            >
              <Text style={[s.filterChipText, ticketTypeFilter === opt && s.filterChipTextActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Check-in filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterRow}>
          {CHECKIN_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={String(opt.value)}
              style={[s.filterChip, checkedInFilter === opt.value && s.filterChipActive]}
              onPress={() => setCheckedInFilter(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={[s.filterChipText, checkedInFilter === opt.value && s.filterChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Total count */}
      {!loading && !error && (
        <View style={s.countBar}>
          <Text style={s.countText}>
            {total} attendee{total !== 1 ? 's' : ''}
            {ticketTypeFilter !== 'All' || checkedInFilter !== null ? ' (filtered)' : ''}
          </Text>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Loading attendees…</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text style={s.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={fetchAttendees} activeOpacity={0.8}>
            <Text style={s.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : attendees.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyEmoji}>📭</Text>
          <Text style={s.emptyText}>No attendees found</Text>
          <Text style={s.emptySubText}>Try adjusting the filters above</Text>
        </View>
      ) : (
        <FlatList
          data={attendees}
          keyExtractor={(item, idx) => item.uuid ?? item.email ?? String(idx)}
          renderItem={renderAttendee}
          contentContainerStyle={s.listContent}
          // Column header
          ListHeaderComponent={() => (
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, { flex: 3 }]}>Attendee</Text>
              <Text style={[s.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Checked In</Text>
            </View>
          )}
        />
      )}

      {/* Message modal */}
      <Modal
        visible={msgVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setMsgVisible(false)}
      >
        <KeyboardAvoidingView
          style={s.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <SafeAreaView style={s.modalRoot}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>✉️ Message Attendees</Text>
              <TouchableOpacity onPress={() => setMsgVisible(false)} activeOpacity={0.7}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalBody} contentContainerStyle={s.modalBodyContent}>
              <Text style={s.inputLabel}>Subject</Text>
              <TextInput
                style={s.textInput}
                value={msgSubject}
                onChangeText={setMsgSubject}
                placeholder="Enter subject…"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />

              <Text style={s.inputLabel}>Message</Text>
              <TextInput
                style={[s.textInput, s.textInputMulti]}
                value={msgBody}
                onChangeText={setMsgBody}
                placeholder="Enter your message…"
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
              />

              <Text style={s.recipientHint}>
                This message will be sent to all {total} attendee{total !== 1 ? 's' : ''} matching the current filters.
              </Text>
            </ScrollView>

            <View style={s.modalFooter}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => setMsgVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.sendBtn, msgSending && s.sendBtnDisabled]}
                onPress={handleSendMessage}
                disabled={msgSending}
                activeOpacity={0.8}
              >
                {msgSending ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={s.sendBtnText}>Send Message</Text>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  backBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  backBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  actionBtnPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  actionBtnPrimaryText: {
    color: colors.white,
  },

  // Filter bar
  filterBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingVertical: spacing.xs,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    paddingVertical: 4,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: colors.textSub,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },

  // Count bar
  countBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.bg,
  },
  countText: {
    fontSize: 12,
    color: colors.textMuted,
  },

  // State views
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 14,
  },
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
  retryBtnText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Table
  listContent: {
    paddingBottom: spacing.xl,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.bg,
  },
  attendeeRowAlt: {
    backgroundColor: colors.surface,
  },
  attendeeLeft: {
    flex: 3,
    paddingRight: spacing.sm,
  },
  attendeeRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  attendeeName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 1,
  },
  attendeeEmail: {
    fontSize: 12,
    color: colors.textSub,
    marginBottom: 1,
  },
  attendeeTicketType: {
    fontSize: 11,
    color: colors.textMuted,
  },
  checkInBadge: {
    fontSize: 20,
  },
  badgeChecked: {
    opacity: 1,
  },
  badgeUnchecked: {
    opacity: 0.5,
  },

  // Message modal
  modalRoot: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  modalClose: {
    fontSize: 18,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSub,
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text,
  },
  textInputMulti: {
    minHeight: 120,
    paddingTop: spacing.sm,
  },
  recipientHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.surface,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSub,
  },
  sendBtn: {
    flex: 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
});
