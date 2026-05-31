/**
 * LobbyScreen — Host waits for players to join, then starts the game
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView,
} from 'react-native';
import { useGameStore } from '../store/gameStore';
import { colors, spacing, radius, typography } from '../theme';

function PlayerChip({ player }) {
  return (
    <View style={[styles.chip, { borderColor: player.color + '88' }]}>
      <Text style={styles.chipEmoji}>{player.emoji}</Text>
      <Text style={styles.chipName}>{player.name}</Text>
    </View>
  );
}

export default function LobbyScreen() {
  const { sessionCode, isHost, players, addDemoPlayer, startRound, showAnswering, resetGame } = useGameStore();
  const [countdown, setCountdown] = useState(null);

  // Simulate players joining every 2.5s in demo mode
  useEffect(() => {
    if (!isHost) return;
    const interval = setInterval(() => {
      const { demoJoinedCount } = useGameStore.getState();
      if (demoJoinedCount < 5) {
        addDemoPlayer();
      } else {
        clearInterval(interval);
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [isHost]);

  const handleStart = () => {
    setCountdown(3);
    let n = 3;
    const t = setInterval(() => {
      n -= 1;
      setCountdown(n);
      if (n <= 0) {
        clearInterval(t);
        startRound();
      }
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Session code */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Room Code</Text>
          <Text style={styles.codeText}>{sessionCode}</Text>
          <Text style={styles.codeHint}>Share this code with your team</Text>
        </View>

        {/* Players */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {players.length} player{players.length !== 1 ? 's' : ''} in room
          </Text>
          <View style={styles.playerGrid}>
            {players.map(p => <PlayerChip key={p.id} player={p} />)}
            {isHost && players.length < 5 && (
              <View style={[styles.chip, styles.chipWaiting]}>
                <Text style={styles.chipEmoji}>⏳</Text>
                <Text style={[styles.chipName, { color: colors.textMuted }]}>Waiting...</Text>
              </View>
            )}
          </View>
        </View>

        {isHost ? (
          <>
            <Text style={styles.hint}>
              {players.length < 2
                ? 'Waiting for players to join...'
                : `${players.length} players ready — start when everyone's in!`}
            </Text>

            {countdown !== null ? (
              <View style={styles.countdownBox}>
                <Text style={styles.countdownText}>{countdown > 0 ? countdown : 'Go!'}</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.startBtn, players.length < 2 && styles.startBtnDisabled]}
                disabled={players.length < 2}
                onPress={handleStart}
              >
                <Text style={styles.startBtnText}>Start Game</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.waitBox}>
            <Text style={styles.waitEmoji}>✋</Text>
            <Text style={styles.waitText}>You're in! Waiting for the host to start...</Text>
          </View>
        )}

        <TouchableOpacity style={styles.leaveBtn} onPress={resetGame}>
          <Text style={styles.leaveBtnText}>Leave Session</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: colors.bg },
  content:          { padding: spacing.xl, paddingTop: spacing.xxl, flexGrow: 1 },

  codeCard:         {
    backgroundColor: colors.card, borderRadius: radius.xl,
    borderWidth: 2, borderColor: colors.primary + '66',
    padding: spacing.xl, alignItems: 'center', marginBottom: spacing.xl,
  },
  codeLabel:        { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 2, marginBottom: spacing.sm },
  codeText:         { fontSize: 56, fontWeight: '900', color: colors.primaryLight, letterSpacing: 12 },
  codeHint:         { fontSize: 13, color: colors.textMuted, marginTop: spacing.sm },

  section:          { marginBottom: spacing.xl },
  sectionTitle:     { ...typography.subhead, color: colors.textSub, marginBottom: spacing.md },
  playerGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip:             {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    borderWidth: 1.5, borderRadius: radius.round,
    paddingVertical: 8, paddingHorizontal: 14,
    backgroundColor: colors.card,
  },
  chipWaiting:      { borderColor: colors.cardBorder, borderStyle: 'dashed' },
  chipEmoji:        { fontSize: 18 },
  chipName:         { fontSize: 14, fontWeight: '600', color: colors.text },

  hint:             { ...typography.body, color: colors.textSub, textAlign: 'center', marginBottom: spacing.xl },

  startBtn:         {
    backgroundColor: colors.accent, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center', marginBottom: spacing.lg,
  },
  startBtnDisabled: { opacity: 0.35 },
  startBtnText:     { color: colors.white, fontSize: 18, fontWeight: '800' },

  countdownBox:     { alignItems: 'center', paddingVertical: spacing.xl },
  countdownText:    { fontSize: 80, fontWeight: '900', color: colors.accent },

  waitBox:          { alignItems: 'center', padding: spacing.xl },
  waitEmoji:        { fontSize: 48, marginBottom: spacing.md },
  waitText:         { ...typography.body, color: colors.textSub, textAlign: 'center' },

  leaveBtn:         { alignItems: 'center', marginTop: spacing.xl },
  leaveBtnText:     { color: colors.textMuted, fontSize: 14 },
});
