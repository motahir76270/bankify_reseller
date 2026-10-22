import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { useDispatch, useSelector } from "react-redux";

import { Colors } from "@/constants/theme";
import { showError } from "@/components/service/AlertService";
import { getServiceMapingIdDataApiCall } from "@/redux/slices/serviceSlice";
import { initiateTransferApiCall } from "@/redux/slices/expressTransferSlice";

/* ----------------------------- Types ----------------------------- */

type TransferMode = "IMPS" | "NEFT";

type Beneficiary = {
  beneficiaryId: string;
  name?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  mobileNumber?: string;
  verificationStatus?: string;
  [key: string]: any;
};

type SenderAccount = {
  name?: string;
  mobileNumber?: string;
  accountNumber?: string;
  bankName?: string;
  ifscCode?: string;
  [key: string]: any;
};

type Props = {
  visible: boolean;
  beneficiary: Beneficiary | null;
  senderAccount?: SenderAccount | null;
  mode?: TransferMode;
  onClose: () => void;
  onSuccess?: () => void;
};

/* --------------------------- Helpers ----------------------------- */

const maskAccount = (acc?: string) => {
  if (!acc) return "—";
  if (acc.length <= 4) return acc;
  return `•••• ${acc.slice(-4)}`;
};

const getInitials = (name?: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
};

const sanitizeAmount = (v: string) => {
  const cleaned = v.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) {
    // strip leading zeros, but keep a single "0"
    const noLeading = cleaned.replace(/^0+(?=\d)/, "");
    return noLeading;
  }
  const intPart = cleaned.slice(0, firstDot).replace(/^0+(?=\d)/, "");
  const decPart = cleaned
    .slice(firstDot + 1)
    .replace(/\./g, "")
    .slice(0, 2);
  return `${intPart || "0"}.${decPart}`;
};

const MAX_AMOUNT = 100000;
const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000];
const TRANSFER_MODES: TransferMode[] = ["IMPS", "NEFT"];

/* --------------------------- Component --------------------------- */

