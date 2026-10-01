import React, { memo } from 'react';
import { Image, ImageSourcePropType, ImageStyle, StyleProp, StyleSheet, View, Text } from 'react-native';
import { useMotionClock, useMotionPreference } from '@/src/hooks/useMascotMotion';
import { getSquatFrame, SQUAT_DEMO_MS } from '@/src/engine/mascotMotion';
import { SquatFigure } from '@/src/components/SquatDemonstration';
import { Colors } from '@/src/constants/theme';

export type MascotPose = 'welcome' | 'squat' | 'break' | 'focus' | 'avatar';

export interface MascotProps {
  pose: MascotPose;
  size?: number;
  style?: StyleProp<ImageStyle>;
  alt?: string;
  isDecorative?: boolean;
  motion?: 'none' | 'calm' | 'celebrate';
  animated?: boolean;
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
  pose,
  size = 120,
  style,
  alt,
  isDecorative = false,
  motion = 'none',
  animated = false,
  playing = true,
  reducedMotion: override,
}: MascotProps) {
  const { reducedMotion, foreground } = useMotionPreference(override);
  const isMotionActive = playing && foreground && !reducedMotion && (motion !== 'none' || animated);
  const elapsed = useMotionClock(
    isMotionActive,
    motion === 'celebrate' ? 1800 : Infinity,
    motion
  );

  const celebration = motion === 'celebrate' && elapsed < 1800 && !reducedMotion;
  const progress = Math.min(1, elapsed / 1800);

  // Subtle breathing and swaying for calm motion
  const scale =
    (motion === 'calm' || animated) && !reducedMotion
      ? 1 + Math.sin(elapsed / 1200) * 0.02
      : 1;
  const translateY =
    (motion === 'calm' || animated) && !reducedMotion
      ? Math.sin(elapsed / 1200) * 1.8
      : 0;

  // If pose is squat and animation is requested, render the articulated SVG SquatFigure
  if (pose === 'squat' && (animated || motion !== 'none') && !reducedMotion) {
    const frame = getSquatFrame(elapsed % SQUAT_DEMO_MS);
    return (
      <View
        style={[styles.container, { width: size, height: size }]}
        accessible={!isDecorative}
        accessibilityLabel={isDecorative ? undefined : (alt ?? defaultAlts.squat)}
        accessibilityRole="image"
      >
        <SquatFigure depth={frame.depth} size={size * 0.9} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image
        source={mascotSources[pose]}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            transform: [{ scale }, { translateY }],
          },
          style,
        ]}
        resizeMode="contain"
        accessible={!isDecorative}
        accessibilityLabel={isDecorative ? undefined : (alt ?? defaultAlts[pose])}
        accessibilityRole="image"
      />
      {celebration ? (
        [-1, 1].map((direction) => (
          <Text
            key={direction}
            accessible={false}
            style={[
              styles.sparkle,
              {
                left: size / 2 + direction * (size * 0.32 + progress * 16) - 10,
                top: size * 0.12 - progress * 18,
                opacity: Math.sin(progress * Math.PI),
                transform: [
                  { scale: 0.7 + progress * 0.6 },
                  { rotate: `${direction * progress * 35}deg` },
                ],
              },
            ]}
          >
            ✦
          </Text>
        ))
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  image: { maxWidth: '100%', maxHeight: '100%' },
  sparkle: { position: 'absolute', color: Colors.accent, fontSize: 24, fontWeight: '700' },
});
