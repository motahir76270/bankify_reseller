import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Colors } from "@/constants/theme";
import HeaderSection from "@/components/ui/headerSections";
import ViewKycUserModal from "@/components/modal/profileKyc/viewKycUserModal";
import RejectKycModal from "@/components/modal/profileKyc/rejectKycModal";
import {
  getPendingKycListApiCall,
  updateProfileKycStatusApiCall,
} from "@/redux/slices/profileKycSlice";
import { LinearGradient } from "expo-linear-gradient";

/* ---------------- Types ---------------- */
export type KycDocument = {
  id: string;
  userKycId: string;
  documentType:
    | "AADHAAR_FRONT"
    | "AADHAAR_BACK"
    | "PAN"
    | "ADDRESS_PROOF"
    | "USER_PHOTO";
  documentNumber: string;
  documentUrl: string;
  documentBackUrl: string | null;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  isActive: boolean;
  createdAt: string;
};

export type KycUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  userNumber: string;
};

export type KycParent = {
  id: string;
  userNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
};

export type KycListItem = {
  id: string;
  userId: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  submittedAt: string;
  submittedByUserId: string;
  approvedAt: string | null;
  approvedByUserId: string | null;
  approvalNotes: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  user: KycUser;
  role: { roleName: string; roleCode: string };
  parent: KycParent | null;
  parentRole: { roleName: string; roleCode: string } | null;
  documents: KycDocument[];
};

type FilterStatus = "ALL" | "PENDING" | "VERIFIED" | "REJECTED";

const FILTERS: FilterStatus[] = ["ALL", "PENDING", "VERIFIED", "REJECTED"];

const STATUS_META: Record<
  FilterStatus,
  { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  ALL: { color: "#6366F1", bg: "#6366F120", icon: "list-outline" },
  PENDING: { color: "#F59E0B", bg: "#F59E0B20", icon: "time-outline" },
  VERIFIED: { color: "#10B981", bg: "#10B98120", icon: "checkmark-circle-outline" },
  REJECTED: { color: "#EF4444", bg: "#EF444420", icon: "close-circle-outline" },
};

