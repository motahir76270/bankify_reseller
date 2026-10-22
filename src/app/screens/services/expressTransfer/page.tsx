import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HeaderSection from "@/components/ui/headerSections";
import AsyncStorage from "@react-native-async-storage/async-storage";

import EditBeneficiaryModal from "@/components/modal/qt/EditBeneficiaryModal";
import AddBeneficiaryModal from "@/components/modal/qt/addBeneficiaryModal";
import InitiateQTModal from "@/components/modal/qt/initiateQTModal";
import { Colors } from "@/constants/theme";
import {
  getBeneficiaryDataApiCall,
  getExpressTranferDetailsApiCall,
} from "@/redux/slices/expressTransferSlice";
import { LinearGradient } from "expo-linear-gradient";

/* ----------------------------- Types ----------------------------- */

type Beneficiary = {
  beneficiaryId: string;
  userId?: string;
  tenantId?: string;
  name?: string;
  mobileNumber?: string;
  areaPinCode?: string;
  beneficiaryIsActive?: boolean;
  bankAccountId?: string;
  bankId?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  verificationStatus?: string;
  bankIsActive?: boolean;
  [key: string]: any;
};

type ETAccountDetails = {
  accountHolderName?: string;
  name?: string;
  mobileNumber?: string;
  accountNumber?: string;
  bankName?: string;
  ifscCode?: string;
  [key: string]: any;
};

/* --------------------------- Constants --------------------------- */

const PAGE_SIZE = 20;

/* --------------------------- Helpers ----------------------------- */

const safeParse = (value: string | null): any => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const getStoredMobile = async (): Promise<string | null> => {
  const raw = await AsyncStorage.getItem("mobile");
  const parsed = safeParse(raw);
  if (typeof parsed === "string") return parsed;
  if (parsed && typeof parsed === "object") {
    return parsed.mobileNumber ?? parsed.mobile ?? null;
  }
  return null;
};

const extractBeneficiaryData = (raw: any): Beneficiary[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.beneficiaryData)) return raw.beneficiaryData;
  if (Array.isArray(raw.beneficiaryList)) return raw.beneficiaryList;
  if (Array.isArray(raw.expressTransferBankList))
    return raw.expressTransferBankList;
  if (Array.isArray(raw.list)) return raw.list;
  if (Array.isArray(raw.data)) return raw.data;
  if (Array.isArray(raw.data?.beneficiaryData)) return raw.data.beneficiaryData;
  return [];
};

const getInitials = (name?: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
};

const maskAccount = (acc?: string) => {
  if (!acc) return "—";
  if (acc.length <= 4) return acc;
  return `•••• ${acc.slice(-4)}`;
};

const formatIndianMobile = (mobile?: string) => {
  if (!mobile) return "—";
  const digits = mobile.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return mobile;
};

const getVerificationColor = (status: string | undefined, colors: any) => {
  switch ((status ?? "").toUpperCase()) {
    case "VERIFIED":
      return colors.success ?? "#10B981";
    case "PENDING":
    case "PROCESSING":
      return "#F59E0B";
    case "REJECTED":
    case "FAILED":
      return colors.error ?? "#EF4444";
    default:
      return colors.textMuted;
  }
};

/* --------------------------- Screen ------------------------------ */

