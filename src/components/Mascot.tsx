import React, { memo } from 'react';
import { Image, ImageSourcePropType, ImageStyle, StyleProp, StyleSheet, View, Text } from 'react-native';
import { useMotionClock, useMotionPreference } from '@/src/hooks/useMascotMotion';
import { Colors } from '@/src/constants/theme';

export type MascotPose = 'welcome' | 'squat' | 'break' | 'focus' | 'avatar';

interface MascotProps {
  pose: MascotPose;
  size?: number;
  style?: StyleProp<ImageStyle>;
  alt?: string;
  isDecorative?: boolean;
  motion?: 'none' | 'calm' | 'celebrate';
  playing?: boolean;
  reducedMotion?: boolean;
}

const mascotSources: Record<MascotPose, ImageSourcePropType> = {
  welcome: require('@/assets/mascot/welcome.png'),
  squat: require('@/assets/mascot/squat.png'),
  break: require('@/assets/mascot/break.png'),
  focus: require('@/assets/mascot/focus.png'),
  avatar: require('@/assets/mascot/avatar.png'),
};

const defaultAlts: Record<MascotPose, string> = {
  welcome: 'Repomodore gym rat mascot wearing glasses and a gray hoodie with laptop and dumbbell',
  squat: 'Mascot performing a bodyweight squat',
  break: 'Mascot resting comfortably on a beanbag chair holding a warm mug',
  focus: 'Mascot focused intently studying at a laptop desk',
  avatar: 'Repomodore mascot face avatar',
};

export const Mascot = memo(function Mascot({
  pose, size = 120, style, alt, isDecorative = false, motion = 'none', playing = true, reducedMotion: override,
}: MascotProps) {
  const { reducedMotion, foreground } = useMotionPreference(override);
  const elapsed = useMotionClock(playing && foreground && !reducedMotion && motion !== 'none', motion === 'celebrate' ? 1500 : Infinity, motion);
  const celebration = motion === 'celebrate' && elapsed < 1500 && !reducedMotion;
  const progress = elapsed / 1500;
  const scale = motion === 'calm' && !reducedMotion ? 1 + Math.sin(elapsed / 1400) * 0.006 : 1;
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image
        source={mascotSources[pose]}
        style={[styles.image, { width: size, height: size, transform: [{ scale }] }, style]}
        resizeMode="contain"
        accessible={!isDecorative}
        accessibilityLabel={isDecorative ? undefined : (alt ?? defaultAlts[pose])}
        accessibilityRole="image"
      />
      {celebration ? [-1, 1].map(direction => (
        <Text key={direction} accessible={false} style={[styles.sparkle, {
          left: size / 2 + direction * (size * 0.3 + progress * 12) - 8,
          top: size * 0.16 - progress * 14,
          opacity: Math.sin(progress * Math.PI),
          transform: [{ scale: 0.7 + progress * 0.5 }, { rotate: `${direction * progress * 25}deg` }],
        }]}>✦</Text>
      )) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  image: { maxWidth: '100%', maxHeight: '100%' },
  sparkle: { position: 'absolute', color: Colors.accent, fontSize: 22, fontWeight: '700' },
});
