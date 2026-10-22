import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
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
import { getMiniSateListDataApiCall } from "@/redux/slices/payoutSlice";
import { getServiceMapingIdDataApiCall } from "@/redux/slices/serviceSlice";
import ViewMiniStateModal from "@/components/modal/payout/ViewMiniStateModal";
import { LinearGradient } from "expo-linear-gradient";

/* ----------------------------- Types ----------------------------- */

type Money = { value: number; currency: string };
type Balance = { amount: number; currency: string };

type Account = {
  accountNumber?: string;
  branchId?: string;
  currency?: string;
  availableBalance?: Balance;
  ledgerBalance?: Balance;
  floatingBalance?: Balance;
  ffdBalance?: Balance;
  userDefinedBalance?: Balance;
};

type MiniTxn = {
  transactionId: string;
  serialNumber?: string;
  postedDate?: string;
  valueDate?: string;
  transactionDate?: string;
  type?: string;
  amount?: Money;
  description?: string;
  balance?: Money;
  category?: string;
  instrumentId?: string;
  additionalData?: any;
};

type TranTypeFilter = "ALL" | "C" | "D";

/* --------------------------- Constants --------------------------- */

const PAGE_SIZE = 20;

const TRAN_TYPE_OPTIONS: { label: string; value: TranTypeFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Credit", value: "C" },
  { label: "Debit", value: "D" },
];

/* --------------------------- Safe extractors --------------------- */

const extractTransactions = (raw: any): MiniTxn[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.transactions)) return raw.transactions;
  if (Array.isArray(raw.data?.transactions)) return raw.data.transactions;
  if (Array.isArray(raw.data)) return raw.data;
  return [];
};

const extractAccount = (raw: any): Account | null => {
  if (!raw || Array.isArray(raw)) return null;
  return raw.account ?? raw.data?.account ?? null;
};

/** Pull mappings out of any wrapper shape. */
const extractMappings = (raw: any): any[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.mappings)) return raw.mappings;
  if (Array.isArray(raw.serviceMapList)) return raw.serviceMapList;
  if (Array.isArray(raw.serviceMappings)) return raw.serviceMappings;
  if (Array.isArray(raw.data?.mappings)) return raw.data.mappings;
  if (Array.isArray(raw.data)) return raw.data;
  return [];
};

/** Find the PAYOUT mapping id. */
const extractPayoutMappingId = (raw: any): string => {
  const list = extractMappings(raw);
  if (!list.length) return "";
  const payout = list.find(
    (m) => (m.serviceCode ?? "").toUpperCase() === "PAYOUT",
  );
  return payout?.id ?? list[0]?.id ?? "";
};

/* --------------------------- Helpers ----------------------------- */

const formatOnlyDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatCurrency = (n?: number, currency = "INR") => {
  if (n === undefined || n === null || isNaN(n)) return "—";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n}`;
  }
};

const getTypeColor = (type: string | undefined, colors: any) => {
  switch ((type ?? "").toUpperCase()) {
    case "C":
      return colors.success ?? "#10B981";
    case "D":
      return colors.error ?? "#EF4444";
    default:
      return colors.textMuted;
  }
};

const getTypeIcon = (type: string | undefined): any => {
  switch ((type ?? "").toUpperCase()) {
    case "C":
      return "arrow-down-circle-outline";
    case "D":
      return "arrow-up-circle-outline";
    default:
      return "swap-horizontal-outline";
  }
};

/* --------------------------- Screen ------------------------------ */

const MiniStateScreen = () => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const payoutState = useSelector((state: any) => state?.payout);
  const servicesState = useSelector((state: any) => state?.services);
  const commissionState = useSelector((state: any) => state?.commission);

  const ministateListData = payoutState?.ministateListData;
  const loading = payoutState?.loading ?? payoutState?.laoding ?? false;

  // Try every plausible slice path for the mappings response
  const serviceMapRaw =
    servicesState?.serviceMapingId ??
    servicesState?.mappings ??
    servicesState?.serviceMapList ??
    commissionState?.serviceMapList ??
    commissionState?.serviceMappings ??
    payoutState?.serviceMapingId ??
    payoutState?.mappings ??
    null;

  const payoutMappingId = useMemo(
    () => extractPayoutMappingId(serviceMapRaw),
    [serviceMapRaw],
  );

  const [transactions, setTransactions] = useState<MiniTxn[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Applied filters — drive the API call
  const [appliedTranType, setAppliedTranType] = useState<TranTypeFilter>("ALL");
  const [appliedFromDate, setAppliedFromDate] = useState<Date | null>(null);
  const [appliedToDate, setAppliedToDate] = useState<Date | null>(null);

  // Draft filters — edited in the panel
  const [tranType, setTranType] = useState<TranTypeFilter>("ALL");
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Details modal
  const [selected, setSelected] = useState<MiniTxn | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Pagination refs
  const isFetchingRef = useRef(false);
  const currentPageRef = useRef(1);
  const appendedPagesRef = useRef<Set<number>>(new Set([1]));
  const [hasMore, setHasMore] = useState(true);

  // Guard against double-fetch on first mount
  const hasMountedRef = useRef(false);

  /* ---------------- Build payload ---------------- */

  const buildPayload = useCallback(
    (pageToFetch: number) => {
      const payload: Record<string, any> = {
        page: pageToFetch,
        limit: PAGE_SIZE,
        tranType: appliedTranType === "ALL" ? "B" : appliedTranType,
        serviceProviderMappingId: payoutMappingId,
      };
      if (appliedFromDate) payload.fromDate = toISODate(appliedFromDate);
      if (appliedToDate) payload.toDate = toISODate(appliedToDate);
      return payload;
    },
    [appliedTranType, appliedFromDate, appliedToDate, payoutMappingId],
  );

  /* ---------------- Fetch the service mapping (once on mount) --------- */

  useEffect(() => {
    if (!payoutMappingId) {
      getServiceMapingIdDataApiCall(dispatch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- Fetch the mini statement (once + on Apply) --------- */

  useEffect(() => {
    // Wait for the mapping id before calling
    if (!payoutMappingId) return;

    appendedPagesRef.current = new Set([1]);
    currentPageRef.current = 1;
    setHasMore(true);
    setLoadingMore(false);

    const timer = setTimeout(async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        setTransactions([]);
        await getMiniSateListDataApiCall(buildPayload(1), dispatch);
      } finally {
        isFetchingRef.current = false;
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [
    appliedTranType,
    appliedFromDate,
    appliedToDate,
    payoutMappingId,
    buildPayload,
    dispatch,
  ]);

  /* ---------------- Sync Redux → local ---------------- */

  useEffect(() => {
    const incoming = extractTransactions(ministateListData);
    const incomingAccount = extractAccount(ministateListData);
    const currentPage = currentPageRef.current;

    if (currentPage === 1) {
      setTransactions(incoming);
      setAccount(incomingAccount);
    } else {
      setTransactions((prev) => {
        const seen = new Set(
          prev.map((t) => `${t.transactionId}-${t.serialNumber ?? ""}`),
        );
        const fresh = incoming.filter(
          (t) => !seen.has(`${t.transactionId}-${t.serialNumber ?? ""}`),
        );
        return [...prev, ...fresh];
      });
      if (!account && incomingAccount) setAccount(incomingAccount);
    }

    const pg = ministateListData?.pagination;
    const more =
      typeof pg?.hasMore === "boolean"
        ? pg.hasMore
        : incoming.length >= PAGE_SIZE;
    setHasMore(more);
    setLoadingMore(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ministateListData]);

  /* ---------------- Load more ---------------- */

  const loadMore = useCallback(async () => {
    if (
      !hasMore ||
      loading ||
      loadingMore ||
      isFetchingRef.current ||
      transactions.length === 0 ||
      !payoutMappingId
    )
      return;

    const nextPage = currentPageRef.current + 1;
    if (appendedPagesRef.current.has(nextPage)) return;

    appendedPagesRef.current.add(nextPage);
    currentPageRef.current = nextPage;
    setLoadingMore(true);
    isFetchingRef.current = true;

    try {
      await getMiniSateListDataApiCall(buildPayload(nextPage), dispatch);
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
    payoutMappingId,
  ]);

  const onRefresh = async () => {
    if (!payoutMappingId) return;
    setRefreshing(true);
    appendedPagesRef.current = new Set([1]);
    currentPageRef.current = 1;
    setHasMore(true);
    isFetchingRef.current = true;
    try {
      await getMiniSateListDataApiCall(buildPayload(1), dispatch);
    } finally {
      isFetchingRef.current = false;
      setRefreshing(false);
    }
  };

  /* ---------------- Date pickers ---------------- */

  const onFromChange = (event: any, date?: Date) => {
    if (Platform.OS !== "ios") setShowFromPicker(false);
    if (event?.type === "dismissed") {
      setShowFromPicker(false);
      return;
    }
    if (date) {
      setFromDate(date);
      if (Platform.OS === "ios") setShowFromPicker(false);
    }
  };

  const onToChange = (event: any, date?: Date) => {
    if (Platform.OS !== "ios") setShowToPicker(false);
    if (event?.type === "dismissed") {
      setShowToPicker(false);
      return;
    }
    if (date) {
      setToDate(date);
      if (Platform.OS === "ios") setShowToPicker(false);
    }
  };

  /* ---------------- Apply / Clear ---------------- */

  // 🎯 The ONLY place that fires the API from the filter panel
  const applyFilters = () => {
    setAppliedTranType(tranType);
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setTranType("ALL");
    setFromDate(null);
    setToDate(null);
    // Also reset applied → triggers a clean fetch
    setAppliedTranType("ALL");
    setAppliedFromDate(null);
    setAppliedToDate(null);
  };

  const hasActiveFilters =
    appliedTranType !== "ALL" || !!appliedFromDate || !!appliedToDate;

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (appliedTranType !== "ALL") c++;
    if (appliedFromDate) c++;
    if (appliedToDate) c++;
    return c;
  }, [appliedTranType, appliedFromDate, appliedToDate]);

  // Seed drafts from applied values when opening the panel
  const toggleFilters = () => {
    if (!showFilters) {
      setTranType(appliedTranType);
      setFromDate(appliedFromDate);
      setToDate(appliedToDate);
    }
    setShowFilters((v) => !v);
  };

  const openDetails = (item: MiniTxn) => {
    setSelected(item);
    setDetailsOpen(true);
  };

  /* ---------------- Render item ---------------- */

  const renderItem = ({ item }: { item: MiniTxn }) => {
    const typeColor = getTypeColor(item.type, colors);
    const typeIcon = getTypeIcon(item.type);
    const isCredit = (item.type ?? "").toUpperCase() === "C";
    const amountValue = item.amount?.value ?? 0;
    const sign = isCredit ? "+" : "-";

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
          style={[styles.iconWrap, { backgroundColor: typeColor + "20" }]}
        >
          <Ionicons name={typeIcon} size={18} color={typeColor} />
        </View>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={2}
          >
            {item.description ?? "Transaction"}
          </Text>
          <View style={styles.metaRow}>
            <Text
              style={[styles.metaText, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {item.transactionId}
            </Text>
            <Text style={[styles.metaDot, { color: colors.textMuted }]}>·</Text>
            <Text
              style={[styles.metaText, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {formatOnlyDate(item.postedDate ?? item.transactionDate)}
            </Text>
          </View>
        </View>

        <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
          <Text style={[styles.amountText, { color: typeColor }]}>
            {sign}
            {formatCurrency(amountValue, item.amount?.currency ?? "INR")}
          </Text>
          {item.balance && (
            <Text
              style={[styles.balanceText, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              Bal {formatCurrency(item.balance.value, item.balance.currency)}
            </Text>
          )}
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

  /* ---------------- Header (account card) ---------------- */

  const ListHeader = () => {
    if (!account) return null;
    return (
      <View
        style={[
          styles.accountCard,
          {
            backgroundColor: colors.buttonPrimary,
            shadowColor: "#000",
          },
        ]}
      >
        <View style={styles.accountTop}>
          <View>
            <Text style={styles.accountLabel}>Available Balance</Text>
            <Text style={styles.accountBalance}>
              {formatCurrency(
                account.availableBalance?.amount,
                account.availableBalance?.currency ?? "INR",
              )}
            </Text>
          </View>
          <View style={styles.accountIconWrap}>
            <Ionicons name="wallet-outline" size={20} color="#FFF" />
          </View>
        </View>

        <View style={styles.accountNumberRow}>
          <Text style={styles.accountNumberLabel}>A/C</Text>
          <Text style={styles.accountNumber}>
            {account.accountNumber
              ? `•••• ${account.accountNumber.slice(-4)}`
              : "—"}
          </Text>
          <View style={styles.branchPill}>
            <Text style={styles.branchText}>{account.branchId ?? "—"}</Text>
          </View>
        </View>

        <View style={styles.accountStats}>
          <View style={styles.accountStatItem}>
            <Text style={styles.accountStatLabel}>Ledger</Text>
            <Text style={styles.accountStatValue}>
              {formatCurrency(
                account.ledgerBalance?.amount,
                account.ledgerBalance?.currency ?? "INR",
              )}
            </Text>
          </View>
          <View style={styles.accountStatDivider} />
          <View style={styles.accountStatItem}>
            <Text style={styles.accountStatLabel}>Floating</Text>
            <Text style={styles.accountStatValue}>
              {formatCurrency(
                account.floatingBalance?.amount,
                account.floatingBalance?.currency ?? "INR",
              )}
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
      <HeaderSection title="Mini Statement" />

      <View style={styles.headerBar}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Mini Statement
        </Text>
        <TouchableOpacity
          onPress={toggleFilters}
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
          <Text style={[styles.filterLabel, { color: colors.textMuted }]}>
            Transaction Type
          </Text>
          <View style={styles.chipRow}>
            {TRAN_TYPE_OPTIONS.map((s) => {
              const active = tranType === s.value;
              return (
                <TouchableOpacity
                  key={s.value}
                  onPress={() => setTranType(s.value)}
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
              onPress={() => setShowFromPicker(true)}
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
                  { color: fromDate ? colors.text : colors.textMuted },
                ]}
              >
                {fromDate ? toISODate(fromDate) : "From date"}
              </Text>
              {fromDate && (
                <TouchableOpacity onPress={() => setFromDate(null)}>
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
              onPress={() => setShowToPicker(true)}
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
                  { color: toDate ? colors.text : colors.textMuted },
                ]}
              >
                {toDate ? toISODate(toDate) : "To date"}
              </Text>
              {toDate && (
                <TouchableOpacity onPress={() => setToDate(null)}>
                  <Ionicons
                    name="close-circle"
                    size={14}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.filterActions}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={clearFilters}
              style={[styles.resetBtn, { backgroundColor:colors.background,borderColor: colors.border }]}
            >
              <Ionicons
                name="refresh-outline"
                size={14}
                color={colors.error}
              />
              <Text style={[styles.resetText, { color: colors.error }]}>
                Clear
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={applyFilters}
              style={[
                styles.applyBtn,
                { backgroundColor: colors.buttonPrimary },
              ]}
            >
              <Ionicons name="checkmark-outline" size={16} color="#FFF" />
              <Text style={styles.applyText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Date pickers */}
      {showFromPicker && (
        <DateTimePicker
          value={fromDate ?? new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onValueChange={onFromChange}
          maximumDate={toDate ?? new Date()}
        />
      )}
      {showToPicker && (
        <DateTimePicker
          value={toDate ?? new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onValueChange={onToChange}
          minimumDate={fromDate ?? undefined}
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
          keyExtractor={(item, idx) =>
            `${item.transactionId}-${item.serialNumber ?? idx}`
          }
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
                name="receipt-outline"
                size={48}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {hasActiveFilters
                  ? "No matching transactions"
                  : "No transactions found"}
              </Text>
            </View>
          }
          removeClippedSubviews={false}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Details modal */}
      <ViewMiniStateModal
        visible={detailsOpen}
        transaction={selected}
        onClose={() => {
          setDetailsOpen(false);
          setSelected(null);
        }}
      />
    </LinearGradient>
  );
};

export default MiniStateScreen;

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

  filterPanel: {
    paddingHorizontal: 16,
    paddingBottom: 14,
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

  filterActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  resetBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  resetText: { fontSize: 13, fontWeight: "700" },
  applyBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 12,
  },
  applyText: { color: "#FFF", fontSize: 13, fontWeight: "800" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyText: { fontSize: 13.5, fontWeight: "600" },

  accountCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  accountTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accountLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  accountBalance: {
    color: "#FFF",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 4,
  },
  accountIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  accountNumberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  accountNumberLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  accountNumber: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
  },
  branchPill: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  branchText: { color: "#FFF", fontSize: 10, fontWeight: "800" },

  accountStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.25)",
  },
  accountStatItem: { flex: 1 },
  accountStatLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  accountStatValue: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  accountStatDivider: {
    width: StyleSheet.hairlineWidth,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginHorizontal: 14,
  },

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
  title: { fontSize: 12.5, fontWeight: "700" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },
  metaText: { fontSize: 10.5, fontWeight: "500", flexShrink: 1 },
  metaDot: { fontSize: 12, fontWeight: "700" },

  amountText: { fontSize: 13.5, fontWeight: "800" },
  balanceText: { fontSize: 10, fontWeight: "500", marginTop: 3 },

  footerText: { fontSize: 11, fontWeight: "600" },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
});