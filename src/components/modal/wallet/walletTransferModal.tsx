import React, { useMemo, useState } from "react";
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
import { useDispatch } from "react-redux";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Colors } from "@/constants/theme";
import {
  walletTransferSchema,
  WALLET_TRANSFER_TYPES,
  type WalletTransferFormValues,
  type WalletTransferType,
} from "@/validations/wallet";
import { WalletTransferApiCall } from "@/redux/slices/walletSlice";
import { showError, showSuccess } from "@/components/service/AlertService";

/* ----------------------------- Types ----------------------------- */

type Props = {
  visible: boolean;
  onClose: () => void;
  user: any;
};

type Wallet = {
  id: string;
  walletType?: string;
  status?: string;
  balance?: number;
  availableBalance?: number;
  blockedAmount?: number;
};

/* ------------------------- Type Config --------------------------- */

const TYPE_META: Record<
  WalletTransferType,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    help: string;
  }
> = {
  credit: {
    label: "Credit",
    icon: "arrow-down-circle-outline",
    color: "#10B981",
    help: "Add funds to the wallet",
  },
  debit: {
    label: "Debit",
    icon: "arrow-up-circle-outline",
    color: "#EF4444",
    help: "Withdraw funds from the wallet",
  },
  release: {
    label: "Release",
    icon: "lock-open-outline",
    color: "#F59E0B",
    help: "Release a blocked amount",
  },
  block: {
    label: "Block",
    icon: "lock-closed-outline",
    color: "#6366F1",
    help: "Block funds without moving them",
  },
};

const DEFAULT_VALUES: WalletTransferFormValues = {
  type: "credit",
  amount: "",
  reference: "",
};

/* --------------------------- Helpers ----------------------------- */

