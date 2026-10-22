import React, { useState } from 'react';
import {
  useColorScheme,
  StyleSheet,
  View,
  Pressable,
  Text,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

import DashboardScreen from '@/app/(tabs)/index';
import HistoryScreen from '@/app/(tabs)/history';
import WalletScreen from '@/app/(tabs)/wallet';
import ProfileScreen from '@/app/(tabs)/profile';
import SettingsScreen from '@/app/(tabs)/settings';

const TABS = [
  { key: 'dashboard', title: 'Home', icon: 'home-outline', activeIcon: 'home', lib: 'ionicons' },
  { key: 'wallet', title: 'Wallet', icon: 'wallet-outline', activeIcon: 'wallet', lib: 'ionicons' },
  { key: 'history', title: 'History', icon: 'clock-outline', activeIcon: 'clock', lib: 'mci' },
  { key: 'profile', title: 'Profile', icon: 'person-outline', activeIcon: 'person', lib: 'ionicons' },
  { key: 'settings', title: 'Settings', icon: 'settings-outline', activeIcon: 'settings', lib: 'ionicons' },
] as const;

const SCREENS = [DashboardScreen,WalletScreen, HistoryScreen, ProfileScreen, SettingsScreen];

export default function AppTabs() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const safeInset = useSafeAreaInsets();

  const [page, setPage] = useState(0);
  const primaryColor = colors.buttonPrimary ?? '#6366F1';

  const ActiveScreen = SCREENS[page];
    
  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0F172A' : '#adb5bd' }}>
      {/* ============ ACTIVE SCREEN ============ */}
      <View style={{ flex: 1 }}>
        <ActiveScreen />
      </View>

      {/* ============ SIMPLE TAB BAR ============ */}
      <View
        style={[
          styles.tabBar,
          {
            paddingBottom: Math.max(safeInset.bottom, 8),
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(220, 232, 238, 0.95)',
            borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          },
        ]}
      >
        {TABS.map((tab, i) => {
          const focused = page === i;
          const color = focused
            ? isDark
              ? '#FFFFFF'
              : primaryColor
            : isDark
            ? '#94A3B8'
            : '#64748B';

          const iconName = focused ? tab.activeIcon : tab.icon;

          return (
            <Pressable
              key={tab.key}
              onPress={() => setPage(i)}
              style={styles.tabButton}
              hitSlop={8}
            >
              {tab.lib === 'mci' ? (
                <MaterialCommunityIcons name={iconName as any} size={22} color={color} />
              ) : (
                <Ionicons name={iconName as any} size={22} color={color} />
              )}
              <Text style={[styles.tabLabel, { color }]}>{tab.title}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});