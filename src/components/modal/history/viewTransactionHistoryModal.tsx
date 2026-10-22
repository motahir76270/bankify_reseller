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

/* ----------------------------- Types ----------------------------- */

type Transaction = {
  id: string;
  txnId: string;
  amount: number;
  netAmount: number;
  status: string;
  serviceType: string;
  pricing?: string | Record<string, any>;
  providerResponse?: string | Record<string, any>;
  serviceData?: string | Record<string, any>;
  providerReference?: string;
  serviceProviderMappingId?: string;
  tenantId?: string;
  userId?: string;
  walletId?: string;
  apiEntityId?: string;
  initiatedAt: string;
  completedAt: string | null;
  processedAt: string | null;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    mobileNumber?: string;
  };
  role?: { roleName?: string; roleCode?: string };
  service?: { serviceName?: string; serviceCode?: string };
  provider?: { serviceName?: string; serviceCode?: string };
  [key: string]: any;
};

type Props = {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
};

/* --------------------------- Helpers ----------------------------- */

const parseJSON = <T,>(input: any): T | null => {
  if (!input) return null;
  if (typeof input === "object") return input as T;
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
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
    case "COMPLETED":
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

const buildReceiptHtml = (txn: Transaction, statusColor: string) => {
  const pricing = parseJSON<Record<string, any>>(txn.pricing);
  const svcData = parseJSON<Record<string, any>>(txn.serviceData);
  const provRes = parseJSON<Record<string, any>>(txn.providerResponse);

  const row = (label: string, value?: any, color?: string) =>
    value === undefined || value === null || value === ""
      ? ""
      : `<tr>
           <td style="padding:6px 0;color:#6B7280;font-size:12px;">${label}</td>
           <td style="padding:6px 0;color:${
             color ?? "#111827"
           };font-size:12px;font-weight:600;text-align:right;">${String(
             value
           )}</td>
         </tr>`;

  const dynamicRows = (obj: Record<string, any> | null, errorColor?: string) =>
    obj
      ? Object.entries(obj)
          .map(([k, v]) => {
            const label = k
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (c) => c.toUpperCase())
              .trim();
            const val =
              typeof v === "object" ? JSON.stringify(v) : String(v ?? "—");
            const isError =
              k.toLowerCase().includes("fail") ||
              k.toLowerCase().includes("error");
            return row(label, val, isError ? errorColor : undefined);
          })
          .join("")
      : "";

  const userName = `${txn.user?.firstName ?? ""} ${
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
          .fail { padding: 12px; border-radius: 10px; background: #EF444415; border: 1px solid #EF4444; margin-bottom: 16px; }
          .fail .title { font-size: 12px; font-weight: 800; color: #EF4444; }
          .fail .msg { font-size: 12px; font-weight: 600; color: #EF4444; margin-top: 2px; }
          .footer { margin-top: 28px; text-align: center; font-size: 10px; color: #9CA3AF; }
        </style>
      </head>
      <body>
        <div class="hero">
          <div style="font-size:12px;color:#6B7280;font-weight:600;">Transaction Details</div>
          <div class="amount">₹${txn.amount}</div>
          <div class="net">Net: ₹${txn.netAmount}</div>
          <div class="pill">${txn.status}</div>
        </div>

        ${
          provRes?.failureReason
            ? `<div class="fail">
                 <div class="title">Failed</div>
                 <div class="msg">${provRes.failureReason}</div>
               </div>`
            : ""
        }

        <h2>Transaction Info</h2>
        <table>
          ${row("Transaction ID", txn.txnId)}
          ${row("Service", txn.service?.serviceName ?? txn.serviceType)}
          ${row("Provider", txn.provider?.serviceName)}
          ${row("Provider Ref", txn.providerReference)}
        </table>

        <h2>Amount</h2>
        <table>
          ${row("Amount", `₹${txn.amount}`)}
          ${row("Net Amount", `₹${txn.netAmount}`)}
          ${
            pricing
              ? `
            ${row(
              "Base Amount",
              typeof pricing.baseAmount === "number"
                ? `₹${pricing.baseAmount}`
                : ""
            )}
            ${row("Surcharge", pricing.surcharge ? `₹${pricing.surcharge}` : "")}
            ${row(
              "Commission",
              pricing.commission ? `₹${pricing.commission}` : ""
            )}
            ${row("TDS", pricing.tds ? `₹${pricing.tds}` : "")}
            ${row("GST", pricing.gst ? `₹${pricing.gst}` : "")}
          `
              : ""
          }
        </table>

        ${
          svcData && Object.keys(svcData).length > 0
            ? `<h2>Service Data</h2><table>${dynamicRows(svcData)}</table>`
            : ""
        }

        ${
          provRes && Object.keys(provRes).length > 0
            ? `<h2>Provider Response</h2><table>${dynamicRows(
                provRes,
                "#EF4444"
              )}</table>`
            : ""
        }

        ${
          txn.user
            ? `<h2>User</h2>
               <table>
                 ${row("Name", userName)}
                 ${row("Email", txn.user.email)}
                 ${row("Mobile", txn.user.mobileNumber)}
               </table>`
            : ""
        }

        <h2>Timeline</h2>
        <table>
          ${row("Initiated", formatDate(txn.initiatedAt))}
          ${row("Processed", formatDate(txn.processedAt))}
          ${row("Completed", formatDate(txn.completedAt))}
        </table>

        <h2>Technical</h2>
        <table>
          ${row("Transaction UUID", txn.id)}
          ${row("Tenant ID", txn.tenantId)}
          ${row("User ID", txn.userId)}
          ${row("Wallet ID", txn.walletId)}
          ${row("API Entity ID", txn.apiEntityId)}
          ${row("SP Mapping ID", txn.serviceProviderMappingId)}
          ${row("Role", txn.role?.roleName)}
        </table>

        <div class="footer">
          Generated on ${new Date().toLocaleString("en-IN")}
        </div>
      </body>
    </html>
  `;
};

