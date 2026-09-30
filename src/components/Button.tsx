import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  Platform,
  View,
} from 'react-native';
import { Colors, Radius, Spacing } from '@/src/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'ghost' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'default' | 'small' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'default',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const getContainerStyle = (pressed: boolean): StyleProp<ViewStyle> => {
    return [
      styles.base,
      styles[variant],
      size === 'small' && styles.smallContainer,
      size === 'large' && styles.largeContainer,
      pressed && !disabled && styles[`${variant}Pressed` as keyof typeof styles],
      disabled && styles.disabled,
      Platform.OS === 'web'
        ? ({
            outlineStyle: 'none',
            cursor: disabled || loading ? 'not-allowed' : 'pointer',
            userSelect: 'none',
          } as any)
        : null,
      style,
    ];
  };

  const getTextStyle = (): StyleProp<TextStyle> => {
    return [
      styles.baseText,
      styles[`${variant}Text` as keyof typeof styles],
      size === 'small' && styles.smallText,
      size === 'large' && styles.largeText,
      disabled && styles.disabledText,
      textStyle,
    ];
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => getContainerStyle(pressed)}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' || variant === 'ghost' ? Colors.ink : Colors.surface}
        />
      ) : (
        <View style={styles.content}>
          {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
          <Text style={getTextStyle()}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: Spacing.sm,
  },
  smallContainer: {
    minHeight: 40,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
  },
  largeContainer: {
    minHeight: 56,
    paddingHorizontal: Spacing.lg,
  },
  primary: {
    backgroundColor: Colors.accent,
  },
  primaryPressed: {
    backgroundColor: '#D65D4F',
  },
  secondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryPressed: {
    backgroundColor: Colors.canvas,
  },
  dark: {
    backgroundColor: Colors.darkPanel,
  },
  darkPressed: {
    backgroundColor: '#1E1F24',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostPressed: {
    backgroundColor: Colors.accentSoft,
  },
  danger: {
    backgroundColor: Colors.errorSoft,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  dangerPressed: {
    backgroundColor: '#FFCDD2',
  },
  disabled: {
    opacity: 0.5,
  },
  baseText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  smallText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 18,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: Colors.ink,
  },
  darkText: {
    color: '#FFFFFF',
  },
  ghostText: {
    color: Colors.muted,
  },
  dangerText: {
    color: Colors.error,
  },
  disabledText: {
    color: Colors.muted,
  },
});
