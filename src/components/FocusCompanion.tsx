import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { Card } from './Card';
import { Mascot } from './Mascot';
import { Colors } from '../constants/theme';

export function FocusCompanion({ playing, repGoal, reducedMotion }: { playing: boolean; repGoal?: number; reducedMotion?: boolean }) {
  const [quiet, setQuiet] = useState(false);
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{playing ? 'IN GOOD COMPANY' : 'ONE THING AT A TIME'}</Text>
          <Text style={styles.title}>{playing ? 'A little focus goes a long way.' : 'Settle in. You’ve got this.'}</Text>
          <Text style={styles.detail}>{repGoal ? `Up next: ${repGoal} squats + a 5 min break` : 'Make a little room for what matters.'}</Text>
        </View>
        <View style={styles.portrait}>
          <Mascot pose="focus" size={78} motion={quiet ? 'none' : 'calm'} playing={playing} reducedMotion={reducedMotion} />
        </View>
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: quiet }}
        accessibilityLabel="Keep focus mascot still"
        onPress={() => setQuiet(value => !value)}
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
  portrait: { width: 78, height: 78, borderRadius: 16, overflow: 'hidden', backgroundColor: Colors.canvas },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, alignSelf: 'flex-start', marginBottom: -6, marginTop: 4 },
  indicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  indicatorOn: { backgroundColor: Colors.muted },
  toggleText: { fontSize: 10, color: Colors.muted },
});
