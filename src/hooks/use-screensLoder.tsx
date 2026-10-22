// components/FullScreenLoader.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, useColorScheme, BackHandler } from 'react-native';
import { Colors } from '@/constants/theme';

interface FullScreenLoaderProps {
  loading: boolean;
  message?: any;
}

export const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({ 
  loading, 
}) => {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme || 'light'];
  
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (loading) {
        return true; // Prevents back button action
      }
      return false; // Allows default back button action
    });

    return () => backHandler.remove();
  }, [loading]);
  
  if (!loading) return null;
  
  return (
    <View style={styles.overlay}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    borderRadius: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    minWidth: 150,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
});