const formatCurrency = (n?: number | null) => {
  const value = typeof n === "number" && !Number.isNaN(n) ? n : 0;
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/* --------------------------- Component --------------------------- */

const WalletTransferModal = ({ visible, onClose, user }: Props) => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"] as any;

  const [submitting, setSubmitting] = useState(false);

  // ✅ Pick the MAIN wallet (fallback to first)
  const wallet: Wallet | undefined = useMemo(() => {
    const list: Wallet[] = Array.isArray(user?.wallets) ? user.wallets : [];
    return list.find((w) => w?.walletType === "MAIN") ?? list[0];
  }, [user]);

  const availableBalance = Number(wallet?.availableBalance ?? 0);
  const blockedAmount = Number(wallet?.blockedAmount ?? 0);
  const totalBalance = Number(wallet?.balance ?? availableBalance + blockedAmount);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WalletTransferFormValues>({
    resolver: zodResolver(walletTransferSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onTouched",
  });

  const selectedType = watch("type") as WalletTransferType;

  const amountRequired = selectedType === "credit" || selectedType === "debit";
  const referenceRequired =
    selectedType === "credit" ||
    selectedType === "debit" ||
    selectedType === "release";

  /* -------- Reset on close -------- */
  const resetAndClose = () => {
    if (submitting) return;
    reset(DEFAULT_VALUES);
    onClose();
  };

  /* -------- Submit -------- */
  const onSubmit: SubmitHandler<WalletTransferFormValues> = async (values) => {
    const isBlock = values.type === "block";

    const payload = {
      id: user?.id,
      type: values.type,
      amount: isBlock ? 0 : Number(values.amount),
      reference: isBlock ? null : values.reference.trim() || null,
    };

    setSubmitting(true);
    try {
      const res = await WalletTransferApiCall(payload, dispatch);

      if (res?.success === true) {
        showSuccess("Success", res?.message || "Transfer completed");
        reset(DEFAULT_VALUES);
        onClose();
      } else {
        showError("Failed", res?.message || "Transfer failed");
      }
    } catch (err: any) {
      showError("Failed", err?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  /* -------- Balance Summary Card -------- */
  const renderBalanceSummary = () => (
    <View
      style={[
        styles.balanceCard,
        {
          backgroundColor: colors.surfacePrimary ?? colors.surfaceTertiary,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Available Balance (big) */}
      <View style={styles.balanceTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>
            AVAILABLE BALANCE
          </Text>
          <Text style={[styles.balanceValue, { color: colors.buttonPrimary }]}>
            ₹ {formatCurrency(availableBalance)}
          </Text>
        </View>
        <View
          style={[
            styles.walletBadge,
            { backgroundColor: colors.buttonPrimary + "15" },
          ]}
        >
          <Ionicons name="wallet-outline" size={14} color={colors.buttonPrimary} />
          <Text
            style={[styles.walletBadgeText, { color: colors.buttonPrimary }]}
          >
            {wallet?.walletType ?? "WALLET"}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.balanceDivider, { backgroundColor: colors.border }]} />

      {/* Blocked / Total */}
      <View style={styles.balanceStatsRow}>
        <View style={styles.balanceStat}>
          <View style={styles.balanceStatHeader}>
            <Ionicons name="lock-closed-outline" size={12} color="#F59E0B" />
            <Text style={[styles.balanceStatLabel, { color: colors.textMuted }]}>
              Blocked
            </Text>
          </View>
          <Text style={[styles.balanceStatValue, { color: colors.text }]}>
            ₹ {formatCurrency(blockedAmount)}
          </Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

        <View style={styles.balanceStat}>
          <View style={styles.balanceStatHeader}>
            <Ionicons name="cash-outline" size={12} color="#6366F1" />
            <Text style={[styles.balanceStatLabel, { color: colors.textMuted }]}>
              Total
            </Text>
          </View>
          <Text style={[styles.balanceStatValue, { color: colors.text }]}>
            ₹ {formatCurrency(totalBalance)}
          </Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

        <View style={styles.balanceStat}>
          <View style={styles.balanceStatHeader}>
            <Ionicons
              name="checkmark-circle-outline"
              size={12}
              color={wallet?.status === "ACTIVE" ? "#10B981" : "#EF4444"}
            />
            <Text style={[styles.balanceStatLabel, { color: colors.textMuted }]}>
              Status
            </Text>
          </View>
          <Text
            style={[
              styles.balanceStatValue,
              {
                color:
                  wallet?.status === "ACTIVE" ? "#10B981" : "#EF4444",
                fontSize: 12,
              },
            ]}
          >
            {wallet?.status ?? "—"}
          </Text>
        </View>
      </View>
    </View>
  );

  /* -------- Type Chip Selector -------- */
  const renderTypeSelector = () => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textMuted }]}>
        Transfer Type <Text style={{ color: colors.error }}>*</Text>
      </Text>

      <Controller
        control={control}
        name="type"
        render={({ field: { onChange, value } }) => (
          <View style={styles.chipRow}>
            {WALLET_TRANSFER_TYPES.map((t) => {
              const meta = TYPE_META[t];
              const active = value === t;
              return (
                <TouchableOpacity
                  key={t}
                  activeOpacity={0.8}
                  disabled={submitting}
                  onPress={() => {
                    onChange(t);
                    if (t === "block") setValue("amount", "");
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active
                        ? meta.color + "20"
                        : colors.surfaceTertiary,
                      borderColor: active ? meta.color : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={meta.icon}
                    size={16}
                    color={active ? meta.color : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: active ? meta.color : colors.text,
                        fontWeight: active ? "800" : "600",
                      },
                    ]}
                  >
                    {meta.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      />

      <Text style={[styles.helper, { color: colors.textMuted }]}>
        {TYPE_META[selectedType]?.help}
      </Text>

      {!!errors.type && (
        <Text style={[styles.errorText, { color: colors.error }]}>
          {errors.type.message as string}
        </Text>
      )}
    </View>
  );

  /* -------- Reusable Text Input -------- */
  const renderTextInput = (
    label: string,
    name: "amount" | "reference",
    opts: {
      placeholder?: string;
      keyboardType?: "default" | "numeric" | "decimal-pad";
      maxLength?: number;
      required?: boolean;
      editable?: boolean;
      multiline?: boolean;
    } = {}
  ) => {
    const errorMessage = errors[name]?.message as string | undefined;

    return (
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textMuted }]}>
          {label}
          {opts.required && <Text style={{ color: colors.error }}> *</Text>}
        </Text>

        <Controller
          control={control}
          name={name}
          render={({ field: { onChange, onBlur, value } }) => (
            <View
              style={[
                styles.inputWrap,
                opts.multiline && { height: 70, alignItems: "flex-start" },
                {
                  backgroundColor: colors.surfaceTertiary,
                  borderColor: errorMessage ? colors.error : colors.border,
                  opacity: opts.editable === false ? 0.6 : 1,
                },
              ]}
            >
              <TextInput
                value={value ?? ""}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={opts.placeholder ?? ""}
                placeholderTextColor={colors.textMuted}
                keyboardType={opts.keyboardType ?? "default"}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={opts.maxLength}
                multiline={opts.multiline}
                editable={opts.editable !== false && !submitting}
                style={[
                  styles.input,
                  opts.multiline && { paddingTop: 8 },
                  { color: colors.text, flex: 1 },
                ]}
              />
            </View>
          )}
        />

        {!!errorMessage && (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {errorMessage}
          </Text>
        )}
      </View>
    );
  };

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
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>
                  Wallet Transfer
                </Text>
                <Text style={[styles.subTitle, { color: colors.textMuted }]}>
                  {user?.firstName
                    ? `${user.firstName} ${user.lastName ?? ""}`.trim()
                    : "Choose a type, enter amount and confirm"}
                </Text>
              </View>
              <TouchableOpacity onPress={resetAndClose} disabled={submitting}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 30 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* ✅ Balance summary at top */}
              {renderBalanceSummary()}

              {/* Type selector */}
              {renderTypeSelector()}

              {/* Amount */}
              {renderTextInput("Amount", "amount", {
                placeholder: amountRequired ? "200" : "Not required",
                keyboardType: "decimal-pad",
                required: amountRequired,
                editable: amountRequired,
              })}

              {/* Reference */}
              {renderTextInput("Reference", "reference", {
                placeholder: referenceRequired
                  ? "e.g. TXN-12345"
                  : "Optional",
                maxLength: 120,
                required: referenceRequired,
              })}

              {/* Info banner */}
              <View
                style={[
                  styles.infoBox,
                  {
                    backgroundColor: colors.surfaceTertiary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={colors.textMuted}
                />
                <Text style={[styles.infoText, { color: colors.textMuted }]}>
                  Selected action:{" "}
                  <Text
                    style={{
                      color: TYPE_META[selectedType].color,
                      fontWeight: "800",
                    }}
                  >
                    {TYPE_META[selectedType].label}
                  </Text>
                  {selectedType === "block" &&
                    " — funds will be blocked without moving."}
                </Text>
              </View>

              {/* Submit */}
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={submitting}
                onPress={handleSubmit(onSubmit)}
                style={[
                  styles.submitBtn,
                  {
                    backgroundColor: TYPE_META[selectedType].color,
                    opacity: submitting ? 0.6 : 1,
                  },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color="#FFF"
                    />
                    <Text style={styles.submitText}>
                      Confirm {TYPE_META[selectedType].label}
                    </Text>
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

export default WalletTransferModal;

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

  /* ✅ Balance card */
  balanceCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  balanceTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  walletBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  walletBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  balanceDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  balanceStatsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  balanceStat: { flex: 1 },
  balanceStatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  balanceStatLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  balanceStatValue: {
    fontSize: 13,
    fontWeight: "800",
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    marginHorizontal: 8,
  },

  field: { marginBottom: 14 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 12.5 },

  helper: { fontSize: 11, marginTop: 6, fontWeight: "500" },

  inputWrap: {
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  input: { fontSize: 14, fontWeight: "500", paddingVertical: 0 },
  errorText: { fontSize: 11, marginTop: 4, fontWeight: "600" },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoText: { fontSize: 11.5, fontWeight: "500", flex: 1, lineHeight: 16 },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
    marginTop: 8,
  },
  submitText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
});