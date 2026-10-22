import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Platform,
  ActivityIndicator,
} from "react-native";
import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Colors } from "@/constants/theme";
import { showSuccess } from "@/components/service/AlertService";

type PayoutTxn = {
  id: string;
  txnId: string;
  userId?: string;
  user?: {
    firstName?: string;
    lastName?: string;
    userNumber?: string;
    roleCode?: string;
    roleName?: string;
  };
  beneficiaryAccount?: string;
  beneficiaryIfsc?: string;
  beneficiaryName?: string;
  mode?: string;
  amount: number;
  netAmount: number;
  status: string;
  providerReference?: string | null;
  utrNo?: string | null;
  rrn?: string | null;
  serviceName?: string;
  providerName?: string;
  pricingType?: string;
  surcharge?: number;
  commission?: number;
  tds?: number;
  gst?: number;
  totalAmount?: number;
  initiatedAt?: string;
  completedAt?: string | null;
  [key: string]: any;
};

type Props = {
  visible: boolean;
  transaction: PayoutTxn | null;
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

const getStatusColor = (status: string, colors: any) => {
  switch (status?.toUpperCase()) {
    case "SUCCESS":
    case "COMPLETED":
      return colors.success ?? "#10B981";
    case "FAILED":
    case "REJECTED":
      return colors.error ?? "#EF4444";
    case "PENDING":
    case "PROCESSING":
      return "#F59E0B";
    default:
      return colors.textMuted;
  }
};

const getStatusIcon = (status: string): any => {
  switch (status?.toUpperCase()) {
    case "SUCCESS":
      return "checkmark-circle";
    case "FAILED":
    case "REJECTED":
      return "close-circle";
    case "PENDING":
    case "PROCESSING":
      return "time";
    default:
      return "help-circle";
  }
};

const buildReceiptHtml = (txn: PayoutTxn, statusColor: string) => {
  const row = (label: string, value?: any) =>
    value === undefined || value === null || value === ""
      ? ""
      : `<tr>
           <td style="padding:6px 0;color:#6B7280;font-size:12px;">${label}</td>
           <td style="padding:6px 0;color:#111827;font-size:12px;font-weight:600;text-align:right;">${String(
             value
           )}</td>
         </tr>`;

  const userFullName = `${txn.user?.firstName ?? ""} ${
    txn.user?.lastName ?? ""
  }`.trim();

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
          body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #111827; }
          .hero { border: 1px solid ${statusColor}; background: ${statusColor}1A; border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 20px; }
          .hero .amount { font-size: 30px; font-weight: 800; margin: 8px 0 2px; }
          .hero .net { color: #6B7280; font-size: 13px; }
          .pill { display: inline-block; margin-top: 10px; padding: 4px 12px; border-radius: 20px; border: 1px solid ${statusColor}; color: ${statusColor}; font-size: 11px; font-weight: 800; letter-spacing: 0.6px; }
          h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; border-bottom: 1px solid #E5E7EB; padding-bottom: 6px; margin: 20px 0 8px; }
          table { width: 100%; border-collapse: collapse; }
          .footer { margin-top: 28px; text-align: center; font-size: 10px; color: #9CA3AF; }
        </style>
      </head>
      <body>
        <div class="hero">
          <div style="font-size:12px;color:#6B7280;font-weight:600;">Payout</div>
          <div class="amount">₹${txn.amount}</div>
          <div class="net">Net: ₹${txn.netAmount}</div>
          <div class="pill">${txn.status}</div>
        </div>

        <h2>Transaction</h2>
        <table>
          ${row("Txn ID", txn.txnId)}
          ${row("Mode", txn.mode)}
          ${row("Service", txn.serviceName)}
          ${row("Provider", txn.providerName)}
          ${row("Provider Ref", txn.providerReference)}
          ${row("UTR No.", txn.utrNo)}
          ${row("RRN", txn.rrn)}
        </table>

        <h2>Amount</h2>
        <table>
          ${row("Amount", `₹${txn.amount}`)}
          ${row("Net Amount", `₹${txn.netAmount}`)}
          ${row("Surcharge", txn.surcharge ? `₹${txn.surcharge}` : "")}
          ${row("Commission", txn.commission ? `₹${txn.commission}` : "")}
          ${row("TDS", txn.tds ? `₹${txn.tds}` : "")}
          ${row("GST", txn.gst ? `₹${txn.gst}` : "")}
          ${row(
            "Total",
            typeof txn.totalAmount === "number" ? `₹${txn.totalAmount}` : ""
          )}
        </table>

        <h2>Beneficiary</h2>
        <table>
          ${row("Name", txn.beneficiaryName)}
          ${row("Account No.", txn.beneficiaryAccount)}
          ${row("IFSC", txn.beneficiaryIfsc)}
        </table>

        ${
          txn.user
            ? `<h2>Sender</h2>
               <table>
                 ${row("Name", userFullName)}
                 ${row("User No.", txn.user.userNumber)}
                 ${row("Role", txn.user.roleName)}
               </table>`
            : ""
        }

        <h2>Timeline</h2>
        <table>
          ${row("Initiated", formatDate(txn.initiatedAt))}
          ${row("Completed", formatDate(txn.completedAt))}
        </table>

        <h2>Technical</h2>
        <table>
          ${row("Txn UUID", txn.id)}
          ${row("User ID", txn.userId)}
        </table>

        <div class="footer">
          Generated on ${new Date().toLocaleString("en-IN")}
        </div>
      </body>
    </html>
  `;
};

const ViewPayoutModal = ({ visible, transaction, onClose }: Props) => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const [sharing, setSharing] = useState(false);

  if (!transaction) return null;

  const statusColor = getStatusColor(transaction.status, colors);
  const statusIcon = getStatusIcon(transaction.status);

  const copy = async (text?: string, label?: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(String(text));
    showSuccess("Copied", `${label ?? "Value"} copied`);
  };

  const sharePdf = async () => {
    if (sharing) return;
    try {
      setSharing(true);

      const html = buildReceiptHtml(transaction, statusColor);
      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Payout ${transaction.txnId}`,
          UTI: "com.adobe.pdf",
        });
      } else {
        showSuccess("PDF Ready", "Sharing not available on this device");
      }
    } catch (e: any) {
      console.error("PDF share failed:", e);
      showSuccess("Error", e?.message ?? "Could not generate PDF");
    } finally {
      setSharing(false);
    }
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
            numberOfLines={3}
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

  const hasPricing =
    (transaction.surcharge ?? 0) > 0 ||
    (transaction.commission ?? 0) > 0 ||
    (transaction.tds ?? 0) > 0 ||
    (transaction.gst ?? 0) > 0;

  const userFullName = `${transaction.user?.firstName ?? ""} ${
    transaction.user?.lastName ?? ""
  }`.trim();

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
                Payout
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => copy(transaction.txnId, "Transaction ID")}
                style={styles.txnIdRow}
              >
                <Text
                  style={[styles.subTitle, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {transaction.txnId}
                </Text>
                <Ionicons
                  name="copy-outline"
                  size={12}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={sharePdf}
              disabled={sharing}
              style={styles.headerAction}
            >
              {sharing ? (
                <ActivityIndicator size="small" color={colors.buttonPrimary} />
              ) : (
                <Ionicons
                  name="share-outline"
                  size={22}
                  color={colors.buttonPrimary}
                />
              )}
            </TouchableOpacity>

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
                  backgroundColor: statusColor + "15",
                  borderColor: statusColor,
                },
              ]}
            >
              <View
                style={[
                  styles.heroIcon,
                  { backgroundColor: statusColor + "25" },
                ]}
              >
                <Ionicons name={statusIcon} size={28} color={statusColor} />
              </View>

              <Text style={[styles.heroAmount, { color: colors.text }]}>
                ₹{transaction.amount}
              </Text>
              <Text style={[styles.heroNet, { color: colors.textMuted }]}>
                Net: ₹{transaction.netAmount}
              </Text>

              <View
                style={[
                  styles.heroPill,
                  {
                    backgroundColor: statusColor + "25",
                    borderColor: statusColor,
                  },
                ]}
              >
                <View
                  style={[styles.heroPillDot, { backgroundColor: statusColor }]}
                />
                <Text style={[styles.heroPillText, { color: statusColor }]}>
                  {transaction.status}
                </Text>
              </View>
            </View>

            {/* Transaction */}
            <Section title="Transaction" icon="information-circle-outline">
              <InfoRow label="Txn ID" value={transaction.txnId} copyable />
              <InfoRow label="Mode" value={transaction.mode} />
              <InfoRow label="Service" value={transaction.serviceName} />
              <InfoRow label="Provider" value={transaction.providerName} />
              {!!transaction.providerReference && (
                <InfoRow
                  label="Provider Ref"
                  value={transaction.providerReference}
                  copyable
                />
              )}
              {!!transaction.utrNo && (
                <InfoRow label="UTR No." value={transaction.utrNo} copyable />
              )}
              {!!transaction.rrn && (
                <InfoRow label="RRN" value={transaction.rrn} copyable />
              )}
            </Section>

            {/* Amount & Pricing */}
            <Section title="Amount" icon="cash-outline">
              <View style={styles.amountRow}>
                <Text style={[styles.amountLabel, { color: colors.textMuted }]}>
                  Amount
                </Text>
                <Text style={[styles.amountValue, { color: colors.text }]}>
                  ₹{transaction.amount}
                </Text>
              </View>
              <View style={styles.amountRow}>
                <Text style={[styles.amountLabel, { color: colors.textMuted }]}>
                  Net Amount
                </Text>
                <Text style={[styles.amountValue, { color: colors.text }]}>
                  ₹{transaction.netAmount}
                </Text>
              </View>
              {hasPricing && (
                <>
                  {!!transaction.surcharge && (
                    <View style={styles.amountRow}>
                      <Text
                        style={[styles.amountLabel, { color: colors.textMuted }]}
                      >
                        Surcharge
                      </Text>
                      <Text
                        style={[styles.amountValue, { color: colors.text }]}
                      >
                        ₹{transaction.surcharge}
                      </Text>
                    </View>
                  )}
                  {!!transaction.commission && (
                    <View style={styles.amountRow}>
                      <Text
                        style={[styles.amountLabel, { color: colors.textMuted }]}
                      >
                        Commission
                      </Text>
                      <Text
                        style={[styles.amountValue, { color: colors.text }]}
                      >
                        ₹{transaction.commission}
                      </Text>
                    </View>
                  )}
                  {!!transaction.tds && (
                    <View style={styles.amountRow}>
                      <Text
                        style={[styles.amountLabel, { color: colors.textMuted }]}
                      >
                        TDS
                      </Text>
                      <Text
                        style={[styles.amountValue, { color: colors.text }]}
                      >
                        ₹{transaction.tds}
                      </Text>
                    </View>
                  )}
                  {!!transaction.gst && (
                    <View style={styles.amountRow}>
                      <Text
                        style={[styles.amountLabel, { color: colors.textMuted }]}
                      >
                        GST
                      </Text>
                      <Text
                        style={[styles.amountValue, { color: colors.text }]}
                      >
                        ₹{transaction.gst}
                      </Text>
                    </View>
                  )}
                </>
              )}
              {typeof transaction.totalAmount === "number" && (
                <View
                  style={[
                    styles.amountRow,
                    {
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: colors.border,
                      marginTop: 6,
                      paddingTop: 8,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.amountLabel,
                      { color: colors.text, fontWeight: "800" },
                    ]}
                  >
                    Total
                  </Text>
                  <Text
                    style={[
                      styles.amountValue,
                      { color: colors.buttonPrimary },
                    ]}
                  >
                    ₹{transaction.totalAmount}
                  </Text>
                </View>
              )}
            </Section>

            {/* Beneficiary */}
            <Section title="Beneficiary" icon="person-outline">
              <InfoRow label="Name" value={transaction.beneficiaryName} />
              <InfoRow
                label="Account No."
                value={transaction.beneficiaryAccount}
                copyable
              />
              <InfoRow
                label="IFSC"
                value={transaction.beneficiaryIfsc}
                copyable
              />
            </Section>

            {/* Sender / User */}
            {transaction.user && (
              <Section title="Sender" icon="send-outline">
                {!!userFullName && (
                  <InfoRow label="Name" value={userFullName} />
                )}
                {!!transaction.user.userNumber && (
                  <InfoRow
                    label="User No."
                    value={transaction.user.userNumber}
                  />
                )}
                {!!transaction.user.roleName && (
                  <InfoRow label="Role" value={transaction.user.roleName} />
                )}
              </Section>
            )}

            {/* Timeline */}
            <Section title="Timeline" icon="time-outline">
              <InfoRow
                label="Initiated"
                value={formatDate(transaction.initiatedAt)}
              />
              <InfoRow
                label="Completed"
                value={formatDate(transaction.completedAt)}
              />
            </Section>

            {/* Technical */}
            <Section title="Technical" icon="code-slash-outline">
              <InfoRow label="Txn UUID" value={transaction.id} copyable />
              {!!transaction.userId && (
                <InfoRow label="User ID" value={transaction.userId} copyable />
              )}
            </Section>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default ViewPayoutModal;

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
  headerAction: {
    padding: 4,
    marginRight: 8,
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
  heroAmount: { fontSize: 28, fontWeight: "800" },
  heroNet: { fontSize: 12.5, fontWeight: "600", marginTop: 2 },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  heroPillDot: { width: 6, height: 6, borderRadius: 3 },
  heroPillText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },

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
  amountValue: { fontSize: 13, fontWeight: "700" },

  doneBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  doneText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
});