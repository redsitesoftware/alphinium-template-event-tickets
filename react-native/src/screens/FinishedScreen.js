/**
 * FinishedScreen — Session wrap-up
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { colors, spacing, radius, typography } from '../theme';

export default function FinishedScreen() {
  const { players, roundIndex, resetGame } = useGameStore();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🏆</Text>
        <Text style={styles.title}>Session Complete!</Text>
        <Text style={styles.sub}>
          {roundIndex} round{roundIndex !== 1 ? 's' : ''} · {players.length} player{players.length !== 1 ? 's' : ''}
        </Text>

        <View style={styles.statsRow}>
          {[
            { label: 'Rounds Played', value: roundIndex },
            { label: 'Players', value: players.length },
            { label: 'Answers Shared', value: roundIndex * players.length },
          ].map(s => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.players}>
          {players.map(p => (
            <View key={p.id} style={[styles.playerChip, { borderColor: p.color + '88' }]}>
              <Text style={styles.playerEmoji}>{p.emoji}</Text>
              <Text style={styles.playerName}>{p.name}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.cta}>No more awkward silences — powered by Icebreaker AI</Text>

        <TouchableOpacity style={styles.btn} onPress={resetGame}>
          <Text style={styles.btnText}>Start New Session</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  content:     { flex: 1, padding: spacing.xl, paddingTop: spacing.xxl, alignItems: 'center' },
  emoji:       { fontSize: 72, marginBottom: spacing.md },
  title:       { ...typography.title, color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  sub:         { ...typography.body, color: colors.textSub, marginBottom: spacing.xl },
  statsRow:    { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  statCard:    {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: spacing.md, alignItems: 'center', flex: 1,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  statValue:   { fontSize: 32, fontWeight: '800', color: colors.accent },
  statLabel:   { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  players:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', marginBottom: spacing.xl },
  playerChip:  {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderRadius: 999,
    paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.card,
  },
  playerEmoji: { fontSize: 18 },
  playerName:  { fontSize: 14, fontWeight: '600', color: colors.text },
  cta:         { ...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xl, fontStyle: 'italic' },
  btn:         {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xxl, alignItems: 'center',
  },
  btnText:     { color: colors.white, fontSize: 17, fontWeight: '700' },
});
