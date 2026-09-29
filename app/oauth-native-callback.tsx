import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Colors, Spacing, Typography } from '@/src/constants/theme';
import { Mascot } from '@/src/components/Mascot';

export default function OAuthNativeCallback() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      router.replace('/(tabs)');
      return;
    }

    // Give a brief window for Clerk's handleOAuth/setActive to resolve
    const timer = setTimeout(() => {
      router.replace('/');
    }, 1500);

    return () => clearTimeout(timer);
  }, [isLoaded, isSignedIn, router]);

  return (
    <View style={styles.container}>
      <Mascot pose="focus" size={90} alt="Authenticating" />
      <ActivityIndicator size="large" color={Colors.accent} style={styles.spinner} />
      <Text style={styles.text}>Completing sign-in...</Text>
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
  spinner: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  text: {
    fontSize: Typography.body,
    color: Colors.muted,
    fontWeight: '500',
  },
});
