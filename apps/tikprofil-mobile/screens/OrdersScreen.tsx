import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function OrdersScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Siparişlerim</Text>
      <Text style={styles.subtitle}>Siparişleriniz burada görünecek.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});
