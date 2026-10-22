import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HeaderSection from "@/components/ui/headerSections";

import { Colors } from "@/constants/theme";
import { getQTtransactionlistDataApiCall } from "@/redux/slices/expressTransferSlice";
import ViewExpressTransferModal from "@/components/modal/qt/ViewExpressTransferModal";
import LoginModal from "@/components/modal/qt/loginModal";
import { LinearGradient } from "expo-linear-gradient";

/* ----------------------------- Types ----------------------------- */

type ExpressUser = {
  firstName?: string;
  lastName?: string;
  userNumber?: string;
  mobile?: string;
  roleCode?: string;
  roleName?: string;
};

type TenantParent = {
  userId?: string;
  tenantId?: string;
  tenantName?: string;
  tenantEmail?: string;
  tenantMobileNumber?: string;
  profilePictureUrl?: string | null;
};

type ExpressTxn = {
  id: string;
  txnId: string;
  userId?: string;
  user?: ExpressUser;
  tenantParent?: TenantParent;
  beneficiaryAccount?: string;
  beneficiaryBankName?: string;
  beneficiaryIfsc?: string;
  beneficiaryName?: string;
  mode?: string;
  amount: number;
  netAmount: number;
  status: string;
  providerReference?: string | null;
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

type StatusFilter = "ALL" | "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";

/* --------------------------- Constants --------------------------- */

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Success", value: "SUCCESS" },
  { label: "Failed", value: "FAILED" },
];

/* --------------------------- Helpers ----------------------------- */

const extractTransactions = (raw: any): ExpressTxn[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.transactions)) return raw.transactions;
  if (Array.isArray(raw.transactionlist)) return raw.transactionlist;
  if (Array.isArray(raw.list)) return raw.list;
  if (Array.isArray(raw.data)) return raw.data;
  if (Array.isArray(raw.data?.transactions)) return raw.data.transactions;
  return [];
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

const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

const getModeIcon = (mode?: string): any => {
  switch (mode?.toUpperCase()) {
    case "IMPS":
      return "flash-outline";
    case "NEFT":
      return "time-outline";
    case "RTGS":
      return "swap-horizontal-outline";
    case "UPI":
      return "phone-portrait-outline";
    default:
      return "card-outline";
  }
};

/* --------------------------- Screen ------------------------------ */

