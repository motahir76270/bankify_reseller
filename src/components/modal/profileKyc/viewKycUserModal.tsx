import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";


type Props = {
  visible: boolean;
  kyc: any | null;
  onClose: () => void;
  loading?: boolean;
};

const DOC_LABELS: Record<any["documentType"], string> = {
  AADHAAR_FRONT: "Aadhaar (Front)",
  AADHAAR_BACK: "Aadhaar (Back)",
  PAN: "PAN Card",
  ADDRESS_PROOF: "Address Proof",
  USER_PHOTO: "User Photo",
};

const ViewKycUserModal = ({
  visible,
  kyc,
  onClose
}: Props) => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const cardBg = isDark ? "#141721" : "#FFFFFF";
  const mutedBg = isDark ? "#1A1D2A" : "#F8FAFC";
  const borderColor = colors.border;
  const brandPrimary = isDark ? "#7C6BFF" : "#4F46E5";

  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  useEffect(() => {
    if (visible) setExpandedDoc(null);
  }, [visible, kyc?.id]);

  if (!kyc) return null;

  const isActionable = kyc.status === "PENDING";
  const fullName =
    `${kyc.user?.firstName ?? ""} ${kyc.user?.lastName ?? ""}`.trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.background, borderColor },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: borderColor }]} />

          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>
                KYC Details
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {kyc.user?.userNumber} · {kyc.role?.roleName}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: mutedBg, borderColor }]}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
          >
            {/* User card */}
            <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.userRow}>
                <View
                  style={[styles.avatar, { backgroundColor: `${brandPrimary}20` }]}
                >
                  <Text style={[styles.avatarText, { color: brandPrimary }]}>
                    {kyc.user?.firstName?.[0]?.toUpperCase()}
                    {kyc.user?.lastName?.[0]?.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.userName, { color: colors.text }]}>
                    {fullName}
                  </Text>
                  <Text
                    style={[styles.userMeta, { color: colors.textSecondary }]}
                  >
                    {kyc.user?.email}
                  </Text>
                  <Text
                    style={[styles.userMeta, { color: colors.textSecondary }]}
                  >
                    +91 {kyc.user?.mobileNumber}
                  </Text>
                </View>
                <StatusPill status={kyc.status} />
              </View>
            </View>

            {/* Parent info */}
            {kyc.parent && (
              <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
                <Text
                  style={[styles.sectionTitle, { color: colors.textSecondary }]}
                >
                  PARENT
                </Text>
                <InfoRow
                  label="Name"
                  value={`${kyc.parent.firstName} ${kyc.parent.lastName}`}
                  colors={colors}
                  borderColor={borderColor}
                />
                <InfoRow
                  label="User No."
                  value={kyc.parent.userNumber}
                  colors={colors}
                  borderColor={borderColor}
                />
                <InfoRow
                  label="Role"
                  value={kyc.parentRole?.roleName ?? "-"}
                  colors={colors}
                  borderColor={borderColor}
                  isLast
                />
              </View>
            )}

            {/* Documents */}
            <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
              <Text
                style={[styles.sectionTitle, { color: colors.textSecondary }]}
              >
                DOCUMENTS ({kyc.documents?.length ?? 0})
              </Text>

              {kyc.documents?.map((doc:any, idx:any) => {
                const isOpen = expandedDoc === doc.id;
                return (
                  <View key={doc.id}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.docRow}
                      onPress={() => setExpandedDoc(isOpen ? null : doc.id)}
                    >
                      <View
                        style={[
                          styles.docIcon,
                          { backgroundColor: `${brandPrimary}18` },
                        ]}
                      >
                        <Ionicons
                          name="document-text-outline"
                          size={16}
                          color={brandPrimary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.docLabel, { color: colors.text }]}>
                          {DOC_LABELS[doc.documentType] ?? doc.documentType}
                        </Text>
                        <Text
                          style={[styles.docSub, { color: colors.textSecondary }]}
                        >
                          #{doc.documentNumber}
                        </Text>
                      </View>
                      <Ionicons
                        name={isOpen ? "chevron-up" : "chevron-down"}
                        size={16}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>

                    {isOpen && (
                      <View style={styles.docPreviewWrap}>
                        <Pressable onPress={() => Linking.openURL(doc.documentUrl)}>
                          <Image
                            source={{ uri: doc.documentUrl }}
                            style={[
                              styles.docPreview,
                              { borderColor, backgroundColor: mutedBg },
                            ]}
                            resizeMode="cover"
                          />
                        </Pressable>
                        <Text
                          style={[
                            styles.docPreviewHint,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Tap to open full image
                        </Text>
                      </View>
                    )}

                    {idx !== kyc.documents.length - 1 && (
                      <View
                        style={[styles.divider, { backgroundColor: borderColor }]}
                      />
                    )}
                  </View>
                );
              })}
            </View>

            {/* Existing approval notes */}
            {kyc.status === "VERIFIED" && kyc.approvalNotes && (
              <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
                <Text
                  style={[styles.sectionTitle, { color: colors.textSecondary }]}
                >
                  APPROVAL NOTES
                </Text>
                <Text style={[styles.notesText, { color: colors.text }]}>
                  {kyc.approvalNotes}
                </Text>
              </View>
            )}

            {/* Existing rejection reason */}
            {kyc.status === "REJECTED" && kyc.rejectionReason && (
              <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
                <Text
                  style={[styles.sectionTitle, { color: colors.textSecondary }]}
                >
                  REJECTION REASON
                </Text>
                <Text style={[styles.notesText, { color: "#EF4444" }]}>
                  {kyc.rejectionReason}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default ViewKycUserModal;

/* ---------------- Sub components ---------------- */
const StatusPill = ({ status }: { status: string }) => {
  const map: Record<string, { color: string; bg: string }> = {
    PENDING: { color: "#F59E0B", bg: "#F59E0B20" },
    VERIFIED: { color: "#10B981", bg: "#10B98120" },
    REJECTED: { color: "#EF4444", bg: "#EF444420" },
  };
  const meta = map[status] ?? map.PENDING;
  return (
    <View style={[styles.pill, { backgroundColor: meta.bg }]}>
      <Text style={[styles.pillText, { color: meta.color }]}>{status}</Text>
    </View>
  );
};

const InfoRow = ({
  label,
  value,
  colors,
  borderColor,
  isLast,
}: {
  label: string;
  value: string;
  colors: any;
  borderColor: string;
  isLast?: boolean;
}) => (
  <View>
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
    {!isLast && (
      <View style={[styles.divider, { backgroundColor: borderColor }]} />
    )}
  </View>
);

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    height: "90%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingTop: 8,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  subtitle: { fontSize: 12.5, fontWeight: "600", marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  section: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  userRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "800" },
  userName: { fontSize: 15.5, fontWeight: "800", letterSpacing: -0.2 },
  userMeta: { fontSize: 12, fontWeight: "500", marginTop: 2 },

  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  pillText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    gap: 12,
  },
  infoLabel: { fontSize: 12.5, fontWeight: "600" },
  infoValue: {
    fontSize: 12.5,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right",
  },
  divider: { height: StyleSheet.hairlineWidth },

  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  docIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  docLabel: { fontSize: 13.5, fontWeight: "700" },
  docSub: { fontSize: 11.5, fontWeight: "500", marginTop: 2 },

  docPreviewWrap: { paddingBottom: 10 },
  docPreview: { width: "100%", height: 200, borderRadius: 12, borderWidth: 1 },
  docPreviewHint: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 6,
  },

  notesText: { fontSize: 13, fontWeight: "600", lineHeight: 18 },

  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 10,
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionText: { fontSize: 14, fontWeight: "800", letterSpacing: 0.2 },
});