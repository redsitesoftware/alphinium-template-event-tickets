/**
 * OrganiserTicketTypeFormScreen
 * Shared create / edit form for a single ticket type tier.
 *
 * Props:
 *   eventId       — parent event ID
 *   ticketType    — null/undefined = create mode; object with tier data = edit mode
 *   token         — JWT from useAuth()
 *   onSaved       — callback when tier is saved successfully
 *   onDeleted     — callback when tier is deleted successfully
 *   onBack        — callback to dismiss without saving
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { TicketTypeService } from '../services/TicketTypeService';
import { colors, spacing, radius } from '../theme';

export default function OrganiserTicketTypeFormScreen({
  eventId,
  ticketType,
  token,
  onSaved,
  onDeleted,
  onBack,
}) {
  const isEditing = Boolean(ticketType?.id);

  const [name, setName] = useState(ticketType?.name ?? '');
  const [description, setDescription] = useState(ticketType?.description ?? '');
  const [price, setPrice] = useState(
    ticketType?.price != null ? String(ticketType.price) : '',
  );
  const [quantity, setQuantity] = useState(
    ticketType?.quantity != null ? String(ticketType.quantity) : '',
  );
  const [saleStart, setSaleStart] = useState(ticketType?.saleStart ?? '');
  const [saleEnd, setSaleEnd] = useState(ticketType?.saleEnd ?? '');
  const [isHidden, setIsHidden] = useState(
    ticketType?.visibility === 'hidden',
  );

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  function validate() {
    if (!name.trim()) return 'Tier name is required';
    const priceVal = parseFloat(price);
    if (price === '' || isNaN(priceVal) || priceVal < 0) {
      return 'Price must be 0 or greater (use 0 for free tickets)';
    }
    const qtyVal = parseInt(quantity, 10);
    if (quantity === '' || isNaN(qtyVal) || qtyVal < 1) {
      return 'Quantity must be at least 1';
    }
    return null;
  }

  async function handleSave() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const data = {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        quantity: parseInt(quantity, 10),
        saleStart: saleStart.trim() || null,
        saleEnd: saleEnd.trim() || null,
        visibility: isHidden ? 'hidden' : 'public',
      };
      if (isEditing) {
        await TicketTypeService.updateTicketType(eventId, ticketType.id, data, token);
      } else {
        await TicketTypeService.createTicketType(eventId, data, token);
      }
      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to save ticket type');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Delete Ticket Tier',
      `Are you sure you want to delete "${name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDelete },
      ],
    );
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await TicketTypeService.deleteTicketType(eventId, ticketType.id, token);
      onDeleted();
    } catch (err) {
      setError(err.message || 'Failed to delete ticket type');
      setDeleting(false);
    }
  }

  const busy = saving || deleting;

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={onBack} disabled={busy} style={s.backBtn}>
            <Text style={[s.backText, busy && s.disabled]}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>
            {isEditing ? 'Edit Ticket Tier' : 'New Ticket Tier'}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
          {/* Error banner */}
          {error ? (
            <View style={s.errorBanner}>
              <Text style={s.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          <Field label="Tier Name *">
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. General Admission, VIP, Early Bird"
              placeholderTextColor={colors.textMuted}
              editable={!busy}
              returnKeyType="next"
            />
          </Field>

          <Field label="Description / Perks">
            <TextInput
              style={[s.input, s.inputMultiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="What's included with this tier…"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              editable={!busy}
              textAlignVertical="top"
            />
          </Field>

          {/* Price + Quantity row */}
          <View style={s.row}>
            <View style={s.rowHalf}>
              <Field label="Price (0 = free) *">
                <TextInput
                  style={s.input}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  editable={!busy}
                  returnKeyType="next"
                />
              </Field>
            </View>
            <View style={s.rowHalf}>
              <Field label="Total Quantity *">
                <TextInput
                  style={s.input}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="e.g. 500"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  editable={!busy}
                  returnKeyType="next"
                />
              </Field>
            </View>
          </View>

          {/* Sale window */}
          <Field label="Sale Start (optional)">
            <TextInput
              style={s.input}
              value={saleStart}
              onChangeText={setSaleStart}
              placeholder="e.g. 2025-06-01 or Jun 1, 2025"
              placeholderTextColor={colors.textMuted}
              editable={!busy}
              returnKeyType="next"
            />
          </Field>

          <Field label="Sale End (optional)">
            <TextInput
              style={s.input}
              value={saleEnd}
              onChangeText={setSaleEnd}
              placeholder="e.g. 2025-08-15 or Aug 15, 2025"
              placeholderTextColor={colors.textMuted}
              editable={!busy}
              returnKeyType="done"
            />
          </Field>

          {/* Visibility toggle */}
          <View style={s.toggleRow}>
            <View style={s.toggleInfo}>
              <Text style={s.toggleLabel}>Invite-Only (Hidden)</Text>
              <Text style={s.toggleSubLabel}>
                Hidden tiers are not shown on public event pages
              </Text>
            </View>
            <Switch
              value={isHidden}
              onValueChange={setIsHidden}
              disabled={busy}
              trackColor={{ true: colors.primary, false: colors.cardBorder }}
              thumbColor={colors.white}
            />
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[s.saveBtn, busy && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={busy}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={s.saveBtnText}>
                {isEditing ? '💾 Save Changes' : '➕ Add Tier'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Delete — edit mode only */}
          {isEditing && (
            <TouchableOpacity
              style={[s.deleteBtn, busy && s.saveBtnDisabled]}
              onPress={confirmDelete}
              disabled={busy}
              activeOpacity={0.8}
            >
              {deleting ? (
                <ActivityIndicator color={colors.error} size="small" />
              ) : (
                <Text style={s.deleteBtnText}>🗑️ Delete Tier</Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }) {
  return (
    <View style={s.fieldGroup}>
      <Text style={s.label}>{label}</Text>
      {children}
    </View>
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  form: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  errorBanner: {
    backgroundColor: colors.error + '22',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorText: { color: colors.error, fontSize: 14 },
  fieldGroup: { gap: spacing.xs },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSub,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
    color: colors.text,
  },
  inputMultiline: { minHeight: 80, paddingTop: spacing.sm + 2 },
  row: { flexDirection: 'row', gap: spacing.sm },
  rowHalf: { flex: 1 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  toggleInfo: { flex: 1, marginRight: spacing.md },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  toggleSubLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.round,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  deleteBtn: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.round,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  deleteBtnText: { color: colors.error, fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.4 },
});
