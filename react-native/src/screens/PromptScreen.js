/**
 * PromptScreen — Shows the current icebreaker prompt, then starts answering phase
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Animated } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { colors, spacing, radius, typography } from '../theme';

export default function PromptScreen() {
  const { currentPrompt, roundIndex, showAnswering, players } = useGameStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.topBar}>
          <Text style={styles.roundBadge}>Round {roundIndex + 1}</Text>
          <Text style={styles.playerCount}>{players.length} players</Text>
        </View>

        <View style={styles.flex} />

        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.cardIcon}>🤔</Text>
          <Text style={styles.questionLabel}>Today's Icebreaker</Text>
          <Text style={styles.prompt}>{currentPrompt}</Text>
        </Animated.View>

        <View style={styles.flex} />

        <Text style={styles.hint}>Read this out loud, then tap Start</Text>
        <TouchableOpacity style={styles.btn} onPress={showAnswering}>
          <Text style={styles.btnText}>Everyone Answer</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: colors.bg },
  content:       { flex: 1, padding: spacing.xl, paddingTop: spacing.xxl },
  topBar:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  roundBadge:    {
    backgroundColor: colors.primary + '33', borderRadius: radius.round,
    paddingHorizontal: 14, paddingVertical: 6,
    color: colors.primaryLight, fontSize: 13, fontWeight: '700',
  },
  playerCount:   { color: colors.textMuted, fontSize: 14 },
  flex:          { flex: 1 },
  card:          {
    backgroundColor: colors.card, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.primary + '44',
    padding: spacing.xl, alignItems: 'center',
  },
  cardIcon:      { fontSize: 48, marginBottom: spacing.md },
  questionLabel: { fontSize: 11, color: colors.primaryLight, textTransform: 'uppercase', letterSpacing: 2, marginBottom: spacing.md },
  prompt:        { ...typography.heading, color: colors.text, textAlign: 'center', lineHeight: 34 },
  hint:          { ...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.md },
  btn:           {
    backgroundColor: colors.accent, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center',
  },
  btnText:       { color: colors.white, fontSize: 18, fontWeight: '800' },
});
