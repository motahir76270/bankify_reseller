import { BottomTabInset, Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  interpolate,
  interpolateColor,
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient as SvgGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<SlideItem>);

type Theme = typeof Colors.light;

interface SlideItem {
  id: string;
  tag: string;
  title: string;
  description: string;
  badgeIcon: keyof typeof Ionicons.glyphMap;
  badgeText: string;
  Illustration: React.FC<{ accent: string }>;
}

/* ------------------------------------------------------------------ */
/*  Layered Premium Fintech SVG Illustrations                         */
/* ------------------------------------------------------------------ */

const WalletCardIllustration = ({ accent }: { accent: string }) => (
  <Svg width={200} height={200} viewBox="0 0 220 220">
    <Defs>
      <SvgGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={accent} stopOpacity="1" />
        <Stop offset="1" stopColor={accent} stopOpacity="0.55" />
      </SvgGradient>
      <SvgGradient id="glowSoft" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={accent} stopOpacity="0.22" />
        <Stop offset="1" stopColor={accent} stopOpacity="0.02" />
      </SvgGradient>
    </Defs>
    {/* Ambient Glow Ring */}
    <Circle cx={110} cy={110} r={92} fill="url(#glowSoft)" />
    <Circle
      cx={110}
      cy={110}
      r={76}
      fill="none"
      stroke={accent}
      strokeWidth={1}
      strokeDasharray="6 6"
      opacity={0.35}
    />

    {/* Back Tilted Virtual Card */}
    <G transform="rotate(-10 110 110)">
      <Rect
        x={44}
        y={64}
        width={132}
        height={84}
        rx={14}
        fill={accent}
        opacity={0.22}
        stroke={accent}
        strokeWidth={1.5}
        strokeOpacity={0.4}
      />
    </G>

    {/* Primary Front Card */}
    <G transform="rotate(4 110 110)">
      <Rect
        x={44}
        y={68}
        width={132}
        height={84}
        rx={14}
        fill="url(#cardGrad)"
      />
      {/* Glass Sheen */}
      <Path
        d="M58 68 L120 68 L90 152 L44 152 L44 82 Q44 68 58 68 Z"
        fill="#FFFFFF"
        opacity={0.14}
      />
      {/* EMV Chip */}
      <Rect
        x={60}
        y={86}
        width={22}
        height={16}
        rx={4}
        fill="#FFFFFF"
        opacity={0.85}
      />
      {/* Contactless Waves */}
      <Path
        d="M150 88 Q155 94 150 100 M155 85 Q162 94 155 103"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
        opacity={0.85}
      />
      {/* Masked Card Digits */}
      <Circle cx={63} cy={132} r={2.2} fill="#FFFFFF" opacity={0.85} />
      <Circle cx={70} cy={132} r={2.2} fill="#FFFFFF" opacity={0.85} />
      <Circle cx={77} cy={132} r={2.2} fill="#FFFFFF" opacity={0.85} />
      <Circle cx={84} cy={132} r={2.2} fill="#FFFFFF" opacity={0.85} />
      {/* Card Brand Circles */}
      <Circle cx={148} cy={132} r={8} fill="#FFFFFF" opacity={0.65} />
      <Circle cx={157} cy={132} r={8} fill="#FFFFFF" opacity={0.9} />
    </G>
  </Svg>
);

const AnalyticsIllustration = ({ accent }: { accent: string }) => (
  <Svg width={200} height={200} viewBox="0 0 220 220">
    <Defs>
      <SvgGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={accent} stopOpacity="1" />
        <Stop offset="1" stopColor={accent} stopOpacity="0.3" />
      </SvgGradient>
    </Defs>
    <Circle cx={110} cy={110} r={92} fill={accent} opacity={0.07} />
    {/* Dashboard Frame */}
    <Rect
      x={42}
      y={48}
      width={136}
      height={124}
      rx={20}
      fill={accent}
      opacity={0.06}
      stroke={accent}
      strokeWidth={1.5}
      strokeOpacity={0.25}
    />
    {/* Subtle Grid Lines */}
    <Path
      d="M58 90 H162 M58 122 H162 M58 154 H162"
      stroke={accent}
      strokeOpacity={0.12}
      strokeWidth={1}
    />
    {/* Cashflow / Savings Bars */}
    <Rect x={66} y={120} width={16} height={34} rx={6} fill={accent} opacity={0.35} />
    <Rect x={92} y={102} width={16} height={52} rx={6} fill={accent} opacity={0.55} />
    <Rect x={118} y={84} width={16} height={70} rx={6} fill={accent} opacity={0.8} />
    <Rect x={144} y={64} width={16} height={90} rx={6} fill="url(#barGrad)" />
    {/* Growth Trajectory Line */}
    <Path
      d="M74 110 L100 92 L126 74 L152 54"
      stroke={accent}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Circle cx={152} cy={54} r={5} fill="#FFFFFF" stroke={accent} strokeWidth={3} />
  </Svg>
);

