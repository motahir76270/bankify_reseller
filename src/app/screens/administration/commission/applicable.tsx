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

import { Colors } from "@/constants/theme";
import { getApplicableCommissionListDataApiCall } from "@/redux/slices/comissionSlice";
import ViewApplicableCommissionModal from "@/components/modal/commssion/ViewApplicableCommissionModal";
import { FullScreenLoader } from "@/hooks/use-screensLoder";
import { LinearGradient } from "expo-linear-gradient";

/* ----------------------------- Types ----------------------------- */

type Slab = {
  id?: string;
  commissionSettingId?: string;
  minAmount: number;
  maxAmount: number;
  value: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type CommissionService = {
  name?: string;
  code?: string;
  providerName?: string;
  providerCode?: string;
};

type CommissionRole = {
  id?: string;
  name?: string;
  code?: string;
};

type CommissionUser = {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  roleId?: string;
  roleName?: string;
  roleCode?: string;
};

type ApplicableCommission = {
  id: string;
  scope: "ROLE" | "USER" | "GLOBAL" | string;
  source?: string;
  user?: CommissionUser;
  role?: CommissionRole;
  serviceProviderMappingId?: string;
  service?: CommissionService;
  mode: "COMMISSION" | "SURCHARGE" | string;
  type: "FLAT" | "PERCENTAGE" | string;
  value?: number;
  applyTDS?: boolean;
  tdsPercent?: number;
  applyGST?: boolean;
  gstPercent?: number;
  supportsSlab?: boolean;
  slabs?: Slab[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
};

/* --------------------------- Constants --------------------------- */

const PAGE_SIZE = 20;

/* --------------------------- Helpers ----------------------------- */

const extractCommissions = (raw: any): ApplicableCommission[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.commissions)) return raw.commissions;
  if (Array.isArray(raw.applicableCommissions))
    return raw.applicableCommissions;
  if (Array.isArray(raw.commisionApplicableList))
    return raw.commisionApplicableList;
  if (Array.isArray(raw.data?.commissions)) return raw.data.commissions;
  if (Array.isArray(raw.data)) return raw.data;
  return [];
};

const extractHeaderUser = (raw: any): CommissionUser | null => {
  if (!raw || Array.isArray(raw)) return null;
  return raw.user ?? raw.data?.user ?? null;
};

const extractTotalRules = (raw: any): number | null => {
  if (!raw || Array.isArray(raw)) return null;
  if (typeof raw.totalRules === "number") return raw.totalRules;
  if (typeof raw.data?.totalRules === "number") return raw.data.totalRules;
  return null;
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
    hour12: true,
  });
};

const getScopeMeta = (scope: string) => {
  switch (scope?.toUpperCase()) {
    case "ROLE":
      return { icon: "shield-outline", label: "Role" };
    case "USER":
      return { icon: "person-outline", label: "User" };
    case "GLOBAL":
      return { icon: "earth-outline", label: "Global" };
    default:
      return { icon: "help-circle-outline", label: scope };
  }
};

const getServiceLabel = (c: ApplicableCommission) => {
  if (!c.service) return "—";
  const provider = c.service.providerCode ? ` · ${c.service.providerCode}` : "";
  return `${c.service.name ?? c.service.code ?? "Service"}${provider}`;
};

const getValueSummary = (c: ApplicableCommission) => {
  if (c.supportsSlab) {
    const slabs = c.slabs ?? [];
    return `${slabs.length} slab${slabs.length === 1 ? "" : "s"}`;
  }
  if (c.type === "PERCENTAGE") return `${c.value ?? 0}%`;
  return `₹${c.value ?? 0}`;
};

/* --------------------------- Screen ------------------------------ */

