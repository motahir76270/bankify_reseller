import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
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
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HeaderSection from "@/components/ui/headerSections";
import CreateCommisonRuleModal from "@/components/modal/commssion/createCommisonRuleModal";
import EditCommissionRuleModal from "@/components/modal/commssion/editCommissionRuleModal";
import ViewCommissionRuleModal from "@/components/modal/commssion/ViewCommissionRuleModal";
import { Colors } from "@/constants/theme";
import { showError, showSuccess } from "@/components/service/AlertService";
import {
  getcommissionRulesListDataApiCall,
  updateCommissionRuleStatusApiCall,
} from "@/redux/slices/comissionSlice";
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

type CommissionRule = {
  id: string;
  tenantId?: string;
  scope: "ROLE" | "USER" | "GLOBAL" | string;
  roleId?: string | null;
  targetUserId?: string | null;
  serviceProviderMappingId?: string | null;
  mode: "COMMISSION" | "SURCHARGE" | string;
  type: "FLAT" | "PERCENTAGE" | string;
  value?: number | null;
  applyTDS?: boolean;
  tdsPercent?: number;
  applyGST?: boolean;
  gstPercent?: number;
  supportsSlab?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  roleName?: string;
  roleCode?: string;
  serviceName?: string;
  serviceCode?: string;
  targetUserFirstName?: string | null;
  targetUserLastName?: string | null;
  targetUserEmail?: string | null;
  slabs?: Slab[];
  targetUser?: any;
  [key: string]: any;
};

type ScopeFilter = "ALL" | "ROLE" | "USER" | "GLOBAL";
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

/* --------------------------- Constants --------------------------- */

const PAGE_SIZE = 20;

const SCOPE_OPTIONS: { label: string; value: ScopeFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Role", value: "ROLE" },
  { label: "User", value: "USER" },
  { label: "Global", value: "GLOBAL" },
];

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
];

/* --------------------------- Helpers ----------------------------- */

const extractRules = (raw: any): CommissionRule[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.commissionRules)) return raw.commissionRules;
  if (Array.isArray(raw.commissionRulesListData))
    return raw.commissionRulesListData;
  if (Array.isArray(raw.rules)) return raw.rules;
  if (Array.isArray(raw.list)) return raw.list;
  if (Array.isArray(raw.data)) return raw.data;
  if (Array.isArray(raw.data?.rules)) return raw.data.rules;
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

const getTargetLabel = (rule: CommissionRule) => {
  if (rule.scope === "ROLE") return rule.roleName ?? "—";
  if (rule.scope === "USER") {
    const name = `${rule.targetUserFirstName ?? ""} ${
      rule.targetUserLastName ?? ""
    }`.trim();
    return name || rule.targetUserEmail || "—";
  }
  return "All Users";
};

const getRuleValueText = (rule: CommissionRule) => {
  if (rule.supportsSlab) {
    const slabs = rule.slabs ?? [];
    return `${slabs.length} slab${slabs.length === 1 ? "" : "s"}`;
  }
  if (rule.type === "PERCENTAGE") return `${rule.value ?? 0}%`;
  return `₹${rule.value ?? 0}`;
};

/* --------------------------- Screen ------------------------------ */

