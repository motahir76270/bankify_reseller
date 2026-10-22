import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useDispatch, useSelector } from "react-redux";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { getWalletHistoryDataApiCall } from "@/redux/slices/walletSlice";
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
import ViewWalletToWalletHostioryModal from "@/components/modal/wallet/ViewWalletToWalletHostioryModal";
import { LinearGradient } from "expo-linear-gradient";

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
  referenceId?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
  initiatedAt?: string;
  meta?: string | Record<string, any>;
  [key: string]: any;
};

type ModeFilter = "ALL" | "CREDIT" | "DEBIT" | "BLOCK" | "RELEASE";
type StatusFilter =
  | "ALL"
  | "PENDING"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED";

/* --------------------------- Constants --------------------------- */

const PAGE_SIZE = 20;

const MODE_OPTIONS: { label: string; value: ModeFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Credit", value: "CREDIT" },
  { label: "Debit", value: "DEBIT" },
  { label: "Block", value: "BLOCK" },
  { label: "Release", value: "RELEASE" },
];

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Success", value: "SUCCESS" },
  { label: "Failed", value: "FAILED" },
];

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

const extractWalletTx = (raw: any): WalletTx[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.transactions)) return raw.transactions;
  if (Array.isArray(raw.walletHistory)) return raw.walletHistory;
  if (Array.isArray(raw.history)) return raw.history;
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
      return "arrow-down-circle-outline";
    case "DEBIT":
      return "arrow-up-circle-outline";
    case "BLOCK":
      return "lock-closed-outline";
    case "RELEASE":
      return "lock-open-outline";
    default:
      return "swap-horizontal-outline";
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

/* --------------------------- Screen ------------------------------ */

const WalletScreen = () => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const { walletHistoryData, loading } = useSelector(
    (state: any) => state?.wallet,
  );  
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Search
  const [search, setSearch] = useState("");

  // Filters
  const [mode, setMode] = useState<ModeFilter>("ALL");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Details modal
  const [selectedTx, setSelectedTx] = useState<WalletTx | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Pagination refs
  const isFetchingRef = useRef(false);
  const currentPageRef = useRef(1);
  const appendedPagesRef = useRef<Set<number>>(new Set([1]));
  const [hasMore, setHasMore] = useState(true);

  /* ---------------- Build parsed payload ---------------- */

  const buildPayload = useCallback(
    (pageToFetch: number) => {
      const payload: Record<string, any> = {
        page: pageToFetch,
        limit: PAGE_SIZE,
        mode: mode || "ALL",
        status: status || "ALL",
      };

      const trimmedSearch = search.trim();
      if (trimmedSearch) payload.search = trimmedSearch;

      if (startDate) payload.startDate = toISODate(startDate);
      if (endDate) payload.endDate = toISODate(endDate);

      return payload;
    },
    [mode, status, startDate, endDate, search],
  );

  /* -------- Fetch first page on filter/search change -------- */

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
        await getWalletHistoryDataApiCall(buildPayload(1), dispatch);
      } finally {
        isFetchingRef.current = false;
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [mode, status, startDate, endDate, search, buildPayload, dispatch]);

  /* -------- Sync redux → local list -------- */

  useEffect(() => {
    const incoming = extractWalletTx(walletHistoryData);
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
  }, [walletHistoryData]);

  /* -------- Load more -------- */

  const loadMore = useCallback(async () => {
    if (
      !hasMore ||
      loading ||
      loadingMore ||
      isFetchingRef.current ||
      transactions.length === 0
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
      await getWalletHistoryDataApiCall(buildPayload(nextPage), dispatch);
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
      await getWalletHistoryDataApiCall(buildPayload(1), dispatch);
    } finally {
      isFetchingRef.current = false;
      setRefreshing(false);
    }
  };

  /* -------- Date pickers -------- */

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
    setMode("ALL");
    setStatus("ALL");
    setStartDate(null);
    setEndDate(null);
  };

  const hasActiveFilters =
    !!search ||
    mode !== "ALL" ||
    status !== "ALL" ||
    !!startDate ||
    !!endDate;

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (search) c++;
    if (mode !== "ALL") c++;
    if (status !== "ALL") c++;
    if (startDate) c++;
    if (endDate) c++;
    return c;
  }, [search, mode, status, startDate, endDate]);

  const openDetails = (tx: WalletTx) => {
    setSelectedTx(tx);
    setDetailsOpen(true);
  };

  /* --------------------------- Render item (minimized) --------------------------- */

  const renderItem = ({ item }: { item: WalletTx }) => {
    const statusColor = getStatusColor(item.status, colors);
    const modeColor = getModeColor(item.mode, colors);
    const sign = getModeSign(item.mode);

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
        {/* Left icon */}
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: modeColor + "20" },
          ]}
        >
          <Ionicons
            name={getModeIcon(item.mode)}
            size={18}
            color={modeColor}
          />
        </View>

        {/* Middle */}
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.description ??
              item.remarks ??
              item.mode?.replace(/_/g, " ") ??
              "Transaction"}
          </Text>
          <View style={styles.metaRow}>
            <Text
              style={[styles.metaText, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {item.txnId ?? item.transactionId ?? item.id}
            </Text>
          </View>
        </View>

        {/* Right */}
        <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
          <Text style={[styles.amountText, { color: modeColor }]}>
            {sign}₹{item.amount}
          </Text>
          <View style={styles.statusRow}>
            <View
              style={[styles.miniDot, { backgroundColor: statusColor }]}
            />
            <Text
              style={[styles.miniStatusText, { color: statusColor }]}
            >
              {item.status}
            </Text>
          </View>
          <Text
            style={[styles.dateText, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {formatDate(
              item.createdAt ?? item.initiatedAt ?? item.updatedAt,
            )}
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

  /* --------------------------- Render --------------------------- */

  return (
    <LinearGradient 
      colors={[colors.backgroundTop , colors.backgroundBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}  style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <SafeAreaView style={styles.headerBar}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Wallet History
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
      </SafeAreaView>

      {/* Search */}
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by Txn ID, reference..."
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
              borderBottomColor: colors.border,
            },
          ]}
        >
          {/* Mode chips */}
          <Text style={[styles.filterLabel, { color: colors.textMuted }]}>
            Mode
          </Text>
          <View style={styles.chipRow}>
            {MODE_OPTIONS.map((s) => {
              const active = mode === s.value;
              return (
                <TouchableOpacity
                  key={s.value}
                  onPress={() => setMode(s.value)}
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

          {/* Status chips */}
          <Text
            style={[
              styles.filterLabel,
              { color: colors.textMuted, marginTop: 12 },
            ]}
          >
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

          {/* Date range */}
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
            padding: 4,
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
                name="wallet-outline"
                size={48}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {hasActiveFilters
                  ? "No matching transactions"
                  : "No wallet transactions yet"}
              </Text>
            </View>
          }
          removeClippedSubviews={false}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Details modal — controlled */}
      <ViewWalletToWalletHostioryModal
        visible={detailsOpen}
        transaction={selectedTx}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedTx(null);
        }}
      />
    </LinearGradient>
  );
};

export default WalletScreen;

/* --------------------------- Styles ------------------------------ */

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: -20,
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

  /* Search */
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

  /* Filter panel */
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

  /* List */
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyText: { fontSize: 13.5, fontWeight: "600" },

  /* Minimized card */
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 2,
    borderWidth: 0.5,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 0,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 13.5, fontWeight: "700" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  metaText: { fontSize: 10.5, fontWeight: "500", flexShrink: 1 },

  amountText: { fontSize: 14, fontWeight: "800" },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
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