const SecurityVaultIllustration = ({ accent }: { accent: string }) => (
  <Svg width={200} height={200} viewBox="0 0 220 220">
    <Defs>
      <SvgGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={accent} stopOpacity="1" />
        <Stop offset="1" stopColor={accent} stopOpacity="0.6" />
      </SvgGradient>
    </Defs>
    {/* Security Radar Rings */}
    <Circle cx={110} cy={110} r={88} fill={accent} opacity={0.05} />
    <Circle
      cx={110}
      cy={110}
      r={68}
      fill="none"
      stroke={accent}
      strokeWidth={1.5}
      strokeDasharray="5 5"
      opacity={0.32}
    />
    {/* Encrypted Node Connections */}
    <G opacity={0.35}>
      <Path d="M110 110 L58 72" stroke={accent} strokeWidth={2} />
      <Path d="M110 110 L162 72" stroke={accent} strokeWidth={2} />
      <Path d="M110 110 L58 148" stroke={accent} strokeWidth={2} />
      <Path d="M110 110 L162 148" stroke={accent} strokeWidth={2} />
    </G>
    {/* Central Security Shield */}
    <Path
      d="M110 56 L154 74 L154 110 C154 140 135 162 110 172 C85 162 66 140 66 110 L66 74 Z"
      fill="url(#shieldGrad)"
    />
    {/* Inner Shield Highlight */}
    <Path
      d="M110 64 L146 79 L146 110 C146 135 130 154 110 163 Z"
      fill="#FFFFFF"
      opacity={0.12}
    />
    {/* Verified Checkmark */}
    <Path
      d="M95 113 L106 124 L128 100"
      stroke="#FFFFFF"
      strokeWidth={5}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* Satellite Security Nodes */}
    <Circle cx={58} cy={72} r={9} fill={accent} />
    <Circle cx={58} cy={72} r={3.5} fill="#FFFFFF" />
    <Circle cx={162} cy={72} r={9} fill={accent} opacity={0.85} />
    <Circle cx={162} cy={72} r={3.5} fill="#FFFFFF" />
    <Circle cx={58} cy={148} r={9} fill={accent} opacity={0.85} />
    <Circle cx={58} cy={148} r={3.5} fill="#FFFFFF" />
    <Circle cx={162} cy={148} r={9} fill={accent} opacity={0.7} />
    <Circle cx={162} cy={148} r={3.5} fill="#FFFFFF" />
  </Svg>
);

/* ------------------------------------------------------------------ */
/*  Fintech Slide Content                                             */
/* ------------------------------------------------------------------ */

const slides: SlideItem[] = [
  {
    id: "1",
    tag: "INSTANT PAYMENTS",
    title: "Welcome to\nBankifyPays",
    description:
      "Send money, pay bills, and manage your digital wallet seamlessly with zero hidden fees.",
    badgeIcon: "flash",
    badgeText: "Instant Zero-Fee Transfers",
    Illustration: WalletCardIllustration,
  },
  {
    id: "2",
    tag: "SMART WEALTH INSIGHTS",
    title: "Master Your\nMoney Flow",
    description:
      "Track daily spending, automate savings goals, and grow your wealth with real-time analytics.",
    badgeIcon: "trending-up",
    badgeText: "+18.4% Monthly Savings",
    Illustration: AnalyticsIllustration,
  },
  {
    id: "3",
    tag: "BANK-GRADE SECURITY",
    title: "Protected at\nEvery Tap",
    description:
      "256-bit encryption, biometric authentication, and instant fraud alerts keep your funds safe 24/7.",
    badgeIcon: "shield-checkmark",
    badgeText: "256-Bit Encrypted Vault",
    Illustration: SecurityVaultIllustration,
  },
];

/* ------------------------------------------------------------------ */
/*  Ambient Parallax Background Glows                                 */
/* ------------------------------------------------------------------ */

const AmbientOrb = ({
  size,
  color,
  top,
  left,
  scrollX,
  parallaxFactor,
  opacity = 0.14,
}: {
  size: number;
  color: string;
  top: number;
  left: number;
  scrollX: SharedValue<number>;
  parallaxFactor: number;
  opacity?: number;
}) => {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -scrollX.value * parallaxFactor },
      { scale: pulse.value },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top,
          left,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity,
        },
        animatedStyle,
      ]}
    />
  );
};

