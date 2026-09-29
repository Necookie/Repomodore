import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors, Spacing } from '@/src/constants/theme';
import { Mascot } from '@/src/components/Mascot';
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
}

export const MovementBreakView: React.FC<MovementBreakViewProps> = ({
  snapshot,
  onRecordResponse,
  onEndBreakEarly,
  onPause,
  onResume,
}) => {
  const isRunning = snapshot.state === 'running_break';
  const isDone = snapshot.breakOutcome === 'done';
  const isSkipped = snapshot.breakOutcome === 'skipped';
  const isRestOnly = snapshot.breakOutcome === 'rest_only';

  const breakProgress =
    snapshot.totalSeconds > 0
      ? 1 - snapshot.remainingSeconds / snapshot.totalSeconds
      : 1;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Exercise / Goal Card */}
      <Card style={styles.card}>
        <Text style={styles.headerTitle}>Movement Break!</Text>
        <Text style={styles.headerSubtitle}>
          {isRestOnly
            ? 'Rest and breathe'
            : snapshot.movementLabel === 'other'
            ? 'Time for gentle movement'
            : `Time for ${snapshot.repGoal} squats`}
        </Text>

        <View style={styles.mascotContainer}>
          <Mascot
            pose={isRestOnly ? 'break' : 'squat'}
            size={160}
            alt={isRestOnly ? 'Mascot resting with mug' : 'Mascot performing bodyweight squat'}
          />
        </View>

        {/* Rep Count Display */}
        <View style={styles.repDisplay}>
          <Text style={styles.repDigits}>
            {snapshot.reportedReps} / {snapshot.repGoal}
          </Text>
          <Text style={styles.repLabel}>
            {isDone
              ? 'Great job completing your reps!'
              : isSkipped
              ? 'Skipped for now - take your rest.'
              : isRestOnly
              ? 'Rest mode active'
              : 'Self-reported bodyweight reps'}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsGroup}>
          <Button
            title={isDone ? '✓ Reps Completed' : `I did my ${snapshot.repGoal} squats`}
            variant={isDone ? 'secondary' : 'primary'}
            onPress={() => onRecordResponse('done')}
            disabled={isDone || isSkipped || isRestOnly}
            style={styles.primaryActionBtn}
            accessibilityLabel={`Mark ${snapshot.repGoal} squats done`}
          />

          {!isDone && !isSkipped && !isRestOnly ? (
            <View style={styles.secondaryActionsRow}>
              <Button
                title="Skip"
                variant="ghost"
                onPress={() => onRecordResponse('skip')}
                style={styles.halfBtn}
                accessibilityLabel="Skip squats for this break"
              />
              <Button
                title="Rest Only"
                variant="ghost"
                onPress={() => onRecordResponse('rest_only')}
                style={styles.halfBtn}
                accessibilityLabel="Choose rest-only break"
              />
            </View>
          ) : null}
        </View>
      </Card>

      {/* Break Countdown Card */}
      <Card style={styles.card}>
        <Text style={styles.breakTitle}>☕ Rest Period</Text>
        <Text style={styles.breakSubtitle}>
          The 5 minutes are your rest period. Take a sip of water and breathe.
        </Text>

        <View style={styles.ringContainer}>
          <CircularProgressRing
            size={180}
            strokeWidth={10}
            progress={breakProgress}
            trackColor="#EAE6E1"
            progressColor={Colors.accent}
          >
            <Text style={styles.countdownText}>
              {formatTime(snapshot.remainingSeconds)}
            </Text>
            <Text style={styles.phaseLabel}>
              {isRunning ? 'Break Running' : 'Break Paused'}
            </Text>
          </CircularProgressRing>
        </View>

        <View style={styles.breakControlsRow}>
          {isRunning ? (
            <Button
              title="Pause Break"
              variant="secondary"
              onPress={onPause || (() => {})}
              style={styles.controlBtn}
            />
          ) : (
            <Button
              title="Resume Break"
              variant="primary"
              onPress={onResume || (() => {})}
              style={styles.controlBtn}
            />
          )}

          <Button
            title="End Break Early"
            variant="ghost"
            onPress={onEndBreakEarly}
            style={styles.controlBtn}
            accessibilityLabel="End break early and get ready to study"
          />
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  content: {
    padding: Spacing.md,
    alignItems: 'center',
    paddingBottom: Spacing.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.ink,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 15,
    color: Colors.muted,
    marginTop: 4,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  mascotContainer: {
    marginVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repDisplay: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  repDigits: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: -1,
  },
  repLabel: {
    fontSize: 13,
    color: Colors.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  actionsGroup: {
    width: '100%',
    marginTop: Spacing.sm,
  },
  primaryActionBtn: {
    width: '100%',
    marginBottom: Spacing.sm,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  halfBtn: {
    flex: 1,
    marginHorizontal: 4,
  },
  breakTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.ink,
    textAlign: 'center',
  },
  breakSubtitle: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  ringContainer: {
    marginVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: 34,
    fontWeight: '700',
    color: Colors.ink,
    fontVariant: ['tabular-nums'],
  },
  phaseLabel: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 4,
  },
  breakControlsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  controlBtn: {
    flex: 1,
    marginHorizontal: 4,
  },
});
