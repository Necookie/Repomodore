import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { useFocusEffect } from 'expo-router';
import { Colors, Spacing } from '@/src/constants/theme';
import { Mascot } from '@/src/components/Mascot';
import { FocusCompanion } from '@/src/components/FocusCompanion';
import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';
import { CircularProgressRing } from '@/src/components/CircularProgressRing';
import { SegmentedControl } from '@/src/components/SegmentedControl';
import { MovementBreakView } from '@/src/components/MovementBreakView';
import { useTimer } from '@/src/hooks/useTimer';
import {
  formatTime,
  TimerMode,
  CompletedActivityEvent,
  TimerConfig,
  DEFAULT_CONFIG,
} from '@/src/engine/timerEngine';
import { activityRepository } from '@/src/storage/ActivityRepository';
import { ActivityRecord, DailyStats } from '@/src/storage/schema';

export default function TimerScreen() {
  const { userId } = useAuth();
  const currentUserId = userId ?? 'guest';

  const [config, setConfig] = useState<TimerConfig>(DEFAULT_CONFIG);
  const [todayStats, setTodayStats] = useState<DailyStats>({
    dateKey: '',
    dayLabel: 'Today',
    focusBlocks: 0,
    focusMinutes: 0,
    reportedReps: 0,
    skippedBreaks: 0,
  });

  const loadData = useCallback(async () => {
    try {
      const [stats, settings] = await Promise.all([
        activityRepository.getTodayStats(currentUserId),
        activityRepository.getSettings(currentUserId),
      ]);
      setTodayStats(stats);
      setConfig({
        focusDurationSeconds: settings.focusDurationSeconds,
        breakDurationSeconds: settings.breakDurationSeconds,
        repGoal: settings.repGoal,
        soundEnabled: settings.soundEnabled,
        notificationsEnabled: settings.notificationsEnabled,
      });
    } catch (err) {
      console.warn('Error loading today stats and settings:', err);
    }
  }, [currentUserId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleActivityCompleted = useCallback(
    async (activity: CompletedActivityEvent) => {
      try {
        const record: ActivityRecord = {
          id: activity.id,
          userId: currentUserId,
          mode: activity.mode,
          startedAt: activity.startedAt,
          completedAt: activity.completedAt,
          focusSeconds: activity.focusSeconds,
          breakSeconds: activity.breakSeconds,
          movementLabel: activity.movementLabel,
          repGoal: activity.repGoal,
          reportedReps: activity.reportedReps,
          breakOutcome: activity.breakOutcome,
          syncStatus: 'pending',
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        };
        await activityRepository.saveActivity(record);
        await loadData();
      } catch (err) {
        console.warn('Error saving completed activity:', err);
      }
    },
    [currentUserId, loadData]
  );

  const {
    snapshot,
    start,
    pause,
    resume,
    reset,
    setMode,
    recordBreakResponse,
    endBreakEarly,
  } = useTimer({
    config,
    onActivityCompleted: handleActivityCompleted,
  });

  const isBreakPhase =
    snapshot.state === 'running_break' || snapshot.state === 'paused_break';

  const progress =
    snapshot.totalSeconds > 0
      ? 1 - snapshot.remainingSeconds / snapshot.totalSeconds
      : 0;

  const handleResetPress = () => {
    if (snapshot.state === 'idle_focus') return;

    const message =
      snapshot.state === 'running_focus' || snapshot.state === 'paused_focus'
        ? 'Discard this active focus session and reset timer?'
        : 'Reset timer to start fresh? (Completed focus blocks are preserved in history)';

    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        reset();
      }
    } else {
      Alert.alert('Reset Timer', message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: reset },
      ]);
    }
  };

  // If in break phase, show MovementBreakView
  if (isBreakPhase) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <MovementBreakView
          snapshot={snapshot}
          onRecordResponse={recordBreakResponse}
          onEndBreakEarly={endBreakEarly}
          onPause={pause}
          onResume={resume}
        />
      </SafeAreaView>
    );
  }

  const isRunning = snapshot.state === 'running_focus';
  const isPaused = snapshot.state === 'paused_focus';
  const isReady = snapshot.state === 'ready_focus';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Wordmark */}
        <View style={styles.header}>
          <View style={styles.wordmarkRow}>
            <Mascot pose="avatar" size={32} alt="Repomodore Logo" />
            <Text style={styles.wordmark}>Repomodore</Text>
          </View>
          <Text style={styles.tagline}>Focus. Rep. Repeat.</Text>
        </View>

        {/* Mode Segmented Control */}
        <View style={styles.modeControlWrapper}>
          <SegmentedControl<TimerMode>
            options={[
              { value: 'study', label: 'Study' },
              { value: 'study_squats', label: 'Study + Squats' },
            ]}
            value={snapshot.mode}
            onChange={(mode) => {
              if (mode === snapshot.mode) return;
              if (isRunning || isPaused) {
                const message = 'Changing mode will reset the active timer. Proceed?';
                if (Platform.OS === 'web') {
                  if (window.confirm(message)) {
                    setMode(mode, true);
                  }
                } else {
                  Alert.alert('Change Mode', message, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Change Mode',
                      style: 'destructive',
                      onPress: () => setMode(mode, true),
                    },
                  ]);
                }
              } else {
                setMode(mode, true);
              }
            }}
          />
        </View>

        {/* Circular Timer Ring */}
        <View style={styles.timerRingSection}>
          <CircularProgressRing
            size={270}
            strokeWidth={14}
            progress={progress}
            trackColor={Colors.accentSoft}
            progressColor={Colors.accent}
          >
            <View style={styles.ringInnerContent}>
              <Text style={styles.phaseBadge}>
                {isReady
                  ? 'READY TO FOCUS'
                  : isRunning
                  ? 'FOCUS SESSION'
                  : isPaused
                  ? 'PAUSED'
                  : 'FOCUS'}
              </Text>
              <Text
                style={styles.countdownText}
                accessibilityRole="timer"
                accessibilityLabel={`${formatTime(snapshot.remainingSeconds)} remaining`}
              >
                {formatTime(snapshot.remainingSeconds)}
              </Text>
              <Text style={styles.phaseCaption}>
                {isReady
                  ? 'Break complete! Tap start when ready.'
                  : 'Focus on what matters.'}
              </Text>
            </View>
          </CircularProgressRing>
        </View>

        {/* Primary Controls */}
        <View style={styles.controlsSection}>
          {isRunning ? (
            <Button
              title="Pause"
              size="large"
              variant="primary"
              onPress={pause}
              style={styles.mainActionBtn}
              accessibilityLabel="Pause focus timer"
            />
          ) : isPaused ? (
            <Button
              title="Resume"
              size="large"
              variant="primary"
              onPress={resume}
              style={styles.mainActionBtn}
              accessibilityLabel="Resume focus timer"
            />
          ) : (
            <Button
              title={isReady ? 'Start Next Focus' : 'Start'}
              size="large"
              variant="primary"
              onPress={start}
              style={styles.mainActionBtn}
              accessibilityLabel="Start focus timer"
            />
          )}

          <Button
            title="Reset"
            variant="secondary"
            onPress={handleResetPress}
            disabled={snapshot.state === 'idle_focus'}
            style={styles.resetBtn}
            accessibilityLabel="Reset timer"
          />
        </View>

        <FocusCompanion playing={isRunning} repGoal={snapshot.mode === 'study_squats' ? snapshot.repGoal : undefined} />
        {/* Daily Summary Card */}
        <Card style={styles.todayCard}>
          <Text style={styles.todayTitle}>Today</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statNum}>{todayStats.focusBlocks}</Text>
              <Text style={styles.statLabel}>Blocks</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statNum}>{todayStats.reportedReps}</Text>
              <Text style={styles.statLabel}>Squats</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statNum}>{todayStats.focusMinutes}m</Text>
              <Text style={styles.statLabel}>Focused</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    alignItems: 'center',
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmark: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.ink,
    marginLeft: Spacing.sm,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    color: Colors.muted,
    fontWeight: '500',
    marginTop: 2,
  },
  modeControlWrapper: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  timerRingSection: {
    marginVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInnerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.accent,
    letterSpacing: 1,
    marginBottom: 4,
  },
  countdownText: {
    fontSize: 58,
    fontWeight: '800',
    color: Colors.ink,
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  phaseCaption: {
    fontSize: 13,
    color: Colors.muted,
    marginTop: 4,
  },
  controlsSection: {
    width: '100%',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  mainActionBtn: {
    width: '100%',
    marginBottom: Spacing.sm,
  },
  resetBtn: {
    width: '100%',
  },
  todayCard: {
    width: '100%',
    padding: Spacing.md,
  },
  todayTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statNum: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.ink,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },
});
