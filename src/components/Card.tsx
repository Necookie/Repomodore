import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { Colors, Radius, Spacing } from '@/src/constants/theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'surface' | 'dark' | 'soft';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'surface',
  style,
  ...props
}) => {
  return (
    <View
      style={[
        styles.base,
        variant === 'surface' && styles.surface,
        variant === 'dark' && styles.dark,
        variant === 'soft' && styles.soft,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  surface: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  dark: {
    backgroundColor: Colors.darkPanel,
    borderWidth: 1,
    borderColor: '#383B44',
  },
  soft: {
    backgroundColor: Colors.accentSoft,
  },
});