const ETPage = () => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const { ETAccountDetials, beneficiaryData, expressTransferBankList, loading } =
    useSelector((state: any) => state?.expressTransfer);

  const etAccount: ETAccountDetails | null = ETAccountDetials ?? null;

  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [selected, setSelected] = useState<Beneficiary | null>(null);

  // Pagination
  const isFetchingRef = useRef(false);
  const currentPageRef = useRef(1);
  const appendedPagesRef = useRef<Set<number>>(new Set([1]));
  const [hasMore, setHasMore] = useState(true);

  /* ---------------- Fetch beneficiary ---------------- */

  const fetchBeneficiaries = useCallback(
    async (page: number = 1) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        const mobile = await getStoredMobile();
        if (!mobile) return;
        await getBeneficiaryDataApiCall(
          { mobileNumber: mobile, page, pageSize: PAGE_SIZE },
          dispatch,
        );
      } finally {
        isFetchingRef.current = false;
      }
    },
    [dispatch],
  );

  /* ---------------- Fetch Express Transfer account details ---------------- */

  const fetchEtDetailsAccountDetails = useCallback(async () => {
    const mobile = await getStoredMobile();
    if (!mobile) return;
    await getExpressTranferDetailsApiCall({ mobileNumber: mobile }, dispatch);
  }, [dispatch]);

  /* ---------------- Initial fetch on mount ---------------- */

  useEffect(() => {
    fetchBeneficiaries(1);
    fetchEtDetailsAccountDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- Sync Redux → pagination flags ---------------- */

  useEffect(() => {
    const incoming = extractBeneficiaryData(expressTransferBankList);
    const source = incoming.length > 0 ? incoming : beneficiaryData;
    setHasMore(source.length >= PAGE_SIZE);
    setLoadingMore(false);
  }, [expressTransferBankList, beneficiaryData]);

  /* ---------------- Load more ---------------- */

  const loadMore = useCallback(async () => {
    if (
      !hasMore ||
      loading ||
      loadingMore ||
      isFetchingRef.current ||
      beneficiaryData.length === 0
    )
      return;

    const nextPage = currentPageRef.current + 1;
    if (appendedPagesRef.current.has(nextPage)) return;

    appendedPagesRef.current.add(nextPage);
    currentPageRef.current = nextPage;
    setLoadingMore(true);
    try {
      await fetchBeneficiaries(nextPage);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loading, loadingMore, beneficiaryData.length, fetchBeneficiaries]);

  /* ---------------- Refresh ---------------- */

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    appendedPagesRef.current = new Set([1]);
    currentPageRef.current = 1;
    setHasMore(true);
    try {
      await fetchBeneficiaries(1);
      await fetchEtDetailsAccountDetails();
    } finally {
      setRefreshing(false);
    }
  }, [fetchBeneficiaries, fetchEtDetailsAccountDetails]);

  const openEdit = (b: Beneficiary) => {
    setSelected(b);
    setEditOpen(true);
  };

  const openTransfer = (b: Beneficiary) => {
    setSelected(b);
    setTransferOpen(true);
  };

  /* ---------------- Render item ---------------- */

  const renderItem = ({ item }: { item: Beneficiary }) => {
    const verificationColor = getVerificationColor(
      item.verificationStatus,
      colors,
    );
    const isVerified = item.verificationStatus === "VERIFIED";

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => openEdit(item)}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.avatar,
            { backgroundColor: colors.buttonPrimary + "20" },
          ]}
        >
          <Text style={[styles.avatarText, { color: colors.buttonPrimary }]}>
            {getInitials(item.accountHolderName ?? item.name)}
          </Text>
        </View>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.accountHolderName ?? item.name ?? "Beneficiary"}
            </Text>
            {isVerified && (
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={colors.success ?? "#10B981"}
              />
            )}
          </View>

          <View style={styles.metaRow}>
            <Text
              style={[styles.metaText, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {maskAccount(item.accountNumber)}
            </Text>
            <Text style={[styles.metaDot, { color: colors.textMuted }]}>·</Text>
            <Text
              style={[styles.metaText, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {item.bankName ?? "—"}
            </Text>
          </View>

          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: verificationColor + "18",
                  borderColor: verificationColor + "60",
                },
              ]}
            >
              <View
                style={[styles.badgeDot, { backgroundColor: verificationColor }]}
              />
              <Text style={[styles.badgeText, { color: verificationColor }]}>
                {item.verificationStatus ?? "UNKNOWN"}
              </Text>
            </View>
            {!!item.ifscCode && (
              <Text
                style={[styles.ifscText, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {item.ifscCode}
              </Text>
            )}
          </View>
        </View>

        {/* Transfer button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={(e) => {
            e.stopPropagation?.();
            openTransfer(item);
          }}
          style={[
            styles.transferBtn,
            {
              backgroundColor: colors.buttonPrimary + "18",
              borderColor: colors.buttonPrimary + "50",
              opacity: isVerified ? 1 : 0.55,
            },
          ]}
          disabled={!isVerified}
          hitSlop={8}
        >
          <Ionicons
            name="paper-plane-outline"
            size={16}
            color={colors.buttonPrimary}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={colors.buttonPrimary} />
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          Loading more...
        </Text>
      </View>
    );
  };

  const showInitialLoader = loading && beneficiaryData.length === 0;

  /* ---------------- Indian Profile Card Header ---------------- */

  const renderAccountHeader = () => {
    const holderName = etAccount?.name ?? "Account Name";
    const mobileNo = etAccount?.mobileNumber ?? "—";
    const bankName = etAccount?.bankName ?? null;
    const isVerified = !!etAccount?.accountHolderName;

    return (
      <View
        style={[
          styles.profileCard,
          {
            backgroundColor: colors.buttonPrimary,
            shadowColor: colors.buttonPrimary,
          },
        ]}
      >
        <View style={styles.decorCircleLarge} />
        <View style={styles.decorCircleSmall} />

        <View style={styles.profileTopRow}>
          <View style={styles.bankChip}>
            <Ionicons name="business-outline" size={12} color="#FFFFFF" />
            <Text style={styles.bankChipText} numberOfLines={1}>
              {bankName}
            </Text>
          </View>

          {isVerified && (
            <View style={styles.verifiedPill}>
              <Ionicons name="shield-checkmark" size={11} color="#FFFFFF" />
              <Text style={styles.verifiedPillText}>Verified</Text>
            </View>
          )}
        </View>

        <View style={styles.profileMiddleRow}>
          <View style={styles.profileAvatarRing}>
            <View
              style={[
                styles.profileAvatar,
                { backgroundColor: "rgba(255,255,255,0.22)" },
              ]}
            >
              <Text style={styles.profileAvatarText}>
                {getInitials(holderName)}
              </Text>
            </View>
          </View>

          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.profileName} numberOfLines={1}>
              {holderName}
            </Text>
            <View style={styles.profileMobileRow}>
              <Ionicons name="call-outline" size={12} color="#FFFFFFCC" />
              <Text style={styles.profileMobile} numberOfLines={1}>
                {formatIndianMobile(mobileNo)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.profileBottomStrip}>
          <View style={styles.profileBottomDot} />
          <Text style={styles.profileBottomText}>
            Primary Express Transfer Account
          </Text>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={[colors.backgroundTop, colors.backgroundBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <HeaderSection title="Express Transfer" />

      {showInitialLoader ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.buttonPrimary} />
        </View>
      ) : (
        <FlatList
          data={beneficiaryData}
          keyExtractor={(item, index) => index?.toString()}
          renderItem={renderItem}
          ListHeaderComponent={renderAccountHeader}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 120,
          }}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.buttonPrimary}
            />
          }
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons
                name="people-outline"
                size={48}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No beneficiaries yet
              </Text>
              <TouchableOpacity
                onPress={() => setAddOpen(true)}
                style={[styles.emptyCta, { borderColor: colors.buttonPrimary }]}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={16}
                  color={colors.buttonPrimary}
                />
                <Text
                  style={[styles.emptyCtaText, { color: colors.buttonPrimary }]}
                >
                  Add your first beneficiary
                </Text>
              </TouchableOpacity>
            </View>
          }
          removeClippedSubviews={false}
          keyboardShouldPersistTaps="handled"
        />
      )}

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setAddOpen(true)}
        style={[
          styles.fab,
          {
            backgroundColor: colors.buttonPrimary,
            bottom: insets.bottom + 24,
          },
        ]}
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </TouchableOpacity>

      <AddBeneficiaryModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={onRefresh}
      />

      <EditBeneficiaryModal
        visible={editOpen}
        beneficiary={selected}
        onClose={() => {
          setEditOpen(false);
          setSelected(null);
        }}
        onSuccess={onRefresh}
      />

      {/* Initiate Transfer (QT) modal */}
      <InitiateQTModal
        visible={transferOpen}
        beneficiary={selected}
        senderAccount={etAccount}
        onClose={() => {
          setTransferOpen(false);
          setSelected(null);
        }}
        onSuccess={() => {
          setTransferOpen(false);
          setSelected(null);
          onRefresh();
        }}
      />
    </LinearGradient>
  );
};

