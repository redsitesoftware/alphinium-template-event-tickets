/**
 * OrganiserEventFormScreen
 * Shared create / edit form for organiser events.
 * Props:
 *   event   — null/undefined = create mode; object with event data = edit mode
 *   token   — JWT from useAuth()
 *   onSaved   — callback when event is saved successfully
 *   onDeleted — callback when event is deleted successfully
 *   onBack    — callback to dismiss the form without saving
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
} from 'react-native';
import { OrganiserService } from '../services/OrganiserService';
import { colors, spacing, radius } from '../theme';

export default function OrganiserEventFormScreen({ event, token, onSaved, onDeleted, onBack }) {
  const isEditing = Boolean(event?.id);

  const [name, setName] = useState(event?.name ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [date, setDate] = useState(event?.date ?? '');
  const [venue, setVenue] = useState(event?.venue ?? '');
  const [bannerImageUrl, setBannerImageUrl] = useState(event?.bannerImageUrl ?? '');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave() {
    if (!name.trim()) {
      setError('Event name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data = { name: name.trim(), description, date, venue, bannerImageUrl };
      if (isEditing) {
        await OrganiserService.updateEvent(event.id, data, token);
      } else {
        await OrganiserService.createEvent(data, token);
      }
      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: handleDelete,
        },
      ],
    );
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await OrganiserService.deleteEvent(event.id, token);
      onDeleted();
    } catch (err) {
      setError(err.message || 'Failed to delete event');
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
            {isEditing ? 'Edit Event' : 'Create Event'}
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

          {/* Fields */}
          <Field label="Event Name *">
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Summer Music Festival"
              placeholderTextColor={colors.textMuted}
              editable={!busy}
              returnKeyType="next"
            />
          </Field>

          <Field label="Description">
            <TextInput
              style={[s.input, s.inputMultiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="Tell attendees what to expect…"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              editable={!busy}
              textAlignVertical="top"
            />
          </Field>

          <Field label="Date">
            <TextInput
              style={s.input}
              value={date}
              onChangeText={setDate}
              placeholder="e.g. 2025-08-15 or Aug 15, 2025"
              placeholderTextColor={colors.textMuted}
              editable={!busy}
              returnKeyType="next"
            />
          </Field>

          <Field label="Venue">
            <TextInput
              style={s.input}
              value={venue}
              onChangeText={setVenue}
              placeholder="e.g. Madison Square Garden, New York"
              placeholderTextColor={colors.textMuted}
              editable={!busy}
              returnKeyType="next"
            />
          </Field>

          <Field label="Banner Image URL">
            <TextInput
              style={s.input}
              value={bannerImageUrl}
              onChangeText={setBannerImageUrl}
              placeholder="https://example.com/banner.jpg"
              placeholderTextColor={colors.textMuted}
              editable={!busy}
              autoCapitalize="none"
              keyboardType="url"
              returnKeyType="done"
            />
          </Field>

          {/* Save button */}
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
                {isEditing ? '💾 Save Changes' : '🚀 Create Event'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Delete button — edit mode only */}
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
                <Text style={s.deleteBtnText}>🗑️ Delete Event</Text>
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
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
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
  backBtn: {
    width: 60,
  },
  backText: {
    color: colors.primaryLight,
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
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
  errorText: {
    color: colors.error,
    fontSize: 14,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
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
  inputMultiline: {
    minHeight: 100,
    paddingTop: spacing.sm + 2,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.round,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  deleteBtn: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.round,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.4,
  },
});
