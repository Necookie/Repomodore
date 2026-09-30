import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MovementBreakView } from '@/src/components/MovementBreakView';
import { FocusCompanion } from '@/src/components/FocusCompanion';
import { Button } from '@/src/components/Button';
import { SquatFigure } from '@/src/components/SquatDemonstration';
import { createInitialSnapshot, recordBreakResponse, TimerSnapshot } from '@/src/engine/timerEngine';
import { Colors } from '@/src/constants/theme';

function newBreak(): TimerSnapshot {
  return { ...createInitialSnapshot(), state: 'running_break', totalSeconds: 300, remainingSeconds: 300, activeRecordId: `preview-${Date.now()}` };
}

/** Local design review only; no authentication, persistence or activity writes. */
export default function MascotPreview() {
  const [snapshot, setSnapshot] = useState(newBreak);
  const [scene, setScene] = useState<'break' | 'focus' | 'poses'>('break');
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (snapshot.state !== 'running_break' || scene !== 'break') return;
    const interval = setInterval(() => setSnapshot(value => ({ ...value, remainingSeconds: Math.max(0, value.remainingSeconds - 1) })), 1000);
    return () => clearInterval(interval);
  }, [snapshot.state, scene]);
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.toolbar}>
        <Text style={styles.title}>Mascot studio</Text>
        <View style={styles.actions}>
          <Button title="Focus" variant="secondary" size="small" onPress={() => setScene('focus')} />
          <Button title="New break" variant="secondary" size="small" onPress={() => { setSnapshot(newBreak()); setScene('break'); }} />
          <Button title="Poses" variant="secondary" size="small" onPress={() => setScene('poses')} />
          <Button title={reduced ? 'Motion: reduced' : 'Motion: full'} variant="ghost" size="small" onPress={() => setReduced(value => !value)} />
        </View>
        <Text style={styles.note}>Local preview · no reps or sessions are saved</Text>
      </View>
      {scene === 'break' ? <MovementBreakView key={snapshot.activeRecordId} snapshot={snapshot} reducedMotion={reduced}
        onRecordResponse={action => setSnapshot(current => recordBreakResponse(current, action))}
        onEndBreakEarly={() => setScene('focus')}
        onPause={() => setSnapshot(current => ({ ...current, state: 'paused_break' }))}
        onResume={() => setSnapshot(current => ({ ...current, state: 'running_break' }))} />
        : scene === 'focus' ? <View style={styles.focus}><Text style={styles.timer}>32:15</Text><Text style={styles.focusLabel}>Focus on what matters.</Text><FocusCompanion playing repGoal={10} reducedMotion={reduced} /></View>
        : <ScrollView contentContainerStyle={styles.poses}>{[0, 0.5, 1].map(depth => <View key={depth}><SquatFigure depth={depth} size={240} /><Text style={styles.poseLabel}>{depth === 0 ? 'Stand tall' : depth === 1 ? 'Hold' : 'Lower'}</Text></View>)}</ScrollView>}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.canvas },
  toolbar: { padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: Colors.ink, marginBottom: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  note: { fontSize: 11, color: Colors.muted, marginTop: 8 },
  focus: { width: '100%', maxWidth: 470, padding: 24, alignSelf: 'center' },
  timer: { fontSize: 64, textAlign: 'center', fontWeight: '700', color: Colors.ink, marginTop: 40 },
  focusLabel: { color: Colors.muted, textAlign: 'center', marginBottom: 40 },
  poses: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', padding: 20 },
  poseLabel: { textAlign: 'center', color: Colors.muted, margin: 12 },
});