/* ---------------- Helpers ---------------- */
const toApiDate = (d: Date | null) => {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatDisplayDate = (d: Date | null) =>
  d
    ? d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

const KycRequestsScreen = () => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const { pendingKycList, loading } = useSelector(
    (state: any) => state?.profileKyc,
  );

  /* ---------------- Filter state ---------------- */
  const [status, setStatus] = useState<FilterStatus>("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  /* ---------------- UI state ---------------- */
  const [refreshing, setRefreshing] = useState(false);
  const [selectedKyc, setSelectedKyc] = useState<KycListItem | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  /* 3-dot menu state */
  const [menuKyc, setMenuKyc] = useState<KycListItem | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  /* Reject modal state */
  const [rejectKyc, setRejectKyc] = useState<KycListItem | null>(null);
  const [rejectVisible, setRejectVisible] = useState(false);

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const cardBg = colors.card
  const mutedBg = isDark ? "#1A1D2A" : "#F8FAFC";
  const borderColor = colors.border;
  const brandPrimary = isDark ? "#7C6BFF" : "#4F46E5";

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
  const fetchData = useCallback(
    async (override?: Partial<{
      status: FilterStatus;
      search: string;
      fromDate: Date | null;
      toDate: Date | null;
    }>) => {
      const s = override?.status ?? status;
      const q = override?.search ?? debouncedSearch;
      const f = override?.fromDate ?? fromDate;
      const t = override?.toDate ?? toDate;

      const payload = {
        page: 1,
        status: s,
        search: q,
        fromdate: toApiDate(f),
        todate: toApiDate(t),
      };
      await getPendingKycListApiCall(payload, dispatch);
    },
    [dispatch, status, debouncedSearch, fromDate, toDate],
  );

  useEffect(() => {
    fetchData();
  }, [status, debouncedSearch, fromDate, toDate, fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  /* ---------------- APPROVE — payload: { approvalNotes: "", kycId } ---------------- */
  const handleApprove = async (kyc: KycListItem) => {
    const payload = {
      approvalNotes: "",
      kycId: kyc.id,
    };
    console.log("Approve payload →", payload);
    await updateProfileKycStatusApiCall(payload, "approve", dispatch);
    closeAllModals();
    await fetchData();
  };

  /* ---------------- REJECT — payload: { approvalNotes: <reason>, kycId } ---------------- */
  const handleRejectSubmit = async (reason: string) => {
    if (!rejectKyc) return;
    const payload = {
      approvalNotes: reason,
      kycId: rejectKyc.id,
    };
    console.log("Reject payload →", payload);
    await updateProfileKycStatusApiCall(payload, "rejected", dispatch);
    closeAllModals();
    await fetchData();
  };

  const closeAllModals = () => {
    setDetailsVisible(false);
    setSelectedKyc(null);
    setMenuVisible(false);
    setMenuKyc(null);
    setRejectVisible(false);
    setRejectKyc(null);
  };

  /* ---------------- Filter helpers ---------------- */
  const hasActiveFilters = useMemo(
    () => !!debouncedSearch || !!fromDate || !!toDate || status !== "ALL",
    [debouncedSearch, fromDate, toDate, status],
  );

  const clearAllFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setFromDate(null);
    setToDate(null);
    setStatus("ALL");
  };

  /* ---------------- Date picker handlers ---------------- */
  const onFromChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") setShowFromPicker(false);
    if (event?.type === "dismissed") return;
    if (date) setFromDate(date);
  };

  const onToChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") setShowToPicker(false);
    if (event?.type === "dismissed") return;
    if (date) setToDate(date);
  };

  /* ---------------- Render item ---------------- */
  const renderItem = ({ item }: { item: KycListItem }) => {
    const meta = STATUS_META[item.status] ?? STATUS_META.PENDING;
    const docsCount = item.documents?.length ?? 0;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.card, { backgroundColor: cardBg, borderColor }]}
        onPress={() => {
          setSelectedKyc(item);
          setDetailsVisible(true);
        }}
      >
        <View style={styles.cardTop}>
          <View style={[styles.avatar, { backgroundColor: `${brandPrimary}20` }]}>
            <Text style={[styles.avatarText, { color: brandPrimary }]}>
              {item.user?.firstName?.[0]?.toUpperCase() ?? "?"}
              {item.user?.lastName?.[0]?.toUpperCase() ?? ""}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {item.user?.firstName} {item.user?.lastName}
            </Text>
            <Text
              style={[styles.subText, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {item.user?.userNumber} · {item.role?.roleName}
            </Text>
          </View>

          <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={11} color={meta.color} />
            <Text style={[styles.statusPillText, { color: meta.color }]}>
              {item.status}
            </Text>
          </View>

          {/* 3-dot button — always shown */}
          <TouchableOpacity
            hitSlop={10}
            onPress={() => {
              setMenuKyc(item);
              setMenuVisible(true);
            }}
            style={styles.dotBtn}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={[styles.divider, { backgroundColor: borderColor }]} />

        <View style={styles.cardBottom}>
          <View style={styles.metaItem}>
            <Ionicons name="call-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {item.user?.mobileNumber}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons
              name="document-text-outline"
              size={12}
              color={colors.textSecondary}
            />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {docsCount} docs
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons
              name="calendar-outline"
              size={12}
              color={colors.textSecondary}
            />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {new Date(item.submittedAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
              })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const list: KycListItem[] = Array.isArray(pendingKycList) ? pendingKycList : [];

  return (
    <LinearGradient
      colors={[colors.backgroundTop , colors.backgroundBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }} 
       style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderSection title="KYC Requests" />

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBar, { backgroundColor: mutedBg, borderColor }]}>
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search name, mobile, email, user no."
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.text }]}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status tabs */}
      <View style={styles.filtersRow}>
        {FILTERS.map((f) => {
          const active = status === f;
          const meta = STATUS_META[f];
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setStatus(f)}
              activeOpacity={0.7}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? meta.bg : mutedBg,
                  borderColor: active ? meta.color : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: active ? meta.color : colors.textSecondary },
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Date range */}
      <View style={styles.dateRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowFromPicker(true)}
          style={[styles.dateBtn, { backgroundColor: mutedBg, borderColor }]}
        >
          <Ionicons name="calendar-outline" size={14} color={brandPrimary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
              FROM
            </Text>
            <Text style={[styles.dateValue, { color: colors.text }]} numberOfLines={1}>
              {fromDate ? formatDisplayDate(fromDate) : "Any"}
            </Text>
          </View>
          {fromDate && (
            <TouchableOpacity onPress={() => setFromDate(null)} hitSlop={8}>
              <Ionicons name="close-circle" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowToPicker(true)}
          style={[styles.dateBtn, { backgroundColor: mutedBg, borderColor }]}
        >
          <Ionicons name="calendar-outline" size={14} color={brandPrimary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
              TO
            </Text>
            <Text style={[styles.dateValue, { color: colors.text }]} numberOfLines={1}>
              {toDate ? formatDisplayDate(toDate) : "Any"}
            </Text>
          </View>
          {toDate && (
            <TouchableOpacity onPress={() => setToDate(null)} hitSlop={8}>
              <Ionicons name="close-circle" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>

      {/* Active filters bar */}
      {hasActiveFilters && (
        <View style={styles.activeBar}>
          <Text style={[styles.activeText, { color: colors.textSecondary }]}>
            {list.length} result{list.length === 1 ? "" : "s"}
          </Text>
          <TouchableOpacity onPress={clearAllFilters} hitSlop={6}>
            <Text style={[styles.clearText, { color: brandPrimary }]}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* List */}
      {loading && list.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brandPrimary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading KYC requests...
          </Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(it) => it.id}
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
            <View style={styles.center}>
              <Ionicons
                name="file-tray-outline"
                size={48}
                color={colors.textSecondary}
              />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No KYC requests
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Try adjusting your filters or search.
              </Text>
            </View>
          }
        />
      )}

      {/* Date pickers */}
      {showFromPicker && (
        <DateTimePicker
          value={fromDate ?? new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          maximumDate={toDate ?? new Date()}
          onChange={onFromChange}
        />
      )}

      {showToPicker && (
        <DateTimePicker
          value={toDate ?? new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={fromDate ?? undefined}
          maximumDate={new Date()}
          onChange={onToChange}
        />
      )}

      {Platform.OS === "ios" && (showFromPicker || showToPicker) && (
        <TouchableOpacity
          style={[styles.iosDone, { backgroundColor: brandPrimary }]}
          onPress={() => {
            setShowFromPicker(false);
            setShowToPicker(false);
          }}
        >
          <Text style={styles.iosDoneText}>Done</Text>
        </TouchableOpacity>
      )}

      {/* 3-DOT ACTION MENU */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setMenuVisible(false);
          setMenuKyc(null);
        }}
        statusBarTranslucent
      >
        <Pressable
          style={styles.menuBackdrop}
          onPress={() => {
            setMenuVisible(false);
            setMenuKyc(null);
          }}
        >
          <View
            style={[styles.menuSheet, { backgroundColor: cardBg, borderColor }]}
          >
            <Text style={[styles.menuHeader, { color: colors.textSecondary }]}>
              {menuKyc?.user?.firstName} {menuKyc?.user?.lastName}
            </Text>

            {/* View Details */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setSelectedKyc(menuKyc);
                setDetailsVisible(true);
                setMenuKyc(null);
              }}
            >
              <Ionicons name="eye-outline" size={18} color={brandPrimary} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                View Details
              </Text>
            </TouchableOpacity>

            {/* Approve */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                if (menuKyc) handleApprove(menuKyc);
              }}
            >
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={[styles.menuItemText, { color: "#10B981" }]}>
                Approve
              </Text>
            </TouchableOpacity>

            {/* Reject → opens reject modal */}
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              onPress={() => {
                setRejectKyc(menuKyc);
                setMenuVisible(false);
                setMenuKyc(null);
                setRejectVisible(true);
              }}
            >
              <Ionicons name="close-circle" size={18} color="#EF4444" />
              <Text style={[styles.menuItemText, { color: "#EF4444" }]}>
                Reject
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Details modal — READ ONLY */}
      <ViewKycUserModal
        visible={detailsVisible}
        kyc={selectedKyc}
        onClose={() => {
          setDetailsVisible(false);
          setSelectedKyc(null);
        }}
      />

      {/* Reject modal — user types reason, passed as approvalNotes */}
      <RejectKycModal
        visible={rejectVisible}
        kyc={rejectKyc}
        loading={loading}
        onClose={() => {
          setRejectVisible(false);
          setRejectKyc(null);
        }}
        onSubmit={handleRejectSubmit}
      />
    </LinearGradient>
  );
};

