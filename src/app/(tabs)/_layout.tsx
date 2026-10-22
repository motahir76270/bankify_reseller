import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import React from 'react';
import { useColorScheme } from 'react-native';
import AppTabs from '@/components/app-tabs';
import { NavigationBar } from 'expo-navigation-bar';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={DefaultTheme}>
      <NavigationBar style="light" />
      <AppTabs />
    </ThemeProvider>
  );
}