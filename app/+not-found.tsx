import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography } from '@/src/constants/theme';
import { Button } from '@/src/components/Button';
import { Mascot } from '@/src/components/Mascot';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Mascot pose="break" size={100} alt="Page not found" />
      <Text style={styles.title}>Route Not Found</Text>
      <Text style={styles.subtitle}>Let's get you back on track.</Text>
      <Button
        title="Return to Repomodore"
        variant="primary"
        onPress={() => router.replace('/')}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  title: {
    fontSize: Typography.headlineMobile,
    fontWeight: 'bold',
    color: Colors.ink,
    marginTop: Spacing.lg,
  },
  subtitle: {
    fontSize: Typography.body,
    color: Colors.muted,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  button: {
    minWidth: 200,
  },
});