/* --------------------------- Component --------------------------- */

const ViewTransactionHistoryModal = ({ visible, transaction, onClose }: Props) => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const [sharing, setSharing] = useState(false);

  if (!transaction) return null;

  const pricing = parseJSON<Record<string, any>>(transaction.pricing);
  const svcData = parseJSON<Record<string, any>>(transaction.serviceData);
  const provRes = parseJSON<Record<string, any>>(transaction.providerResponse);
  const statusColor = getStatusColor(transaction.status, colors);
  const statusIcon = getStatusIcon(transaction.status);

  const copyToClipboard = async (text?: string, label?: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(String(text));
    showSuccess("Copied", `${label ?? "Value"} copied to clipboard`);
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
          dialogTitle: `Transaction ${transaction.txnId}`,
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

  /* ---------------- Reusable rows ---------------- */

  const InfoRow = ({
    label,
    value,
    copyable,
    valueColor,
  }: {
    label: string;
    value?: string | number | null;
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
          onPress={() => copyable && copyToClipboard(String(value), label)}
          style={styles.infoValueWrap}
        >
          <Text
            style={[
              styles.infoValue,
              { color: valueColor ?? colors.text },
            ]}
            numberOfLines={2}
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

  const AmountRow = ({
    label,
    value,
    highlight,
  }: {
    label: string;
    value: number;
    highlight?: boolean;
  }) => (
    <View style={styles.amountRow}>
      <Text style={[styles.amountLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.amountValue,
          {
            color: highlight ? colors.buttonPrimary : colors.text,
            fontWeight: highlight ? "800" : "700",
          },
        ]}
      >
        ₹{value}
      </Text>
    </View>
  );

  /* ---------------- Render ---------------- */

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
                Transaction Details
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  copyToClipboard(transaction.txnId, "Transaction ID")
                }
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

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 30 }}
          >
            {/* Hero — status + amount */}
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
                <Text style={[styles.heroPillText, { color: statusColor }]}>
                  {transaction.status}
                </Text>
              </View>
            </View>

            {/* Failure reason banner */}
            {!!provRes?.failureReason && (
              <View
                style={[
                  styles.failBanner,
                  { backgroundColor: (colors.error ?? "#EF4444") + "15" },
                ]}
              >
                <Ionicons
                  name="alert-circle"
                  size={16}
                  color={colors.error ?? "#EF4444"}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.failTitle,
                      { color: colors.error ?? "#EF4444" },
                    ]}
                  >
                    Failed
                  </Text>
                  <Text
                    style={[
                      styles.failMsg,
                      { color: colors.error ?? "#EF4444" },
                    ]}
                  >
                    {provRes.failureReason}
                  </Text>
                </View>
              </View>
            )}

            {/* Transaction info */}
            <Section title="Transaction Info" icon="information-circle-outline">
              <InfoRow
                label="Transaction ID"
                value={transaction.txnId}
                copyable
              />
              <InfoRow
                label="Service"
                value={
                  transaction.service?.serviceName ?? transaction.serviceType
                }
              />
              {!!transaction.provider?.serviceName && (
                <InfoRow
                  label="Provider"
                  value={transaction.provider.serviceName}
                />
              )}
              {!!transaction.providerReference && (
                <InfoRow
                  label="Provider Ref"
                  value={transaction.providerReference}
                  copyable
                />
              )}
            </Section>

            {/* Amount breakdown */}
            <Section title="Amount" icon="cash-outline">
              <AmountRow label="Amount" value={transaction.amount} />
              <AmountRow label="Net Amount" value={transaction.netAmount} highlight />
              {pricing && (
                <>
                  {typeof pricing.baseAmount === "number" && (
                    <AmountRow label="Base Amount" value={pricing.baseAmount} />
                  )}
                  {!!pricing.surcharge && (
                    <AmountRow label="Surcharge" value={pricing.surcharge} />
                  )}
                  {!!pricing.commission && (
                    <AmountRow label="Commission" value={pricing.commission} />
                  )}
                  {!!pricing.tds && <AmountRow label="TDS" value={pricing.tds} />}
                  {!!pricing.gst && <AmountRow label="GST" value={pricing.gst} />}
                </>
              )}
            </Section>

            {/* Service data (dynamic — bank, PAN, etc.) */}
            {svcData && Object.keys(svcData).length > 0 && (
              <Section title="Service Data" icon="document-text-outline">
                {Object.entries(svcData).map(([k, v]) => (
                  <InfoRow
                    key={k}
                    label={k
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (c) => c.toUpperCase())
                      .trim()}
                    value={
                      typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")
                    }
                  />
                ))}
              </Section>
            )}

            {/* Provider response */}
            {provRes && Object.keys(provRes).length > 0 && (
              <Section title="Provider Response" icon="cloud-outline">
                {Object.entries(provRes).map(([k, v]) => (
                  <InfoRow
                    key={k}
                    label={k
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (c) => c.toUpperCase())
                      .trim()}
                    value={
                      typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")
                    }
                    valueColor={
                      k.toLowerCase().includes("fail") ||
                      k.toLowerCase().includes("error")
                        ? colors.error ?? "#EF4444"
                        : undefined
                    }
                  />
                ))}
              </Section>
            )}

            {/* User info */}
            {transaction.user && (
              <Section title="User" icon="person-outline">
                <InfoRow
                  label="Name"
                  value={`${transaction.user.firstName ?? ""} ${
                    transaction.user.lastName ?? ""
                  }`.trim()}
                />
                <InfoRow label="Email" value={transaction.user.email} copyable />
                <InfoRow
                  label="Mobile"
                  value={transaction.user.mobileNumber}
                  copyable
                />
              </Section>
            )}

            {/* Timeline */}
            <Section title="Timeline" icon="time-outline">
              <InfoRow
                label="Initiated"
                value={formatDate(transaction.initiatedAt)}
              />
              <InfoRow
                label="Processed"
                value={formatDate(transaction.processedAt)}
              />
              <InfoRow
                label="Completed"
                value={formatDate(transaction.completedAt)}
              />
            </Section>

            {/* Technical */}
            <Section title="Technical" icon="code-slash-outline">
              <InfoRow
                label="Transaction UUID"
                value={transaction.id}
                copyable
              />
              {!!transaction.tenantId && (
                <InfoRow
                  label="Tenant ID"
                  value={transaction.tenantId}
                  copyable
                />
              )}
              {!!transaction.userId && (
                <InfoRow
                  label="User ID"
                  value={transaction.userId}
                  copyable
                />
              )}
              {!!transaction.walletId && (
                <InfoRow
                  label="Wallet ID"
                  value={transaction.walletId}
                  copyable
                />
              )}
              {!!transaction.apiEntityId && (
                <InfoRow
                  label="API Entity ID"
                  value={transaction.apiEntityId}
                  copyable
                />
              )}
              {!!transaction.serviceProviderMappingId && (
                <InfoRow
                  label="SP Mapping ID"
                  value={transaction.serviceProviderMappingId}
                  copyable
                />
              )}
              {!!transaction.role?.roleName && (
                <InfoRow label="Role" value={transaction.role.roleName} />
              )}
            </Section>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default ViewTransactionHistoryModal;

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
  closeBtn: { padding: 4, marginLeft: 8 },

  /* Hero */
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
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  heroPillText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },

  /* Failure banner */
  failBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  failTitle: { fontSize: 12, fontWeight: "800" },
  failMsg: { fontSize: 12, fontWeight: "600", marginTop: 2 },

  /* Sections */
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

  /* Info rows */
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

  /* Amount rows */
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  amountLabel: { fontSize: 12, fontWeight: "500" },
  amountValue: { fontSize: 13, fontWeight: "700" },

  /* Done button */
  doneBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  doneText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
});