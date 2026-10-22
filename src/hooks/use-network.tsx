import React from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';

const InternetPage = ({onRetry}:any) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>📡</Text>
      </View>

      <Text style={styles.title}>No Internet Connection</Text>

      <Text style={styles.description}>
        Your internet connection is currently off.
        Please turn on your Wi-Fi or mobile data to continue.
      </Text>

      <TouchableOpacity style={styles.button} onPress={onRetry}  >
        <Text style={styles.buttonText}>Retry</Text>
      </TouchableOpacity>

      <Text style={styles.helpText}>
        Check your Wi-Fi or mobile data connection.
      </Text>
    </View>
  );
};

export default InternetPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  icon: {
    fontSize: 42,
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },

  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 28,
  },

  button: {
    width: '100%',
    backgroundColor: '#2563EB',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  helpText: {
    marginTop: 18,
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
