import React from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, View } from 'react-native';

export type MascotPose = 'welcome' | 'squat' | 'break' | 'focus' | 'avatar';

interface MascotProps {
  pose: MascotPose;
  size?: number;
  style?: StyleProp<ImageStyle>;
  alt?: string;
  isDecorative?: boolean;
}

const mascotSources: Record<MascotPose, any> = {
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

export const Mascot: React.FC<MascotProps> = ({
  pose,
  size = 120,
  style,
  alt,
  isDecorative = false,
}) => {
  const source = mascotSources[pose];
  const accessibilityLabel = isDecorative ? undefined : (alt ?? defaultAlts[pose]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image
        source={source}
        style={[
          styles.image,
          { width: size, height: size },
          style,
        ]}
        resizeMode="contain"
        accessible={!isDecorative}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="image"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '100%',
  },
});
