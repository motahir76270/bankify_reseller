import React, { useEffect, useMemo, useState } from "react";
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
import payoutValidation from "@/validations/payout";
import { showError, showSuccess } from "@/components/service/AlertService";
import {
  getUserBankDataApiCall,
  initiatePayoutApiCall,
} from "@/redux/slices/payoutSlice";
import { getServiceMapingIdDataApiCall } from "@/redux/slices/serviceSlice";

/* ----------------------------- Types ----------------------------- */

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

type Mode = "IMPS" | "NEFT" | "RTGS";

type BankDetail = {
  id?: string;
  bankId?: string;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  mobileNumber?: string;
  isPrimary?: boolean;
  upiId?: string;
  verificationStatus?: string;
  [key: string]: any;
};

const MODE_OPTIONS: { label: string; value: Mode }[] = [
  { label: "IMPS", value: "IMPS" },
  { label: "NEFT", value: "NEFT" },
  { label: "RTGS", value: "RTGS" },
];

/* --------------------------- Helpers ----------------------------- */

/** Pull the PAYOUT service mapping out of whatever wrapper the slice uses. */
const extractPayoutMapping = (raw: any): any | null => {
  if (!raw) return null;
  const list: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw.mappings)
    ? raw.mappings
    : Array.isArray(raw.data?.mappings)
    ? raw.data.mappings
    : [];
  if (!list.length) return null;
  return (
    list.find((m) => (m.serviceCode ?? "").toUpperCase() === "PAYOUT") ?? null
  );
};

/** Extract the primary bank from any common wrapper shape. */
const extractPrimaryBank = (raw: any): BankDetail | null => {
  if (!raw) return null;

  // Direct shape: { primaryBank: {...} }
  if (raw.primaryBank) return raw.primaryBank;

  // Wrapped: { data: { primaryBank: {...} } }
  if (raw.data?.primaryBank) return raw.data.primaryBank;

  // Fallback: find in bankDetails[]
  const list: BankDetail[] = Array.isArray(raw.bankDetails)
    ? raw.bankDetails
    : Array.isArray(raw.data?.bankDetails)
    ? raw.data.bankDetails
    : [];
  if (list.length) {
    return list.find((b) => b.isPrimary) ?? list[0];
  }
  return null;
};

/* --------------------------- Component --------------------------- */

