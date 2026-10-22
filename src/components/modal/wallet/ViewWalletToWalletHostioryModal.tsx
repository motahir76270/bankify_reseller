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

type WalletTx = {
  id: string;
  txnId?: string;
  transactionId?: string;
  amount: number;
  netAmount?: number;
  mode: string; // CREDIT | DEBIT | BLOCK | RELEASE
  status: string; // PENDING | PROCESSING | SUCCESS | FAILED
  description?: string;
  remarks?: string;
  reference?: string;
  referenceId?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
  initiatedAt?: string;
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    mobileNumber?: string;
  };
  role?: {
    roleName?: string;
    roleCode?: string;
  };
  service?: {
    serviceName?: string;
    serviceCode?: string;
  };
  provider?: {
    serviceName?: string;
    serviceCode?: string;
  };
  serviceType?: string;
  meta?: string | Record<string, any>;
  [key: string]: any;
};

type Props = {
  visible: boolean;
  transaction: WalletTx | null;
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

const getModeColor = (mode: string, colors: any) => {
  switch (mode?.toUpperCase()) {
    case "CREDIT":
    case "RELEASE":
      return colors.success ?? "#10B981";
    case "DEBIT":
      return colors.error ?? "#EF4444";
    case "BLOCK":
      return "#F59E0B";
    default:
      return colors.textMuted;
  }
};

const getModeIcon = (mode: string): any => {
  switch (mode?.toUpperCase()) {
    case "CREDIT":
      return "arrow-down-circle";
    case "DEBIT":
      return "arrow-up-circle";
    case "BLOCK":
      return "lock-closed";
    case "RELEASE":
      return "lock-open";
    default:
      return "swap-horizontal";
  }
};

const getModeSign = (mode: string) => {
  switch (mode?.toUpperCase()) {
    case "CREDIT":
    case "RELEASE":
      return "+";
    case "DEBIT":
    case "BLOCK":
      return "-";
    default:
      return "";
  }
};

const buildReceiptHtml = (txn: WalletTx, modeColor: string, statusColor: string) => {
  const meta = parseJSON<Record<string, any>>(txn.meta);

  const row = (label: string, value?: any) =>
    value === undefined || value === null || value === ""
      ? ""
      : `<tr>
           <td style="padding:6px 0;color:#6B7280;font-size:12px;">${label}</td>
           <td style="padding:6px 0;color:#111827;font-size:12px;font-weight:600;text-align:right;">${String(
             value
           )}</td>
         </tr>`;

  const txnId =
    txn.txnId ?? txn.transactionId ?? txn.referenceId ?? txn.id;

  const userName = txn.user
    ? `${txn.user.firstName ?? ""} ${txn.user.lastName ?? ""}`.trim()
    : "";

  const sign = getModeSign(txn.mode);

  const metaRows = meta
    ? Object.entries(meta)
        .map(([k, v]) =>
          row(
            k
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (c) => c.toUpperCase())
              .trim(),
            typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")
          )
        )
        .join("")
    : "";

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
          body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #111827; }
          .hero { border: 1px solid ${modeColor}; background: ${modeColor}1A; border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 20px; }
          .hero .mode { font-size: 11px; font-weight: 800; letter-spacing: 1px; color: ${modeColor}; margin-bottom: 4px; }
          .hero .amount { font-size: 30px; font-weight: 800; color: ${modeColor}; margin: 4px 0 2px; }
          .hero .balance { color: #6B7280; font-size: 13px; }
          .pill { display: inline-block; margin-top: 10px; padding: 4px 12px; border-radius: 20px; border: 1px solid ${statusColor}; color: ${statusColor}; font-size: 11px; font-weight: 800; letter-spacing: 0.6px; }
          h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; border-bottom: 1px solid #E5E7EB; padding-bottom: 6px; margin: 20px 0 8px; }
          table { width: 100%; border-collapse: collapse; }
          .desc { padding: 12px; border-radius: 10px; border: 1px solid #E5E7EB; background: #F9FAFB; font-size: 12.5px; font-weight: 600; margin-bottom: 16px; line-height: 1.5; }
          .footer { margin-top: 28px; text-align: center; font-size: 10px; color: #9CA3AF; }
        </style>
      </head>
      <body>
        <div class="hero">
          <div class="mode">${txn.mode?.toUpperCase() ?? ""}</div>
          <div class="amount">${sign}₹${txn.amount}</div>
          ${
            typeof txn.balanceAfter === "number"
              ? `<div class="balance">Balance: ₹${txn.balanceAfter}</div>`
              : ""
          }
          <div class="pill">${txn.status}</div>
        </div>

        ${
          txn.description || txn.remarks
            ? `<div class="desc">${txn.description ?? txn.remarks}</div>`
            : ""
        }

        <h2>Transaction Info</h2>
        <table>
          ${row("Txn ID", txnId)}
          ${row(
            "Service Type",
            txn.service?.serviceName ?? txn.serviceType ?? ""
          )}
          ${row("Service Code", txn.service?.serviceCode)}
          ${row("Mode", txn.mode)}
          ${row("Status", txn.status)}
          ${row("Reference", txn.reference ?? txn.referenceId)}
          ${row("Provider", txn.provider?.serviceName)}
        </table>

        <h2>Amount</h2>
        <table>
          ${row("Amount", `${sign}₹${txn.amount}`)}
          ${row(
            "Net Amount",
            typeof txn.netAmount === "number" ? `₹${txn.netAmount}` : ""
          )}
          ${row(
            "Balance Before",
            typeof txn.balanceBefore === "number"
              ? `₹${txn.balanceBefore}`
              : ""
          )}
          ${row(
            "Balance After",
            typeof txn.balanceAfter === "number" ? `₹${txn.balanceAfter}` : ""
          )}
        </table>

        ${
          txn.user || txn.role
            ? `<h2>User & Role</h2>
               <table>
                 ${row("Name", userName)}
                 ${row("Email", txn.user?.email)}
                 ${row("Mobile", txn.user?.mobileNumber)}
                 ${row("User ID", txn.user?.id)}
                 ${row("Role", txn.role?.roleName)}
                 ${row("Role Code", txn.role?.roleCode)}
               </table>`
            : ""
        }

        <h2>Timeline</h2>
        <table>
          ${row("Initiated At", formatDate(txn.initiatedAt ?? txn.createdAt))}
          ${row("Updated At", txn.updatedAt ? formatDate(txn.updatedAt) : "")}
          ${row("Completed At", formatDate(txn.completedAt))}
        </table>

        ${metaRows ? `<h2>Additional Info</h2><table>${metaRows}</table>` : ""}

        <h2>Technical</h2>
        <table>
          ${row("Wallet Txn UUID", txn.id)}
          ${row("Wallet ID", txn.walletId)}
          ${row("Tenant ID", txn.tenantId)}
        </table>

        <div class="footer">
          Generated on ${new Date().toLocaleString("en-IN")}
        </div>
      </body>
    </html>
  `;
};

/* --------------------------- Component --------------------------- */

const ViewWalletToWalletHostioryModal = ({ visible, transaction, onClose }: Props) => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const [sharing, setSharing] = useState(false);

  if (!transaction) return null;

  const statusColor = getStatusColor(transaction.status, colors);
  const modeColor = getModeColor(transaction.mode, colors);
  const modeIcon = getModeIcon(transaction.mode);
  const sign = getModeSign(transaction.mode);
  const meta = parseJSON<Record<string, any>>(transaction.meta);

  const txnId =
    transaction.txnId ??
    transaction.transactionId ??
    transaction.referenceId ??
    transaction.id;

  const userName = transaction.user
    ? `${transaction.user.firstName ?? ""} ${transaction.user.lastName ?? ""}`.trim()
    : "—";

  const copyToClipboard = async (text?: string, label?: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(String(text));
    showSuccess("Copied", `${label ?? "Value"} copied to clipboard`);
  };

  const sharePdf = async () => {
    if (sharing) return;
    try {
      setSharing(true);

      const html = buildReceiptHtml(transaction, modeColor, statusColor);
      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Wallet ${transaction.mode} - ${txnId}`,
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
    icon,
  }: {
    label: string;
    value?: string | number | null;
    copyable?: boolean;
    valueColor?: string;
    icon?: any;
  }) => {
    if (value === undefined || value === null || value === "") return null;
    return (
      <View style={styles.infoRow}>
        <View style={styles.infoLabelWrap}>
          {icon && (
            <Ionicons name={icon} size={13} color={colors.textMuted} />
          )}
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
            {label}
          </Text>
        </View>
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
                Wallet Transaction
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => copyToClipboard(String(txnId), "Transaction ID")}
                style={styles.txnIdRow}
              >
                <Text
                  style={[styles.subTitle, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {txnId}
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
            {/* Hero — mode + amount + status */}
            <View
              style={[
                styles.hero,
                {
                  backgroundColor: modeColor + "15",
                  borderColor: modeColor,
                },
              ]}
            >
              <View
                style={[
                  styles.heroIcon,
                  { backgroundColor: modeColor + "25" },
                ]}
              >
                <Ionicons name={modeIcon} size={28} color={modeColor} />
              </View>

              <Text style={[styles.heroMode, { color: modeColor }]}>
                {transaction.mode?.toUpperCase()}
              </Text>

              <Text style={[styles.heroAmount, { color: modeColor }]}>
                {sign}₹{transaction.amount}
              </Text>

              {typeof transaction.balanceAfter === "number" && (
                <Text style={[styles.heroBalance, { color: colors.textMuted }]}>
                  Balance: ₹{transaction.balanceAfter}
                </Text>
              )}

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
                  style={[
                    styles.heroPillDot,
                    { backgroundColor: statusColor },
                  ]}
                />
                <Text style={[styles.heroPillText, { color: statusColor }]}>
                  {transaction.status}
                </Text>
              </View>
            </View>

            {/* Reference / description banner */}
            {(transaction.description || transaction.remarks) && (
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
                  {transaction.description ?? transaction.remarks}
                </Text>
              </View>
            )}

            {/* Transaction Info */}
            <Section title="Transaction Info" icon="information-circle-outline">
              <InfoRow label="Txn ID" value={txnId} copyable />
              <InfoRow
                label="Service Type"
                value={
                  transaction.service?.serviceName ??
                  transaction.serviceType ??
                  "—"
                }
              />
              {!!transaction.service?.serviceCode && (
                <InfoRow
                  label="Service Code"
                  value={transaction.service.serviceCode}
                />
              )}
              <InfoRow
                label="Mode"
                value={transaction.mode}
                valueColor={modeColor}
              />
              <InfoRow
                label="Status"
                value={transaction.status}
                valueColor={statusColor}
              />
              <InfoRow
                label="Reference"
                value={transaction.reference ?? transaction.referenceId}
                copyable
              />
              {!!transaction.provider?.serviceName && (
                <InfoRow
                  label="Provider"
                  value={transaction.provider.serviceName}
                />
              )}
            </Section>

            {/* Amount */}
            <Section title="Amount" icon="cash-outline">
              <View style={styles.amountRow}>
                <Text style={[styles.amountLabel, { color: colors.textMuted }]}>
                  Amount
                </Text>
                <Text style={[styles.amountValue, { color: modeColor }]}>
                  {sign}₹{transaction.amount}
                </Text>
              </View>
              {typeof transaction.netAmount === "number" && (
                <View style={styles.amountRow}>
                  <Text
                    style={[styles.amountLabel, { color: colors.textMuted }]}
                  >
                    Net Amount
                  </Text>
                  <Text style={[styles.amountValue, { color: colors.text }]}>
                    ₹{transaction.netAmount}
                  </Text>
                </View>
              )}
              {typeof transaction.balanceBefore === "number" && (
                <View style={styles.amountRow}>
                  <Text
                    style={[styles.amountLabel, { color: colors.textMuted }]}
                  >
                    Balance Before
                  </Text>
                  <Text style={[styles.amountValue, { color: colors.text }]}>
                    ₹{transaction.balanceBefore}
                  </Text>
                </View>
              )}
              {typeof transaction.balanceAfter === "number" && (
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
                    ₹{transaction.balanceAfter}
                  </Text>
                </View>
              )}
            </Section>

            {/* User & Role */}
            {(transaction.user || transaction.role) && (
              <Section title="User & Role" icon="person-outline">
                {!!userName && userName !== "—" && (
                  <InfoRow label="Name" value={userName} />
                )}
                {!!transaction.user?.email && (
                  <InfoRow
                    label="Email"
                    value={transaction.user.email}
                    copyable
                  />
                )}
                {!!transaction.user?.mobileNumber && (
                  <InfoRow
                    label="Mobile"
                    value={transaction.user.mobileNumber}
                    copyable
                  />
                )}
                {!!transaction.user?.id && (
                  <InfoRow
                    label="User ID"
                    value={transaction.user.id}
                    copyable
                  />
                )}
                {!!transaction.role?.roleName && (
                  <InfoRow
                    label="Role"
                    value={transaction.role.roleName}
                    icon="shield-checkmark-outline"
                  />
                )}
                {!!transaction.role?.roleCode && (
                  <InfoRow label="Role Code" value={transaction.role.roleCode} />
                )}
              </Section>
            )}

            {/* Timeline */}
            <Section title="Timeline" icon="time-outline">
              <InfoRow
                label="Initiated At"
                value={formatDate(
                  transaction.initiatedAt ?? transaction.createdAt,
                )}
              />
              {!!transaction.updatedAt && (
                <InfoRow
                  label="Updated At"
                  value={formatDate(transaction.updatedAt)}
                />
              )}
              <InfoRow
                label="Completed At"
                value={formatDate(transaction.completedAt)}
              />
            </Section>

            {/* Meta (if any) */}
            {meta && Object.keys(meta).length > 0 && (
              <Section title="Additional Info" icon="document-text-outline">
                {Object.entries(meta).map(([k, v]) => (
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

            {/* Technical */}
            <Section title="Technical" icon="code-slash-outline">
              <InfoRow
                label="Wallet Txn UUID"
                value={transaction.id}
                copyable
              />
              {!!transaction.walletId && (
                <InfoRow
                  label="Wallet ID"
                  value={transaction.walletId}
                  copyable
                />
              )}
              {!!transaction.tenantId && (
                <InfoRow
                  label="Tenant ID"
                  value={transaction.tenantId}
                  copyable
                />
              )}
            </Section>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default ViewWalletToWalletHostioryModal;

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
    marginBottom: 8,
  },
  heroMode: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroAmount: { fontSize: 28, fontWeight: "800" },
  heroBalance: { fontSize: 12, fontWeight: "600", marginTop: 4 },
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
  heroPillText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },

  /* Description */
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
  infoLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexShrink: 0,
  },
  infoLabel: { fontSize: 12, fontWeight: "500" },
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