/* ------------------------------------------------------------------ */
/*  Interactive Pagination Pill                                       */
/* ------------------------------------------------------------------ */

const PaginationDot = ({
  index,
  scrollX,
  width,
  accent,
  inactive,
  onPress,
}: {
  index: number;
  scrollX: SharedValue<number>;
  width: number;
  accent: string;
  inactive: string;
  onPress: () => void;
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    return {
      width: interpolate(scrollX.value, inputRange, [8, 30, 8], Extrapolation.CLAMP),
      opacity: interpolate(scrollX.value, inputRange, [0.45, 1, 0.45], Extrapolation.CLAMP),
      backgroundColor: interpolateColor(scrollX.value, inputRange, [
        inactive,
        accent,
        inactive,
      ]),
    };
  });

  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Animated.View style={[styles.dot, animatedStyle]} />
    </Pressable>
  );
};

/* ------------------------------------------------------------------ */
/*  Parallax Slide Component                                          */
/* ------------------------------------------------------------------ */

const Slide = ({
  item,
  index,
  scrollX,
  width,
  colors,
  isDark,
}: {
  item: SlideItem;
  index: number;
  scrollX: SharedValue<number>;
  width: number;
  colors: Theme;
  isDark: boolean;
}) => {
  const { Illustration } = item;
  const floatY = useSharedValue(0);

  useEffect(() => {
    floatY.value = withDelay(
      index * 200,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, [floatY, index]);

  const cardAnimStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    return {
      opacity: interpolate(scrollX.value, inputRange, [0.25, 1, 0.25], Extrapolation.CLAMP),
      transform: [
        { translateY: floatY.value },
        {
          translateX: interpolate(scrollX.value, inputRange, [50, 0, -50], Extrapolation.CLAMP),
        },
        {
          scale: interpolate(scrollX.value, inputRange, [0.86, 1, 0.86], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const badgeAnimStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    return {
      opacity: interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP),
      transform: [
        {
          translateX: interpolate(scrollX.value, inputRange, [95, 0, -95], Extrapolation.CLAMP),
        },
        {
          translateY: interpolate(scrollX.value, inputRange, [12, 0, 12], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const textAnimStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    return {
      opacity: interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP),
      transform: [
        {
          translateX: interpolate(scrollX.value, inputRange, [35, 0, -35], Extrapolation.CLAMP),
        },
      ],
    };
  });

  return (
    <View style={[styles.slide, { width }]}>
      {/* Frosted Stage Card */}
      <Animated.View
        style={[
          styles.stageCard,
          {
            backgroundColor: isDark
              ? "rgba(255, 255, 255, 0.04)"
              : "rgba(255, 255, 255, 0.72)",
            borderColor: isDark
              ? "rgba(255, 255, 255, 0.10)"
              : colors.buttonPrimary + "22",
            shadowColor: colors.buttonPrimary,
          },
          cardAnimStyle,
        ]}
      >
        <Illustration accent={colors.buttonPrimary} />

        {/* Floating Micro-Badge */}
        <Animated.View
          style={[
            styles.floatingBadge,
            {
              backgroundColor: isDark ? "#1E222B" : "#FFFFFF",
              borderColor: colors.buttonPrimary + "30",
              shadowColor: "#000",
            },
            badgeAnimStyle,
          ]}
        >
          <View
            style={[
              styles.badgeIconWrap,
              { backgroundColor: colors.buttonPrimary + "18" },
            ]}
          >
            <Ionicons name={item.badgeIcon} size={14} color={colors.buttonPrimary} />
          </View>
          <Text style={[styles.badgeText, { color: colors.textPrimary }]}>
            {item.badgeText}
          </Text>
        </Animated.View>
      </Animated.View>

      {/* Typography Block */}
      <Animated.View style={[styles.textBlock, textAnimStyle]}>
        <View
          style={[
            styles.tagPill,
            { backgroundColor: colors.buttonPrimary + "14" },
          ]}
        >
          <Text style={[styles.tagText, { color: colors.buttonPrimary }]}>
            {item.tag}
          </Text>
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {item.title}
        </Text>

        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {item.description}
        </Text>
      </Animated.View>
    </View>
  );
};

/* ------------------------------------------------------------------ */
/*  Main Screen                                                       */
/* ------------------------------------------------------------------ */

export default function BeginScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<SlideItem>>(null);
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"] as Theme;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const scrollX = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / width);
      setCurrentIndex(index);
    },
    [width]
  );

  const goToSlide = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      goToSlide(currentIndex + 1);
    } else {
      router.replace("/(auth)/login");
    }
  };

  const btnScale = useSharedValue(1);
  const arrowX = useSharedValue(0);

  useEffect(() => {
    arrowX.value = withRepeat(
      withSequence(
        withTiming(4, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [arrowX]);

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: arrowX.value }],
  }));

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <LinearGradient
      colors={[colors.backgroundTop, colors.backgroundBottom]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.container}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Ambient Parallax Glows */}
      <AmbientOrb
        size={260}
        color={colors.buttonPrimary}
        top={-60}
        left={-50}
        scrollX={scrollX}
        parallaxFactor={0.18}
        opacity={isDark ? 0.16 : 0.12}
      />
      <AmbientOrb
        size={300}
        color={colors.buttonPrimary}
        top={height * 0.42}
        left={width * 0.45}
        scrollX={scrollX}
        parallaxFactor={0.28}
        opacity={isDark ? 0.12 : 0.09}
      />

      {/* Top Header Bar */}
      <Animated.View
        entering={FadeIn.duration(500)}
        style={[styles.topBar, { paddingTop: insets.top + 10 }]}
      >
        {/* Brand Identity */}
        <View style={styles.brandRow}>
          <View
            style={[
              styles.brandIconBox,
              { backgroundColor: colors.buttonPrimary },
            ]}
          >
            <Ionicons name="wallet" size={14} color="#FFFFFF" />
          </View>
          <Text style={[styles.brandName, { color: colors.textPrimary }]}>
            BankifyPays
          </Text>
        </View>

        {/* Glass Skip Pill */}
        {!isLastSlide && (
          <Pressable
            onPress={() => router.replace("/(auth)/login")}
            hitSlop={10}
            style={({ pressed }) => [
              styles.skipBtn,
              {
                borderColor: isDark
                  ? "rgba(255,255,255,0.14)"
                  : colors.buttonPrimary + "30",
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : colors.buttonPrimary + "10",
                opacity: pressed ? 0.65 : 1,
              },
            ]}
          >
            <Text style={[styles.skipText, { color: colors.buttonPrimary }]}>
              Skip
            </Text>
          </Pressable>
        )}
      </Animated.View>

      {/* Main Carousel */}
      <View style={styles.carouselContainer}>
        <AnimatedFlatList
          ref={flatListRef}
          data={slides}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <Slide
              item={item}
              index={index}
              scrollX={scrollX}
              width={width}
              colors={colors}
              isDark={isDark}
            />
          )}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleMomentumEnd}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
              });
            }, 100);
          }}
        />
      </View>

      {/* Footer Controls */}
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, BottomTabInset) + 18 },
        ]}
      >
        {/* Interactive Pagination */}
        <View style={styles.pagination}>
          {slides.map((_, i) => (
            <PaginationDot
              key={i}
              index={i}
              scrollX={scrollX}
              width={width}
              accent={colors.buttonPrimary}
              inactive={colors.border}
              onPress={() => goToSlide(i)}
            />
          ))}
        </View>

        {/* Primary CTA Button */}
        <Animated.View style={btnStyle}>
          <Pressable
            onPressIn={() => {
              btnScale.value = withSpring(0.965, { damping: 16, stiffness: 300 });
            }}
            onPressOut={() => {
              btnScale.value = withSpring(1, { damping: 16, stiffness: 300 });
            }}
            onPress={handleNext}
            style={[
              styles.ctaShadow,
              { shadowColor: colors.buttonPrimary },
            ]}
          >
            <LinearGradient
              colors={[colors.buttonPrimary, colors.buttonPrimary + "DD"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nextBtn}
            >
              <Text style={styles.nextText}>
                {isLastSlide ? "Open Your Account" : "Continue"}
              </Text>
              <Animated.View style={[styles.arrowCircle, arrowStyle]}>
                <Ionicons name="arrow-forward" size={18} color={colors.buttonPrimary} />
              </Animated.View>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    minHeight: 56,
    zIndex: 10,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  brandIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  skipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  skipText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  carouselContainer: {
    flex: 1,
    justifyContent: "center",
  },
  slide: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  stageCard: {
    width: 268,
    height: 268,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.14,
        shadowRadius: 28,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  floatingBadge: {
    position: "absolute",
    bottom: -14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  badgeIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  textBlock: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 14,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  title: {
    fontSize: 31,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 37,
    marginBottom: 14,
    letterSpacing: -0.7,
  },
  description: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 23,
    fontWeight: "400",
    maxWidth: 320,
  },
  footer: {
    paddingHorizontal: 24,
    gap: 24,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  ctaShadow: {
    borderRadius: 18,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.28,
        shadowRadius: 18,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 18,
    gap: 12,
  },
  nextText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
});