const InitiateTransferModal = ({
  visible,
  beneficiary,
  senderAccount,
  mode: initialMode = "IMPS",
  onClose,
  onSuccess,
}: Props) => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [mode, setMode] = useState<TransferMode>(initialMode);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchingRef = useRef(false);

  const servicesState = useSelector((state: any) => state?.services);
  const serviceMapRaw = servicesState?.serviceMapingId?.mappings;

  const serviceMapData = useMemo(() => {
    if (!Array.isArray(serviceMapRaw)) return undefined;
    return serviceMapRaw.find(
      (item: any) => (item?.serviceCode ?? "").toUpperCase() === mode
    );
  }, [serviceMapRaw, mode]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setAmount("");
      setRemarks("");
      setMode(initialMode);
      setErrors({});
      setSubmitting(false);
    }
  }, [visible, initialMode]);

  // Fetch service mappings once when needed
  useEffect(() => {
    if (!visible) return;
    if (Array.isArray(serviceMapRaw) && serviceMapRaw.length > 0) return;
    if (fetchingRef.current) return;

    fetchingRef.current = true;
    Promise.resolve(getServiceMapingIdDataApiCall(dispatch)).finally(() => {
      fetchingRef.current = false;
    });
  }, [visible, serviceMapRaw, dispatch]);

  // Clear the "service not available" error once the mapping arrives for the selected mode
  useEffect(() => {
    if (serviceMapData?.id) {
      setErrors((prev) => {
        if (!prev._) return prev;
        const { _, ...rest } = prev;
        return rest;
      });
    }
  }, [serviceMapData]);

  const numericAmount = useMemo(() => {
    const n = parseFloat(amount);
    return isNaN(n) ? 0 : n;
  }, [amount]);

  const isVerified = useMemo(
    () =>
      !!beneficiary?.verificationStatus &&
      beneficiary.verificationStatus.toUpperCase() === "VERIFIED",
    [beneficiary]
  );

  const validationError = useMemo(() => {
    if (!beneficiary) return "No beneficiary selected";
    if (!isVerified) return "Beneficiary is not verified";
    if (!numericAmount || numericAmount < 1) return "Enter a valid amount";
    if (numericAmount > MAX_AMOUNT)
      return `Amount exceeds per-transaction limit (₹${MAX_AMOUNT.toLocaleString(
        "en-IN"
      )})`;
    if (!serviceMapData?.id)
      return `${mode} service not available. Please try again.`;
    return "";
  }, [beneficiary, isVerified, numericAmount, serviceMapData, mode]);

  const canSubmit = useMemo(
    () => !validationError && !submitting,
    [validationError, submitting]
  );

  const validate = () => {
    const e: Record<string, string> = {};
    if (!beneficiary) e._ = "No beneficiary selected";
    if (!isVerified) e._ = "Beneficiary is not verified";
    if (!numericAmount || numericAmount < 1) e.amount = "Enter a valid amount";
    if (numericAmount > MAX_AMOUNT)
      e.amount = `Amount exceeds per-transaction limit (₹${MAX_AMOUNT.toLocaleString(
        "en-IN"
      )})`;
    if (!serviceMapData?.id)
      e._ = `${mode} service not available. Please try again.`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        amount: numericAmount,
        beneficiaryAccount: beneficiary?.accountNumber,
        beneficiaryBankName: beneficiary?.bankName,
        beneficiaryIfsc: beneficiary?.ifscCode,
        beneficiaryMobile: beneficiary?.mobileNumber,
        beneficiaryName:
          beneficiary?.accountHolderName ?? beneficiary?.name,
        mode, // IMPS or NEFT
        remarks: remarks.trim() || `${mode} Transfer`,
        serviceProviderMappingId: serviceMapData?.id,
      };

      const res = await initiateTransferApiCall(payload, dispatch);

      if (res?.success === true) {
        onClose();
        onSuccess?.();
      }
    } catch (err: any) {
      showError("Transfer failed", err?.message ?? "Please try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ width: "100%" }}
        >
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>
                  Send Money
                </Text>
                <Text style={[styles.subTitle, { color: colors.textMuted }]}>
                  {mode} Transfer · Instant
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                disabled={submitting}
                hitSlop={8}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 30 }}
              keyboardShouldPersistTaps="handled"
            >
              {beneficiary && (
                <View
                  style={[
                    styles.payeeCard,
                    {
                      backgroundColor: colors.surfaceTertiary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.payeeAvatar,
                      { backgroundColor: colors.buttonPrimary + "22" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.payeeAvatarText,
                        { color: colors.buttonPrimary },
                      ]}
                    >
                      {getInitials(
                        beneficiary.accountHolderName ?? beneficiary.name
                      )}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text
                      style={[styles.payeeName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {beneficiary.accountHolderName ??
                        beneficiary.name ??
                        "Beneficiary"}
                    </Text>
                    <Text
                      style={[styles.payeeMeta, { color: colors.textMuted }]}
                      numberOfLines={1}
                    >
                      {beneficiary.bankName ?? "—"} ·{" "}
                      {maskAccount(beneficiary.accountNumber)}
                    </Text>
                  </View>
                  {isVerified && (
                    <Ionicons
                      name="shield-checkmark"
                      size={18}
                      color={colors.success ?? "#10B981"}
                    />
                  )}
                </View>
              )}

              {senderAccount && (
                <View
                  style={[
                    styles.senderRow,
                    {
                      backgroundColor: colors.surfaceTertiary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="arrow-up-circle-outline"
                    size={16}
                    color={colors.textMuted}
                  />
                  <Text
                    style={[styles.senderText, { color: colors.textMuted }]}
                    numberOfLines={1}
                  >
                    From: {senderAccount.name ?? "Your account"} ·{" "}
                    {maskAccount(senderAccount.accountNumber)}
                  </Text>
                </View>
              )}

              {/* Transfer Mode */}
              <Text style={[styles.label, { color: colors.textMuted }]}>
                Transfer Mode <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <View style={styles.modeRow}>
                {TRANSFER_MODES.map((m) => {
                  const active = mode === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      activeOpacity={0.7}
                      disabled={submitting}
                      onPress={() => {
                        setMode(m);
                        setErrors({});
                      }}
                      style={[
                        styles.modeChip,
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
                          styles.modeText,
                          { color: active ? "#FFFFFF" : colors.text },
                        ]}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Amount */}
              <Text style={[styles.label, { color: colors.textMuted }]}>
                Amount <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <View
                style={[
                  styles.amountWrap,
                  {
                    backgroundColor: colors.surfaceTertiary,
                    borderColor: errors.amount ? colors.error : colors.border,
                  },
                ]}
              >
                <Text style={[styles.rupee, { color: colors.text }]}>₹</Text>
                <TextInput
                  value={amount}
                  onChangeText={(v) => {
                    setAmount(sanitizeAmount(v));
                    setErrors((p) => ({ ...p, amount: "" }));
                  }}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  style={[styles.amountInput, { color: colors.text }]}
                  editable={!submitting}
                />
              </View>
              {!!errors.amount && (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {errors.amount}
                </Text>
              )}

              <View style={styles.quickRow}>
                {QUICK_AMOUNTS.map((q) => (
                  <TouchableOpacity
                    key={q}
                    activeOpacity={0.7}
                    disabled={submitting}
                    onPress={() => {
                      setAmount(String(q));
                      setErrors((p) => ({ ...p, amount: "" }));
                    }}
                    style={[
                      styles.quickChip,
                      {
                        backgroundColor: colors.surfaceTertiary,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.quickText, { color: colors.text }]}>
                      ₹{q}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Remarks */}
              <Text style={[styles.label, { color: colors.textMuted }]}>
                Remarks (optional)
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.surfaceTertiary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TextInput
                  value={remarks}
                  onChangeText={setRemarks}
                  placeholder="e.g. Rent, Tuition, Gift"
                  placeholderTextColor={colors.textMuted}
                  maxLength={60}
                  style={[styles.input, { color: colors.text, flex: 1 }]}
                  editable={!submitting}
                />
              </View>

              {/* Generic error (e.g. service unavailable / unverified beneficiary) */}
              {!!errors._ && (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {errors._}
                </Text>
              )}

              {/* Submit */}
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={submitting}
                onPress={handleSubmit}
                style={[
                  styles.submitBtn,
                  {
                    backgroundColor: colors.buttonPrimary,
                    opacity: submitting ? 0.5 : 1,
                  },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
                    <Text style={styles.submitText}>Transfer</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={[styles.noteText, { color: colors.textMuted }]}>
                By continuing you agree to the {mode} transfer terms. Funds
                are usually credited within seconds.
              </Text>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default InitiateTransferModal;

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
    minHeight: "92%",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: "800" },
  subTitle: { fontSize: 11.5, fontWeight: "500", marginTop: 3 },

  payeeCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  payeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  payeeAvatarText: { fontSize: 13, fontWeight: "800" },
  payeeName: { fontSize: 13.5, fontWeight: "700" },
  payeeMeta: { fontSize: 11, fontWeight: "500", marginTop: 2 },

  senderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  senderText: { fontSize: 11.5, fontWeight: "600", flex: 1 },

  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
    marginTop: 6,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  input: { fontSize: 14, fontWeight: "500", paddingVertical: 0 },

  modeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  modeChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modeText: { fontSize: 13, fontWeight: "700" },

  amountWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 58,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  rupee: { fontSize: 22, fontWeight: "800", marginRight: 6 },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "800",
    paddingVertical: 0,
  },
  errorText: { fontSize: 11, marginTop: 4, fontWeight: "600" },

  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickText: { fontSize: 12.5, fontWeight: "700" },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 12,
    marginTop: 16,
  },
  submitText: { color: "#FFFFFF", fontSize: 14.5, fontWeight: "800" },

  noteText: {
    fontSize: 10.5,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 15,
  },
});