const CommissionRulesScreen = () => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const { commissionRulesListData, laoding } = useSelector(
    (state: any) => state?.commission,
  );
  const loading = laoding;

  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [addVisible, setAddVisible] = useState(false);

  // Search
  const [search, setSearch] = useState("");

  // Filters
  const [scope, setScope] = useState<ScopeFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [showFilters, setShowFilters] = useState(false);

  // Details modal
  const [selectedRule, setSelectedRule] = useState<CommissionRule | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Edit modal
  const [editRule, setEditRule] = useState<CommissionRule | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Action menu
  const [menuRule, setMenuRule] = useState<CommissionRule | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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
        scope: scope === "ALL" ? "all" : scope,
        isActive:
          statusFilter === "ALL"
            ? undefined
            : statusFilter === "ACTIVE",
      };

      const trimmedSearch = search.trim();
      if (trimmedSearch) payload.search = trimmedSearch;

      return payload;
    },
    [scope, statusFilter, search],
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
        setRules([]);
        await getcommissionRulesListDataApiCall(buildPayload(1), dispatch);
      } finally {
        isFetchingRef.current = false;
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [scope, statusFilter, search, buildPayload, dispatch]);

  /* -------- Sync redux → local -------- */

  useEffect(() => {
    const incoming = extractRules(commissionRulesListData);
    const currentPage = currentPageRef.current;

    if (currentPage === 1) {
      setRules(incoming);
    } else {
      setRules((prev) => {
        const existing = new Set(prev.map((r) => r.id));
        const fresh = incoming.filter((r) => !existing.has(r.id));
        return [...prev, ...fresh];
      });
    }
    setHasMore(incoming.length >= PAGE_SIZE);
    setLoadingMore(false);
  }, [commissionRulesListData]);

  /* -------- Load more -------- */

  const loadMore = useCallback(async () => {
    if (
      !hasMore ||
      loading ||
      loadingMore ||
      isFetchingRef.current ||
      rules.length === 0
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
      await getcommissionRulesListDataApiCall(buildPayload(nextPage), dispatch);
    } finally {
      isFetchingRef.current = false;
    }
  }, [
    hasMore,
    loading,
    loadingMore,
    rules.length,
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
      await getcommissionRulesListDataApiCall(buildPayload(1), dispatch);
    } finally {
      isFetchingRef.current = false;
      setRefreshing(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setScope("ALL");
    setStatusFilter("ALL");
  };

  const hasActiveFilters =
    !!search || scope !== "ALL" || statusFilter !== "ALL";

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (search) c++;
    if (scope !== "ALL") c++;
    if (statusFilter !== "ALL") c++;
    return c;
  }, [search, scope, statusFilter]);

  const openDetails = (rule: CommissionRule) => {
    setSelectedRule(rule);
    setDetailsOpen(true);
  };

  const openMenu = (rule: CommissionRule) => {
    setMenuRule(rule);
    setMenuOpen(true);
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setMenuRule(null);
  };

  /* --------- Open Edit modal --------- */
  const handleEdit = () => {
    if (!menuRule) return;
    setEditRule(menuRule);
    closeMenu();
    // Slight delay so the menu modal closes before the edit modal opens
    setTimeout(() => setEditOpen(true), 150);
  };

  /* --------- Toggle active (quick action) --------- */

  const handleToggleActive = async () => {
    if (!menuRule) return;
    const id = menuRule.id;
    const nextActive = !menuRule.isActive;
    closeMenu();

    setActionLoading(true);
    try {
      const payload = {
        ...menuRule,
        isActive: nextActive,
      };
      const res = await updateCommissionRuleStatusApiCall(
        payload,
        id,
        dispatch,
      );
    } catch (err: any) {
      showError("Failed", err?.message || "Could not update rule");
    } finally {
      setActionLoading(false);
    }
  };

  /* --------------------------- Render item --------------------------- */

  const renderItem = ({ item }: { item: CommissionRule }) => {
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
              {getTargetLabel(item)}
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
              {item.serviceName ?? "—"}
            </Text>
            <Text style={[styles.metaDot, { color: colors.textMuted }]}>
              ·
            </Text>
            <Text
              style={[styles.metaText, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {getRuleValueText(item)}
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

        <TouchableOpacity
          activeOpacity={0.6}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={(e) => {
            e.stopPropagation?.();
            openMenu(item);
          }}
          style={[
            styles.menuBtn,
            {
              backgroundColor: colors.surfaceTertiary,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={16}
            color={colors.textMuted}
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

  const showInitialLoader = loading && rules.length === 0;

  /* --------------------------- Render --------------------------- */

  return (
    <LinearGradient
      colors={[colors.backgroundTop , colors.backgroundBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }} 
       style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderSection title="Commission Rules" />

      <View style={styles.headerBar}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Commission Rules
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
            placeholder="Search by role, user, service..."
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
            Scope
          </Text>
          <View style={styles.chipRow}>
            {SCOPE_OPTIONS.map((s) => {
              const active = scope === s.value;
              return (
                <TouchableOpacity
                  key={s.value}
                  onPress={() => setScope(s.value)}
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
            Status
          </Text>
          <View style={styles.chipRow}>
            {STATUS_OPTIONS.map((s) => {
              const active = statusFilter === s.value;
              return (
                <TouchableOpacity
                  key={s.value}
                  onPress={() => setStatusFilter(s.value)}
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

      {/* List */}
      {showInitialLoader ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.buttonPrimary} />
        </View>
      ) : (
        <FlatList
          data={rules}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 100,
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
                {hasActiveFilters
                  ? "No matching rules"
                  : "No commission rules yet"}
              </Text>
            </View>
          }
          removeClippedSubviews={false}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setAddVisible(true)}
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

      {/* Create Modal */}
      <CreateCommisonRuleModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSuccess={onRefresh}
      />

      {/* Edit Modal */}
      <EditCommissionRuleModal
        visible={editOpen}
        rule={editRule}
        onClose={() => {
          setEditOpen(false);
          setEditRule(null);
        }}
        onSuccess={onRefresh}
      />

      {/* View Details Modal */}
      <ViewCommissionRuleModal
        visible={detailsOpen}
        rule={selectedRule}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedRule(null);
        }}
      />

      {/* 3-dot Action Menu */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.menuBackdrop}
          onPress={closeMenu}
        >
          <View
            style={[
              styles.menuSheet,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[styles.menuHeader, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.menuTitle, { color: colors.text }]}>
                Actions
              </Text>
              <Text
                style={[styles.menuSub, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {menuRule ? getTargetLabel(menuRule) : ""}
              </Text>
            </View>

            {/* Edit */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleEdit}
              disabled={actionLoading}
              style={styles.menuItem}
            >
              <View
                style={[
                  styles.menuIconWrap,
                  { backgroundColor: (colors.buttonPrimary ?? "#2563EB") + "20" },
                ]}
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={colors.buttonPrimary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  Edit
                </Text>
                <Text
                  style={[styles.menuItemSub, { color: colors.textMuted }]}
                >
                  Modify value, slabs, taxes…
                </Text>
              </View>
            </TouchableOpacity>

            {/* Toggle active */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleToggleActive}
              disabled={actionLoading}
              style={styles.menuItem}
            >
              <View
                style={[
                  styles.menuIconWrap,
                  {
                    backgroundColor: menuRule?.isActive
                      ? "#EF444420"
                      : "#10B98120",
                  },
                ]}
              >
                <Ionicons
                  name={
                    menuRule?.isActive
                      ? "close-circle-outline"
                      : "checkmark-circle-outline"
                  }
                  size={18}
                  color={menuRule?.isActive ? "#EF4444" : "#10B981"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  {menuRule?.isActive ? "Deactivate" : "Activate"}
                </Text>
                <Text
                  style={[styles.menuItemSub, { color: colors.textMuted }]}
                >
                  {menuRule?.isActive
                    ? "Stop applying this rule"
                    : "Enable this rule"}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={closeMenu}
              style={[styles.menuCancel, { borderTopColor: colors.border }]}
            >
              <Text style={[styles.menuCancelText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </LinearGradient>
  );
};

export default CommissionRulesScreen;

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

  menuBtn: {
    marginLeft: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
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

  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingTop: 4,
    paddingBottom: Platform.OS === "ios" ? 28 : 14,
  },
  menuHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuTitle: { fontSize: 15, fontWeight: "800" },
  menuSub: { fontSize: 11.5, fontWeight: "500", marginTop: 2 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemText: { fontSize: 14, fontWeight: "700" },
  menuItemSub: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  menuCancel: {
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  menuCancelText: { fontSize: 13.5, fontWeight: "700" },
});