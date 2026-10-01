import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { Card } from './Card';
import { Mascot } from './Mascot';
import { Colors } from '../constants/theme';
import { TimerState } from '../engine/timerEngine';

interface FocusCompanionProps {
  playing: boolean;
  repGoal?: number;
  reducedMotion?: boolean;
  state?: TimerState;
  celebrating?: boolean;
}

export function FocusCompanion({
  playing,
  repGoal,
  reducedMotion,
  state = 'idle_focus',
  celebrating = false,
}: FocusCompanionProps) {
  const [quiet, setQuiet] = useState(false);

  const isReady = state === 'ready_focus';
  const isPaused = state === 'paused_focus';

  let eyebrow = 'ONE THING AT A TIME';
  let title = 'Settle in. You’ve got this.';
  let detail = repGoal ? `Up next: ${repGoal} squats + a 5 min break` : 'Make a little room for what matters.';
  let pose: 'focus' | 'welcome' | 'break' = 'focus';
  let motion: 'none' | 'calm' | 'celebrate' = quiet ? 'none' : 'calm';

  if (celebrating) {
    eyebrow = 'GOAL ACHIEVED!';
    title = 'Awesome focus block completed!';
    detail = repGoal ? `Time for ${repGoal} squats and a refreshing break!` : 'Take a moment to breathe and reset.';
    pose = 'welcome';
    motion = 'celebrate';
  } else if (isReady) {
    eyebrow = 'READY FOR ACTION';
    title = 'Break complete! Feeling refreshed?';
    detail = 'Tap start whenever you’re ready for your next session.';
    pose = 'welcome';
    motion = quiet ? 'none' : 'calm';
  } else if (playing) {
    eyebrow = 'IN GOOD COMPANY';
    title = 'A little focus goes a long way.';
    detail = repGoal ? `Up next: ${repGoal} squats + a 5 min break` : 'Lock in. Your companion is right here with you.';
    pose = 'focus';
    motion = quiet ? 'none' : 'calm';
  } else if (isPaused) {
    eyebrow = 'TAKING A BREATHER';
    title = 'Timer paused. Take a deep breath.';
    detail = 'Resume when you are ready to jump back in.';
    pose = 'focus';
    motion = 'none';
  } else {
    eyebrow = 'ONE THING AT A TIME';
    title = 'Settle in. You’ve got this.';
    detail = repGoal ? `Focus session paired with ${repGoal} squats.` : 'Make a little room for what matters.';
    pose = 'welcome';
    motion = quiet ? 'none' : 'calm';
  }

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.detail}>{detail}</Text>
        </View>
        <View style={styles.portrait}>
          <Mascot
            pose={pose}
            size={78}
            motion={motion}
            playing={playing || celebrating || isReady}
            reducedMotion={reducedMotion}
          />
        </View>
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: quiet }}
        accessibilityLabel="Keep focus mascot still"
        onPress={() => setQuiet((value) => !value)}
        style={[
          styles.toggle,
          Platform.OS === 'web' ? ({ cursor: 'pointer', userSelect: 'none' } as any) : null,
        ]}
      >
        <View style={[styles.indicator, quiet && styles.indicatorOn]} />
        <Text style={styles.toggleText}>{quiet ? 'Still mascot' : 'Gentle mascot motion'}</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', marginBottom: 16, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1 },
  eyebrow: { color: Colors.accent, fontSize: 9, fontWeight: '700', letterSpacing: 1.1 },
  title: { color: Colors.ink, fontSize: 15, fontWeight: '600', marginTop: 5, lineHeight: 21 },
  detail: { color: Colors.muted, fontSize: 11, marginTop: 5, lineHeight: 17 },
  portrait: {
    width: 78,
    height: 78,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    alignSelf: 'flex-start',
    marginBottom: -6,
    marginTop: 4,
  },
  indicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  indicatorOn: { backgroundColor: Colors.muted },
  toggleText: { fontSize: 10, color: Colors.muted },
});
