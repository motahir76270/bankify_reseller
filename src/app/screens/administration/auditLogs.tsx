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
import { getAuditLogsDataApiCall } from "@/redux/slices/historySlice";
import { LinearGradient } from "expo-linear-gradient";

type AuditLog = {
  id: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  oldData?: any;
  newData?: {
    type?: string;
    status?: string;
    accuracy?: number;
    latitude?: number;
    longitude?: number;
    identifier?: string;
  } | null;
  performByUserId?: string;
  performByEmployeeId?: string | null;
  ipAddress?: string;
  userAgent?: string;
  tenantId?: string;
  metaData?: any;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    mobileNumber?: string;
  };
  role?: {
    roleName?: string;
    roleCode?: string;
  };
};

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

const AuditLogsScreen = () => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const { auditLogsData, loading } = useSelector(
    (state: any) => state?.history,
  );
  

  // ✅ Stable reference — only changes when auditLogsData actually changes
  const apiLogs = useMemo<AuditLog[]>(() => {
    if (Array.isArray(auditLogsData?.logs)) return auditLogsData.logs;
    if (Array.isArray(auditLogsData)) return auditLogsData;
    return [];
  }, [auditLogsData]);

  const [allLogs, setAllLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Only search filter now
  const [search, setSearch] = useState("");

  // Race guards
  const isFetchingRef = useRef(false);
  const currentPageRef = useRef(1);
  const appendedPagesRef = useRef<Set<number>>(new Set([1]));

  // ✅ Only `page` and `search` in payload
  const buildPayload = useCallback(
    (pageToFetch: number) => ({
      page: pageToFetch,
      search: search,
    }),
    [search],
  );

  // First-page fetch whenever search changes (debounced)
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
        setAllLogs([]);
        await getAuditLogsDataApiCall(buildPayload(1), dispatch);
      } finally {
        isFetchingRef.current = false;
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [search, buildPayload, dispatch]);

  // ✅ Signature-based sync — prevents "Maximum update depth exceeded"
  const responseSignature = `${currentPageRef.current}|${apiLogs.length}|${
    apiLogs[0]?.id ?? ""
  }|${apiLogs[apiLogs.length - 1]?.id ?? ""}`;

  useEffect(() => {
    const currentPage = currentPageRef.current;

    if (currentPage === 1) {
      const seen = new Set<string>();
      const deduped = apiLogs.filter((l) => {
        if (!l.id) return true;
        if (seen.has(l.id)) return false;
        seen.add(l.id);
        return true;
      });
      setAllLogs((prev) => {
        if (
          prev.length === deduped.length &&
          prev.every((p, i) => p.id === deduped[i]?.id)
        ) {
          return prev;
        }
        return deduped;
      });
      setHasMore(apiLogs.length >= PAGE_SIZE);
    } else {
      setAllLogs((prev) => {
        const existingIds = new Set(prev.map((l) => l.id));
        const fresh = apiLogs.filter((l) => l.id && !existingIds.has(l.id));
        if (fresh.length === 0) return prev;
        return [...prev, ...fresh];
      });
      setHasMore(apiLogs.length >= PAGE_SIZE);
    }
    setLoadingMore(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responseSignature]);

  // Load more
  const loadMore = useCallback(async () => {
    if (
      !hasMore ||
      loading ||
      loadingMore ||
      isFetchingRef.current ||
      allLogs.length === 0
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
      await getAuditLogsDataApiCall(buildPayload(nextPage), dispatch);
    } finally {
      isFetchingRef.current = false;
    }
  }, [hasMore, loading, loadingMore, allLogs.length, buildPayload, dispatch]);

  const renderLog = ({ item }: { item: AuditLog }) => {
    const status = (item.newData?.status ?? "").toUpperCase();
    const isSuccess = status === "SUCCESS";
    const isFailed = status === "FAILED";
    const statusColor = isSuccess
      ? colors.success
      : isFailed
        ? colors.error
        : colors.textMuted;
    const statusBg = isSuccess
      ? "rgba(16,185,129,0.15)"
      : isFailed
        ? "rgba(239,68,68,0.15)"
        : "rgba(148,163,184,0.15)";

    const initials = `${item.user?.firstName?.[0] ?? ""}${
      item.user?.lastName?.[0] ?? ""
    }`.toUpperCase();

    const fullName =
      `${item.user?.firstName ?? ""} ${item.user?.lastName ?? ""}`.trim() ||
      item.entityId ||
      "Unknown";

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
            style={[styles.avatar, { backgroundColor: colors.surfacePrimary }]}
          >
            <Text style={[styles.avatarText, { color: colors.buttonPrimary }]}>
              {initials || "?"}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]}>
              {fullName}
            </Text>
            <Text style={[styles.email, { color: colors.textMuted }]}>
              {item.user?.email ?? item.entityId ?? "-"}
            </Text>
          </View>

          <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {status || "UNKNOWN"}
            </Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
              Action
            </Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>
              {item.action ?? "-"}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
              Type
            </Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>
              {item.entityType ?? "-"}
            </Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
              IP
            </Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>
              {item.ipAddress ?? "-"}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
              Role
            </Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>
              {item.role?.roleName ?? item.role?.roleCode ?? "-"}
            </Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
              Accuracy
            </Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>
              {item.newData?.accuracy != null
                ? `${Math.round(item.newData.accuracy)}%`
                : "-"}
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

  const showInitialLoader = loading && allLogs.length === 0;

  return (
    <LinearGradient
    colors={[colors.backgroundTop , colors.backgroundBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }} 
       style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderSection title="Login History" />

      {/* Filter Bar — search only */}
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
            placeholder="Search history..."
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

      {showInitialLoader ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.buttonPrimary} />
        </View>
      ) : (
        <FlatList
          data={allLogs}
          keyExtractor={(item, idx) => `${item.id ?? "log"}-${idx}`}
          renderItem={renderLog}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 40,
            gap: 12,
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons
                name="time-outline"
                size={40}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {search ? "No matching logs" : "No login history yet"}
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

export default AuditLogsScreen;

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

  card: { borderRadius: 14, borderWidth: 1, padding: 14 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontWeight: "800" },
  name: { fontSize: 15, fontWeight: "700" },
  email: { fontSize: 12, marginTop: 2, fontWeight: "500" },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },

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