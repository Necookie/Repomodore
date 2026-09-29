import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function IndexScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Repomodore</Text>
      <Text style={styles.subtitle}>Focus. Rep. Repeat.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF7F2',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#20232A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#687078',
  },
});
