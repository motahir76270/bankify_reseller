import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Platform,
} from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Colors } from "@/constants/theme";
import { showSuccess } from "@/components/service/AlertService";

type MiniTxn = {
  transactionId: string;
  serialNumber?: string;
  postedDate?: string;
  valueDate?: string;
  transactionDate?: string;
  type?: string;
  amount?: { value: number; currency: string };
  description?: string;
  balance?: { value: number; currency: string };
  category?: string;
  instrumentId?: string;
  additionalData?: any;
  [key: string]: any;
};

type Props = {
  visible: boolean;
  transaction: MiniTxn | null;
  onClose: () => void;
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const formatCurrency = (n?: number, currency = "INR") => {
  if (n === undefined || n === null || isNaN(n)) return "—";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n}`;
  }
};

const ViewMiniStateModal = ({ visible, transaction, onClose }: Props) => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  if (!transaction) return null;

  const isCredit = (transaction.type ?? "").toUpperCase() === "C";
  const typeColor = isCredit
    ? colors.success ?? "#10B981"
    : colors.error ?? "#EF4444";
  const typeIcon = isCredit ? "arrow-down-circle" : "arrow-up-circle";
  const amountValue = transaction.amount?.value ?? 0;
  const sign = isCredit ? "+" : "-";

  const copy = async (text?: string, label?: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(String(text));
    showSuccess("Copied", `${label ?? "Value"} copied`);
  };

  const InfoRow = ({
    label,
    value,
    copyable,
    valueColor,
  }: {
    label: string;
    value?: any;
    copyable?: boolean;
    valueColor?: string;
  }) => {
    if (value === undefined || value === null || value === "") return null;
    return (
      <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
          {label}
        </Text>
        <TouchableOpacity
          disabled={!copyable}
          activeOpacity={copyable ? 0.6 : 1}
          onPress={() => copyable && copy(String(value), label)}
          style={styles.infoValueWrap}
        >
          <Text
            style={[styles.infoValue, { color: valueColor ?? colors.text }]}
            numberOfLines={4}
          >
            {String(value)}
          </Text>
          {copyable && (
            <Ionicons
              name="copy-outline"
              size={12}
              color={colors.textMuted}
              style={{ marginLeft: 6 }}
            />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const Section = ({
    title,
    icon,
    children,
  }: {
    title: string;
    icon: any;
    children: React.ReactNode;
  }) => (
    <View
      style={[
        styles.section,
        {
          backgroundColor: colors.surfaceTertiary,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={14} color={colors.buttonPrimary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>
                {isCredit ? "Credit" : "Debit"} Transaction
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  copy(transaction.transactionId, "Transaction ID")
                }
                style={styles.txnIdRow}
              >
                <Text
                  style={[styles.subTitle, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {transaction.transactionId}
                </Text>
                <Ionicons
                  name="copy-outline"
                  size={12}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 30 }}
          >
            {/* Hero */}
            <View
              style={[
                styles.hero,
                {
                  backgroundColor: typeColor + "15",
                  borderColor: typeColor,
                },
              ]}
            >
              <View
                style={[
                  styles.heroIcon,
                  { backgroundColor: typeColor + "25" },
                ]}
              >
                <Ionicons name={typeIcon} size={28} color={typeColor} />
              </View>

              <Text style={[styles.heroAmount, { color: typeColor }]}>
                {sign}
                {formatCurrency(
                  amountValue,
                  transaction.amount?.currency ?? "INR",
                )}
              </Text>

              {transaction.balance && (
                <Text style={[styles.heroBalance, { color: colors.textMuted }]}>
                  Balance after:{" "}
                  {formatCurrency(
                    transaction.balance.value,
                    transaction.balance.currency,
                  )}
                </Text>
              )}

              <View
                style={[
                  styles.heroPill,
                  {
                    backgroundColor: typeColor + "25",
                    borderColor: typeColor,
                  },
                ]}
              >
                <Text style={[styles.heroPillText, { color: typeColor }]}>
                  {isCredit ? "CREDIT" : "DEBIT"}
                </Text>
              </View>
            </View>

            {/* Description */}
            {!!transaction.description && (
              <View
                style={[
                  styles.descBox,
                  {
                    backgroundColor: colors.surfaceTertiary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={14}
                  color={colors.buttonPrimary}
                />
                <Text style={[styles.descText, { color: colors.text }]}>
                  {transaction.description}
                </Text>
              </View>
            )}

            {/* Transaction Info */}
            <Section title="Transaction" icon="information-circle-outline">
              <InfoRow
                label="Txn ID"
                value={transaction.transactionId}
                copyable
              />
              {!!transaction.serialNumber && (
                <InfoRow
                  label="Serial No."
                  value={transaction.serialNumber}
                />
              )}
              <InfoRow
                label="Type"
                value={isCredit ? "Credit" : "Debit"}
                valueColor={typeColor}
              />
              {!!transaction.category && (
                <InfoRow label="Category" value={transaction.category} />
              )}
              {!!transaction.instrumentId && (
                <InfoRow
                  label="Instrument ID"
                  value={transaction.instrumentId}
                  copyable
                />
              )}
            </Section>

            {/* Amount */}
            <Section title="Amount" icon="cash-outline">
              <View style={styles.amountRow}>
                <Text style={[styles.amountLabel, { color: colors.textMuted }]}>
                  Amount
                </Text>
                <Text style={[styles.amountValue, { color: typeColor }]}>
                  {sign}
                  {formatCurrency(
                    amountValue,
                    transaction.amount?.currency ?? "INR",
                  )}
                </Text>
              </View>
              {transaction.balance && (
                <View style={styles.amountRow}>
                  <Text
                    style={[styles.amountLabel, { color: colors.textMuted }]}
                  >
                    Balance After
                  </Text>
                  <Text
                    style={[
                      styles.amountValue,
                      { color: colors.buttonPrimary },
                    ]}
                  >
                    {formatCurrency(
                      transaction.balance.value,
                      transaction.balance.currency,
                    )}
                  </Text>
                </View>
              )}
            </Section>

            {/* Timeline */}
            <Section title="Timeline" icon="time-outline">
              <InfoRow
                label="Posted Date"
                value={formatDate(transaction.postedDate)}
              />
              <InfoRow
                label="Value Date"
                value={formatDate(transaction.valueDate)}
              />
              <InfoRow
                label="Txn Date"
                value={formatDate(transaction.transactionDate)}
              />
            </Section>

            {/* Additional Data */}
            {transaction.additionalData &&
              Object.keys(transaction.additionalData).length > 0 && (
                <Section title="Additional Info" icon="document-text-outline">
                  {Object.entries(transaction.additionalData).map(([k, v]) => (
                    <InfoRow
                      key={k}
                      label={k
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (c) => c.toUpperCase())
                        .trim()}
                      value={
                        typeof v === "object"
                          ? JSON.stringify(v)
                          : String(v ?? "—")
                      }
                    />
                  ))}
                </Section>
              )}
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
};

export default ViewMiniStateModal;

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
    paddingBottom: Platform.OS === "ios" ? 30 : 20,
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
  subTitle: { fontSize: 11.5, fontWeight: "500", flexShrink: 1 },
  txnIdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },

  hero: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    marginBottom: 14,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  heroAmount: { fontSize: 26, fontWeight: "800" },
  heroBalance: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  heroPill: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  heroPillText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },

  descBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  descText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 18,
  },

  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: 5,
    gap: 12,
  },
  infoLabel: { fontSize: 12, fontWeight: "500", flexShrink: 0 },
  infoValueWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  infoValue: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
    flexShrink: 1,
  },

  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  amountLabel: { fontSize: 12, fontWeight: "500" },
  amountValue: { fontSize: 13, fontWeight: "800" },

  doneBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  doneText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
});