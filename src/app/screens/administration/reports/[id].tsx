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
import { useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import HeaderSection from "@/components/ui/headerSections";
import { FullScreenLoader } from "@/hooks/use-screensLoder";
import { getReportHistoryDataApiCall } from "@/redux/slices/historySlice";
import { LinearGradient } from "expo-linear-gradient";

/* ================================================================
   TYPES
   ================================================================ */
type TxnStatus = "SUCCESS" | "FAILED" | "PENDING" | "PROCESSING" | "REFUNDED";
type LedgerEntryType = "CREDIT" | "DEBIT" | "BLOCK" | "UNBLOCK" | "REFUND";

type TransactionItem = {
  id: string;
  txnId: string;
  amount: number;
  netAmount: number;
  status: TxnStatus;
  serviceType: string;
  pricing: string;
  providerResponse?: string;
  initiatedAt: string;
  completedAt: string | null;
  serviceData?: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    mobileNumber: string;
  };
  role?: { roleName: string; roleCode: string };
  service?: { serviceName: string; serviceCode: string };
  provider?: { serviceName: string; serviceCode: string };
};

type LedgerItem = {
  id: string;
  reference: string;
  entryType: LedgerEntryType;
  amount: string;
  balanceAfter: string;
  createdAt: string;
  transaction: {
    txnId: string;
    amount: string;
    status: TxnStatus;
    serviceType: string;
    userId: string;
  } | null;
  user: {
    firstName: string;
    lastName: string;
    mobileNumber: string;
  } | null;
};

type EarningsItem = {
  id: string;
  txnId: string;
  amount: number;
  commission: number;
  surcharge: number;
  tds: number;
  gst: number;
  netAmount: number;
  status: TxnStatus;
  serviceType: string;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
    mobileNumber: string;
  };
};

type ReportType = "transactions" | "ledger" | "transactions/earnings" | "refunds";

/* ================================================================
   CONFIG
   ================================================================ */
const STATUS_META: Record<
  TxnStatus,
  { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  SUCCESS: { color: "#10B981", bg: "#10B98120", icon: "checkmark-circle" },
  FAILED: { color: "#EF4444", bg: "#EF444420", icon: "close-circle" },
  PENDING: { color: "#F59E0B", bg: "#F59E0B20", icon: "time" },
  PROCESSING: { color: "#3B82F6", bg: "#3B82F620", icon: "sync" },
  REFUNDED: { color: "#8B5CF6", bg: "#8B5CF620", icon: "refresh-circle" },
};

const LEDGER_META: Record<
  LedgerEntryType,
  { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; prefix: string }
> = {
  CREDIT: { color: "#10B981", bg: "#10B98120", icon: "arrow-down-circle", prefix: "+" },
  DEBIT: { color: "#EF4444", bg: "#EF444420", icon: "arrow-up-circle", prefix: "-" },
  BLOCK: { color: "#F59E0B", bg: "#F59E0B20", icon: "lock-closed", prefix: "-" },
  UNBLOCK: { color: "#3B82F6", bg: "#3B82F620", icon: "lock-open", prefix: "+" },
  REFUND: { color: "#8B5CF6", bg: "#8B5CF620", icon: "refresh-circle", prefix: "+" },
};

const TYPE_LABELS: Record<ReportType, string> = {
  transactions: "Transactions",
  ledger: "Ledger",
  "transactions/earnings": "Earnings",
  refunds: "Refunds",
};

/* ================================================================
   HELPERS
   ================================================================ */