export default KycRequestsScreen;

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  loadingText: { marginTop: 12, fontSize: 13, fontWeight: "600" },
  emptyTitle: { fontSize: 16, fontWeight: "800", marginTop: 12 },
  emptySub: { fontSize: 12.5, fontWeight: "500", marginTop: 4, textAlign: "center" },

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

  filtersRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.4 },

  dateRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingBottom: 12 },
  dateBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  dateLabel: { fontSize: 9.5, fontWeight: "800", letterSpacing: 0.6 },
  dateValue: { fontSize: 12.5, fontWeight: "700", marginTop: 1 },

  activeBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  activeText: { fontSize: 12, fontWeight: "600" },
  clearText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.3 },

  card: { borderRadius: 18, borderWidth: 1, padding: 14 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontWeight: "800", letterSpacing: -0.3 },
  name: { fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  subText: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },
  dotBtn: { padding: 4, marginLeft: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  cardBottom: { flexDirection: "row", alignItems: "center", gap: 14 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11.5, fontWeight: "600" },

  iosDone: {
    position: "absolute",
    right: 16,
    bottom: 32,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  iosDoneText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },

  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  menuSheet: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 16,
    borderWidth: 1,
    padding: 8,
  },
  menuHeader: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(127,127,127,0.2)",
  },
  menuItemText: { fontSize: 14.5, fontWeight: "700" },
});