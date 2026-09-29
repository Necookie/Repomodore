import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { Redirect } from 'expo-router';
import { Colors } from '@/src/constants/theme';
import { Mascot } from '@/src/components/Mascot';
import { AuthScreen } from '@/src/components/AuthScreen';

export default function IndexRoute() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Mascot pose="avatar" size={80} alt="Repomodore loading" />
        <ActivityIndicator size="large" color={Colors.accent} style={styles.spinner} />
      </View>
    );
  }

  if (!isSignedIn) {
    return <AuthScreen />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginTop: 20,
  },
});