const formatCurrency = (v: number | string = 0) =>
  `₹${Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/* ================================================================
   SCREEN
   ================================================================ */
const DynamicReportScreen = () => {
  const params:any = useLocalSearchParams<{ type?: any }>();
  const rawType = (params?.id ?? "transactions") as string;
  
  const type = rawType === "refunds"? "transactions": rawType === "earnings" ? "transactions/earnings" : rawType;

  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const { reportHistoryData, loading } = useSelector(
    (state: any) => state?.history,
  );

  const cardBg = colors.card;
  const mutedBg = isDark ? "#1A1D2A" : "#F8FAFC";
  const borderColor = colors.border;
  const brandPrimary = isDark ? "#7C6BFF" : "#4F46E5";

  /* ---------------- Filter state ---------------- */
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  /* ---------------- Debounce search ---------------- */
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  /* ---------------- Fetch ---------------- */
  const fetchData = useCallback(async () => {
    const payload = {
      page: 1,
      search: debouncedSearch,
      fromdate: "",
      todate: "",
    };
    // ⚠️ adjust to your thunk signature
    await getReportHistoryDataApiCall(type, payload, dispatch);
  }, [dispatch, type, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  /* ---------------- Extract list from API ---------------- */
  const list = useMemo<any[]>(() => {
    if (!reportHistoryData) return [];
    // API returns { transactions: [...] } | { earnings: [...] } | { ledger: [...] } | { refunds: [...] }
    const key =
      type === "transactions/earnings"
        ? "earnings"
        : type === "transactions"
        ? "transactions"
        : type; // "ledger" | "refunds"
    const arr = reportHistoryData?.[key];
    return Array.isArray(arr) ? arr : [];
  }, [reportHistoryData, type]);

  /* ---------------- Filter by search ---------------- */
  const filteredList = useMemo(() => {
    if (!debouncedSearch) return list;
    const q = debouncedSearch.toLowerCase();
    return list.filter((it) => {
      const hay = [
        it?.txnId,
        it?.reference,
        it?.user?.firstName,
        it?.user?.lastName,
        it?.user?.mobileNumber,
        it?.serviceType,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [list, debouncedSearch]);

  /* ================================================================
     RENDERERS PER TYPE
     ================================================================ */

  /* -------- Transaction card (also used for refunds) -------- */
  const renderTransaction = (item: TransactionItem) => {
    const meta = STATUS_META[item.status] ?? STATUS_META.PENDING;

    // Parse pricing JSON safely
    let pricing: any = {};
    try {
      pricing = item.pricing ? JSON.parse(item.pricing) : {};
    } catch {}

    // Parse failure reason
    let failureReason = "";
    try {
      const pr = item.providerResponse
        ? JSON.parse(item.providerResponse)
        : null;
      failureReason = pr?.failureReason ?? "";
    } catch {}

    // Extract account number from serviceData
    let accountNumber = "";
    try {
      const sd = item.serviceData ? JSON.parse(item.serviceData) : null;
      accountNumber = sd?.accountNumber ?? "";
    } catch {}

    return (
      <View
        style={[styles.card, { backgroundColor: cardBg, borderColor }]}
      >
        {/* Top row */}
        <View style={styles.cardTop}>
          <View
            style={[
              styles.statusIcon,
              { backgroundColor: meta.bg },
            ]}
          >
            <Ionicons name={meta.icon} size={18} color={meta.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.txnId, { color: colors.text }]} numberOfLines={1}>
              {item.txnId}
            </Text>
            <Text style={[styles.serviceText, { color: colors.textSecondary }]}>
              {item.service?.serviceName ?? item.serviceType}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
            <Text style={[styles.statusText, { color: meta.color }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: borderColor }]} />

        {/* Amount row */}
        <View style={styles.amountRow}>
          <View>
            <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
              AMOUNT
            </Text>
            <Text style={[styles.amountValue, { color: colors.text }]}>
              {formatCurrency(item.amount)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
              NET
            </Text>
            <Text style={[styles.amountValue, { color: brandPrimary }]}>
              {formatCurrency(item.netAmount)}
            </Text>
          </View>
        </View>

        {/* User row */}
        {item.user && (
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {item.user.firstName} {item.user.lastName} · {item.user.mobileNumber}
            </Text>
          </View>
        )}

        {/* Account (for bank verification) */}
        {!!accountNumber && (
          <View style={styles.metaRow}>
            <Ionicons name="card-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              A/C: {accountNumber}
            </Text>
          </View>
        )}

        {/* Failure reason */}
        {!!failureReason && (
          <View
            style={[
              styles.failBox,
              { backgroundColor: "#EF444410", borderColor: "#EF444440" },
            ]}
          >
            <Ionicons name="alert-circle" size={12} color="#EF4444" />
            <Text style={[styles.failText, { color: "#EF4444" }]}>
              {failureReason}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            {formatDate(item.initiatedAt)} · {formatTime(item.initiatedAt)}
          </Text>
          {!!item.pricing && (
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Base {formatCurrency(pricing.baseAmount)} · Gst{" "}
              {formatCurrency(pricing.gst)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  /* -------- Ledger row -------- */
  const renderLedger = (item: LedgerItem) => {
    const meta = LEDGER_META[item.entryType] ?? LEDGER_META.CREDIT;

    return (
      <View
        style={[styles.card, { backgroundColor: cardBg, borderColor }]}
      >
        <View style={styles.cardTop}>
          <View style={[styles.statusIcon, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={18} color={meta.color} />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={[styles.txnId, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.transaction?.txnId ?? item.reference}
            </Text>
            <Text style={[styles.serviceText, { color: colors.textSecondary }]}>
              {item.transaction?.serviceType ?? item.entryType}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={[
                styles.ledgerAmount,
                { color: meta.color },
              ]}
            >
              {meta.prefix}
              {formatCurrency(item.amount)}
            </Text>
            <Text style={[styles.ledgerBalance, { color: colors.textSecondary }]}>
              Bal: {formatCurrency(item.balanceAfter)}
            </Text>
          </View>
        </View>

        {/* User (may be null for manual credits) */}
        {item.user && (
          <>
            <View style={[styles.divider, { backgroundColor: borderColor }]} />
            <View style={styles.metaRow}>
              <Ionicons
                name="person-outline"
                size={12}
                color={colors.textSecondary}
              />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {item.user.firstName} {item.user.lastName} ·{" "}
                {item.user.mobileNumber}
              </Text>
            </View>
          </>
        )}

        {/* Reference */}
        <View style={[styles.divider, { backgroundColor: borderColor }]} />
        <View style={styles.metaRow}>
          <Ionicons
            name="pricetag-outline"
            size={12}
            color={colors.textSecondary}
          />
          <Text
            style={[styles.metaText, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.reference}
          </Text>
        </View>

        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            {formatDate(item.createdAt)} · {formatTime(item.createdAt)}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
            <Text style={[styles.statusText, { color: meta.color }]}>
              {item.entryType}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  /* -------- Earnings row -------- */
  const renderEarnings = (item: EarningsItem) => {
    const meta = STATUS_META[item.status] ?? STATUS_META.SUCCESS;

    return (
      <View
        style={[styles.card, { backgroundColor: cardBg, borderColor }]}
      >
        <View style={styles.cardTop}>
          <View style={[styles.statusIcon, { backgroundColor: meta.bg }]}>
            <Ionicons name="trending-up" size={18} color={meta.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.txnId, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.txnId}
            </Text>
            <Text style={[styles.serviceText, { color: colors.textSecondary }]}>
              {item.serviceType}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
            <Text style={[styles.statusText, { color: meta.color }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: borderColor }]} />

        {/* Breakdown */}
        <View style={styles.breakdown}>
          <BreakdownCell label="Commission" value={item.commission} colors={colors} />
          <BreakdownCell label="Surcharge" value={item.surcharge} colors={colors} />
          <BreakdownCell label="GST" value={item.gst} colors={colors} />
          <BreakdownCell label="TDS" value={item.tds} colors={colors} />
        </View>

        <View style={[styles.divider, { backgroundColor: borderColor }]} />

        <View style={styles.amountRow}>
          <View>
            <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
              GROSS
            </Text>
            <Text style={[styles.amountValue, { color: colors.text }]}>
              {formatCurrency(item.amount)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
              NET EARNING
            </Text>
            <Text style={[styles.amountValue, { color: "#10B981" }]}>
              {formatCurrency(item.netAmount)}
            </Text>
          </View>
        </View>

        {item.user && (
          <View style={styles.metaRow}>
            <Ionicons
              name="person-outline"
              size={12}
              color={colors.textSecondary}
            />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {item.user.firstName} {item.user.lastName} · {item.user.mobileNumber}
            </Text>
          </View>
        )}
      </View>
    );
  };

  /* -------- Dispatcher -------- */
  const renderItem = ({ item }: { item: any }) => {
    if (type === "ledger") return renderLedger(item as LedgerItem);
    if (type === "transactions/earnings")
      return renderEarnings(item as EarningsItem);
    return renderTransaction(item as TransactionItem);
  };

  /* ================================================================
     RENDER
     ================================================================ */
  const showFullLoader = loading && filteredList.length === 0;

  return (
    <LinearGradient
      colors={[colors.backgroundTop , colors.backgroundBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}  style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderSection title={type} />

      {/* Search */}
      <View style={styles.searchWrap}>
        <View
          style={[styles.searchBar, { backgroundColor: mutedBg, borderColor }]}
        >
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search txn id, name, mobile..."
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.text }]}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons
                name="close-circle"
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List */}
      {showFullLoader ? (
        <FullScreenLoader loading={true} />
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(it, i) => it.id ?? String(i)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={brandPrimary}
              colors={[brandPrimary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons
                name="file-tray-outline"
                size={48}
                color={colors.textSecondary}
              />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No records
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                There are no types to show.
              </Text>
            </View>
          }
        />
      )}
    </LinearGradient>
  );
};

export default DynamicReportScreen;

/* ---------------- Sub component ---------------- */
const BreakdownCell = ({
  label,
  value,
  colors,
}: {
  label: string;
  value: number;
  colors: any;
}) => (
  <View style={styles.breakdownCell}>
    <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
      {label}
    </Text>
    <Text style={[styles.breakdownValue, { color: colors.text }]}>
      {formatCurrency(value)}
    </Text>
  </View>
);

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Search */
  searchWrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 13.5, fontWeight: "600", paddingVertical: 0 },

  countBar: { paddingHorizontal: 16, paddingBottom: 8 },
  countText: { fontSize: 12, fontWeight: "600" },

  /* Card */
  card: { borderRadius: 16, borderWidth: 1, padding: 14 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  txnId: { fontSize: 13.5, fontWeight: "800", letterSpacing: -0.2 },
  serviceText: { fontSize: 11.5, fontWeight: "500", marginTop: 2 },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: { fontSize: 9.5, fontWeight: "800", letterSpacing: 0.3 },

  divider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },

  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  amountLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  amountValue: { fontSize: 16, fontWeight: "800", marginTop: 2 },

  ledgerAmount: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  ledgerBalance: { fontSize: 10.5, fontWeight: "600", marginTop: 2 },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },
  metaText: { fontSize: 11.5, fontWeight: "600", flex: 1 },

  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  footerText: { fontSize: 10.5, fontWeight: "500" },

  failBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  failText: { fontSize: 11.5, fontWeight: "700", flex: 1 },

  /* Earnings breakdown */
  breakdown: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  breakdownCell: { width: "48%" },
  breakdownLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  breakdownValue: { fontSize: 13.5, fontWeight: "800", marginTop: 2 },

  /* Empty */
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 6,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", marginTop: 8 },
  emptySub: {
    fontSize: 12.5,
    fontWeight: "500",
    textAlign: "center",
  },
});