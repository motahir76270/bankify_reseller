import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { Colors } from "@/constants/theme";
import HeaderSection from "@/components/ui/headerSections";
import { FullScreenLoader } from "@/hooks/use-screensLoder";
import { getMyKycDataApiCall } from "@/redux/slices/profileKycSlice";
import { LinearGradient } from "expo-linear-gradient";

/* ---------------- Types ---------------- */
export type MyKycDocument = {
  id: string;
  documentType:
    | "AADHAAR_FRONT"
    | "AADHAAR_BACK"
    | "PAN"
    | "ADDRESS_PROOF"
    | "USER_PHOTO";
  documentNumber: string;
  documentUrl: string;
  documentBackUrl: string | null;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  isActive: boolean;
  createdAt: string;
};

export type MyKycAddress = {
  id: string;
  address: string;
  pinCode: string;
  stateId: string;
  cityId: string;
};

export type MyKycPersonalInfo = {
  firstName: string;
  lastName: string;
  fatherName: string;
  dob: string;
  gender: "MALE" | "FEMALE" | "OTHER";
};

export type MyKycData = {
  id: string;
  userId: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  submittedAt: string;
  submittedByUserId: string;
  approvedAt: string | null;
  approvedByUserId: string | null;
  approvalNotes: string | null;
  rejectedAt: string | null;
  rejectedByUserId: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  documents: MyKycDocument[];
  address: MyKycAddress;
  personalInfo: MyKycPersonalInfo;
};

/* ---------------- Doc labels ---------------- */
const DOC_LABELS: Record<MyKycDocument["documentType"], string> = {
  AADHAAR_FRONT: "Aadhaar (Front)",
  AADHAAR_BACK: "Aadhaar (Back)",
  PAN: "PAN Card",
  ADDRESS_PROOF: "Address Proof",
  USER_PHOTO: "User Photo",
};

const STATUS_META: Record<
  "PENDING" | "VERIFIED" | "REJECTED",
  { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; label: string }
> = {
  PENDING: {
    color: "#F59E0B",
    bg: "#F59E0B20",
    icon: "time-outline",
    label: "Under Review",
  },
  VERIFIED: {
    color: "#10B981",
    bg: "#10B98120",
    icon: "checkmark-circle",
    label: "Verified",
  },
  REJECTED: {
    color: "#EF4444",
    bg: "#EF444420",
    icon: "close-circle",
    label: "Rejected",
  },
};

