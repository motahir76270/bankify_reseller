import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  Modal,
} from "react-native";
import React, { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import HeaderSection from "@/components/ui/headerSections";
import { Colors } from "@/constants/theme";
import { showError, showSuccess } from "@/components/service/AlertService";
import {
  createSMTPApiCall,
  getSMTPdataApiCall,
  updateSMTPdataApiCall,
} from "@/redux/slices/configuration/smptSlice";
import { LinearGradient } from "expo-linear-gradient";

// ----------------------------------------------------------------
// Zod Schema
// ----------------------------------------------------------------
const smtpSchema = z.object({
  smtpHost: z.string().trim().min(1, "SMTP host is required"),
  smtpPort: z
    .string()
    .trim()
    .min(1, "SMTP port is required")
    .regex(/^\d+$/, "Port must be a number")
    .refine((v) => Number(v) >= 1 && Number(v) <= 65535, "Port must be between 1-65535"),
  smtpUsername: z.string().trim().min(1, "Username is required"),
  smtpPassword: z.string().trim().min(1, "Password is required"),
  encryptionType: z.enum(["TLS", "SSL", "NONE"]),
  fromName: z.string().trim().min(1, "From name is required"),
  fromEmail: z
    .string()
    .trim()
    .min(1, "From email is required")
    .email("From email is invalid"),
});

type SMTPForm = z.infer<typeof smtpSchema>;

const emptyForm: SMTPForm = {
  smtpHost: "",
  smtpPort: "",
  smtpUsername: "",
  smtpPassword: "",
  encryptionType: "TLS",
  fromName: "",
  fromEmail: "",
};

const ENCRYPTIONS: SMTPForm["encryptionType"][] = ["TLS", "SSL", "NONE"];

// ----------------------------------------------------------------
// Screen
// ----------------------------------------------------------------
const SMPTScreen = () => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const smtpData = useSelector((state: any) => state.smtp?.smtpData);
  const loading = useSelector((state: any) => state.smtp?.loading);

  const [modalVisible, setModalVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const hasConfig =
    !!smtpData && typeof smtpData === "object" && !!smtpData.id;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SMTPForm>({
    resolver: zodResolver(smtpSchema),
    defaultValues: emptyForm,
    mode: "onBlur",
  });

  // Fetch SMTP on mount
  useEffect(() => {
    getSMTPdataApiCall(dispatch);
  }, [dispatch]);

  // Hydrate form whenever smtpData changes
  useEffect(() => {
    if (hasConfig) {
      reset({
        smtpHost: smtpData.smtpHost ?? "",
        smtpPort: String(smtpData.smtpPort ?? ""),
        smtpUsername: smtpData.smtpUsername ?? "",
        smtpPassword: smtpData.smtpPassword ?? "",
        encryptionType: smtpData.encryptionType ?? "TLS",
        fromName: smtpData.fromName ?? "",
        fromEmail: smtpData.fromEmail ?? "",
      });
    } else {
      reset(emptyForm);
      setModalVisible(true); // force add mode when nothing exists
    }
  }, [smtpData, hasConfig, reset]);

  // ----------------------------------------------------------------
  // Open modal (add or edit)
  // ----------------------------------------------------------------
  const openModal = () => {
    if (hasConfig) {
      reset({
        smtpHost: smtpData.smtpHost ?? "",
        smtpPort: String(smtpData.smtpPort ?? ""),
        smtpUsername: smtpData.smtpUsername ?? "",
        smtpPassword: smtpData.smtpPassword ?? "",
        encryptionType: smtpData.encryptionType ?? "TLS",
        fromName: smtpData.fromName ?? "",
        fromEmail: smtpData.fromEmail ?? "",
      });
    } else {
      reset(emptyForm);
    }
    setShowPassword(false);
    setModalVisible(true);
  };

  const closeModal = () => {
    // Prevent closing when in forced add mode with no config
    if (!hasConfig) {
      showError("Required", "Please configure SMTP before closing.");
      return;
    }
    setModalVisible(false);
    setShowPassword(false);
  };

  // ----------------------------------------------------------------
  // Submit
  // ----------------------------------------------------------------
  const onSubmit = async (data: SMTPForm) => {
    try {
      const payload = {
        smtpHost: data.smtpHost.trim(),
        smtpPort: data.smtpPort.trim(),
        smtpUsername: data.smtpUsername.trim(),
        smtpPassword: data.smtpPassword.trim(),
        encryptionType: data.encryptionType,
        fromName: data.fromName.trim(),
        fromEmail: data.fromEmail.trim(),
      };

      if (hasConfig) {
        // UPDATE
        await updateSMTPdataApiCall(
          { ...smtpData, ...payload },
          dispatch,
        );
      } else {
        // CREATE
        await createSMTPApiCall(payload, dispatch);
        await getSMTPdataApiCall(dispatch);
      }

      showSuccess?.("Success", hasConfig ? "SMTP updated" : "SMTP saved");
      setModalVisible(false);
      setShowPassword(false);
    } catch (e: any) {
      showError("Error", e?.message ?? "Something went wrong");
    }
  };

  // ----------------------------------------------------------------
  // Loading
  // ----------------------------------------------------------------
  if (loading && !smtpData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <HeaderSection title="SMTP Setup" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.buttonPrimary} />
        </View>
      </View>
    );
  }

  // ----------------------------------------------------------------
  // Field renderer
  // ----------------------------------------------------------------
  const renderField = (
    label: string,
    name: keyof SMTPForm,
    opts: {
      placeholder?: string;
      keyboardType?: "default" | "numeric" | "email-address";
      secure?: boolean;
      autoCapitalize?: "none" | "sentences" | "words";
    } = {},
  ) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.surfaceTertiary,
            borderColor: errors[name] ? "#EF4444" : colors.border,
          },
        ]}
      >
        <Controller
          control={control}
          name={name}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={opts.placeholder ?? ""}
              placeholderTextColor={colors.textMuted}
              keyboardType={opts.keyboardType ?? "default"}
              autoCapitalize={opts.autoCapitalize ?? "none"}
              autoCorrect={false}
              secureTextEntry={opts.secure && !showPassword}
              style={[styles.input, { color: colors.text }]}
            />
          )}
        />
        {opts.secure && (
          <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
      {errors[name] && (
        <Text style={styles.errorText}>{errors[name]?.message as string}</Text>
      )}
    </View>
  );

  // ----------------------------------------------------------------
  // View row renderer
  // ----------------------------------------------------------------
  const renderViewRow = (
    label: string,
    value?: string | null,
    isPassword = false,
  ) => (
    <View style={[styles.viewRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.viewLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      <Text style={[styles.viewValue, { color: colors.text }]} numberOfLines={1}>
        {isPassword && value
          ? showPassword
            ? value
            : "•".repeat(Math.min(value.length, 16))
          : value || "-"}
      </Text>
    </View>
  );

  return (
    <LinearGradient
      colors={[colors.backgroundTop , colors.backgroundBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }} 
       style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderSection title="SMTP Setup" />

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 40,
          gap: 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        {hasConfig ? (
          // ---------- VIEW CARD ----------
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: colors.surfacePrimary },
                ]}
              >
                <Ionicons name="mail" size={18} color={colors.buttonPrimary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                SMTP Configuration
              </Text>
              <TouchableOpacity
                onPress={openModal}
                style={[
                  styles.editBtn,
                  { backgroundColor: colors.buttonPrimary },
                ]}
              >
                <Ionicons name="create-outline" size={14} color="#fff" />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>

            {renderViewRow("SMTP Host", smtpData.smtpHost)}
            {renderViewRow("SMTP Port", String(smtpData.smtpPort ?? ""))}
            {renderViewRow("Username", smtpData.smtpUsername)}
            {renderViewRow("Password", smtpData.smtpPassword, true)}
            {renderViewRow("Encryption", smtpData.encryptionType)}
            {renderViewRow("From Name", smtpData.fromName)}
            {renderViewRow("From Email", smtpData.fromEmail)}
          </View>
        ) : (
          // ---------- EMPTY STATE ----------
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.surfaceTertiary,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: colors.surfacePrimary },
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={28}
                color={colors.buttonPrimary}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No SMTP Configured
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Add your SMTP details to start sending emails.
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={openModal}
              style={[
                styles.submitBtn,
                { backgroundColor: colors.buttonPrimary, paddingHorizontal: 24 },
              ]}
            >
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.submitText}>Add SMTP Config</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ---------------- MODAL ---------------- */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalContainer}
          >
            <View
              style={[
                styles.modalContent,
                { backgroundColor: colors.background },
              ]}
            >
              {/* Header */}
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <View style={styles.modalHeaderLeft}>
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: colors.surfacePrimary },
                    ]}
                  >
                    <Ionicons
                      name={hasConfig ? "create" : "add"}
                      size={18}
                      color={colors.buttonPrimary}
                    />
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {hasConfig ? "Edit SMTP Config" : "Add SMTP Config"}
                  </Text>
                </View>
                <TouchableOpacity onPress={closeModal} hitSlop={10}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Scrollable Form */}
              <ScrollView
                contentContainerStyle={{
                  padding: 16,
                  paddingBottom: insets.bottom + 24,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {renderField("SMTP Host", "smtpHost", {
                  placeholder: "smtp.example.com",
                })}
                {renderField("SMTP Port", "smtpPort", {
                  placeholder: "465",
                  keyboardType: "numeric",
                })}
                {renderField("Username", "smtpUsername", {
                  placeholder: "your-smtp-username",
                })}
                {renderField("Password", "smtpPassword", {
                  placeholder: "••••••••",
                  secure: true,
                })}

                {/* Encryption chips */}
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>
                    Encryption
                  </Text>
                  <Controller
                    control={control}
                    name="encryptionType"
                    render={({ field: { onChange, value } }) => (
                      <View style={styles.chipRow}>
                        {ENCRYPTIONS.map((e) => {
                          const active = value === e;
                          return (
                            <TouchableOpacity
                              key={e}
                              activeOpacity={0.7}
                              onPress={() => onChange(e)}
                              style={[
                                styles.chip,
                                {
                                  backgroundColor: active
                                    ? colors.buttonPrimary
                                    : colors.surfaceTertiary,
                                  borderColor: active
                                    ? colors.buttonPrimary
                                    : colors.border,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  { color: active ? "#FFFFFF" : colors.text },
                                ]}
                              >
                                {e}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  />
                </View>

                {renderField("From Name", "fromName", {
                  placeholder: "Your Company Name",
                  autoCapitalize: "words",
                })}
                {renderField("From Email", "fromEmail", {
                  placeholder: "noreply@example.com",
                  keyboardType: "email-address",
                })}

                {/* Submit */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isSubmitting || loading}
                  onPress={handleSubmit(onSubmit)}
                  style={[
                    styles.submitBtn,
                    {
                      backgroundColor: colors.buttonPrimary,
                      opacity: isSubmitting || loading ? 0.6 : 1,
                    },
                  ]}
                >
                  {isSubmitting || loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons
                        name={
                          hasConfig
                            ? "checkmark-circle-outline"
                            : "add-circle-outline"
                        }
                        size={18}
                        color="#fff"
                      />
                      <Text style={styles.submitText}>
                        {hasConfig ? "Update Config" : "Save Config"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Cancel */}
                {hasConfig && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={closeModal}
                    style={styles.cancelBtn}
                  >
                    <Text
                      style={[styles.cancelText, { color: colors.textMuted }]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </LinearGradient>
  );
};

export default SMPTScreen;

// ----------------------------------------------------------------
// Styles
// ----------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 8,
  },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "700", flex: 1 },

  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // View rows
  viewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  viewLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  viewValue: {
    fontSize: 13.5,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right",
  },

  // Empty state
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },

  // Form
  field: { marginBottom: 12 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    paddingVertical: 0,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },

  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: "700" },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
    marginTop: 8,
  },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  cancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  cancelText: { fontSize: 13, fontWeight: "600" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    maxHeight: "92%",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
});