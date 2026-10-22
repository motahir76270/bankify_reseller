

import { Colors } from "@/constants/theme";
import { onLocation } from "@/hooks/use-location";
import { FullScreenLoader } from "@/hooks/use-screensLoder";
import {
  getTenetUserApiCall
} from "@/redux/slices/authSlice";
import AuthValiation from "@/validations/auth";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient as Linear,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { useDispatch, useSelector } from "react-redux";
import { z } from "zod";

type LoginFormData = z.infer<typeof AuthValiation.loginSchema>;

/* ---------------- Hero SVG Background ---------------- */

function HeroBackground({
  color1,
  color2,
  color3,
}: {
  color1: string;
  color2: string;
  color3: string;
}) {
  return (
    <Svg
      height="100%"
      width="100%"
      viewBox="0 0 400 280"
      preserveAspectRatio="none"
      style={StyleSheet.absoluteFill}
    >
      <Defs>
        <Linear id="heroGrad" x1="0" y1="0" x2="0.8" y2="1">
          <Stop offset="0%" stopColor={color1} stopOpacity="1" />
          <Stop offset="60%" stopColor={color2} stopOpacity="1" />
          <Stop offset="100%" stopColor={color3} stopOpacity="1" />
        </Linear>

        <RadialGradient id="glow" cx="80%" cy="20%" r="60%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Main Gradient Background */}
      <Path d="M0,0 L400,0 L400,240 Q200,285 0,240 Z" fill="url(#heroGrad)" />

      {/* Ambient Glows & Glass Bubbles */}
      <Circle cx="320" cy="60" r="120" fill="url(#glow)" />
      <Circle cx="350" cy="40" r="70" fill="#FFFFFF" opacity={0.08} />
      <Circle cx="40" cy="180" r="90" fill="#FFFFFF" opacity={0.04} />
      <Circle cx="80" cy="30" r="45" fill="#FFFFFF" opacity={0.06} />
    </Svg>
  );
}

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const { loading, location } = useSelector((state: any) => state.auth);
  const [identifierFocused, setidentifierFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // console.log(location)
  const dispatch = useDispatch();

  const [showForgotModal, setShowForgotModal] = useState(false);

  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<LoginFormData>({
    resolver: zodResolver(AuthValiation.loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    //  await onLocation(dispatch)
    const payload = {
      identifier: data.identifier,
      password: data.password,
    };
    if (location?.latitude) {
      const res = await getTenetUserApiCall(payload, location, dispatch);
      if(res?.success  === true){
        reset();
      }
    } else {
      await onLocation(dispatch);
    }
  };

  const handleForgetModal = () => {
    setShowForgotModal(true);
  };
  
  useEffect(()=> {
    if(location?.latitude){
    }else{
      onLocation(dispatch)
    }
  },[dispatch])

  const heroColor1 = isDark ? "#6347EA" : "#4F46E5";
  const heroColor2 = isDark ? "#432BBA" : "#3730A3";
  const heroColor3 = isDark ? "#2A188C" : "#1E1B4B";

  const cardBg = colors.card;
  const inputBg = isDark ? "#1A1D2A" : "#F8FAFC";
  const activeBorderColor = colors.buttonPrimary || "#4F46E5";

  return (
    <LinearGradient
      colors={[colors.backgroundTop, colors.backgroundBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* ---------- Premium Hero Header ---------- */}
          <View style={styles.hero}>
            <HeroBackground
              color1={heroColor1}
              color2={heroColor2}
              color3={heroColor3}
            />
            <View style={styles.heroContent}>
              <View style={styles.logoBadgeContainer}>
                <View style={styles.logoBadge}>
                  <Ionicons name="school-outline" size={28} color="#FFFFFF" />
                </View>
              </View>
              <Text style={styles.heroTitle}>Welcome Back</Text>
              <Text style={styles.heroSubtitle}>
                Sign in to continue your journey
              </Text>
            </View>
          </View>

          {/* ---------- Elevated Form Card ---------- */}
          <View style={styles.cardContainer}>
            <View
              style={[
                styles.formCard,
                {
                  backgroundColor: cardBg,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.04)",
                },
              ]}
            >
              {/* identifier Field */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>
                  User Name
                </Text>
                <Controller
                  control={control}
                  name="identifier"
                  render={({ field: { onChange, value } }) => (
                    <View
                      style={[
                        styles.inputContainer,
                        {
                          backgroundColor: inputBg,
                          borderColor: errors.identifier
                            ? colors.error
                            : identifierFocused
                              ? activeBorderColor
                              : isDark
                                ? "rgba(255,255,255,0.1)"
                                : "#E2E8F0",
                        },
                      ]}
                    >
                      <Ionicons
                        name="mail-outline"
                        size={20}
                        color={
                          errors.identifier
                            ? colors.error
                            : identifierFocused
                              ? activeBorderColor
                              : colors.textSecondary
                        }
                      />
                      <TextInput
                        style={[styles.input, { color: colors.textPrimary }]}
                        placeholder="User name"
                        placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                        value={value}
                        onChangeText={onChange}
                        onFocus={() => setidentifierFocused(true)}
                        onBlur={() => setidentifierFocused(false)}
                        keyboardType="default"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!loading}
                      />
                    </View>
                  )}
                />
                {errors.identifier && (
                  <View style={styles.errorRow}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={14}
                      color={colors.error}
                    />
                    <Text style={[styles.errorText, { color: colors.error }]}>
                      {errors.identifier.message}
                    </Text>
                  </View>
                )}
              </View>

              {/* Password Field */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>
                  Password
                </Text>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, value } }) => (
                    <View
                      style={[
                        styles.inputContainer,
                        {
                          backgroundColor: inputBg,
                          borderColor: errors.password
                            ? colors.error
                            : passwordFocused
                              ? activeBorderColor
                              : isDark
                                ? "rgba(255,255,255,0.1)"
                                : "#E2E8F0",
                        },
                      ]}
                    >
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color={
                          errors.password
                            ? colors.error
                            : passwordFocused
                              ? activeBorderColor
                              : colors.textSecondary
                        }
                      />
                      <TextInput
                        style={[styles.input, { color: colors.textPrimary }]}
                        placeholder="Enter your password"
                        placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                        value={value}
                        onChangeText={onChange}
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => setPasswordFocused(false)}
                        secureTextEntry={!showPassword}
                        editable={!loading}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        disabled={loading}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name={
                            showPassword ? "eye-off-outline" : "eye-outline"
                          }
                          size={20}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                />
                {errors.password && (
                  <View style={styles.errorRow}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={14}
                      color={colors.error}
                    />
                    <Text style={[styles.errorText, { color: colors.error }]}>
                      {errors.password.message}
                    </Text>
                  </View>
                )}
              </View>

              {/* Remember Me & Forgot Password Options */}
              {/* <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={styles.rememberContainer}
                  activeOpacity={0.7}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: rememberMe
                          ? activeBorderColor
                          : isDark
                            ? "#475569"
                            : "#CBD5E1",
                        backgroundColor: rememberMe
                          ? activeBorderColor
                          : "transparent",
                      },
                    ]}
                  >
                    {rememberMe && (
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.rememberText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Remember me
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={loading}
                  onPress={handleForgetModal}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.forgotText,
                      { color: colors.buttonPrimary || activeBorderColor },
                    ]}
                  >
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View> */}

              {/* Root Error */}
              {errors.root && (
                <View
                  style={[
                    styles.rootErrorContainer,
                    {
                      backgroundColor: isDark
                        ? "rgba(239,68,68,0.12)"
                        : "#FEF2F2",
                      borderColor: isDark ? "rgba(239,68,68,0.3)" : "#FCA5A5",
                    },
                  ]}
                >
                  <Ionicons
                    name="alert-circle"
                    size={20}
                    color={colors.error}
                  />
                  <Text style={[styles.rootErrorText, { color: colors.error }]}>
                    {errors.root.message}
                  </Text>
                </View>
              )}

              {/* Login Button */}
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  { backgroundColor: activeBorderColor },
                  loading && styles.loginButtonDisabled,
                ]}
                onPress={handleSubmit(onSubmit)}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? "Logging in..." : "Login"}
                </Text>
                {!loading && (
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color="#FFFFFF"
                    style={styles.buttonIcon}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <FullScreenLoader loading={loading} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  /* ---------- Premium Hero ---------- */
  hero: {
    height: 270,
    justifyContent: "center",
    overflow: "hidden",
  },
  heroContent: {
    paddingHorizontal: 28,
    paddingTop: 40,
  },
  logoBadgeContainer: {
    marginBottom: 16,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    marginTop: 6,
    fontWeight: "400",
  },

  /* ---------- Elevated Form Card ---------- */
  cardContainer: {
    paddingHorizontal: 20,
    marginTop: 15,
  },
  formCard: {
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,

    // Premium Drop Shadow
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 0,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13.5,
    fontWeight: "600",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    height: 54,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: "500",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginLeft: 2,
  },
  errorText: {
    fontSize: 12.5,
    marginLeft: 4,
    fontWeight: "500",
  },

  /* ---------- Options ---------- */
  optionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 2,
  },
  rememberContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  rememberText: {
    fontSize: 13.5,
    fontWeight: "500",
  },
  forgotText: {
    fontSize: 13.5,
    fontWeight: "600",
  },

  /* ---------- Root Error ---------- */
  rootErrorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  rootErrorText: {
    marginLeft: 10,
    fontSize: 13.5,
    fontWeight: "500",
    flex: 1,
  },

  /* ---------- Button ---------- */
  loginButton: {
    height: 54,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  loginButtonDisabled: {
    opacity: 0.65,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  buttonIcon: {
    marginLeft: 8,
  },
});