export default ETPage;

/* --------------------------- Styles ------------------------------ */

const styles = StyleSheet.create({
  container: { flex: 1 },

  profileCard: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },

  decorCircleLarge: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -70,
    right: -50,
  },
  decorCircleSmall: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.06)",
    bottom: -40,
    left: -30,
  },

  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  bankChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    maxWidth: "68%",
  },
  bankChipText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  verifiedPillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  profileMiddleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  profileAvatarRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  profileName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  profileMobileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  profileMobile: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12.5,
    fontWeight: "600",
    letterSpacing: 0.4,
  },

  profileBottomStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.18)",
  },
  profileBottomDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ADE80",
  },
  profileBottomText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 10.5,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyText: { fontSize: 13.5, fontWeight: "600" },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  emptyCtaText: { fontSize: 12.5, fontWeight: "700" },

  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 14, fontWeight: "800" },

  titleRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  title: { fontSize: 13.5, fontWeight: "700", flexShrink: 1 },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },
  metaText: { fontSize: 10.5, fontWeight: "500", flexShrink: 1 },
  metaDot: { fontSize: 12, fontWeight: "700" },

  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeDot: { width: 5, height: 5, borderRadius: 2.5 },
  badgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },
  ifscText: { fontSize: 10.5, fontWeight: "600" },

  transferBtn: {
    marginLeft: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  footerText: { fontSize: 11, fontWeight: "600" },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
});