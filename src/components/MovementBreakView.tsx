import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { Colors, Spacing } from '@/src/constants/theme';
import { Mascot } from '@/src/components/Mascot';
import { SquatDemonstration } from '@/src/components/SquatDemonstration';
import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';
import { CircularProgressRing } from '@/src/components/CircularProgressRing';
import { TimerSnapshot, formatTime } from '@/src/engine/timerEngine';

interface MovementBreakViewProps {
  snapshot: TimerSnapshot;
  onRecordResponse: (action: 'done' | 'skip' | 'other' | 'rest_only') => void;
  onEndBreakEarly: () => void;
  onPause?: () => void;
  onResume?: () => void;
  reducedMotion?: boolean;
}

export const MovementBreakView: React.FC<MovementBreakViewProps> = ({
  snapshot, onRecordResponse, onEndBreakEarly, onPause, onResume, reducedMotion,
}) => {
  const [replayKey, setReplayKey] = useState(0);
  const [demoPaused, setDemoPaused] = useState(false);
  const { width } = useWindowDimensions();
  const isRunning = snapshot.state === 'running_break';
  const isDone = snapshot.breakOutcome === 'done';
  const isResolved = snapshot.breakOutcome !== 'pending';
  const showDemo = !isResolved && snapshot.movementLabel === 'squats';
  const breakProgress = snapshot.totalSeconds > 0 ? 1 - snapshot.remainingSeconds / snapshot.totalSeconds : 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.transitionCue} accessibilityLiveRegion="polite">
        <Text style={styles.cueIcon}>✓</Text>
        <Text style={styles.cueText}>Focus complete. Take a little time for you.</Text>
      </View>
      <View style={[styles.cards, width >= 850 && styles.cardsWide]}>
        <Card style={[styles.card, width >= 850 && styles.cardWide]}>
          <Text style={styles.eyebrow}>{isResolved ? 'A MOMENT TO RECHARGE' : 'TIME TO MOVE'}</Text>
          <Text style={styles.headerTitle}>{isDone ? 'Nicely done!' : isResolved ? 'Make yourself comfortable' : 'Movement break'}</Text>
          <Text style={styles.headerSubtitle}>{isDone ? 'Reps recorded. The rest is yours.' : isResolved ? 'Breathe, stretch, or enjoy a quiet moment.' : snapshot.movementLabel === 'other' ? 'Choose a movement that feels good.' : `Time for ${snapshot.repGoal} gentle squats`}</Text>

          <View style={styles.mascotContainer}>
            {showDemo ? (
              <SquatDemonstration key={snapshot.activeRecordId ?? 'break'} playing={!demoPaused} replayKey={replayKey} reducedMotion={reducedMotion} />
            ) : (
              <Mascot key={snapshot.breakOutcome} pose="break" size={232} motion={isDone ? 'celebrate' : 'calm'} playing={isRunning} reducedMotion={reducedMotion} />
            )}
          </View>

          {showDemo ? (
            <View style={styles.demoControls}>
              <Button title="Replay demo" variant="ghost" size="small" style={styles.demoButton} onPress={() => { setDemoPaused(false); setReplayKey(key => key + 1); }} accessibilityHint="Shows two demonstration squats. Does not record reps." />
              <Button title={demoPaused ? 'Play demo' : 'Pause demo'} variant="ghost" size="small" style={styles.demoButton} onPress={() => setDemoPaused(paused => !paused)} />
            </View>
          ) : null}

          {!isResolved ? (
            <>
              <View style={styles.repDisplay}>
                <Text style={styles.repDigits}>{snapshot.reportedReps}<Text style={styles.repGoal}> / {snapshot.repGoal}</Text></Text>
                <Text style={styles.repLabel}>Your reported reps · the demo doesn’t count</Text>
              </View>
              <View style={styles.actionsGroup}>
                <Button title={snapshot.movementLabel === 'other' ? 'I finished my movement' : `I did my ${snapshot.repGoal} squats`} onPress={() => onRecordResponse('done')} style={styles.primaryActionBtn} accessibilityLabel={`Record ${snapshot.repGoal} completed reps`} />
                <View style={styles.secondaryActionsRow}>
                  <Button title="Skip" variant="ghost" onPress={() => onRecordResponse('skip')} style={styles.halfBtn} />
                  <Button title="Rest Only" variant="ghost" onPress={() => onRecordResponse('rest_only')} style={styles.halfBtn} />
                </View>
              </View>
            </>
          ) : (
            <View style={[styles.outcomeBadge, isDone && styles.doneBadge]} accessibilityLiveRegion="polite">
              <Text style={[styles.outcomeText, isDone && styles.doneText]}>{isDone ? `✓ ${snapshot.reportedReps} reps recorded` : 'Rest is part of the rhythm.'}</Text>
            </View>
          )}
        </Card>

        <Card style={[styles.card, width >= 850 && styles.cardWide]}>
          <Text style={styles.eyebrow}>BREATHE. RESET.</Text>
          <Text style={styles.breakTitle}>Break time</Text>
          <Text style={styles.breakSubtitle}>Take a sip of water. Let your shoulders relax.</Text>
          <View style={styles.ringContainer}>
            <CircularProgressRing size={200} strokeWidth={10} progress={breakProgress} trackColor="#EAE6E1" progressColor={Colors.accent}>
              <Text style={styles.countdownText} accessibilityRole="timer" accessibilityLabel={`${formatTime(snapshot.remainingSeconds)} remaining in break`}>{formatTime(snapshot.remainingSeconds)}</Text>
              <Text style={styles.phaseLabel}>{isRunning ? 'Time for yourself' : 'Break paused'}</Text>
            </CircularProgressRing>
          </View>
          <Text style={styles.breakNote}>Your break continues while you move.</Text>
          <View style={styles.breakControls}>
            <Button title={isRunning ? 'Pause Break' : 'Resume Break'} variant={isRunning ? 'secondary' : 'primary'} onPress={(isRunning ? onPause : onResume) ?? (() => {})} />
            <Button title="End Break Early" variant="ghost" onPress={onEndBreakEarly} accessibilityLabel="End break early and get ready to study" />
          </View>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.canvas },
  content: { padding: Spacing.md, alignItems: 'center', paddingBottom: Spacing.xxl },
  transitionCue: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, marginBottom: 8 },
  cueIcon: { color: Colors.success, fontSize: 14 },
  cueText: { color: Colors.muted, fontSize: 12, flexShrink: 1, lineHeight: 18 },
  cards: { width: '100%', maxWidth: 440, gap: Spacing.md },
  cardsWide: { flexDirection: 'row', alignItems: 'flex-start', maxWidth: 900 },
  card: { minWidth: 0, width: '100%', alignItems: 'center', padding: Spacing.lg },
  cardWide: { flex: 1 },
  eyebrow: { color: Colors.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1.6, marginBottom: 9 },
  headerTitle: { fontSize: 23, fontWeight: '700', color: Colors.ink, textAlign: 'center', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: Colors.muted, marginTop: 7, marginBottom: 8, textAlign: 'center', lineHeight: 20 },
  mascotContainer: { marginVertical: 4, alignItems: 'center', justifyContent: 'center' },
  demoButton: { minHeight: 44 },
  demoControls: { flexDirection: 'row', gap: 8, marginTop: 6 },
  repDisplay: { alignItems: 'center', marginVertical: Spacing.md },
  repDigits: { fontSize: 35, fontWeight: '800', color: Colors.ink, letterSpacing: -1 },
  repGoal: { color: '#96918D', fontWeight: '500' },
  repLabel: { fontSize: 11, color: Colors.muted, marginTop: 5, textAlign: 'center' },
  actionsGroup: { width: '100%', marginTop: 2 },
  primaryActionBtn: { width: '100%', marginBottom: 4 },
  secondaryActionsRow: { flexDirection: 'row', width: '100%' },
  halfBtn: { flex: 1, marginHorizontal: 4 },
  outcomeBadge: { backgroundColor: Colors.canvas, borderRadius: 24, paddingHorizontal: 17, paddingVertical: 11, marginVertical: 14 },
  doneBadge: { backgroundColor: Colors.successSoft },
  outcomeText: { color: Colors.muted, fontSize: 13, fontWeight: '500' },
  doneText: { color: Colors.success },
  breakTitle: { fontSize: 23, fontWeight: '700', color: Colors.ink, textAlign: 'center' },
  breakSubtitle: { fontSize: 13, color: Colors.muted, textAlign: 'center', marginTop: 7, lineHeight: 20 },
  ringContainer: { marginTop: 32, marginBottom: 24, alignItems: 'center' },
  countdownText: { fontSize: 38, fontWeight: '700', color: Colors.ink, fontVariant: ['tabular-nums'] },
  phaseLabel: { fontSize: 11, color: Colors.muted, marginTop: 5 },
  breakNote: { fontSize: 12, color: Colors.muted, marginBottom: 24 },
  breakControls: { width: '100%', gap: 8 },
});
