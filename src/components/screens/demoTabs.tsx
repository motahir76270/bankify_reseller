import React, { useRef, useState, useEffect } from 'react';
import {
  useColorScheme,
  StyleSheet,
  View,
  Pressable,
  Animated,
  Text,
  Platform,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

// Import your screens directly
import DashboardScreen from '@/app/(tabs)/index';
import HistoryScreen from '@/app/(tabs)/history';
import WalletScreen from '@/app/(tabs)/wallet';
import ProfileScreen from '@/app/(tabs)/profile';
import SettingsScreen from '@/app/(tabs)/settings';

const TABS = [
  {
    key: 'index',
    title: 'Wallet',
    icon: 'wallet',
    iconOutline: 'wallet-outline',
    lib: 'ionicons',
  },
  {
    key: 'history',
    title: 'History',
    icon: 'clock-outline',
    iconOutline: 'clock-outline',
    lib: 'mci',
  },
  {
    key: 'dashboard',
    title: 'Dashboard',
    icon: 'grid',
    iconOutline: 'grid-outline',
    lib: 'ionicons',
    center: true,
  },
  {
    key: 'profile',
    title: 'Profile',
    icon: 'person',
    iconOutline: 'person-outline',
    lib: 'ionicons',
  },
  {
    key: 'settings',
    title: 'Settings',
    icon: 'settings',
    iconOutline: 'settings-outline',
    lib: 'ionicons',
  },
] as const;

const INITIAL_PAGE = 2;

export default function AppTabs() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const safeInset = useSafeAreaInsets();

  const pagerRef = useRef<PagerView>(null);
  const [page, setPage] = useState(INITIAL_PAGE);

  const primaryColor = colors.buttonPrimary ?? '#6366F1';

  const goTo = (index: number) => {
    pagerRef.current?.setPage(index);
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }}>
      {/* ============ SLIDING PAGER ============ */}
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={INITIAL_PAGE}
        onPageSelected={(e) => setPage(e.nativeEvent.position)}
        overdrag
      >
        <View key="0" style={{ flex: 1 }}><WalletScreen /></View>
        <View key="1" style={{ flex: 1 }}><HistoryScreen /></View>
        <View key="2" style={{ flex: 1 }}><DashboardScreen /></View>
        <View key="3" style={{ flex: 1 }}><ProfileScreen /></View>
        <View key="4" style={{ flex: 1 }}><SettingsScreen /></View>
      </PagerView>

      {/* ============ FLOATING TAB BAR CONTAINER ============ */}
      <View
        pointerEvents="box-none"
        style={[
          styles.tabBarWrapper,
          { bottom: Math.max(safeInset.bottom, 12) },
        ]}
      >
        {/* FROSTED GLASS BACKGROUND */}
        <View style={styles.blurContainer}>
          <BlurView
            tint={isDark ? 'dark' : 'light'}
            intensity={Platform.OS === 'ios' ? 80 : 100}
            style={StyleSheet.absoluteFill}
          />
          {/* Subtle Outer Border Layer */}
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.blurBorder,
              {
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.12)'
                  : 'rgba(255, 255, 255, 0.8)',
                backgroundColor: isDark
                  ? 'rgba(15, 23, 42, 0.65)'
                  : 'rgba(196, 201, 206, 0.65)',
              },
            ]}
          />
        </View>

        {/* TAB BUTTONS LAYER */}
        <View style={styles.tabRow}>
          {TABS.map((tab, i) => {
            const focused = page === i;

            // ======= CENTER BUTTON =======
            if ('center' in tab && tab.center) {
              return (
                <CenterTabButton
                  key={tab.key}
                  focused={focused}
                  primaryColor={primaryColor}
                  isDark={isDark}
                  onPress={() => goTo(i)}
                />
              );
            }

            // ======= STANDARD BUTTONS =======
            return (
              <TabButton
                key={tab.key}
                tab={tab}
                focused={focused}
                isDark={isDark}
                colors={colors}
                primaryColor={primaryColor}
                onPress={() => goTo(i)}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

// Sub-component for smooth animated standard tabs
function TabButton({ tab, focused, isDark, colors, primaryColor, onPress }: any) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1 : 0.92)).current;
  const opacityAnim = useRef(new Animated.Value(focused ? 1 : 0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1 : 0.92,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: focused ? 1 : 0.6,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  const activeColor = focused
    ? isDark
      ? '#FFFFFF'
      : primaryColor
    : isDark
    ? '#97a0ad'
    : '#18191b';

  return (
    <Pressable
      onPress={onPress}
      style={styles.tabButton}
      hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
    >
      <Animated.View
        style={[
          styles.iconWrapper,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        {/* Soft pill indicator behind active icon */}
        {focused && (
          <View
            style={[
              styles.activePill,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : `${primaryColor}15`,
              },
            ]}
          />
        )}

        {tab.lib === 'mci' ? (
          <MaterialCommunityIcons
            name={(focused ? tab.icon : tab.iconOutline) as any}
            size={22}
            color={activeColor}
          />
        ) : (
          <Ionicons
            name={(focused ? tab.icon : tab.iconOutline) as any}
            size={22}
            color={activeColor}
          />
        )}

        <Text
          style={[
            styles.tabLabel,
            { color: activeColor, fontWeight: focused ? '800' : '600' },
          ]}
        >
          {tab.title}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// Sub-component for elevated action button
function CenterTabButton({ focused, primaryColor, isDark, onPress }: any) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.centerButtonWrapper}
    >
      <Animated.View
        style={[
          styles.centerButton,
          {
            backgroundColor: primaryColor,
            borderColor: isDark ? '#0F172A' : '#FFFFFF',
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Ionicons name="grid" size={24} color="#FFFFFF" />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    alignSelf: 'center',
    width: '92%',
    height: 64,
  },
  blurContainer: {
    ...StyleSheet.absoluteFill,
    borderRadius: 32,
    overflow: 'hidden', // Clips blur cleanly to rounded border
  },
  blurBorder: {
    borderRadius: 32,
    borderWidth: 1,
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    width: '100%',
  },
  activePill: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    letterSpacing: -0.2,
  },
  centerButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    zIndex: 10,
  },
  centerButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24, // Lift above bar
    borderWidth: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});