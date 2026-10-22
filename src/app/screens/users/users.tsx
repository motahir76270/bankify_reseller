import AddUserModal from "@/components/modal/usersManagement/addUserModal";
import EditUserModal from "@/components/modal/usersManagement/editUserModal";
import UserPermissionModal from "@/components/modal/usersManagement/userPermissionModal";
import HeaderSection from "@/components/ui/headerSections";
import { Colors } from "@/constants/theme";
import { FullScreenLoader } from "@/hooks/use-screensLoder";
import { getUsersListApiCall } from "@/redux/slices/userMangementSlice";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  userStatus?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  status?: string;
  roleName?: string;
  roleCode?: string;
  permissions?: any[];
  [key: string]: any;
};

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE" | "SUSPENDED";

const PAGE_SIZE = 10;

const formatDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const UsersScreen = () => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  // Raw users from redux (this gets replaced on every fetch)
  const { usersList, loading } = useSelector((state: any) => state.users);
  const apiUsers: User[] = Array.isArray(usersList) ? usersList : [];

  // Local accumulated list (used for infinite scroll)
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [addVisible, setAddVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [permVisible, setPermVisible] = useState(false);
  const [selected, setSelected] = useState<User | null>(null);

  // Filter states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [showFilters, setShowFilters] = useState(false);

  // Date filters
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Refs to manage race conditions
  const isFetchingRef = useRef(false);
  const currentPageRef = useRef(1);
  const appendedPagesRef = useRef<Set<number>>(new Set());
  const filtersSignatureRef = useRef("");

  const filtersSignature = `${search}|${statusFilter}|${
    fromDate ? formatDate(fromDate) : ""
  }|${toDate ? formatDate(toDate) : ""}`;

  const buildPayload = (pageToFetch: number) => ({
    page: pageToFetch,
    limit: PAGE_SIZE,
    search: search,
    status: statusFilter === "ALL" ? null : statusFilter,
    fromDate: fromDate ? formatDate(fromDate) : "",
    toDate: toDate ? formatDate(toDate) : "",
  });

  // ----- Fetch first page whenever filters change -----
  useEffect(() => {
    // Filters changed → reset everything
    filtersSignatureRef.current = filtersSignature;
    appendedPagesRef.current = new Set([1]);
    currentPageRef.current = 1;
    setPage(1);
    setHasMore(true);
    setLoadingMore(false);

    const timer = setTimeout(async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        // Clear current list immediately so old page-1 data doesn't linger
        setAllUsers([]);
        await getUsersListApiCall(buildPayload(1), dispatch);
      } finally {
        isFetchingRef.current = false;
      }
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, fromDate, toDate]);

  // ----- Sync redux response into local list -----
  useEffect(() => {
    // Only merge if the response matches the current filter signature
    const currentPage = currentPageRef.current;

    if (currentPage === 1) {
      // First page → replace local list
      setAllUsers(apiUsers);
      setHasMore(apiUsers.length >= PAGE_SIZE);
    } else {
      // Next page → append (dedupe by id)
      setAllUsers((prev) => {
        const existingIds = new Set(prev.map((u) => u.id));
        const fresh = apiUsers.filter((u) => !existingIds.has(u.id));
        const merged = [...prev, ...fresh];
        setHasMore(apiUsers.length >= PAGE_SIZE);
        return merged;
      });
    }
    setLoadingMore(false);
  }, [apiUsers]);

  // ----- Load more on scroll -----
  const loadMore = useCallback(async () => {
    if (
      !hasMore ||
      loading ||
      loadingMore ||
      isFetchingRef.current ||
      allUsers.length === 0
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
      await getUsersListApiCall(buildPayload(nextPage), dispatch);
    } finally {
      isFetchingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasMore,
    loading,
    loadingMore,
    allUsers.length,
    search,
    statusFilter,
    fromDate,
    toDate,
  ]);

  const refreshFirstPage = useCallback(async () => {
    appendedPagesRef.current = new Set([1]);
    currentPageRef.current = 1;
    setPage(1);
    setHasMore(true);
    isFetchingRef.current = true;
    try {
      await getUsersListApiCall(buildPayload(1), dispatch);
    } finally {
      isFetchingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, fromDate, toDate]);

  const handleEdit = (user: User) => {
    setSelected(user);
    setEditVisible(true);
  };

  const handlePermissions = (user: User) => {
    setSelected(user);
    setPermVisible(true);
  };

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
    setStatusFilter("ALL");
    setFromDate(null);
    setToDate(null);
  };

  const statusFilters: StatusFilter[] = [
    "ALL",
    "ACTIVE",
    "INACTIVE",
    "SUSPENDED",
  ];

  const hasActiveFilters =
    !!search || statusFilter !== "ALL" || !!fromDate || !!toDate;

  const renderUser = ({ item }: { item: User }) => {
    const initials = `${item.firstName?.[0] ?? ""}${
      item.lastName?.[0] ?? ""
    }`.toUpperCase();

    const status = (item.userStatus ?? item.status ?? "ACTIVE").toUpperCase();
    const isActive = status === "ACTIVE";

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
              {initials || "U"}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]}>
              {item.firstName} {item.lastName}
            </Text>
            <Text style={[styles.email, { color: colors.textMuted }]}>
              {item.email}
            </Text>
          </View>

          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isActive
                  ? "rgba(16,185,129,0.15)"
                  : "rgba(239,68,68,0.15)",
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isActive ? colors.success : colors.error },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: isActive ? colors.success : colors.error },
              ]}
            >
              {status}
            </Text>
          </View>
        </View>

        <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.7}
            onPress={() => handlePermissions(item)}
          >
            <Ionicons
              name="key-outline"
              size={16}
              color={colors.buttonPrimary}
            />
            <Text style={[styles.actionText, { color: colors.text }]}>
              Permissions
            </Text>
          </TouchableOpacity>

          <View
            style={[styles.verticalDivider, { backgroundColor: colors.border }]}
          />

          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.7}
            onPress={() => handleEdit(item)}
          >
            <Ionicons
              name="create-outline"
              size={16}
              color={colors.buttonPrimary}
            />
            <Text style={[styles.actionText, { color: colors.text }]}>
              Edit
            </Text>
          </TouchableOpacity>
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

  const showInitialLoader = loading && allUsers.length === 0;

  return (
    <LinearGradient
     colors={[colors.backgroundTop , colors.backgroundBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }} 
       style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderSection title="Users" />

      {/* Filter Bar */}
      <View
        style={[
          styles.filterBar,
          {
            borderBottomColor: colors.border,
          },
        ]}
      >
        {/* Search row */}
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
              placeholder="Search users..."
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
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

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowFilters((v) => !v)}
            style={[
              styles.filterToggle,
              {
                backgroundColor: showFilters
                  ? colors.buttonPrimary
                  : colors.surfaceTertiary,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={showFilters ? "#FFFFFF" : colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* Filter panel */}
        {showFilters && (
          <>
            {/* Status chips */}
            <View style={styles.chipRow}>
              {statusFilters.map((s) => {
                const active = statusFilter === s;
                return (
                  <TouchableOpacity
                    key={s}
                    activeOpacity={0.7}
                    onPress={() => setStatusFilter(s)}
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
                      {s.charAt(0) + s.slice(1).toLowerCase()}
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
                    styles.dateText,
                    { color: fromDate ? colors.text : colors.textMuted },
                  ]}
                >
                  {fromDate ? formatDate(fromDate) : "From date"}
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
                    styles.dateText,
                    { color: toDate ? colors.text : colors.textMuted },
                  ]}
                >
                  {toDate ? formatDate(toDate) : "To date"}
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

            {/* Clear filters */}
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
          </>
        )}

        {/* Date pickers */}
        {showFromPicker && (
          <DateTimePicker
            value={fromDate ?? new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onFromChange}
            maximumDate={toDate ?? new Date()}
          />
        )}
        {showToPicker && (
          <DateTimePicker
            value={toDate ?? new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onToChange}
            minimumDate={fromDate ?? undefined}
            maximumDate={new Date()}
          />
        )}
      </View>

      {showInitialLoader ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.buttonPrimary} />
        </View>
      ) : (
        <FlatList
          data={allUsers}
          keyExtractor={(item, idx) => item.id ?? String(idx)}
          renderItem={renderUser}
          contentContainerStyle={{
            padding: 6,
            paddingBottom: insets.bottom + 120,
            gap: 0,
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons
                name="people-outline"
                size={40}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {hasActiveFilters ? "No matching users" : "No users yet"}
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

      <AddUserModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSuccess={refreshFirstPage}
      />
      <EditUserModal
        visible={editVisible}
        user={selected}
        onClose={() => {
          setEditVisible(false);
          setSelected(null);
        }}
        onSuccess={refreshFirstPage}
      />
      <UserPermissionModal
        visible={permVisible}
        user={selected}
        onClose={() => {
          setPermVisible(false);
          setSelected(null);
        }}
        onSuccess={refreshFirstPage}
      />

      <FullScreenLoader loading={loading && allUsers.length === 0} />
    </LinearGradient>
  );
};

export default UsersScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 8,
  },
  emptyText: { fontSize: 13, fontWeight: "500" },

  // Filter bar
  filterBar: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchBox: {
    flex: 1,
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
  filterToggle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Date filters
  dateRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
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
  dateText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 12,
    alignSelf: "flex-start",
  },
  clearText: {
    fontSize: 12,
    fontWeight: "700",
  },

  card: { borderRadius: 4, borderWidth: 1, padding: 14 },
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

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 4,
  },
  actionText: { fontSize: 12.5, fontWeight: "600" },
  verticalDivider: { width: StyleSheet.hairlineWidth, height: 20 },

  // Footer loader
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    fontWeight: "500",
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
});