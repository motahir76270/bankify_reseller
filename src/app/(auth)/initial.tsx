import { BottomTabInset, Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient  } from "expo-linear-gradient";


const onboardingData = (colors: any) => [
  {
    id: "1",
    title: "Welcome to Aadhishala",
    description:
      "Manage your academic life effortlessly with our comprehensive student management system",
    icon: "school-outline",
    color: colors.primary,
  },
  {
    id: "2",
    title: "Track Your Progress",
    description:
      "Monitor attendance, grades, assignments, and performance all in one place",
    icon: "trending-up-outline",
    color: colors.secondary || colors.primary,
  },
  {
    id: "3",
    title: "Stay Connected",
    description:
      "Get real-time notifications, updates from teachers, and never miss important deadlines",
    icon: "notifications-outline",
    color: colors.tertiary || colors.primary,
  },
];

export default function BeginScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  
  const scheme = useColorScheme();
  // ✅ handles null AND "unspecified"
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  const insets = useSafeAreaInsets();
  // ✅ reactive — updates on rotation / split-screen
  const { width, height } = useWindowDimensions();

  const data = onboardingData(colors);

  const renderItem = useCallback(
    ({ item }: any) => (
      <View style={[styles.slide, { width, height: height * 0.72 }]}>
        <View
          style={[
            styles.iconContainer,
            {
              // ✅ use template literal to avoid invalid hex concat
              backgroundColor: `${item.color}20`,
            },
          ]}
        >
          <Image source={require('@/assets/images/icon.png')} contentFit="cover" style={{ width: 200, height: 200,borderRadius:140 }} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {item.description}
        </Text>
      </View>
    ),
    [colors, width, height],
  );

  const handleNext = () => {
    if (currentIndex < data.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      router.push("/(auth)/login");
    }
  };

  const handleSkip = () => router.push("/(auth)/login");

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / width);
      setCurrentIndex(index);
    },
    [width],
  );

  return (
    <LinearGradient
         colors={[
          colors.backgroundTop,
          colors.backgroundBottom,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }} 
       style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ✅ Themed status bar */}
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
        translucent={false}
      />

      {/* ✅ Safe-area aware skip button */}
      <TouchableOpacity
        style={[
          styles.skipButton,
          {
            backgroundColor: colors.buttonPrimary,
            top: insets.top + 12,
          },
        ]}
        onPress={handleSkip}
        activeOpacity={0.7}
      >
        {/* ✅ use textInverse/white so it contrasts with btnBg */}
        <Text style={[styles.skipText, { color: colors.background }]}>
          Skip
        </Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={data}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        keyExtractor={(item) => item.id}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        // ✅ prevents crash when scrollToIndex is called before layout
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
            });
          }, 100);
        }}
      />

      <View style={styles.paginationContainer}>
        {data.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              { backgroundColor: colors.border },
              currentIndex === index && [
                styles.paginationDotActive,
                { backgroundColor: colors.buttonPrimary  },
              ],
            ]}
          />
        ))}
      </View>

      <View
        style={[
          styles.buttonContainer,
          {
            // ✅ safe-area + tab inset aware
            paddingBottom: Math.max(insets.bottom, BottomTabInset) + 20,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: colors.buttonPrimary }]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={[styles.nextButtonText, { color: colors.background }]}>
            {currentIndex === data.length - 1 ? "Get Started" : "Next"}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={colors.background} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipButton: {
    position: "absolute",
    right: 20,
    zIndex: 1,
    padding: 10,
    borderRadius: 20,
    paddingHorizontal: 30,
  },
  skipText: { fontSize: 16, fontWeight: "600" },
  slide: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  iconContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 5,
  },
  paginationDotActive: { width: 24 },
  buttonContainer: {
    paddingHorizontal: 20,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  nextButtonText: { fontSize: 16, fontWeight: "600" },
});





