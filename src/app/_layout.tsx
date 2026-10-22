// import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import React, { useEffect, useRef } from 'react';
import { useColorScheme } from 'react-native';
import { Provider } from 'react-redux';
import { store } from '@/redux/store';

import AlertManager from '@/components/AlertManager';
import { setGlobalAlertRef } from '@/components/service/AlertService';
import { StatusBar } from 'expo-status-bar';
import AppScreens from '@/components/screens/app';
import { NavigationBar } from 'expo-navigation-bar';

export default function RootLayout() {
  const colorScheme = useColorScheme();
    const alertRef = useRef<any>('alertRef');
    useEffect(() => {
    // Set the global alert reference
    if (alertRef.current) {
      setGlobalAlertRef(alertRef.current);
    }
  }, []);

  return (
    <Provider store={store}>
      <NavigationBar style="auto" />
      <AppScreens />
      <AlertManager ref={alertRef} />
      <StatusBar style="auto" />
    </Provider>
  );
}