const ExpressTransferScreen = () => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const { transactionlist, loading } = useSelector(
    (state: any) => state?.expressTransfer,
  );
    const { user } = useSelector((state: any) => state?.auth);
    const role = user?.role?.roleCode
    
  const [transactions, setTransactions] = useState<ExpressTxn[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Search
  const [search, setSearch] = useState("");

  // Filters
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [selected, setSelected] = useState<ExpressTxn | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Pagination refs
  const isFetchingRef = useRef(false);
  const currentPageRef = useRef(1);
  const appendedPagesRef = useRef<Set<number>>(new Set([1]));
  const [hasMore, setHasMore] = useState(true);

  /* ---------------- Build payload ---------------- */

  const buildPayload = useCallback(
    (pageToFetch: number) => {
      const payload: Record<string, any> = {
        page: pageToFetch,
        limit: PAGE_SIZE,
        status: status || "ALL",
      };
      const trimmed = search.trim();
      if (trimmed) payload.search = trimmed;
      if (startDate) payload.startDate = toISODate(startDate);
      if (endDate) payload.endDate = toISODate(endDate);
      return payload;
    },
    [status, startDate, endDate, search],
  );

  /* ---------------- Fetch on filter/search change ---------------- */

  useEffect(() => {
    appendedPagesRef.current = new Set([1]);
    currentPageRef.current = 1;
    setHasMore(true);
    setLoadingMore(false);

    const timer = setTimeout(async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        setTransactions([]);
        await getQTtransactionlistDataApiCall(buildPayload(1), dispatch);
      } finally {
        isFetchingRef.current = false;
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [status, startDate, endDate, search, buildPayload, dispatch]);

  /* ---------------- Sync Redux → local ---------------- */

  useEffect(() => {
    const incoming = extractTransactions(transactionlist);
    const currentPage = currentPageRef.current;

    if (currentPage === 1) {
      setTransactions(incoming);
    } else {
      setTransactions((prev) => {
        const existing = new Set(prev.map((t) => t.id));
        const fresh = incoming.filter((t) => !existing.has(t.id));
        return [...prev, ...fresh];
      });
    }
    setHasMore(incoming.length >= PAGE_SIZE);
    setLoadingMore(false);
  }, [transactionlist]);

  /* ---------------- Load more ---------------- */

  const loadMore = useCallback(async () => {
    if (
      !hasMore ||
      loading ||
      loadingMore ||
      isFetchingRef.current ||
      transactions.length === 0
    )
      return;

    const nextPage = currentPageRef.current + 1;
    if (appendedPagesRef.current.has(nextPage)) return;

    appendedPagesRef.current.add(nextPage);
    currentPageRef.current = nextPage;
    setLoadingMore(true);
    isFetchingRef.current = true;

    try {
      await getQTtransactionlistDataApiCall(buildPayload(nextPage), dispatch);
    } finally {
      isFetchingRef.current = false;
    }
  }, [
    hasMore,
    loading,
    loadingMore,
    transactions.length,
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
      await getQTtransactionlistDataApiCall(buildPayload(1), dispatch);
    } finally {
      isFetchingRef.current = false;
      setRefreshing(false);
    }
  };

  /* ---------------- Date pickers ---------------- */

  const onStartChange = (event: any, date?: Date) => {
    if (Platform.OS !== "ios") setShowStartPicker(false);
    if (event?.type === "dismissed") {
      setShowStartPicker(false);
      return;
    }
    if (date) {
      setStartDate(date);
      if (Platform.OS === "ios") setShowStartPicker(false);
    }
  };

  const onEndChange = (event: any, date?: Date) => {
    if (Platform.OS !== "ios") setShowEndPicker(false);
    if (event?.type === "dismissed") {
      setShowEndPicker(false);
      return;
    }
    if (date) {
      setEndDate(date);
      if (Platform.OS === "ios") setShowEndPicker(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("ALL");
    setStartDate(null);
    setEndDate(null);
  };

  const hasActiveFilters =
    !!search || status !== "ALL" || !!startDate || !!endDate;

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (search) c++;
    if (status !== "ALL") c++;
    if (startDate) c++;
    if (endDate) c++;
    return c;
  }, [search, status, startDate, endDate]);

  const openDetails = (item: ExpressTxn) => {
    setSelected(item);
    setDetailsOpen(true);
  };

  /* ---------------- Render item ---------------- */

  const renderItem = ({ item }: { item: ExpressTxn }) => {
    const statusColor = getStatusColor(item.status, colors);
    const modeIcon = getModeIcon(item.mode);

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
          style={[styles.iconWrap, { backgroundColor: statusColor + "20" }]}
        >
          <Ionicons name={modeIcon} size={18} color={statusColor} />
        </View>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.beneficiaryName ?? "Beneficiary"}
            </Text>
            {item.mode && (
              <View
                style={[
                  styles.modeTag,
                  { backgroundColor: colors.buttonPrimary + "18" },
                ]}
              >
                <Text
                  style={[styles.modeTagText, { color: colors.buttonPrimary }]}
                >
                  {item.mode}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.metaRow}>
            <Text
              style={[styles.metaText, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {item.txnId ?? item.id}
            </Text>
            {!!item.beneficiaryBankName && (
              <>
                <Text style={[styles.metaDot, { color: colors.textMuted }]}>
                  ·
                </Text>
                <Text
                  style={[styles.metaText, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {item.beneficiaryBankName}
                </Text>
              </>
            )}
          </View>
        </View>

        <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
          <Text style={[styles.amountText, { color: colors.text }]}>
            ₹{item.amount}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.miniDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.miniStatusText, { color: statusColor }]}>
              {item.status}
            </Text>
          </View>
          <Text
            style={[styles.dateText, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {formatDate(item.initiatedAt)}
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

  const showInitialLoader = loading && transactions.length === 0;

  /* ---------------- Render ---------------- */

  return (
    <LinearGradient
    colors={[colors.backgroundTop , colors.backgroundBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }} 
       style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderSection title="Express Transfer" />

         {/* ---------- ACTION BUTTON ---------- */}
        { role !== "WHITE_LABEL" ? 
         <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setLoginModalOpen(true)}
        style={[
          styles.actionBtn,
          {
            backgroundColor: colors.buttonPrimary,
            shadowColor: "#000",
          },
        ]}
      >
        <View style={styles.actionBtnIconWrap}>
          <Ionicons name="flash-outline" size={18} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.actionBtnTitle}>Express Transfer</Text>
          <Text style={styles.actionBtnSub}>
            Send money instantly via IMPS / NEFT / RTGS
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#FFF" />
         </TouchableOpacity>
        : null}   

      <View style={styles.headerBar}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Express Transfer
        </Text>
        <TouchableOpacity
          onPress={() => setShowFilters((v) => !v)}
          style={[
            styles.filterBtn,
            {
              borderColor: colors.border,
              backgroundColor: showFilters
                ? colors.buttonPrimary
                : colors.surfaceTertiary,
            },
          ]}
        >
          <Ionicons
            name="options-outline"
            size={16}
            color={showFilters ? "#FFF" : colors.text}
          />
          <Text
            style={[
              styles.filterBtnText,
              { color: showFilters ? "#FFF" : colors.text },
            ]}
          >
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Text>
        </TouchableOpacity>
      </View>


      {/* Search */}
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.surfaceTertiary,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by txn ID, beneficiary..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons
                name="close-circle"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter panel */}
      {showFilters && (
        <View
          style={[
            styles.filterPanel,
            {
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.filterLabel, { color: colors.textMuted }]}>
            Status
          </Text>
          <View style={styles.chipRow}>
            {STATUS_OPTIONS.map((s) => {
              const active = status === s.value;
              return (
                <TouchableOpacity
                  key={s.value}
                  onPress={() => setStatus(s.value)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active
                        ? colors.buttonPrimary
                        : colors.surfaceTertiary,
                      borderColor: active
                        ? colors.buttonPrimary
                        : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? "#FFF" : colors.text },
                    ]}
                  >
                    {s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text
            style={[
              styles.filterLabel,
              { color: colors.textMuted, marginTop: 12 },
            ]}
          >
            Date Range
          </Text>
          <View style={styles.dateRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowStartPicker(true)}
              style={[
                styles.dateBox,
                {
                  backgroundColor: colors.surfaceTertiary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={colors.textMuted}
              />
              <Text
                style={[
                  styles.dateBoxText,
                  { color: startDate ? colors.text : colors.textMuted },
                ]}
              >
                {startDate ? toISODate(startDate) : "Start date"}
              </Text>
              {startDate && (
                <TouchableOpacity onPress={() => setStartDate(null)}>
                  <Ionicons
                    name="close-circle"
                    size={14}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowEndPicker(true)}
              style={[
                styles.dateBox,
                {
                  backgroundColor: colors.surfaceTertiary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={colors.textMuted}
              />
              <Text
                style={[
                  styles.dateBoxText,
                  { color: endDate ? colors.text : colors.textMuted },
                ]}
              >
                {endDate ? toISODate(endDate) : "End date"}
              </Text>
              {endDate && (
                <TouchableOpacity onPress={() => setEndDate(null)}>
                  <Ionicons
                    name="close-circle"
                    size={14}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>

          {hasActiveFilters && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={clearFilters}
              style={styles.clearBtn}
            >
              <Ionicons
                name="refresh-outline"
                size={14}
                color={colors.error}
              />
              <Text style={[styles.clearText, { color: colors.error }]}>
                Clear filters
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Date pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={startDate ?? new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onValueChange={onStartChange}
          maximumDate={endDate ?? new Date()}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDate ?? new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onValueChange={onEndChange}
          minimumDate={startDate ?? undefined}
          maximumDate={new Date()}
        />
      )}

      {/* List */}
      {showInitialLoader ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.buttonPrimary} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
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
                name="swap-horizontal-outline"
                size={48}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {hasActiveFilters
                  ? "No matching transactions"
                  : "No express transfers yet"}
              </Text>
            </View>
          }
          removeClippedSubviews={false}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Details modal */}
      <ViewExpressTransferModal
        visible={detailsOpen}
        transaction={selected}
        onClose={() => {
          setDetailsOpen(false);
          setSelected(null);
        }}
      />

      {/* Login / Register modal */}
      <LoginModal
        visible={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={() => {
          setLoginModalOpen(false);
          onRefresh();
        }}
      />
    </LinearGradient>
  );
};

export default ExpressTransferScreen;

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
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterBtnText: { fontSize: 12, fontWeight: "700" },

  /* Action button (Express Transfer) */
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  actionBtnIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnTitle: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "800",
  },
  actionBtnSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },

  searchRow: { paddingHorizontal: 16, paddingBottom: 10 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    paddingVertical: 0,
  },

  filterPanel: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: "700" },

  dateRow: { flexDirection: "row", gap: 10 },
  dateBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  dateBoxText: { flex: 1, fontSize: 12.5, fontWeight: "600" },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 12,
    alignSelf: "flex-start",
  },
  clearText: { fontSize: 12, fontWeight: "700" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyText: { fontSize: 13.5, fontWeight: "600" },

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
  modeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modeTagText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },
  metaText: { fontSize: 10.5, fontWeight: "500", flexShrink: 1 },
  metaDot: { fontSize: 12, fontWeight: "700" },

  amountText: { fontSize: 14, fontWeight: "800" },
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