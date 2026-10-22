import CustomAlertModal from "@/components/modal/CustomAlertModal";
import { Colors } from "@/constants/theme";
import { FullScreenLoader } from "@/hooks/use-screensLoder";
import { setUser } from "@/redux/slices/authSlice";
import AuthValiation from "@/validations/auth";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
  LinearGradient as LinearGradientSvg,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { useDispatch } from "react-redux";
import { z } from "zod";
import { LinearGradient  } from "expo-linear-gradient";

type PINFormData = z.infer<typeof AuthValiation.loginPIN>;

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
        <LinearGradientSvg id="heroGrad" x1="0" y1="0" x2="0.8" y2="1">
          <Stop offset="0%" stopColor={color1} stopOpacity="1" />
          <Stop offset="60%" stopColor={color2} stopOpacity="1" />
          <Stop offset="100%" stopColor={color3} stopOpacity="1" />
        </LinearGradientSvg>

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

const PINScreen = () => {
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const dispatch = useDispatch();

  // Alert states
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertType, setAlertType] = useState<"success" | "failed" | "warning">(
    "success",
  );
  const [alertMessage, setAlertMessage] = useState("");
  const [alertTitle, setAlertTitle] = useState("");

  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const pinInputRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<PINFormData>({
    resolver: zodResolver(AuthValiation.loginPIN),
    defaultValues: {
      pin: "",
    },
  });

  const showAlert = (
    type: "success" | "failed" | "warning",
    message: string,
    title?: string,
  ) => {
    setAlertType(type);
    setAlertMessage(message);
    setAlertTitle(title || "");
    setShowAlertModal(true);
  };

  const onSubmit = async (data: PINFormData) => {
    setLoading(true);
    clearErrors();

    try {
      // Demo logic — replace with real API
      const res = { success: true, message: "PIN verified", user: {} };

      if (res?.success === true) {
        await AsyncStorage.setItem("pin_verified", JSON.stringify(true));
        const storedUser = await AsyncStorage.getItem("user");
        const parsedUser = storedUser ? JSON.parse(storedUser) : null;
        if (parsedUser?.user) {
          dispatch(setUser(parsedUser.user));
        }
        router.replace("/(tabs)");
      } else {
        showAlert(
          "failed",
          res?.message || "Invalid PIN. Please try again.",
          "Verification Failed",
        );
      }
    } catch (error: any) {
      const message =
        error?.message || "Network error. Please check your connection.";
      setError("root", { message });
      showAlert("warning", message, "Connection Error");
    } finally {
      setLoading(false);
    }
  };

  const heroColor1 = isDark ? "#6347EA" : "#4F46E5";
  const heroColor2 = isDark ? "#432BBA" : "#3730A3";
  const heroColor3 = isDark ? "#2A188C" : "#1E1B4B";

  const cardBg = isDark ? "#12141C" : "#FFFFFF";
  const boxBg = isDark ? "#1A1D2A" : "#F8FAFC";
  const activeBorderColor = colors.buttonPrimary || "#4F46E5";

  return (
    <LinearGradient
        colors={[
          colors.backgroundTop,
          colors.backgroundBottom,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}  style={[styles.container, { backgroundColor: colors.background }]}
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
          {/* ---------- Hero Header ---------- */}
          <View style={styles.hero}>
            <HeroBackground
              color1={heroColor1}
              color2={heroColor2}
              color3={heroColor3}
            />

            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButtonTop}
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.heroContent}>
              <View style={styles.logoBadgeContainer}>
                <View style={styles.logoBadge}>
                  <Ionicons name="keypad-outline" size={28} color="#FFFFFF" />
                </View>
              </View>
              <Text style={styles.heroTitle}>Enter Security PIN</Text>
              <Text style={styles.heroSubtitle}>
                Enter your 6-digit PIN code to proceed
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
              {/* PIN Field */}
              <View style={styles.fieldContainer}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>
                    Security Code
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowPin(!showPin)}
                    disabled={loading}
                    style={styles.toggleVisibility}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showPin ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.toggleVisibilityText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {showPin ? "Hide" : "Show"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Controller
                  control={control}
                  name="pin"
                  render={({ field: { onChange, value = "" } }) => (
                    <View style={styles.pinWrapper}>
                      {/* Hidden TextInput handling input */}
                      <TextInput
                        ref={pinInputRef}
                        style={styles.hiddenInput}
                        value={value}
                        onChangeText={(text) => {
                          const numeric = text.replace(/[^0-9]/g, "");
                          onChange(numeric.slice(0, 6));
                        }}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        keyboardType="number-pad"
                        maxLength={6}
                        editable={!loading}
                        autoFocus
                      />

                      {/* Custom 6-Digit PIN Boxes */}
                      <Pressable
                        style={styles.pinBoxesContainer}
                        onPress={() => pinInputRef.current?.focus()}
                      >
                        {Array.from({ length: 6 }).map((_, index) => {
                          const digit = value[index];
                          const isCurrentSlot =
                            index === value.length ||
                            (index === 5 && value.length === 6);
                          const isFilled = digit !== undefined;

                          return (
                            <View
                              key={index}
                              style={[
                                styles.pinBox,
                                {
                                  backgroundColor: boxBg,
                                  borderColor: errors.pin
                                    ? colors.error
                                    : isFocused && isCurrentSlot
                                    ? activeBorderColor
                                    : isDark
                                    ? "rgba(255,255,255,0.1)"
                                    : "#E2E8F0",
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.pinDigitText,
                                  { color: colors.textPrimary },
                                ]}
                              >
                                {isFilled
                                  ? showPin
                                    ? digit
                                    : "•"
                                  : ""}
                              </Text>
                            </View>
                          );
                        })}
                      </Pressable>
                    </View>
                  )}
                />

                {errors.pin && (
                  <View style={styles.errorRow}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={14}
                      color={colors.error}
                    />
                    <Text style={[styles.errorText, { color: colors.error }]}>
                      {errors.pin.message}
                    </Text>
                  </View>
                )}
              </View>

              {/* Forgot PIN Link */}
              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.forgotText,
                      { color: colors.buttonPrimary || activeBorderColor },
                    ]}
                  >
                    Forgot PIN?
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Root Error */}
              {errors.root && (
                <View
                  style={[
                    styles.rootErrorContainer,
                    {
                      backgroundColor: isDark
                        ? "rgba(239,68,68,0.12)"
                        : "#FEF2F2",
                      borderColor: isDark
                        ? "rgba(239,68,68,0.3)"
                        : "#FCA5A5",
                    },
                  ]}
                >
                  <Ionicons
                    name="alert-circle"
                    size={20}
                    color={colors.error}
                  />
                  <Text
                    style={[styles.rootErrorText, { color: colors.error }]}
                  >
                    {errors.root.message}
                  </Text>
                </View>
              )}

              {/* Submit Button */}
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
                  {loading ? "Verifying PIN..." : "Verify & Continue"}
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

      {/* Custom Alert Modal */}
      <CustomAlertModal
        visible={showAlertModal}
        type={alertType}
        message={alertMessage}
        title={alertTitle}
        onClose={() => setShowAlertModal(false)}
        autoDismiss={true}
        autoDismissTime={5000}
      />
    </LinearGradient>
  );
};

export default PINScreen;

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
  backButtonTop: {
    position: "absolute",
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    zIndex: 10,
  },
  heroContent: {
    paddingHorizontal: 28,
    paddingTop: 30,
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
    marginTop: -35,
  },
  formCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,

    // Premium Drop Shadow
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  label: {
    fontSize: 13.5,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  toggleVisibility: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  toggleVisibilityText: {
    fontSize: 12.5,
    fontWeight: "600",
  },

  /* ---------- PIN Box Grid ---------- */
  pinWrapper: {
    position: "relative",
    width: "100%",
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },
  pinBoxesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  pinBox: {
    width: 46,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  pinDigitText: {
    fontSize: 22,
    fontWeight: "700",
  },

  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
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
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 4,
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