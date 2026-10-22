import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from "react-native-svg";
import { useSelector } from "react-redux";

const { width, height } = Dimensions.get("window");

const SplashScreen = () => {
  const {user,loading, location} = useSelector((state:any) => state.auth)

  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  // Entrance animations
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslate = useRef(new Animated.Value(20)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;

  // Rotating ring
  const spin = useRef(new Animated.Value(0)).current;

  const isAuthenticated = true; // 👈 replace with real check (AsyncStorage / redux)

  useEffect(() => {
    // Sequential entrance
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslate, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(loaderOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Infinite spin for ring
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // Redirect after splash delay
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        router.replace("/(auth)/initial");
      } else {
        router.replace("/(auth)/login");
      }
    }, 8600);

    return () => clearTimeout(timer);
  }, []);

  const spinInterpolate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const brandPrimary = isDark ? "#7C6BFF" : "#4F46E5";
  const brandSecondary = isDark ? "#432BBA" : "#3730A3";
  const brandTertiary = isDark ? "#2A188C" : "#1E1B4B";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Background gradient blobs */}
      <Svg
        width={width}
        height={height}
        style={StyleSheet.absoluteFill}
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <SvgLinearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={brandPrimary} stopOpacity="0.18" />
            <Stop offset="60%" stopColor={brandSecondary} stopOpacity="0.10" />
            <Stop offset="100%" stopColor={brandTertiary} stopOpacity="0.05" />
          </SvgLinearGradient>
        </Defs>
        <Path d={`M0,0 L${width},0 L${width},${height} L0,${height} Z`} fill="url(#bgGrad)" />
        <Circle cx={width * 0.85} cy={height * 0.12} r={140} fill={brandPrimary} opacity={0.10} />
        <Circle cx={width * 0.1} cy={height * 0.85} r={180} fill={brandSecondary} opacity={0.08} />
      </Svg>

      {/* Center content */}
      <View style={styles.center}>
        {/* Logo card */}
        <Animated.View
          style={[
            styles.logoCardWrap,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          {/* rotating ring around the logo */}
          <Animated.View
            style={[
              styles.ring,
              { borderColor: `${brandPrimary}30`, transform: [{ rotate: spinInterpolate }] },
            ]}
          >
            <View style={[styles.ringDot, { backgroundColor: brandPrimary }]} />
          </Animated.View>

          <LinearGradient
            colors={[brandPrimary, brandSecondary, brandTertiary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoCard}
          >
            <Ionicons name="wallet-outline" size={44} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>

        {/* Brand name */}
        <Animated.View
          style={{
            opacity: textOpacity,
            transform: [{ translateY: textTranslate }],
            alignItems: "center",
          }}
        >
          <Text style={[styles.brandName, { color: colors.text }]}>
            Aadhishala <Text style={{ color: brandPrimary }}>Pay</Text>
          </Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Banking • Payments • Rewards
          </Text>
        </Animated.View>
      </View>

      {/* Footer loader */}
      <Animated.View style={[styles.footer, { opacity: loaderOpacity }]}>
        <View style={styles.dotsRow}>
          <LoadingDot delay={0} color={brandPrimary} />
          <LoadingDot delay={150} color={brandPrimary} />
          <LoadingDot delay={300} color={brandPrimary} />
        </View>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Securing your session…
        </Text>
        <Text style={[styles.versionText, { color: colors.textSecondary }]}>
          v1.0.0 · Encrypted
        </Text>
      </Animated.View>
    </View>
  );
};

/* Animated loading dot */
const LoadingDot = ({ delay, color }: { delay: number; color: string }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: color, opacity }]}
    />
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  logoCardWrap: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  ring: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
  },
  ringDot: {
    position: "absolute",
    top: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  logoCard: {
    width: 104,
    height: 104,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },

  brandName: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  tagline: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 8,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  footer: {
    alignItems: "center",
    paddingBottom: 56,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footerText: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  versionText: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 6,
    opacity: 0.7,
    letterSpacing: 0.5,
  },
});