import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
import DateTimePicker from "@react-native-community/datetimepicker";
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HeaderSection from "@/components/ui/headerSections";
import AddFundModal from "@/components/modal/addFund/minFundFormModal";
import { Colors } from "@/constants/theme";
import {
  getFundRequestLsitApiCall,
  updateFundRequestStatusApiCall,
} from "@/redux/slices/addFundSlice";

import { showError, showSuccess } from "@/components/service/AlertService";
import ViewFundRequestModal from "@/components/modal/addFund/viewFundRequestModal";
import { LinearGradient } from "expo-linear-gradient";

/* ----------------------------- Types ----------------------------- */

type FundRequest = {
  id: string;
  tenantId?: string;
  userId?: string;
  idempotencyKey?: string;
  amount: number;
  walletId?: string;
  platformServiceId?: string;
  providerCode?: string;
  providerId?: string;
  imageUrl?: string;
  status: string;
  providerResponse?: string | Record<string, any> | null;
  providerTxnId?: string;
  referenceId?: string;
  paymentMode?: string;
  failureReason?: string | null;
  retryCount?: number;
  lastRetryAt?: string | null;
  processedBy?: string | null;
  processedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  tenantName?: string;
  tenantNumber?: string;
  userNumber?: string;
  name?: string;
  mobileNumber?: string;
  [key: string]: any;
};

type StatusFilter = "ALL" | "PENDING" | "SUCCESS" | "FAILED" | "REJECTED";

/* --------------------------- Constants --------------------------- */

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Success", value: "SUCCESS" },
  { label: "Failed", value: "FAILED" },
  { label: "Rejected", value: "REJECTED" },
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

const extractFundRequests = (raw: any): FundRequest[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.fundRequests)) return raw.fundRequests;
  if (Array.isArray(raw.fundRequestList)) return raw.fundRequestList;
  if (Array.isArray(raw.list)) return raw.list;
  if (Array.isArray(raw.data)) return raw.data;
  if (Array.isArray(raw.data?.fundRequests)) return raw.data.fundRequests;
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
    case "BANK":
      return "business-outline";
    case "UPI":
      return "phone-portrait-outline";
    default:
      return "card-outline";
  }
};

/* --------------------------- Screen ------------------------------ */