const InitiatePayoutModal = ({ visible, onClose, onSuccess }: Props) => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const servicesState = useSelector((state: any) => state?.services);
  const payoutState = useSelector((state: any) => state?.payout);
  const { user } = useSelector((state: any) => state?.auth);

  const userId = user?.user?.id ?? payoutState?.userId;

  const serviceMapRaw =
    servicesState?.serviceMapingId ??
    payoutState?.serviceMapingId ??
    payoutState?.serviceMappings ??
    null;

  const loading =
    servicesState?.loading ??
    servicesState?.laoding ??
    payoutState?.loading ??
    payoutState?.laoding ??
    false;

  const payoutMapping = useMemo(
    () => extractPayoutMapping(serviceMapRaw),
    [serviceMapRaw],
  );
  const serviceProviderMappingId = payoutMapping?.id ?? "";

  // 🔑 Primary bank extracted from Redux
  const primaryBank = useMemo(
    () => extractPrimaryBank(payoutState?.userBankData),
    [payoutState?.userBankData],
  );

  // Form only needs amount + mode + remarks now
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<Mode>("IMPS");
  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  /* -------- Fetch on open -------- */
  useEffect(() => {
    if (!visible) return;
    if (!payoutMapping) getServiceMapingIdDataApiCall(dispatch);
    if (userId && !primaryBank) getUserBankDataApiCall(userId, dispatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, userId]);

  /* -------- Reset on close -------- */
  const resetAndClose = () => {
    setAmount("");
    setMode("IMPS");
    setRemarks("");
    setErrors({});
    onClose();
  };

  const setField =
    (setter: React.Dispatch<React.SetStateAction<string>>, key: string) =>
    (v: string) => {
      setter(v);
      setErrors((prev) => ({ ...prev, [key]: "" }));
    };

  /* -------- Submit -------- */
  const handleSubmit = async () => {
    if (!primaryBank) {
      showError("Missing bank", "Please add a primary bank first");
      return;
    }
    if (!serviceProviderMappingId) {
      showError("Missing config", "PAYOUT service mapping not found");
      return;
    }

    const raw: any = {
      amount: Number(amount),
      beneficiaryAccount: primaryBank.accountNumber ?? "",
      beneficiaryBankName: primaryBank.bankName ?? "",
      beneficiaryIfsc: (primaryBank.ifscCode ?? "").toUpperCase(),
      beneficiaryMobile: primaryBank.mobileNumber ?? "",
      beneficiaryName: primaryBank.accountHolderName ?? "",
      mode,
      remarks: remarks.trim(),
    };

    const schema = payoutValidation.initiatePayoutSchema;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue: any) => {
        fieldErrors[issue.path[0]] = issue.message;
      });
      setErrors(fieldErrors);
      showError("Validation", parsed.error.issues[0]?.message || "Check form");
      return;
    }

    const payload = {
      ...parsed.data,
      serviceProviderMappingId,
    };

    setSubmitting(true);
    try {
      const res = await initiatePayoutApiCall(payload, dispatch);
      if (res?.success === true || res === true) {
        showSuccess("Success", "Payout initiated successfully");
        onSuccess?.();
        resetAndClose();
      }
    } catch (err: any) {
      showError("Failed", err?.message || "Could not initiate payout");
    } finally {
      setSubmitting(false);
    }
  };

  /* -------- Renderers -------- */

  /** Read-only info row for auto-filled bank data */
  const InfoRow = ({
    icon,
    label,
    value,
  }: {
    icon: any;
    label: string;
    value?: string;
  }) => (
    <View style={styles.infoRow}>
      <View
        style={[
          styles.infoIconWrap,
          { backgroundColor: colors.buttonPrimary + "18" },
        ]}
      >
        <Ionicons name={icon} size={14} color={colors.buttonPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
          {label}
        </Text>
        <Text
          style={[styles.infoValue, { color: colors.text }]}
          numberOfLines={1}
        >
          {value || "—"}
        </Text>
      </View>
    </View>
  );

  const Chip = ({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={submitting}
      style={[
        styles.chip,
        {
          backgroundColor: active
            ? colors.buttonPrimary
            : colors.surfaceTertiary,
          borderColor: active ? colors.buttonPrimary : colors.border,
        },
      ]}
    >
      <Text
        style={[styles.chipText, { color: active ? "#FFF" : colors.text }]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  /* --------------------------- Render --------------------------- */

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
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>
                  Initiate Payout
                </Text>
                {!!payoutMapping && (
                  <Text
                    style={[styles.subTitle, { color: colors.textMuted }]}
                    numberOfLines={1}
                  >
                    {payoutMapping.serviceCode} · {payoutMapping.providerCode}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={resetAndClose} disabled={submitting}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* -------- Primary bank card (auto-filled) -------- */}
              {!primaryBank ? (
                <View
                  style={[
                    styles.emptyBankBox,
                    {
                      backgroundColor: colors.surfaceTertiary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color={colors.error}
                  />
                  <Text
                    style={[styles.emptyBankText, { color: colors.text }]}
                  >
                    No primary bank found. Please add one in My Banks.
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.bankCard,
                    {
                      backgroundColor: colors.surfaceTertiary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.bankCardHeader}>
                    <View
                      style={[
                        styles.bankIconWrap,
                        { backgroundColor: colors.buttonPrimary + "18" },
                      ]}
                    >
                      <Ionicons
                        name="business-outline"
                        size={18}
                        color={colors.buttonPrimary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.bankName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {primaryBank.bankName ?? "Bank"}
                      </Text>
                      <Text
                        style={[styles.bankSub, { color: colors.textMuted }]}
                        numberOfLines={1}
                      >
                        Primary beneficiary
                      </Text>
                    </View>
                    {primaryBank.verificationStatus === "VERIFIED" && (
                      <View
                        style={[
                          styles.verifiedPill,
                          {
                            backgroundColor:
                              (colors.success ?? "#10B981") + "20",
                            borderColor: colors.success ?? "#10B981",
                          },
                        ]}
                      >
                        <Ionicons
                          name="checkmark-circle"
                          size={10}
                          color={colors.success ?? "#10B981"}
                        />
                        <Text
                          style={[
                            styles.verifiedText,
                            { color: colors.success ?? "#10B981" },
                          ]}
                        >
                          VERIFIED
                        </Text>
                      </View>
                    )}
                  </View>

                  <View
                    style={[
                      styles.bankCardBody,
                      { borderTopColor: colors.border },
                    ]}
                  >
                    <InfoRow
                      icon="person-outline"
                      label="Account Holder"
                      value={primaryBank.accountHolderName}
                    />
                    <InfoRow
                      icon="card-outline"
                      label="Account Number"
                      value={primaryBank.accountNumber}
                    />
                    <InfoRow
                      icon="git-branch-outline"
                      label="IFSC"
                      value={primaryBank.ifscCode}
                    />
                    <InfoRow
                      icon="call-outline"
                      label="Mobile"
                      value={primaryBank.mobileNumber}
                    />
                  </View>
                </View>
              )}

              {/* -------- Amount -------- */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textMuted }]}>
                  Amount <Text style={{ color: colors.error }}>*</Text>
                </Text>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      backgroundColor: colors.surfaceTertiary,
                      borderColor: errors.amount
                        ? colors.error
                        : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.currencyPrefix,
                      { color: colors.textMuted },
                    ]}
                  >
                    ₹
                  </Text>
                  <TextInput
                    value={amount}
                    onChangeText={setField(setAmount, "amount")}
                    placeholder="1000"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    style={[styles.input, { color: colors.text, flex: 1 }]}
                    editable={!submitting}
                  />
                </View>
                {!!errors.amount && (
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    {errors.amount}
                  </Text>
                )}
              </View>

              {/* -------- Mode -------- */}
              <Text style={[styles.label, { color: colors.textMuted }]}>
                Payment Mode <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <View style={styles.chipRow}>
                {MODE_OPTIONS.map((m) => (
                  <Chip
                    key={m.value}
                    label={m.label}
                    active={mode === m.value}
                    onPress={() => setMode(m.value)}
                  />
                ))}
              </View>
              {!!errors.mode && (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {errors.mode}
                </Text>
              )}

              {/* -------- Remarks -------- */}
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.label, { color: colors.textMuted }]}>
                  Remarks (optional)
                </Text>
                <View
                  style={[
                    styles.inputWrap,
                    styles.inputWrapMultiline,
                    {
                      backgroundColor: colors.surfaceTertiary,
                      borderColor: errors.remarks
                        ? colors.error
                        : colors.border,
                    },
                  ]}
                >
                  <TextInput
                    value={remarks}
                    onChangeText={setRemarks}
                    placeholder="e.g. Salary payout"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="sentences"
                    maxLength={200}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    style={[
                      styles.input,
                      styles.inputMultiline,
                      { color: colors.text },
                    ]}
                    editable={!submitting}
                  />
                </View>
                {!!errors.remarks && (
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    {errors.remarks}
                  </Text>
                )}
              </View>

              {/* -------- Submit -------- */}
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={submitting || !primaryBank}
                onPress={handleSubmit}
                style={[
                  styles.submitBtn,
                  {
                    backgroundColor: colors.buttonPrimary,
                    opacity: submitting || !primaryBank ? 0.5 : 1,
                  },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="send-outline" size={18} color="#FFF" />
                    <Text style={styles.submitText}>Initiate Payout</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default InitiatePayoutModal;

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
    minHeight: "90%",
    maxHeight: "95%",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: "800" },
  subTitle: { fontSize: 11.5, fontWeight: "500", marginTop: 3 },

  /* Primary bank card */
  bankCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  bankCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bankIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bankName: { fontSize: 14, fontWeight: "800" },
  bankSub: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  bankCardBody: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
    paddingTop: 10,
    gap: 8,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 3,
  },
  infoIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  infoValue: { fontSize: 12.5, fontWeight: "700", marginTop: 1 },

  /* Empty bank state */
  emptyBankBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  emptyBankText: { flex: 1, fontSize: 12.5, fontWeight: "600" },

  /* Fields */
  field: { marginBottom: 12 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
    marginTop: 8,
  },
  inputWrap: {
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  inputWrapMultiline: {
    height: undefined,
    minHeight: 80,
    paddingVertical: 10,
    alignItems: "flex-start",
  },
  currencyPrefix: { fontSize: 16, fontWeight: "700", marginRight: 6 },
  input: { fontSize: 14, fontWeight: "500", paddingVertical: 0 },
  inputMultiline: { paddingVertical: 0, minHeight: 60, width: "100%" },
  errorText: { fontSize: 11, marginTop: 4, fontWeight: "600" },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 12.5, fontWeight: "700" },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
    marginTop: 20,
  },
  submitText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
});