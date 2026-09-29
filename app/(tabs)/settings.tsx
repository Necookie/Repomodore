import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors, Spacing } from '@/src/constants/theme';
import { Card } from '@/src/components/Card';
import { AccountControl } from '@/src/components/AccountControl';

export default function SettingsTab() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Settings</Text>

      <Text style={styles.sectionTitle}>Account</Text>
      <Card style={styles.card}>
        <AccountControl />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
  },
  content: {
    padding: Spacing.md,
    paddingTop: Spacing.xl,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.ink,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  card: {
    marginBottom: Spacing.lg,
  },
});
