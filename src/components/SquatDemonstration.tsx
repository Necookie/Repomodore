import React, { memo, useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { ClipPath, Defs, Ellipse, G, Image as SvgImage, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Colors } from '@/src/constants/theme';
import { getSquatFrame, SQUAT_DEMO_MS } from '@/src/engine/mascotMotion';
import { useMotionClock, useMotionPreference } from '@/src/hooks/useMascotMotion';

const standingArt = require('@/assets/mascot/squat-standing.png');

/** The face and hoodie stay rigid; the trouser silhouette bends at hips and knees.
 * Both feet are cut from the same source art and stay on a fixed ground plane.
 * Clipping is done at render time so the original generated artwork stays intact. */
export const SquatFigure = memo(function SquatFigure({ depth = 0, size = 220 }: { depth?: number; size?: number }) {
  const id = useId().replace(/:/g, '');
  const drop = depth * 43;
  const hipY = 204 + drop;
  const kneeY = 252 + depth * 13;
  const leftKnee = 119 - depth * 37;
  const rightKnee = 184 + depth * 38;
  return (
    <Svg width={size} height={size * 1.1} viewBox="35 0 240 330">
      <Defs>
        <ClipPath id={`${id}body`}>
          <Rect x="60" y="0" width="200" height="189" />
          <Rect x="108" y="188" width="89" height="18" />
        </ClipPath>
        <ClipPath id={`${id}feet`}><Rect x="60" y="289" width="200" height="39" /></ClipPath>
        <LinearGradient id={`${id}pants`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#343437" /><Stop offset="1" stopColor="#18191A" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="154" cy="320" rx="80" ry="5" fill="#20232A" opacity="0.07" />
      {/* Keep both ends behind the hip, above the inner thigh at full depth. */}
      <Path d={`M 116 ${hipY - 2} C 86 ${hipY + 26} 43 ${hipY + 42} 49 ${hipY + 12} C 51 ${hipY + 1} 60 ${hipY - 8} 68 ${hipY - 10} C 52 ${hipY - 17} 37 ${hipY + 3} 41 ${hipY + 24} C 49 ${hipY + 57} 93 ${hipY + 34} 120 ${hipY + 8} Z`} fill="#F4A99F" stroke="#171719" strokeWidth="2.4" strokeLinejoin="round" />
      <SvgImage href={standingArt} width="300" height="328.27" clipPath={`url(#${id}feet)`} />
      <G fill={`url(#${id}pants)`} stroke="#161719" strokeWidth="2.3" strokeLinejoin="round">
        <Path d={`M 112 ${hipY - 6} Q 130 ${hipY - 10} 153 ${hipY + 2} C 143 ${hipY + 12} ${leftKnee + 19} ${kneeY - 10} ${leftKnee + 15} ${kneeY + 2} Q ${leftKnee + 12} ${kneeY + 10} ${leftKnee + 13} ${kneeY + 13} C ${leftKnee + 15} ${kneeY + 20} 123 278 118 290 Q 107 295 97 290 C 94 281 ${leftKnee - 11} ${kneeY + 21} ${leftKnee - 15} ${kneeY + 10} Q ${leftKnee - 21} ${kneeY - 2} ${leftKnee - 10} ${kneeY - 12} Q 99 ${hipY + 2} 112 ${hipY - 6} Z`} />
        <Path d={`M 152 ${hipY + 2} Q 176 ${hipY - 10} 195 ${hipY - 6} Q 208 ${hipY + 2} ${rightKnee + 10} ${kneeY - 12} Q ${rightKnee + 21} ${kneeY - 2} ${rightKnee + 15} ${kneeY + 10} C ${rightKnee + 11} ${kneeY + 21} 206 281 203 290 Q 193 295 182 290 C 177 278 ${rightKnee - 15} ${kneeY + 20} ${rightKnee - 13} ${kneeY + 13} Q ${rightKnee - 12} ${kneeY + 10} ${rightKnee - 15} ${kneeY + 2} C ${rightKnee - 19} ${kneeY - 10} 162 ${hipY + 12} 152 ${hipY + 2} Z`} />
      </G>
      <Path d={`M 114 ${hipY + 3} Q 151 ${hipY + 23} 190 ${hipY + 2} M ${leftKnee - 9} ${kneeY + 4} l 15 4 M ${rightKnee - 6} ${kneeY + 4} l 14 -4`} fill="none" stroke="#111214" strokeWidth="1.8" opacity="0.65" />
      <G transform={`translate(0 ${drop})`}>
        <SvgImage href={standingArt} width="300" height="328.27" clipPath={`url(#${id}body)`} />
      </G>
    </Svg>
  );
});

export function SquatDemonstration({ playing, replayKey, reducedMotion: override, size = 212 }: {
  playing: boolean; replayKey: number; reducedMotion?: boolean; size?: number;
}) {
  const { reducedMotion, foreground } = useMotionPreference(override);
  const elapsed = useMotionClock(playing && foreground && !reducedMotion, SQUAT_DEMO_MS, replayKey);
  const frame = getSquatFrame(elapsed);
  const caption = reducedMotion ? 'Stand tall · lower · hold · rise' : !playing ? 'Demo paused' : frame.cue;
  return (
    <View style={styles.container}>
      <View accessible accessibilityRole="image" accessibilityLabel="Squat demonstration: stand with feet planted, bend your knees and hips slowly, hold, then stand tall.">
        <SquatFigure depth={reducedMotion ? 0 : frame.depth} size={size} />
      </View>
      <View style={styles.cueRow}>
        <View style={styles.dot} />
        <Text style={styles.cue}>{caption}</Text>
        {!reducedMotion && !frame.complete ? <Text style={styles.count}>Demo {frame.repetition} of 2</Text> : null}
      </View>
      <Text style={styles.note}>{reducedMotion ? 'Still pose · reduced motion' : frame.complete ? 'Move at your own pace.' : 'Follow along, or watch first.'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  cueRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10, minHeight: 22 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  cue: { fontSize: 13, fontWeight: '600', color: Colors.ink },
  count: { fontSize: 11, color: Colors.muted, marginLeft: 5 },
  note: { color: Colors.muted, fontSize: 12, marginTop: 4 },
});