/* ---------------- Helpers ---------------- */
const formatDate = (iso: string | null) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* ---------------- Screen ---------------- */
const MyKycScreen = () => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const { user } = useSelector((state: any) => state.auth);
  const { myKycData, loading } = useSelector((state: any) => state.profileKyc);

  const data: MyKycData | null = myKycData ?? null;

  const cardBg = colors.card;
  const mutedBg = isDark ? "#1A1D2A" : "#F8FAFC";
  const borderColor = colors.border;
  const brandPrimary = isDark ? "#7C6BFF" : "#4F46E5";

  const userId = user?.user?.id;
  const [refreshing, setRefreshing] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  const fetchData = async () => {
    if (!userId) return;
    await getMyKycDataApiCall(userId, dispatch);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  /* ---------------- Loading ---------------- */
  if (loading && !data) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <HeaderSection title="My KYC" />
        <FullScreenLoader loading={true} />
      </View>
    );
  }

  /* ---------------- Empty ---------------- */
  if (!data) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <HeaderSection title="My KYC" />
        <ScrollView
          contentContainerStyle={styles.center}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={brandPrimary}
              colors={[brandPrimary]}
            />
          }
        >
          <View style={[styles.emptyIcon, { backgroundColor: `${brandPrimary}18` }]}>
            <Ionicons name="document-outline" size={40} color={brandPrimary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No KYC Submitted
          </Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            You haven't submitted your KYC yet. Complete it from your profile.
          </Text>
        </ScrollView>
      </View>
    );
  }

  const meta = STATUS_META[data.status];
  const p = data.personalInfo;
  const a = data.address;

  return (
    <LinearGradient
      colors={[colors.backgroundTop , colors.backgroundBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }} 
       style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderSection title="My KYC" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={brandPrimary}
            colors={[brandPrimary]}
          />
        }
      >
        {/* ---------- Status banner ---------- */}
        <View
          style={[
            styles.statusBanner,
            { backgroundColor: meta.bg, borderColor: meta.color },
          ]}
        >
          <View style={[styles.statusIcon, { backgroundColor: meta.color }]}>
            <Ionicons name={meta.icon} size={22} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusTitle, { color: meta.color }]}>
              {meta.label}
            </Text>
            <Text style={[styles.statusSub, { color: colors.textSecondary }]}>
              Submitted on {formatDate(data.submittedAt)}
            </Text>
          </View>
        </View>

        {/* ---------- Rejection reason ---------- */}
        {data.status === "REJECTED" && !!data.rejectionReason && (
          <View
            style={[
              styles.reasonCard,
              { backgroundColor: "#EF444410", borderColor: "#EF4444" },
            ]}
          >
            <View style={styles.reasonHeader}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.reasonTitle}>Rejection Reason</Text>
            </View>
            <Text style={[styles.reasonText, { color: colors.text }]}>
              {data.rejectionReason}
            </Text>
            {!!data.rejectedAt && (
              <Text style={[styles.reasonDate, { color: colors.textSecondary }]}>
                Rejected on {formatDate(data.rejectedAt)}
              </Text>
            )}
          </View>
        )}

        {/* ---------- Approval notes (if any) ---------- */}
        {data.status === "VERIFIED" && !!data.approvalNotes && (
          <View
            style={[
              styles.reasonCard,
              { backgroundColor: "#10B98110", borderColor: "#10B981" },
            ]}
          >
            <View style={styles.reasonHeader}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={[styles.reasonTitle, { color: "#10B981" }]}>
                Approval Notes
              </Text>
            </View>
            <Text style={[styles.reasonText, { color: colors.text }]}>
              {data.approvalNotes}
            </Text>
          </View>
        )}

        {/* ---------- Personal info ---------- */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={16} color={brandPrimary} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              PERSONAL INFORMATION
            </Text>
          </View>

          <InfoRow
            label="First Name"
            value={p?.firstName ?? "-"}
            colors={colors}
            borderColor={borderColor}
          />
          <InfoRow
            label="Last Name"
            value={p?.lastName ?? "-"}
            colors={colors}
            borderColor={borderColor}
          />
          <InfoRow
            label="Father's Name"
            value={p?.fatherName ?? "-"}
            colors={colors}
            borderColor={borderColor}
          />
          <InfoRow
            label="Date of Birth"
            value={formatDate(p?.dob ?? null)}
            colors={colors}
            borderColor={borderColor}
          />
          <InfoRow
            label="Gender"
            value={p?.gender ?? "-"}
            colors={colors}
            borderColor={borderColor}
            isLast
          />
        </View>

        {/* ---------- Address ---------- */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={16} color={brandPrimary} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              ADDRESS
            </Text>
          </View>

          <InfoRow
            label="Address"
            value={a?.address ?? "-"}
            colors={colors}
            borderColor={borderColor}
          />
          <InfoRow
            label="Pincode"
            value={a?.pinCode ?? "-"}
            colors={colors}
            borderColor={borderColor}
            isLast
          />
        </View>

        {/* ---------- Documents ---------- */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="documents-outline" size={16} color={brandPrimary} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              DOCUMENTS ({data.documents?.length ?? 0})
            </Text>
          </View>

          {data.documents?.map((doc, idx) => {
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
                    <Text style={[styles.docSub, { color: colors.textSecondary }]}>
                      #{doc.documentNumber}
                    </Text>
                  </View>

                  {/* Per-doc verification badge */}
                  <View
                    style={[
                      styles.docStatusPill,
                      {
                        backgroundColor:
                          doc.verificationStatus === "VERIFIED"
                            ? "#10B98120"
                            : doc.verificationStatus === "REJECTED"
                            ? "#EF444420"
                            : "#F59E0B20",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.docStatusText,
                        {
                          color:
                            doc.verificationStatus === "VERIFIED"
                              ? "#10B981"
                              : doc.verificationStatus === "REJECTED"
                              ? "#EF4444"
                              : "#F59E0B",
                        },
                      ]}
                    >
                      {doc.verificationStatus}
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
                      style={[styles.docPreviewHint, { color: colors.textSecondary }]}
                    >
                      Tap to open full image
                    </Text>
                  </View>
                )}

                {idx !== data.documents.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: borderColor }]} />
                )}
              </View>
            );
          })}
        </View>

        {/* ---------- Footer meta ---------- */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            KYC ID: {data.id.slice(0, 8)}…
          </Text>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Last updated: {formatDate(data.updatedAt)}
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

export default MyKycScreen;

/* ---------------- Sub components ---------------- */
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
      <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
    {!isLast && <View style={[styles.divider, { backgroundColor: borderColor }]} />}
  </View>
);

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", marginTop: 16 },
  emptySub: {
    fontSize: 12.5,
    fontWeight: "500",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 18,
  },

  /* Status banner */
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  statusIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTitle: { fontSize: 15.5, fontWeight: "800", letterSpacing: -0.2 },
  statusSub: { fontSize: 11.5, fontWeight: "500", marginTop: 2 },

  /* Rejection / approval card */
  reasonCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  reasonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  reasonTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "#EF4444",
  },
  reasonText: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  reasonDate: { fontSize: 11, fontWeight: "500", marginTop: 6 },

  /* Sections */
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

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

  /* Documents */
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
  docStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  docStatusText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },

  docPreviewWrap: { paddingBottom: 10 },
  docPreview: { width: "100%", height: 200, borderRadius: 12, borderWidth: 1 },
  docPreviewHint: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 6,
  },

  footer: { alignItems: "center", marginTop: 8, gap: 2 },
  footerText: { fontSize: 11, fontWeight: "500", letterSpacing: 0.3 },
});