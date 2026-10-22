import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Colors } from "@/constants/theme";
import { showError, showSuccess } from "@/components/service/AlertService";
import {
  createExpressTransferAccountApiCall,
  ExpressTransferLoginApiCall,
} from "@/redux/slices/expressTransferSlice";

/* ----------------------------- Types ----------------------------- */

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

/* --------------------------- Component --------------------------- */

const LoginModal = ({ visible, onClose, onSuccess }: Props) => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const loading = useSelector(
    (state: any) =>
      state?.expressTransfer?.loading ??
      state?.expressTransfer?.laoding ??
      false,
  );

  // 🔑 Toggle this once login returns empty data
  const [showRegisterFields, setShowRegisterFields] = useState(false);

  const [mobileNumber, setMobileNumber] = useState("");
  const [name, setName] = useState("");
  const [areaPinCode, setAreaPinCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  /* ---------------- Reset on close ---------------- */

  useEffect(() => {
    if (!visible) {
      setShowRegisterFields(false);
      setMobileNumber("");
      setName("");
      setAreaPinCode("");
      setErrors({});
      setSubmitting(false);
    }
  }, [visible]);

  const resetAndClose = () => {
    setShowRegisterFields(false);
    setMobileNumber("");
    setName("");
    setAreaPinCode("");
    setErrors({});
    onClose();
  };

  /* ---------------- Validation ---------------- */

  const validateMobileOnly = () => {
    const trimmed = mobileNumber.trim();
    if (!trimmed) {
      setErrors({ mobileNumber: "Mobile number is required" });
      return false;
    }
    if (!/^[6-9]\d{9}$/.test(trimmed)) {
      setErrors({ mobileNumber: "Enter a valid 10-digit mobile number" });
      return false;
    }
    setErrors({});
    return true;
  };

  const validateRegister = () => {
    const e: Record<string, string> = {};
    if (!/^[6-9]\d{9}$/.test(mobileNumber.trim())) {
      e.mobileNumber = "Enter a valid 10-digit mobile number";
    }
    if (!name.trim() || name.trim().length < 2) {
      e.name = "Name must be at least 2 characters";
    }
    if (!/^\d{6}$/.test(areaPinCode.trim())) {
      e.areaPinCode = "Enter a valid 6-digit PIN code";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ---------------- Main button (login OR register) ---------------- */

  const handleMainBtn = async () => {
    // Stage 1 — mobile-only validation → call LOGIN
    if (!showRegisterFields) {
      if (!validateMobileOnly()) return;

      setSubmitting(true);
      try {
        const payload = { mobileNumber: mobileNumber.trim() };
        const res = await ExpressTransferLoginApiCall(payload, dispatch);

        const hasAccount =
          res?.success === true &&
          Array.isArray(res?.data) &&
          res.data.length > 0;

        if (hasAccount) {
          // Existing user → go to page
          showSuccess("Welcome back", "Login successful");
          onSuccess?.();
          resetAndClose();
          router.push("/screens/services/expressTransfer/page");
          return;
        }

        // No account → reveal register fields
        if (res?.success === true) {
          setShowRegisterFields(true);
          showSuccess(
            "New user",
            "Please complete the form to create your account",
          );
        } else {
          showError("Login failed", res?.message || "Please try again");
        }
      } catch (err: any) {
        showError("Login failed", err?.message || "Could not log you in");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Stage 2 — register fields shown → validate all → call REGISTER
    if (!validateRegister()) return;

    setSubmitting(true);
    try {
      const payload = {
        mobileNumber: mobileNumber.trim(),
        name: name.trim(),
        areaPinCode: areaPinCode.trim(),
      };
      const res = await createExpressTransferAccountApiCall(payload, dispatch);

      if (res?.success === true) {
        onSuccess?.();
        resetAndClose();
      } else {
        showError("Registration failed", res?.message || "Please try again");
      }
    } catch (err: any) {
      showError(
        "Registration failed",
        err?.message || "Could not create account",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- Render ---------------- */

  const isLoading = submitting || loading;
  const isRegisterStep = showRegisterFields;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={resetAndClose}
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ width: "100%" }}
        >
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>
                  Express Transfer
                </Text>
                <Text style={[styles.subTitle, { color: colors.textMuted }]}>
                  {isRegisterStep
                    ? "Set up your Express Transfer account"
                    : "Log in with your mobile number"}
                </Text>
              </View>
              <TouchableOpacity onPress={resetAndClose} disabled={isLoading}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 30 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Hero */}
              <View
                style={[
                  styles.hero,
                  { backgroundColor: colors.buttonPrimary + "12" },
                ]}
              >
                <View
                  style={[
                    styles.heroIcon,
                    { backgroundColor: colors.buttonPrimary + "22" },
                  ]}
                >
                  <Ionicons
                    name={
                      isRegisterStep
                        ? "person-add-outline"
                        : "log-in-outline"
                    }
                    size={28}
                    color={colors.buttonPrimary}
                  />
                </View>
                <Text style={[styles.heroTitle, { color: colors.text }]}>
                  {isRegisterStep ? "One more step" : "Welcome"}
                </Text>
                <Text style={[styles.heroSub, { color: colors.textMuted }]}>
                  {isRegisterStep
                    ? "We couldn't find an account with this number. Let's create one."
                    : "Enter your registered mobile to continue"}
                </Text>
              </View>

              {/* Mobile — always visible */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textMuted }]}>
                  Mobile Number <Text style={{ color: colors.error }}>*</Text>
                </Text>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      backgroundColor: colors.surfaceTertiary,
                      borderColor: errors.mobileNumber
                        ? colors.error
                        : colors.border,
                      opacity: isRegisterStep ? 0.7 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name="call-outline"
                    size={16}
                    color={colors.textMuted}
                  />
                  <TextInput
                    value={mobileNumber}
                    onChangeText={(v) => {
                      setMobileNumber(v.replace(/\D/g, "").slice(0, 10));
                      setErrors((p) => ({ ...p, mobileNumber: "" }));
                    }}
                    placeholder="9876543210"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    maxLength={10}
                    style={[styles.input, { color: colors.text, flex: 1 }]}
                    editable={!isLoading && !isRegisterStep}
                  />
                </View>
                {!!errors.mobileNumber && (
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    {errors.mobileNumber}
                  </Text>
                )}
              </View>

              {/* 🔑 Extra fields — only after login says no account */}
              {isRegisterStep && (
                <>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>
                      Full Name <Text style={{ color: colors.error }}>*</Text>
                    </Text>
                    <View
                      style={[
                        styles.inputWrap,
                        {
                          backgroundColor: colors.surfaceTertiary,
                          borderColor: errors.name
                            ? colors.error
                            : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="person-outline"
                        size={16}
                        color={colors.textMuted}
                      />
                      <TextInput
                        value={name}
                        onChangeText={(v) => {
                          setName(v);
                          setErrors((p) => ({ ...p, name: "" }));
                        }}
                        placeholder="John Doe"
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="words"
                        style={[styles.input, { color: colors.text, flex: 1 }]}
                        editable={!isLoading}
                      />
                    </View>
                    {!!errors.name && (
                      <Text style={[styles.errorText, { color: colors.error }]}>
                        {errors.name}
                      </Text>
                    )}
                  </View>

                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>
                      Area PIN Code{" "}
                      <Text style={{ color: colors.error }}>*</Text>
                    </Text>
                    <View
                      style={[
                        styles.inputWrap,
                        {
                          backgroundColor: colors.surfaceTertiary,
                          borderColor: errors.areaPinCode
                            ? colors.error
                            : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="location-outline"
                        size={16}
                        color={colors.textMuted}
                      />
                      <TextInput
                        value={areaPinCode}
                        onChangeText={(v) => {
                          setAreaPinCode(v.replace(/\D/g, "").slice(0, 6));
                          setErrors((p) => ({ ...p, areaPinCode: "" }));
                        }}
                        placeholder="110001"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="number-pad"
                        maxLength={6}
                        style={[styles.input, { color: colors.text, flex: 1 }]}
                        editable={!isLoading}
                      />
                    </View>
                    {!!errors.areaPinCode && (
                      <Text style={[styles.errorText, { color: colors.error }]}>
                        {errors.areaPinCode}
                      </Text>
                    )}
                  </View>
                </>
              )}

              {/* Main button */}
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isLoading}
                onPress={handleMainBtn}
                style={[
                  styles.submitBtn,
                  {
                    backgroundColor: colors.buttonPrimary,
                    opacity: isLoading ? 0.6 : 1,
                  },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons
                      name={
                        isRegisterStep
                          ? "person-add-outline"
                          : "log-in-outline"
                      }
                      size={18}
                      color="#FFF"
                    />
                    <Text style={styles.submitText}>
                      {isRegisterStep ? "Create Account" : "Continue"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Change number */}
              {isRegisterStep && (
                <TouchableOpacity
                  onPress={() => {
                    setShowRegisterFields(false);
                    setName("");
                    setAreaPinCode("");
                    setErrors({});
                  }}
                  disabled={isLoading}
                  style={styles.backBtn}
                >
                  <Ionicons
                    name="arrow-back-outline"
                    size={14}
                    color={colors.textMuted}
                  />
                  <Text style={[styles.backText, { color: colors.textMuted }]}>
                    Use a different mobile number
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default LoginModal;

/* --------------------------- Styles ------------------------------ */

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: "800" },
  subTitle: { fontSize: 11.5, fontWeight: "500", marginTop: 3 },

  hero: {
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    marginBottom: 16,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  heroTitle: { fontSize: 16, fontWeight: "800" },
  heroSub: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
    textAlign: "center",
    lineHeight: 18,
  },

  field: { marginBottom: 12 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
    marginTop: 4,
  },
  inputWrap: {
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: { fontSize: 14, fontWeight: "500", paddingVertical: 0 },
  errorText: { fontSize: 11, marginTop: 4, fontWeight: "600" },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
    marginTop: 16,
  },
  submitText: { color: "#FFF", fontSize: 14, fontWeight: "800" },

  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
    paddingVertical: 8,
  },
  backText: { fontSize: 12.5, fontWeight: "600" },
});