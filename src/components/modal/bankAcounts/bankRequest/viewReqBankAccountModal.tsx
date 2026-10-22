import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

/* ---------------- Types ---------------- */
export type BankAccount = {
  id: string;
  userId: string;
  bankId: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  mobileNumber: string;
  isPrimary: boolean;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  submittedAt: string;
  approvedAt: string | null;
  approvalNotes: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    mobileNumber?: string;
  };
  role?: { roleName?: string; roleCode?: string };
};

type Props = {
  visible: boolean;
  onClose: () => void;
  account: BankAccount | null;
};

/* ---------------- Helpers ---------------- */
const safe = (v: any, fallback = "—") =>
  v === undefined || v === null || v === "" ? fallback : String(v);

const formatDate = (d?: string | null) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
};

const statusColor = (status: string) => {
  switch (status) {
    case "VERIFIED":
      return "#22c55e";
    case "REJECTED":
      return "#ef4444";
    case "PENDING":
      return "#f59e0b";
    default:
      return "#94a3b8";
  }
};

/* ---------------- Section ---------------- */
const Section = ({
  title,
  icon,
  children,
  colors,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  colors: any;
}) => (
  <View
    style={[
      styles.section,
      {
        backgroundColor: colors.surfacePrimary,
        borderColor: colors.border,
      },
    ]}
  >
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={13} color={colors.buttonPrimary} />
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {title}
      </Text>
    </View>
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

/* ---------------- Row ---------------- */
const Row = ({
  label,
  value,
  colors,
  valueColor,
}: {
  label: string;
  value: string;
  colors: any;
  valueColor?: string;
}) => (
  <View style={styles.row}>
    <Text style={[styles.rowLabel, { color: colors.textMuted }]}>
      {label}
    </Text>
    <Text
      style={[
        styles.rowValue,
        { color: valueColor ?? colors.text },
      ]}
      numberOfLines={2}
    >
      {value}
    </Text>
  </View>
);

/* ---------------- Modal ---------------- */
const ViewReqBankAccountModal = ({ visible, onClose, account }: Props) => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  if (!account) return null;

  const sc = statusColor(account.verificationStatus);
  const userName = account.user
    ? `${account.user.firstName ?? ""} ${account.user.lastName ?? ""}`.trim()
    : "—";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
          ]}
          onPress={() => {}}
        >
          {/* Handle bar */}
          <View
            style={[styles.handle, { backgroundColor: colors.border }]}
          />

          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.headerIcon,
                { backgroundColor: colors.surfacePrimary },
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
                style={[styles.headerTitle, { color: colors.text }]}
                numberOfLines={1}
              >
                {safe(account.bankName, "Bank Account")}
              </Text>
              <Text
                style={[styles.headerSub, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {safe(account.accountHolderName, userName)}
              </Text>
            </View>

            <View style={[styles.statusPill, { backgroundColor: sc + "22" }]}>
              <View style={[styles.statusDot, { backgroundColor: sc }]} />
              <Text style={[styles.statusText, { color: sc }]}>
                {safe(account.verificationStatus, "PENDING")}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: colors.surfacePrimary },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}
          >
            {/* Account details */}
            <Section
              title="Account Details"
              icon="card-outline"
              colors={colors}
            >
              <Row
                label="Account Number"
                value={safe(account.accountNumber)}
                colors={colors}
              />
              <Row
                label="IFSC Code"
                value={safe(account.ifscCode)}
                colors={colors}
              />
              <Row
                label="Branch"
                value={safe(account.branchName)}
                colors={colors}
              />
              <Row
                label="Primary Account"
                value={account.isPrimary ? "YES" : "NO"}
                colors={colors}
                valueColor={
                  account.isPrimary ? colors.buttonPrimary : colors.textMuted
                }
              />
            </Section>

            {/* User details */}
            <Section title="User Details" icon="person-outline" colors={colors}>
              <Row label="Full Name" value={safe(userName)} colors={colors} />
              <Row
                label="Email"
                value={safe(account.user?.email)}
                colors={colors}
              />
              <Row
                label="Mobile"
                value={safe(
                  account.user?.mobileNumber || account.mobileNumber
                )}
                colors={colors}
              />
              <Row
                label="Role"
                value={safe(account.role?.roleName)}
                colors={colors}
              />
            </Section>

            {/* Timeline */}
            <Section
              title="Timeline"
              icon="time-outline"
              colors={colors}
            >
              <Row
                label="Submitted At"
                value={formatDate(
                  account.submittedAt || account.createdAt
                )}
                colors={colors}
              />
              {account.approvedAt && (
                <Row
                  label="Approved At"
                  value={formatDate(account.approvedAt)}
                  colors={colors}
                  valueColor="#22c55e"
                />
              )}
              {account.rejectedAt && (
                <Row
                  label="Rejected At"
                  value={formatDate(account.rejectedAt)}
                  colors={colors}
                  valueColor="#ef4444"
                />
              )}
            </Section>

            {/* Notes */}
            {(account.approvalNotes || account.rejectionReason) && (
              <Section
                title={
                  account.rejectionReason
                    ? "Rejection Reason"
                    : "Approval Notes"
                }
                icon={
                  account.rejectionReason
                    ? "alert-circle-outline"
                    : "checkmark-circle-outline"
                }
                colors={colors}
              >
                <View
                  style={[
                    styles.noteBox,
                    {
                      backgroundColor: account.rejectionReason
                        ? "#ef444415"
                        : "#22c55e15",
                      borderColor: account.rejectionReason
                        ? "#ef444440"
                        : "#22c55e40",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.noteText,
                      {
                        color: account.rejectionReason
                          ? "#ef4444"
                          : "#22c55e",
                      },
                    ]}
                  >
                    {account.rejectionReason ??
                      account.approvalNotes ??
                      "—"}
                  </Text>
                </View>
              </Section>
            )}

            {/* System IDs */}
            <Section
              title="System"
              icon="key-outline"
              colors={colors}
            >
              <Row
                label="Account ID"
                value={safe(account.id)}
                colors={colors}
              />
              <Row
                label="User ID"
                value={safe(account.userId)}
                colors={colors}
              />
              <Row
                label="Bank ID"
                value={safe(account.bankId)}
                colors={colors}
              />
            </Section>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ViewReqBankAccountModal;

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: "88%",
    paddingTop: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 14, fontWeight: "700" },
  headerSub: { fontSize: 11, fontWeight: "500", marginTop: 2 },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "700" },

  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },

  /* Body */
  body: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },

  /* Section */
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  sectionBody: { gap: 8 },

  /* Row */
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  rowLabel: { fontSize: 11, fontWeight: "500", flex: 1 },
  rowValue: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1.4,
    textAlign: "right",
  },

  /* Note */
  noteBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  noteText: { fontSize: 11, fontWeight: "500", lineHeight: 16 },
});