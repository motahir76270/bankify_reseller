import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";

type Props = {
  visible: boolean;
  kyc: any | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
};

const RejectKycModal = ({
  visible,
  kyc,
  loading = false,
  onClose,
  onSubmit,
}: Props) => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const cardBg = isDark ? "#141721" : "#FFFFFF";
  const mutedBg = isDark ? "#1A1D2A" : "#F8FAFC";
  const borderColor = colors.border;
  const brandPrimary = isDark ? "#7C6BFF" : "#4F46E5";

  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      setReason("");
      setError("");
    }
  }, [visible, kyc?.id]);

  if (!kyc) return null;

  const handleSubmit = () => {
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError("Please enter a reason (min 3 characters)");
      return;
    }
    setError("");
    onSubmit(trimmed);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View
          style={[styles.sheet, { backgroundColor: cardBg, borderColor }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View
              style={[styles.iconWrap, { backgroundColor: "#EF444420" }]}
            >
              <Ionicons name="close-circle" size={20} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>
                Reject KYC
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {kyc.user?.firstName} {kyc.user?.lastName} ·{" "}
                {kyc.user?.userNumber}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={10}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            REJECTION REASON *
          </Text>
          <TextInput
            value={reason}
            onChangeText={(v) => {
              setReason(v);
              if (error) setError("");
            }}
            placeholder="e.g. Document unclear, invalid PAN..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: mutedBg,
                borderColor: error ? "#EF4444" : borderColor,
              },
            ]}
            textAlignVertical="top"
          />
          {!!error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onClose}
              disabled={loading}
              style={[
                styles.btn,
                { backgroundColor: mutedBg, borderColor },
              ]}
            >
              <Text style={[styles.btnText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSubmit}
              disabled={loading}
              style={[
                styles.btn,
                { backgroundColor: "#EF4444", borderColor: "#EF4444" },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={16} color="#FFFFFF" />
                  <Text style={[styles.btnText, { color: "#FFFFFF" }]}>
                    Reject
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default RejectKycModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  closeBtn: { padding: 4 },

  label: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minHeight: 96,
    fontSize: 13.5,
    fontWeight: "500",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 11.5,
    fontWeight: "700",
    marginTop: 6,
  },

  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  btnText: { fontSize: 14, fontWeight: "800", letterSpacing: 0.2 },
});