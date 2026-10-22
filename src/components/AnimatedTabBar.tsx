import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { BlurView } from "expo-blur";
import React, { useRef, useState } from "react";
import {
    Animated,
    Pressable,
    StyleSheet,
    useColorScheme,
    View
} from "react-native";
import PagerView from "react-native-pager-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ClassNotesScreen from "@/app/(tabs)/history";
import HomeScreen from "@/app/(tabs)/index";
import ProfileScreen from "@/app/(tabs)/profile";
import SettingsScreen from "@/app/(tabs)/settings";

const TABS = [
  {
    key: "index",
    title: "Home",
    icon: "home",
    iconOutline: "home-outline",
    lib: "ionicons",
  },
  {
    key: "classNotes",
    title: "ClassNotes",
    icon: "notebook",
    iconOutline: "notebook-outline",
    lib: "mci",
  },
  {
    key: "profile",
    title: "Profile",
    icon: "person",
    iconOutline: "person-outline",
    lib: "ionicons",
  },
  {
    key: "settings",
    title: "Settings",
    icon: "settings",
    iconOutline: "settings-outline",
    lib: "ionicons",
  },
] as const;

// Pill dimensions (keep in sync with styles.activeBg)
const PILL_WIDTH = 64;
const PILL_HEIGHT = 45;
const TAB_BAR_HEIGHT = 62;

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "unspecified" ? "light" : scheme];
  const safeInset = useSafeAreaInsets();

  const pagerRef = useRef<PagerView>(null);
  const [page, setPage] = useState(0);

  // Track tab bar width so we can compute tab centers
  const [barWidth, setBarWidth] = useState(0);
  const tabWidth = barWidth / TABS.length;

  // Animated X position of the sliding pill
  const pillX = useRef(new Animated.Value(0)).current;

  // Animate pill to a given tab index
  const animatePillTo = (index: number, animated = true) => {
    const toValue = index * tabWidth + (tabWidth - PILL_WIDTH) / 2;
    if (animated) {
      Animated.spring(pillX, {
        toValue,
        useNativeDriver: true,
        friction: 9,
        tension: 90,
      }).start();
    } else {
      pillX.setValue(toValue);
    }
  };

  // When user taps a tab
  const goTo = (index: number) => {
    pagerRef.current?.setPage(index);
    // pill will be animated in onPageSelected for reliability
  };

  const TAB_BAR_MARGIN = 8;

  return (
    <View style={{ flex: 1 }}>
      {/* ============ SLIDING PAGER ============ */}
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        overdrag
        onPageSelected={(e) => {
          const i = e.nativeEvent.position;
          setPage(i);
          animatePillTo(i); // ← animate the pill
        }}
        // Optional: pill follows your finger during swipe
        onPageScroll={(e) => {
          const { position, offset } = e.nativeEvent;
          const continuousIndex = position + offset;
          pillX.setValue(
            continuousIndex * tabWidth + (tabWidth - PILL_WIDTH) / 2,
          );
        }}
      >
        <View key="0" style={{ flex: 1 }}>
          <HomeScreen />
        </View>
        <View key="1" style={{ flex: 1 }}>
          <ClassNotesScreen />
        </View>
        <View key="2" style={{ flex: 1 }}>
          <ProfileScreen />
        </View>
        <View key="3" style={{ flex: 1 }}>
          <SettingsScreen />
        </View>
      </PagerView>

      {/* ============ FLOATING TAB BAR ============ */}
      <View
        pointerEvents="box-none"
        style={[
          styles.tabBarWrapper,
          {
            bottom: safeInset.bottom,
            left: TAB_BAR_MARGIN,
            right: TAB_BAR_MARGIN,
            height: TAB_BAR_HEIGHT,
          },
        ]}
      >
        <BlurView
          tint={scheme === "dark" ? "dark" : "light"}
          intensity={100}
          style={StyleSheet.absoluteFill}
        />
        {/* Border overlay */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: 35,
              borderWidth: 2.4,
              borderColor:
                scheme === "dark"
                  ? "rgba(240, 228, 228, 0.15)"
                  : "rgba(236, 230, 230, 0.95)",
            },
          ]}
        />

        {/* Measure row width once laid out */}
        <View
          style={styles.tabRow}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            setBarWidth(w);
            // position pill on first render without animation
            if (w > 0) {
              pillX.setValue(
                0 * (w / TABS.length) + (w / TABS.length - PILL_WIDTH) / 2,
              );
            }
          }}
        >
          {/* ===== Animated sliding pill (behind the icons) ===== */}
          {barWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.activeBg,
                {
                  transform: [{ translateX: pillX }],
                },
              ]}
            />
          )}

          {/* ===== Tab buttons ===== */}
          {TABS.map((tab, i) => {
            const focused = page === i;
            const color = focused ? colors.text : colors.textSecondary;

            return (
              <Pressable
                key={tab.key}
                onPress={() => goTo(i)}
                style={styles.tabButton}
                android_ripple={{ color: "transparent", borderless: true }}
              >
                <View style={styles.iconContainer}>
                  {tab.lib === "mci" ? (
                    <MaterialCommunityIcons
                      name={focused ? tab.icon : tab.iconOutline}
                      size={24}
                      color={color}
                    />
                  ) : (
                    <Ionicons
                      name={
                        focused ? (tab.icon as any) : (tab.iconOutline as any)
                      }
                      size={24}
                      color={color}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: "absolute",
    borderRadius: 35,
    overflow: "hidden",
    width: "80%",
    alignSelf: "center",
    marginHorizontal: 30,
    shadowColor: "#969191",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  tabRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 50,
    height: 50,
  },
  activeBg: {
    position: "absolute",
    left: 0,
    top: (TAB_BAR_HEIGHT - PILL_HEIGHT) / 2,
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: 28,
    opacity: 0.9,
    backgroundColor: "rgba(115, 114, 199, 0.6)",
    borderWidth: 2,
    borderColor: "#dadada",
    shadowColor: "#969191",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 5,
    zIndex: 0,
  },
});
