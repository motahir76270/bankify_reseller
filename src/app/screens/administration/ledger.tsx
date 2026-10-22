import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HeaderSection from "@/components/ui/headerSections";
import { Colors } from "@/constants/theme";
import { getLedgerHistoryDataApiCall } from "@/redux/slices/historySlice";
import { LinearGradient } from "expo-linear-gradient";

type LedgerEntry = {
  id: string;
  tenantId?: string;
  walletId?: string;
  transactionId?: string | null;
  refundId?: string | null;
  apiEntityId?: string | null;
  reference?: string;
  entryType?: "CREDIT" | "DEBIT" | "BLOCK" | "UNBLOCK" | string;
  amount?: string;
  balanceAfter?: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
  transaction?: any;
  user?: any;
};

type LedgerMeta = {
  page?: string;
  limit?: string;
  total?: number;
  totalPages?: number;
  walletBalance?: number;
  walletBlocked?: number;
  summary?: {
    totalCredits?: number;
    totalDebits?: number;
    totalBlocks?: number;
    totalUnblocks?: number;
    netBalance?: number;
    netBlocked?: number;
  };
};

type EntryTypeFilter = "ALL" | "CREDIT" | "DEBIT" | "BLOCK" | "UNBLOCK";

const PAGE_SIZE = 10;

