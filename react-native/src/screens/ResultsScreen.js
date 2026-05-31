/**
 * ResultsScreen — Reveals answers one by one, shows AI commentary, vote for favourite
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Animated,
} from 'react-native';
import { useGameStore } from '../store/gameStore';
import { colors, spacing, radius, typography } from '../theme';

function AnswerCard({ player, answer, index, visible }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 100, friction: 10, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[
      styles.answerCard,
      { borderColor: player.color + '66', opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
    ]}>
      <View style={styles.answerHeader}>
        <Text style={styles.playerEmoji}>{player.emoji}</Text>
        <Text style={[styles.playerName, { color: player.color }]}>{player.name}</Text>
        <View style={[styles.numBadge, { backgroundColor: player.color + '33' }]}>
          <Text style={[styles.numText, { color: player.color }]}>#{index + 1}</Text>
        </View>
      </View>
      <Text style={styles.answerText}>"{answer}"</Text>
    </Animated.View>
  );
}

export default function ResultsScreen() {
  const { players, answers, aiCommentary, revealIndex, revealNext, nextRound, endSession, roundIndex } = useGameStore();
  const aiAnim = useRef(new Animated.Value(0)).current;

  const playerList = players.filter(p => answers[p.id]);
  const allRevealed = revealIndex >= playerList.length;

  useEffect(() => {
    if (allRevealed && aiCommentary) {
      setTimeout(() => {
        Animated.timing(aiAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      }, 500);
    }
  }, [allRevealed]);

  // Auto-advance reveals
  useEffect(() => {
    if (revealIndex < playerList.length) {
      const t = setTimeout(revealNext, 900);
      return () => clearTimeout(t);
    }
  }, [revealIndex]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🎉</Text>
          <Text style={styles.title}>Everyone's Answers</Text>
          <Text style={styles.roundLabel}>Round {roundIndex + 1}</Text>
        </View>

        {/* Answer cards */}
        {playerList.map((player, i) => (
          <AnswerCard
            key={player.id}
            player={player}
            answer={answers[player.id]}
            index={i}
            visible={i < revealIndex}
          />
        ))}

        {/* AI Commentary */}
        {allRevealed && aiCommentary ? (
          <Animated.View style={[styles.aiBox, { opacity: aiAnim }]}>
            <View style={styles.aiHeader}>
              <Text style={styles.aiEmoji}>🤖</Text>
              <Text style={styles.aiLabel}>AI Commentary</Text>
            </View>
            <Text style={styles.aiText}>{aiCommentary}</Text>
          </Animated.View>
        ) : null}

        {/* Actions */}
        {allRevealed && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.nextBtn} onPress={nextRound}>
              <Text style={styles.nextBtnText}>Next Round</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.endBtn} onPress={endSession}>
              <Text style={styles.endBtnText}>End Session</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: colors.bg },
  content:       { padding: spacing.xl, paddingTop: spacing.xxl },
  header:        { alignItems: 'center', marginBottom: spacing.xl },
  headerEmoji:   { fontSize: 48, marginBottom: spacing.sm },
  title:         { ...typography.heading, color: colors.text, marginBottom: 4 },
  roundLabel:    { fontSize: 13, color: colors.textMuted },

  answerCard:    {
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1.5, padding: spacing.md, marginBottom: spacing.md,
  },
  answerHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm },
  playerEmoji:   { fontSize: 22 },
  playerName:    { fontWeight: '700', fontSize: 15, flex: 1 },
  numBadge:      { borderRadius: radius.round, paddingHorizontal: 10, paddingVertical: 3 },
  numText:       { fontSize: 12, fontWeight: '700' },
  answerText:    { ...typography.body, color: colors.text, fontStyle: 'italic', lineHeight: 24 },

  aiBox:         {
    backgroundColor: '#1F0B3A', borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.primary + '66',
    padding: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.xl,
  },
  aiHeader:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  aiEmoji:       { fontSize: 24 },
  aiLabel:       { fontSize: 11, color: colors.primaryLight, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '700' },
  aiText:        { ...typography.body, color: colors.textSub, fontStyle: 'italic', lineHeight: 24 },

  actions:       { gap: spacing.md, marginTop: spacing.sm },
  nextBtn:       {
    backgroundColor: colors.accent, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center',
  },
  nextBtnText:   { color: colors.white, fontSize: 17, fontWeight: '700' },
  endBtn:        { alignItems: 'center', paddingVertical: spacing.sm },
  endBtnText:    { color: colors.textMuted, fontSize: 14 },
});
