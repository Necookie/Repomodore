import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface AndroidIconProps {
  size?: number;
  color?: string;
  eyeColor?: string;
}

/**
 * Recognizable Android robot SVG icon used in download badges and mobile calls to action.
 */
export const AndroidIcon: React.FC<AndroidIconProps> = ({
  size = 24,
  color = '#3DDC84',
  eyeColor = '#FFFFFF',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Head dome and antennas */}
      <Path
        d="M17.52 4.13l1.42-2.46a.5.5 0 0 0-.18-.68.5.5 0 0 0-.68.18L16.6 3.7A9.45 9.45 0 0 0 12 2.5c-1.66 0-3.22.43-4.6 1.2L5.92 1.17a.5.5 0 0 0-.68-.18.5.5 0 0 0-.18.68l1.42 2.46A9.42 9.42 0 0 0 2.5 12h19a9.42 9.42 0 0 0-3.98-7.87z"
        fill={color}
      />
      {/* Left & Right eyes */}
      <Circle cx="7.5" cy="7.8" r="1.1" fill={eyeColor} />
      <Circle cx="16.5" cy="7.8" r="1.1" fill={eyeColor} />
    </Svg>
  );
};
