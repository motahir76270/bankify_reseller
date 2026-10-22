import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
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

type FundRequest = {
  id: string;
  amount: number;
  status: string;
  paymentMode?: string;
  referenceId?: string;
  providerTxnId?: string;
  providerCode?: string;
  providerResponse?: string | Record<string, any> | null;
  failureReason?: string | null;
  imageUrl?: string;
  retryCount?: number;
  lastRetryAt?: string | null;
  processedBy?: string | null;
  processedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  tenantId?: string;
  tenantName?: string;
  tenantNumber?: string;
  userId?: string;
  userNumber?: string;
  name?: string;
  mobileNumber?: string;
  walletId?: string;
  idempotencyKey?: string;
  platformServiceId?: string;
  [key: string]: any;
};

type Props = {
  visible: boolean;
  request: FundRequest | null;
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
      return "checkmark-circle";
    case "FAILED":
    case "REJECTED":
      return "close-circle";
    case "PENDING":
      return "time";
    default:
      return "help-circle";
  }
};

const getModeIcon = (mode?: string): any => {
  switch (mode?.toUpperCase()) {
    case "BANK":
      return "business";
    case "UPI":
      return "phone-portrait";
    default:
      return "card";
  }
};

const buildReceiptHtml = (req: FundRequest, statusColor: string) => {
  const providerResponse = parseJSON<Record<string, any>>(req.providerResponse);

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

  const dynamicRows = (obj: Record<string, any> | null) =>
    obj
      ? Object.entries(obj)
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
          .hero { border: 1px solid ${statusColor}; background: ${statusColor}1A; border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 20px; }
          .hero .amount { font-size: 30px; font-weight: 800; margin: 8px 0 2px; }
          .hero .mode { color: #6B7280; font-size: 13px; }
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
          <div style="font-size:12px;color:#6B7280;font-weight:600;">Fund Request</div>
          <div class="amount">₹${req.amount}</div>
          ${
            req.paymentMode
              ? `<div class="mode">via ${req.paymentMode}</div>`
              : ""
          }
          <div class="pill">${req.status}</div>
        </div>

        ${
          req.failureReason
            ? `<div class="fail">
                 <div class="title">${
                   req.status === "REJECTED" ? "Rejected" : "Failed"
                 }</div>
                 <div class="msg">${req.failureReason}</div>
               </div>`
            : ""
        }

        <h2>Request Info</h2>
        <table>
          ${row("Reference ID", req.referenceId)}
          ${row("Amount", `₹${req.amount}`)}
          ${row("Status", req.status)}
          ${row("Payment Mode", req.paymentMode)}
          ${row("Provider Txn ID", req.providerTxnId)}
          ${row("Provider", req.providerCode)}
        </table>

        <h2>User & Tenant</h2>
        <table>
          ${row("Name", req.name)}
          ${row("Mobile", req.mobileNumber)}
          ${row("User Number", req.userNumber)}
          ${row("User ID", req.userId)}
          ${row("Tenant", req.tenantName)}
          ${row("Tenant No.", req.tenantNumber)}
        </table>

        <h2>Timeline</h2>
        <table>
          ${row("Created At", formatDate(req.createdAt))}
          ${row("Updated At", formatDate(req.updatedAt))}
          ${row("Processed At", formatDate(req.processedAt))}
          ${row("Last Retry", req.lastRetryAt ? formatDate(req.lastRetryAt) : "")}
          ${row(
            "Retry Count",
            typeof req.retryCount === "number" ? req.retryCount : ""
          )}
        </table>

        ${
          providerResponse && Object.keys(providerResponse).length > 0
            ? `<h2>Provider Response</h2><table>${dynamicRows(
                providerResponse
              )}</table>`
            : ""
        }

        <h2>Technical</h2>
        <table>
          ${row("Request UUID", req.id)}
          ${row("Idempotency Key", req.idempotencyKey)}
          ${row("Wallet ID", req.walletId)}
          ${row("Platform Service ID", req.platformServiceId)}
          ${row("Processed By", req.processedBy)}
          ${row("Tenant ID", req.tenantId)}
        </table>

        ${
          req.imageUrl
            ? `<h2>Payment Proof</h2><p style="font-size:11px;color:#6B7280;word-break:break-all;">${req.imageUrl}</p>`
            : ""
        }

        <div class="footer">
          Generated on ${new Date().toLocaleString("en-IN")}
        </div>
      </body>
    </html>
  `;
};

/* --------------------------- Component --------------------------- */

const ViewFundRequestModal = ({ visible, request, onClose }: Props) => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const [sharing, setSharing] = useState(false);

  if (!request) return null;

  const statusColor = getStatusColor(request.status, colors);
  const statusIcon = getStatusIcon(request.status);
  const modeIcon = getModeIcon(request.paymentMode);
  const providerResponse = parseJSON<Record<string, any>>(
    request.providerResponse,
  );

  const copyToClipboard = async (text?: string, label?: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(String(text));
    showSuccess("Copied", `${label ?? "Value"} copied to clipboard`);
  };

  const openImage = () => {
    if (request.imageUrl) Linking.openURL(request.imageUrl);
  };

  const sharePdf = async () => {
    if (sharing) return;
    try {
      setSharing(true);

      const html = buildReceiptHtml(request, statusColor);
      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Fund Request ${request.referenceId ?? request.id}`,
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
                Fund Request
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  copyToClipboard(
                    request.referenceId ?? request.id,
                    "Reference ID",
                  )
                }
                style={styles.refRow}
              >
                <Text
                  style={[styles.subTitle, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {request.referenceId ?? request.id}
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
                ₹{request.amount}
              </Text>

              {request.paymentMode && (
                <View style={styles.heroModeRow}>
                  <Ionicons
                    name={modeIcon}
                    size={12}
                    color={colors.textMuted}
                  />
                  <Text style={[styles.heroModeText, { color: colors.textMuted }]}>
                    via {request.paymentMode}
                  </Text>
                </View>
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
                  style={[styles.heroPillDot, { backgroundColor: statusColor }]}
                />
                <Text style={[styles.heroPillText, { color: statusColor }]}>
                  {request.status}
                </Text>
              </View>
            </View>

            {/* Failure reason */}
            {!!request.failureReason && (
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
                    {request.status === "REJECTED" ? "Rejected" : "Failed"}
                  </Text>
                  <Text
                    style={[
                      styles.failMsg,
                      { color: colors.error ?? "#EF4444" },
                    ]}
                  >
                    {request.failureReason}
                  </Text>
                </View>
              </View>
            )}

            {/* Payment proof image */}
            {!!request.imageUrl && (
              <Section title="Payment Proof" icon="image-outline">
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={openImage}
                  style={styles.imageWrap}
                >
                  <Image
                    source={{ uri: request.imageUrl }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                  <View style={styles.imageOverlay}>
                    <Ionicons
                      name="expand-outline"
                      size={16}
                      color="#FFF"
                    />
                    <Text style={styles.imageOverlayText}>Tap to view</Text>
                  </View>
                </TouchableOpacity>
              </Section>
            )}

            {/* Request info */}
            <Section title="Request Info" icon="information-circle-outline">
              <InfoRow
                label="Reference ID"
                value={request.referenceId}
                copyable
              />
              <InfoRow label="Amount" value={`₹${request.amount}`} />
              <InfoRow
                label="Status"
                value={request.status}
                valueColor={statusColor}
              />
              <InfoRow label="Payment Mode" value={request.paymentMode} />
              <InfoRow
                label="Provider Txn ID"
                value={request.providerTxnId}
                copyable
              />
              <InfoRow label="Provider" value={request.providerCode} />
            </Section>

            {/* User & Tenant */}
            <Section title="User & Tenant" icon="person-outline">
              <InfoRow label="Name" value={request.name} />
              <InfoRow
                label="Mobile"
                value={request.mobileNumber}
                copyable
              />
              <InfoRow label="User Number" value={request.userNumber} />
              <InfoRow label="User ID" value={request.userId} copyable />
              <InfoRow label="Tenant" value={request.tenantName} />
              <InfoRow label="Tenant No." value={request.tenantNumber} />
            </Section>

            {/* Timeline */}
            <Section title="Timeline" icon="time-outline">
              <InfoRow
                label="Created At"
                value={formatDate(request.createdAt)}
              />
              <InfoRow
                label="Updated At"
                value={formatDate(request.updatedAt)}
              />
              <InfoRow
                label="Processed At"
                value={formatDate(request.processedAt)}
              />
              {request.lastRetryAt && (
                <InfoRow
                  label="Last Retry"
                  value={formatDate(request.lastRetryAt)}
                />
              )}
              {typeof request.retryCount === "number" && (
                <InfoRow label="Retry Count" value={request.retryCount} />
              )}
            </Section>

            {/* Provider response */}
            {providerResponse &&
              Object.keys(providerResponse).length > 0 && (
                <Section title="Provider Response" icon="cloud-outline">
                  {Object.entries(providerResponse).map(([k, v]) => (
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
              <InfoRow label="Request UUID" value={request.id} copyable />
              <InfoRow
                label="Idempotency Key"
                value={request.idempotencyKey}
                copyable
              />
              <InfoRow
                label="Wallet ID"
                value={request.walletId}
                copyable
              />
              <InfoRow
                label="Platform Service ID"
                value={request.platformServiceId}
                copyable
              />
              <InfoRow
                label="Processed By"
                value={request.processedBy}
                copyable
              />
              <InfoRow label="Tenant ID" value={request.tenantId} copyable />
            </Section>
          </ScrollView>

          {/* Footer */}
          {/* <TouchableOpacity
            activeOpacity={0.85}
            onPress={onClose}
            style={[styles.doneBtn, { backgroundColor: colors.buttonPrimary }]}
          >
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity> */}
        </View>
      </View>
    </Modal>
  );
};

export default ViewFundRequestModal;

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
  refRow: {
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
  heroModeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  heroModeText: { fontSize: 12, fontWeight: "600" },
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

  /* Image */
  imageWrap: {
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: 180,
  },
  imageOverlay: {
    position: "absolute",
    right: 8,
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  imageOverlayText: {
    color: "#FFF",
    fontSize: 10.5,
    fontWeight: "700",
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

  /* Done */
  doneBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  doneText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
});