const ApplicableCommissionScreen = () => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const { commisionApplicableList, loading } = useSelector(
    (state: any) => state?.commission,
  );
  const { user } = useSelector((state: any) => state?.auth);
  const userId = user?.user?.id;

  const [commissions, setCommissions] = useState<ApplicableCommission[]>([]);
  const [headerUser, setHeaderUser] = useState<CommissionUser | null>(null);
  const [totalRules, setTotalRules] = useState<number | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Details modal
  const [selected, setSelected] = useState<ApplicableCommission | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Pagination
  const isFetchingRef = useRef(false);
  const currentPageRef = useRef(1);
  const appendedPagesRef = useRef<Set<number>>(new Set([1]));
  const [hasMore, setHasMore] = useState(true);

  /* ---------------- Payload ---------------- */

  const buildPayload = useCallback(
    (pageToFetch: number) => ({
      page: pageToFetch,
      limit: PAGE_SIZE,
    }),
    [],
  );

  /* ---------------- Initial fetch ---------------- */

  useEffect(() => {
    appendedPagesRef.current = new Set([1]);
    currentPageRef.current = 1;
    setHasMore(true);
    setLoadingMore(false);

    const timer = setTimeout(async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        setCommissions([]);
        await getApplicableCommissionListDataApiCall(userId, dispatch);
      } finally {
        isFetchingRef.current = false;
      }
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  /* ---------------- Sync Redux → local ---------------- */

  useEffect(() => {
    const incoming = extractCommissions(commisionApplicableList);
    const incomingUser = extractHeaderUser(commisionApplicableList);
    const incomingTotal = extractTotalRules(commisionApplicableList);

    const currentPage = currentPageRef.current;

    if (currentPage === 1) {
      setCommissions(incoming);
      setHeaderUser(incomingUser);
      setTotalRules(incomingTotal);
    } else {
      setCommissions((prev) => {
        const existing = new Set(prev.map((c) => c.id));
        const fresh = incoming.filter((c) => !existing.has(c.id));
        return [...prev, ...fresh];
      });
      if (!headerUser && incomingUser) setHeaderUser(incomingUser);
      if (totalRules == null && incomingTotal != null)
        setTotalRules(incomingTotal);
    }

    setHasMore(incoming.length >= PAGE_SIZE);
    setLoadingMore(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commisionApplicableList]);

  /* ---------------- Load more ---------------- */

  const loadMore = useCallback(async () => {
    if (
      !hasMore ||
      loading ||
      loadingMore ||
      isFetchingRef.current ||
      commissions.length === 0
    ) {
      return;
    }

    const nextPage = currentPageRef.current + 1;
    if (appendedPagesRef.current.has(nextPage)) return;

    appendedPagesRef.current.add(nextPage);
    currentPageRef.current = nextPage;
    setLoadingMore(true);
    isFetchingRef.current = true;

    try {
      await getApplicableCommissionListDataApiCall(
        buildPayload(nextPage),
        dispatch,
      );
    } finally {
      isFetchingRef.current = false;
    }
  }, [
    hasMore,
    loading,
    loadingMore,
    commissions.length,
    buildPayload,
    dispatch,
  ]);

  const onRefresh = async () => {
    setRefreshing(true);
    appendedPagesRef.current = new Set([1]);
    currentPageRef.current = 1;
    setHasMore(true);
    isFetchingRef.current = true;
    try {
      await getApplicableCommissionListDataApiCall(userId, dispatch);
    } finally {
      isFetchingRef.current = false;
      setRefreshing(false);
    }
  };

  const openDetails = (item: ApplicableCommission) => {
    setSelected(item);
    setDetailsOpen(true);
  };

  /* ---------------- Render item ---------------- */

  const renderItem = ({ item }: { item: ApplicableCommission }) => {
    const scopeMeta = getScopeMeta(item.scope);
    const isActive = !!item.isActive;
    const statusColor = isActive
      ? colors.success ?? "#10B981"
      : colors.error ?? "#EF4444";

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => openDetails(item)}
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
            styles.iconWrap,
            {
              backgroundColor: isActive
                ? (colors.buttonPrimary ?? "#2563EB") + "18"
                : colors.border,
            },
          ]}
        >
          <Ionicons
            name={scopeMeta.icon as any}
            size={18}
            color={isActive ? colors.buttonPrimary : colors.textMuted}
          />
        </View>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.service?.name ?? "Service"}
            </Text>
            <View
              style={[
                styles.scopeTag,
                { backgroundColor: colors.buttonPrimary + "18" },
              ]}
            >
              <Text
                style={[styles.scopeTagText, { color: colors.buttonPrimary }]}
              >
                {scopeMeta.label}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text
              style={[styles.metaText, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {getServiceLabel(item)}
            </Text>
            <Text style={[styles.metaDot, { color: colors.textMuted }]}>·</Text>
            <Text
              style={[styles.metaText, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {getValueSummary(item)}
            </Text>
          </View>
        </View>

        <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
          <View style={styles.statusRow}>
            <View style={[styles.miniDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.miniStatusText, { color: statusColor }]}>
              {isActive ? "ACTIVE" : "INACTIVE"}
            </Text>
          </View>
          <Text
            style={[styles.dateText, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {formatDate(item.createdAt)}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.textMuted}
          style={{ marginLeft: 4 }}
        />
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

  const showInitialLoader = loading && commissions.length === 0;

  /* ---------------- Header ---------------- */

  const ListHeader = () => {
    if (!headerUser && totalRules == null) return null;
    return (
      <View
        style={[
          styles.headerCard,
          {
            backgroundColor: colors.surfaceTertiary,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerUserRow}>
          <View
            style={[
              styles.headerAvatar,
              { backgroundColor: (colors.buttonPrimary ?? "#2563EB") + "18" },
            ]}
          >
            <Text
              style={[
                styles.headerAvatarText,
                { color: colors.buttonPrimary },
              ]}
            >
              {(headerUser?.firstName?.[0] ?? "") +
                (headerUser?.lastName?.[0] ?? "")}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.headerName, { color: colors.text }]}
              numberOfLines={1}
            >
              {`${headerUser?.firstName ?? ""} ${
                headerUser?.lastName ?? ""
              }`.trim() || "—"}
            </Text>
            {!!headerUser?.email && (
              <Text
                style={[styles.headerSub, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {headerUser.email}
              </Text>
            )}
            {!!headerUser?.roleName && (
              <Text
                style={[styles.headerSub, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {headerUser.roleName} · {headerUser.roleCode}
              </Text>
            )}
          </View>
        </View>

        <View style={[styles.headerStats, { borderTopColor: colors.border }]}>
          <View style={styles.headerStatItem}>
            <Text style={[styles.headerStatValue, { color: colors.text }]}>
              {totalRules ?? commissions.length}
            </Text>
            <Text style={[styles.headerStatLabel, { color: colors.textMuted }]}>
              Total Rules
            </Text>
          </View>
          <View
            style={[styles.headerStatDivider, { backgroundColor: colors.border }]}
          />
          <View style={styles.headerStatItem}>
            <Text
              style={[
                styles.headerStatValue,
                { color: colors.success ?? "#10B981" },
              ]}
            >
              {commissions.filter((c) => c.isActive).length}
            </Text>
            <Text style={[styles.headerStatLabel, { color: colors.textMuted }]}>
              Active
            </Text>
          </View>
        </View>
      </View>
    );
  };

  /* ---------------- Render ---------------- */

  return (
    <LinearGradient
      colors={[colors.backgroundTop , colors.backgroundBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }} 
       style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderSection title="Applicable Commission" />

      {/* List */}
      {showInitialLoader ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.buttonPrimary} />
        </View>
      ) : (
        <FlatList
          data={commissions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 40,
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
                name="calculator-outline"
                size={48}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No applicable commissions found
              </Text>
            </View>
          }
          removeClippedSubviews={false}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Details modal */}
      <ViewApplicableCommissionModal
        visible={detailsOpen}
        commission={selected}
        onClose={() => {
          setDetailsOpen(false);
          setSelected(null);
        }}
      />
      <FullScreenLoader loading={loading} />
    </LinearGradient>
  );
};

export default ApplicableCommissionScreen;

/* --------------------------- Styles ------------------------------ */

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: "800" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyText: { fontSize: 13.5, fontWeight: "600" },

  /* Header card */
  headerCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  headerUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: { fontSize: 16, fontWeight: "800" },
  headerName: { fontSize: 15, fontWeight: "800" },
  headerSub: { fontSize: 11.5, fontWeight: "500", marginTop: 2 },
  headerStats: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
    paddingTop: 12,
  },
  headerStatItem: { flex: 1, alignItems: "center" },
  headerStatValue: { fontSize: 18, fontWeight: "800" },
  headerStatLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  headerStatDivider: { width: StyleSheet.hairlineWidth, height: 30 },

  /* Card */
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontSize: 13.5, fontWeight: "700", flexShrink: 1 },
  scopeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  scopeTagText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },
  metaText: { fontSize: 10.5, fontWeight: "500", flexShrink: 1 },
  metaDot: { fontSize: 12, fontWeight: "700" },

  statusRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  miniDot: { width: 6, height: 6, borderRadius: 3 },
  miniStatusText: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  dateText: { fontSize: 10, fontWeight: "500", marginTop: 3 },

  footerText: { fontSize: 11, fontWeight: "600" },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
});