const FundRequestScreen = () => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const { fundRequestList, loading } = useSelector(
    (state: any) => state?.addFund,
  );

  const [requests, setRequests] = useState<FundRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [addVisible, setAddVisible] = useState(false);

  // Search
  const [search, setSearch] = useState("");

  // Filters
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Details modal
  const [selectedReq, setSelectedReq] = useState<FundRequest | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Action menu (3-dot)
  const [menuReq, setMenuReq] = useState<FundRequest | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Reject reason modal
  const [rejectReq, setRejectReq] = useState<FundRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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
        status: status === "ALL" ? "all" : status,
      };

      const trimmedSearch = search.trim();
      if (trimmedSearch) payload.search = trimmedSearch;

      if (fromDate) payload.fromdate = toISODate(fromDate);
      if (toDate) payload.todate = toISODate(toDate);

      return payload;
    },
    [status, fromDate, toDate, search],
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
        setRequests([]);
        await getFundRequestLsitApiCall(buildPayload(1), dispatch);
      } finally {
        isFetchingRef.current = false;
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [status, fromDate, toDate, search, buildPayload, dispatch]);

  /* -------- Sync redux → local list -------- */

  useEffect(() => {
    const incoming = extractFundRequests(fundRequestList);
    const currentPage = currentPageRef.current;

    if (currentPage === 1) {
      setRequests(incoming);
    } else {
      setRequests((prev) => {
        const existing = new Set(prev.map((r) => r.id));
        const fresh = incoming.filter((r) => !existing.has(r.id));
        return [...prev, ...fresh];
      });
    }
    setHasMore(incoming.length >= PAGE_SIZE);
    setLoadingMore(false);
  }, [fundRequestList]);

  /* -------- Load more -------- */

  const loadMore = useCallback(async () => {
    if (
      !hasMore ||
      loading ||
      loadingMore ||
      isFetchingRef.current ||
      requests.length === 0
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
      await getFundRequestLsitApiCall(buildPayload(nextPage), dispatch);
    } finally {
      isFetchingRef.current = false;
    }
  }, [
    hasMore,
    loading,
    loadingMore,
    requests.length,
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
      await getFundRequestLsitApiCall(buildPayload(1), dispatch);
    } finally {
      isFetchingRef.current = false;
      setRefreshing(false);
    }
  };

  /* -------- Date pickers -------- */

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

  const clearFilters = () => {
    setSearch("");
    setStatus("ALL");
    setFromDate(null);
    setToDate(null);
  };

  const hasActiveFilters =
    !!search || status !== "ALL" || !!fromDate || !!toDate;

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (search) c++;
    if (status !== "ALL") c++;
    if (fromDate) c++;
    if (toDate) c++;
    return c;
  }, [search, status, fromDate, toDate]);

  const openDetails = (req: FundRequest) => {
    setSelectedReq(req);
    setDetailsOpen(true);
  };

  /* --------------------- Actions (Approve / Reject) --------------------- */

  const openMenu = (req: FundRequest) => {
    setMenuReq(req);
    setMenuOpen(true);
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setMenuReq(null);
  };

  const handleApprove = async () => {
    if (!menuReq) return;
    const id = menuReq.id;
    closeMenu();

    setActionLoading(true);
    try {
      const payload = {
        failureReason: "",
        status: "SUCCESS",
      };
      const res = await updateFundRequestStatusApiCall(
        payload,
        id,
        dispatch,
      );
      if (res !== false) {
        showSuccess("Approved", "Fund request approved successfully");
        onRefresh();
      }
    } catch (err: any) {
      showError("Failed", err?.message || "Could not approve request");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = () => {
    if (!menuReq) return;
    setRejectReq(menuReq);
    setRejectReason("");
    closeMenu();
    setRejectOpen(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectReq) return;
    if (!rejectReason.trim()) {
      showError("Validation", "Please enter a reason for rejection");
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        failureReason: rejectReason.trim(),
        status: "REJECTED",
      };
      const res = await updateFundRequestStatusApiCall(
        payload,
        rejectReq.id,
        dispatch,
      );
      if (res !== false) {
        showSuccess("Rejected", "Fund request rejected");
        setRejectOpen(false);
        setRejectReq(null);
        setRejectReason("");
        onRefresh();
      }
    } catch (err: any) {
      showError("Failed", err?.message || "Could not reject request");
    } finally {
      setActionLoading(false);
    }
  };

  /* --------------------------- Render item (minimized) --------------------------- */

  const renderItem = ({ item }: { item: FundRequest }) => {
    const statusColor = getStatusColor(item.status, colors);
    const modeIcon = getModeIcon(item.paymentMode);
    const isPending = item.status?.toUpperCase() === "PENDING";

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
        {/* Middle (name, meta) — no left icon anymore */}
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.name ?? "Fund Request"}
            </Text>
            {item.paymentMode && (
              <View
                style={[
                  styles.modeTag,
                  { backgroundColor: colors.buttonPrimary + "18" },
                ]}
              >
                <Ionicons
                  name={modeIcon}
                  size={9}
                  color={colors.buttonPrimary}
                />
                <Text
                  style={[
                    styles.modeTagText,
                    { color: colors.buttonPrimary },
                  ]}
                >
                  {item.paymentMode}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.metaRow}>
            <Text
              style={[styles.metaText, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {item.referenceId ?? item.providerTxnId ?? item.id}
            </Text>
          </View>
        </View>

        {/* Right: amount + status + date */}
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
            {formatDate(item.createdAt)}
          </Text>
        </View>

        {/* 3-dot menu button */}
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
              backgroundColor: isPending
                ? colors.buttonPrimary + "15"
                : "transparent",
              borderColor: isPending ? colors.buttonPrimary + "40" : colors.border,
            },
          ]}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={16}
            color={isPending ? colors.buttonPrimary : colors.textMuted}
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

  const showInitialLoader = loading && requests.length === 0;

  /* --------------------------- Render --------------------------- */

  return (
    <LinearGradient
      colors={[colors.backgroundTop , colors.backgroundBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }} 
       style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderSection title="Fund Request" />

      {/* Header row: filters toggle */}
      <View style={styles.headerBar}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Fund Requests
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
            placeholder="Search by name, reference, mobile..."
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
          data={requests}
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
                name="document-text-outline"
                size={48}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {hasActiveFilters
                  ? "No matching fund requests"
                  : "No fund requests yet"}
              </Text>
            </View>
          }
          removeClippedSubviews={false}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* FAB — Add Fund */}
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

      <AddFundModal visible={addVisible} onClose={() => setAddVisible(false)} />

      <ViewFundRequestModal
        visible={detailsOpen}
        request={selectedReq}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedReq(null);
        }}
      />

      {/* ---------------- 3-dot Action Menu ---------------- */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="slide"
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
            {/* Header */}
            <View style={[styles.menuHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.menuTitle, { color: colors.text }]}>
                Actions
              </Text>
              <Text
                style={[styles.menuSub, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {menuReq?.name ?? ""} · ₹{menuReq?.amount ?? 0}
              </Text>
            </View>

            {(() => {
              const isPending =
                menuReq?.status?.toUpperCase() === "PENDING";
              if (!isPending) {
                return (
                  <View style={styles.menuDisabledRow}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={14}
                      color={colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.menuDisabledText,
                        { color: colors.textMuted },
                      ]}
                    >
                      This request is already {menuReq?.status?.toLowerCase()}
                    </Text>
                  </View>
                );
              }
              return (
                <>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleApprove}
                    disabled={actionLoading}
                    style={styles.menuItem}
                  >
                    <View
                      style={[
                        styles.menuIconWrap,
                        { backgroundColor: "#10B98120" },
                      ]}
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color="#10B981"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.menuItemText, { color: colors.text }]}
                      >
                        Approve
                      </Text>
                      <Text
                        style={[
                          styles.menuItemSub,
                          { color: colors.textMuted },
                        ]}
                      >
                        Mark this request as SUCCESS
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleOpenReject}
                    disabled={actionLoading}
                    style={styles.menuItem}
                  >
                    <View
                      style={[
                        styles.menuIconWrap,
                        { backgroundColor: "#EF444420" },
                      ]}
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={18}
                        color="#EF4444"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.menuItemText, { color: colors.text }]}
                      >
                        Reject
                      </Text>
                      <Text
                        style={[
                          styles.menuItemSub,
                          { color: colors.textMuted },
                        ]}
                      >
                        Provide a reason and mark as REJECTED
                      </Text>
                    </View>
                  </TouchableOpacity>
                </>
              );
            })()}

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

      {/* ---------------- Reject Reason Modal ---------------- */}
      <Modal
        visible={rejectOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!actionLoading) {
            setRejectOpen(false);
            setRejectReq(null);
            setRejectReason("");
          }
        }}
      >
        <View style={styles.rejectBackdrop}>
          <View
            style={[
              styles.rejectSheet,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.rejectHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rejectTitle, { color: colors.text }]}>
                  Reject Fund Request
                </Text>
                <Text
                  style={[styles.rejectSub, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {rejectReq?.name} · ₹{rejectReq?.amount}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (!actionLoading) {
                    setRejectOpen(false);
                    setRejectReq(null);
                    setRejectReason("");
                  }
                }}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.rejectLabel, { color: colors.textMuted }]}>
              Reason for rejection *
            </Text>
            <View
              style={[
                styles.rejectInputWrap,
                {
                  backgroundColor: colors.surfaceTertiary,
                  borderColor: colors.border,
                },
              ]}
            >
              <TextInput
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="e.g. Invalid payment proof"
                placeholderTextColor={colors.textMuted}
                style={[styles.rejectInput, { color: colors.text }]}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!actionLoading}
              />
            </View>

            <View style={styles.rejectActions}>
              <TouchableOpacity
                onPress={() => {
                  if (!actionLoading) {
                    setRejectOpen(false);
                    setRejectReq(null);
                    setRejectReason("");
                  }
                }}
                disabled={actionLoading}
                style={[
                  styles.rejectCancelBtn,
                  { borderColor: colors.border },
                ]}
              >
                <Text
                  style={[styles.rejectCancelText, { color: colors.text }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleRejectSubmit}
                disabled={actionLoading}
                style={[
                  styles.rejectSubmitBtn,
                  {
                    backgroundColor: colors.error ?? "#EF4444",
                    opacity: actionLoading ? 0.6 : 1,
                  },
                ]}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons
                      name="close-circle"
                      size={16}
                      color="#FFF"
                    />
                    <Text style={styles.rejectSubmitText}>Confirm Reject</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

export default FundRequestScreen;

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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: { fontSize: 13.5, fontWeight: "700", flexShrink: 1 },
  modeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modeTagText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
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

  /* 3-dot menu button */
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

  /* FAB */
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

  /* 3-dot action menu */
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
    minHeight:"50%"
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
  menuDisabledRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  menuDisabledText: { fontSize: 12.5, fontWeight: "600" },
  menuCancel: {
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  menuCancelText: { fontSize: 13.5, fontWeight: "700" },

  /* Reject modal */
  rejectBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    minHeight:"60%"
  },
  rejectSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 30 : 20,
  },
  rejectHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  rejectTitle: { fontSize: 16, fontWeight: "800" },
  rejectSub: { fontSize: 11.5, fontWeight: "500", marginTop: 2 },
  rejectLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  rejectInputWrap: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minHeight: 100,
  },
  rejectInput: {
    fontSize: 13.5,
    fontWeight: "500",
    minHeight: 76,
  },
  rejectActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  rejectCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectCancelText: { fontSize: 13.5, fontWeight: "700" },
  rejectSubmitBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 46,
    borderRadius: 12,
  },
  rejectSubmitText: { color: "#FFF", fontSize: 13.5, fontWeight: "800" },
});