const formatDateTime = (iso?: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getDate()).padStart(2, "0")}`;
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
  return `${date} ${time}`;
};

const formatAmount = (val?: string | number) => {
  if (val === undefined || val === null || val === "") return "-";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return String(val);
  return n.toLocaleString("en-IN");
};

const LedgerScreen = () => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const { ledgerHistoryData, loading } = useSelector(
    (state: any) => state?.history,
  );

  // ✅ Stable reference for the raw API data
  const apiEntries = useMemo<LedgerEntry[]>(() => {
    if (Array.isArray(ledgerHistoryData?.data)) return ledgerHistoryData.data;
    if (Array.isArray(ledgerHistoryData)) return ledgerHistoryData;
    return [];
  }, [ledgerHistoryData]);

  const meta: LedgerMeta = useMemo(
    () => ledgerHistoryData?.meta ?? {},
    [ledgerHistoryData],
  );

  const [allEntries, setAllEntries] = useState<LedgerEntry[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [entryType, setEntryType] = useState<EntryTypeFilter>("ALL");

  // Race guards
  const isFetchingRef = useRef(false);
  const currentPageRef = useRef(1);
  const appendedPagesRef = useRef<Set<number>>(new Set([1]));

  // ✅ Only page, search, entryType in payload
  const buildPayload = useCallback(
    (pageToFetch: number) => ({
      page: pageToFetch,
      search: search,
      entryType: entryType, // "ALL" | "CREDIT" | "DEBIT" | "BLOCK" | "UNBLOCK"
    }),
    [search, entryType],
  );

  // First-page fetch whenever filters change (debounced)
  useEffect(() => {
    appendedPagesRef.current = new Set([1]);
    currentPageRef.current = 1;
    setPage(1);
    setHasMore(true);
    setLoadingMore(false);

    const timer = setTimeout(async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        setAllEntries([]);
        await getLedgerHistoryDataApiCall(buildPayload(1), dispatch);
      } finally {
        isFetchingRef.current = false;
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [search, entryType, buildPayload, dispatch]);

  // ✅ Signature-based sync — prevents infinite loop
  const responseSignature = `${currentPageRef.current}|${apiEntries.length}|${
    apiEntries[0]?.id ?? ""
  }|${apiEntries[apiEntries.length - 1]?.id ?? ""}`;

  useEffect(() => {
    const currentPage = currentPageRef.current;

    if (currentPage === 1) {
      // Dedupe page-1 (in case API returns duplicates)
      const seen = new Set<string>();
      const deduped = apiEntries.filter((e) => {
        if (!e.id) return true;
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });
      setAllEntries((prev) => {
        if (
          prev.length === deduped.length &&
          prev.every((p, i) => p.id === deduped[i]?.id)
        ) {
          return prev;
        }
        return deduped;
      });
      setHasMore(apiEntries.length >= PAGE_SIZE);
    } else {
      setAllEntries((prev) => {
        const existingIds = new Set(prev.map((e) => e.id));
        const fresh = apiEntries.filter(
          (e) => e.id && !existingIds.has(e.id),
        );
        if (fresh.length === 0) return prev;
        return [...prev, ...fresh];
      });
      setHasMore(apiEntries.length >= PAGE_SIZE);
    }
    setLoadingMore(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responseSignature]);

  // Load more on scroll
  const loadMore = useCallback(async () => {
    if (
      !hasMore ||
      loading ||
      loadingMore ||
      isFetchingRef.current ||
      allEntries.length === 0
    ) {
      return;
    }

    const nextPage = currentPageRef.current + 1;
    if (appendedPagesRef.current.has(nextPage)) return;

    appendedPagesRef.current.add(nextPage);
    currentPageRef.current = nextPage;
    setPage(nextPage);
    setLoadingMore(true);

    isFetchingRef.current = true;
    try {
      await getLedgerHistoryDataApiCall(buildPayload(nextPage), dispatch);
    } finally {
      isFetchingRef.current = false;
    }
  }, [
    hasMore,
    loading,
    loadingMore,
    allEntries.length,
    buildPayload,
    dispatch,
  ]);

  const entryTypeFilters: EntryTypeFilter[] = [
    "ALL",
    "CREDIT",
    "DEBIT",
    "BLOCK",
    "UNBLOCK",
  ];

  const hasActiveFilters = !!search || entryType !== "ALL";

  const getEntryStyle = (type?: string) => {
    switch ((type ?? "").toUpperCase()) {
      case "CREDIT":
        return { color: colors.success, bg: "rgba(16,185,129,0.15)", sign: "+" };
      case "DEBIT":
        return { color: colors.error, bg: "rgba(239,68,68,0.15)", sign: "-" };
      case "BLOCK":
        return {
          color: "#F59E0B",
          bg: "rgba(245,158,11,0.15)",
          sign: "🔒",
        };
      case "UNBLOCK":
        return {
          color: "#3B82F6",
          bg: "rgba(59,130,246,0.15)",
          sign: "🔓",
        };
      default:
        return {
          color: colors.textMuted,
          bg: "rgba(148,163,184,0.15)",
          sign: "",
        };
    }
  };

  const renderEntry = ({ item }: { item: LedgerEntry }) => {
    const style = getEntryStyle(item.entryType);

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.cardTop}>
          <View
            style={[styles.iconWrap, { backgroundColor: style.bg }]}
          >
            <Ionicons
              name={
                item.entryType === "CREDIT"
                  ? "arrow-down-outline"
                  : item.entryType === "DEBIT"
                    ? "arrow-up-outline"
                    : item.entryType === "BLOCK"
                      ? "lock-closed-outline"
                      : item.entryType === "UNBLOCK"
                        ? "lock-open-outline"
                        : "swap-horizontal-outline"
              }
              size={18}
              color={style.color}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={[styles.entryType, { color: style.color }]}
              numberOfLines={1}
            >
              {(item.entryType ?? "UNKNOWN").toUpperCase()}
            </Text>
            <Text
              style={[styles.reference, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {item.reference ?? "-"}
            </Text>
          </View>

          <Text style={[styles.amount, { color: style.color }]}>
            {style.sign}
            {formatAmount(item.amount)}
          </Text>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
              Balance After
            </Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>
              {formatAmount(item.balanceAfter)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
              Time
            </Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>
              {formatDateTime(item.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderSummary = () => {
    if (!meta?.summary) return null;
    const s = meta.summary;
    return (
      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.summaryTop}>
          <View>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              Wallet Balance
            </Text>
            <Text style={[styles.summaryBalance, { color: colors.text }]}>
              {formatAmount(meta.walletBalance ?? 0)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              Blocked
            </Text>
            <Text
              style={[styles.summaryBalance, { color: "#F59E0B" }]}
            >
              {formatAmount(meta.walletBlocked ?? 0)}
            </Text>
          </View>
        </View>

        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summarySmallLabel, { color: colors.textMuted }]}>
              Credits
            </Text>
            <Text style={[styles.summarySmallValue, { color: colors.success }]}>
              {formatAmount(s.totalCredits ?? 0)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summarySmallLabel, { color: colors.textMuted }]}>
              Debits
            </Text>
            <Text style={[styles.summarySmallValue, { color: colors.error }]}>
              {formatAmount(s.totalDebits ?? 0)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summarySmallLabel, { color: colors.textMuted }]}>
              Blocks
            </Text>
            <Text style={[styles.summarySmallValue, { color: "#F59E0B" }]}>
              {formatAmount(s.totalBlocks ?? 0)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summarySmallLabel, { color: colors.textMuted }]}>
              Unblocks
            </Text>
            <Text style={[styles.summarySmallValue, { color: "#3B82F6" }]}>
              {formatAmount(s.totalUnblocks ?? 0)}
            </Text>
          </View>
        </View>
      </View>
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

  const showInitialLoader = loading && allEntries.length === 0;

  return (
    <LinearGradient
    colors={[colors.backgroundTop , colors.backgroundBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }} 
       style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderSection title="Ledger History" />

      {/* Filter Bar — search + entry type chips */}
      <View
        style={[
          styles.filterBar,
          {
            borderBottomColor: colors.border,
          },
        ]}
      >
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
            placeholder="Search ledger..."
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

        <View style={styles.chipRow}>
          {entryTypeFilters.map((t) => {
            const active = entryType === t;
            return (
              <TouchableOpacity
                key={t}
                activeOpacity={0.7}
                onPress={() => setEntryType(t)}
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
                    { color: active ? "#FFFFFF" : colors.text },
                  ]}
                >
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {showInitialLoader ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.buttonPrimary} />
        </View>
      ) : (
        <FlatList
          data={allEntries}
          keyExtractor={(item, idx) => `${item.id ?? "entry"}-${idx}`}
          renderItem={renderEntry}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 40,
            gap: 12,
          }}
          ListHeaderComponent={renderSummary}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons
                name="receipt-outline"
                size={40}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {hasActiveFilters
                  ? "No matching ledger entries"
                  : "No ledger history yet"}
              </Text>
            </View>
          }
          ListFooterComponent={renderFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}
        />
      )}
    </LinearGradient>
  );
};

export default LedgerScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 8,
  },
  emptyText: { fontSize: 13, fontWeight: "500" },

  filterBar: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
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
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: "700" },

  // Summary card
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 4,
  },
  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  summaryBalance: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 4,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 14,
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryItem: { flex: 1 },
  summarySmallLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  summarySmallValue: {
    fontSize: 13.5,
    fontWeight: "800",
    marginTop: 4,
  },

  // Ledger entry card
  card: { borderRadius: 14, borderWidth: 1, padding: 14 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  entryType: { fontSize: 13, fontWeight: "800", letterSpacing: 0.4 },
  reference: { fontSize: 11.5, marginTop: 2, fontWeight: "500" },
  amount: { fontSize: 16, fontWeight: "800" },

  metaGrid: { flexDirection: "row", marginTop: 12, gap: 20 },
  metaItem: { flex: 1 },
  metaLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  metaValue: { fontSize: 13, fontWeight: "700", marginTop: 2 },

  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  footerText: { fontSize: 12, fontWeight: "500" },
});