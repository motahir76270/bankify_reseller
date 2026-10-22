import ViewReqBankAccountModal from "@/components/modal/bankAcounts/bankRequest/viewReqBankAccountModal";
import HeaderSection from "@/components/ui/headerSections";
import { Colors } from "@/constants/theme";
import { FullScreenLoader } from "@/hooks/use-screensLoder";
import {
  getPendaingAprovalBankAccountListApiCall,
  udateStatusBankAccountApiCall,
} from "@/redux/slices/bankAccountSlice";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

/* ---------------- Types ---------------- */
type BankAccount = {
  id: string;
  userId: string;
  bankId: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  mobileNumber: string;
  isPrimary: boolean;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  submittedAt: string;
  approvedAt: string | null;
  approvalNotes: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    mobileNumber?: string;
  };
  role?: { roleName?: string; roleCode?: string };
};

type FilterKey = "ALL" | "PENDING" | "VERIFIED" | "REJECTED";

/* ---------------- Helpers ---------------- */
const safe = (v: any, fallback = "—") =>
  v === undefined || v === null || v === "" ? fallback : String(v);

const maskAccount = (acc?: string) => {
  if (!acc) return "—";
  const s = String(acc);
  return s.length <= 4 ? s : `•••• ${s.slice(-4)}`;
};

const statusColor = (status: string) => {
  switch (status) {
    case "VERIFIED":
      return "#22c55e";
    case "REJECTED":
      return "#ef4444";
    case "PENDING":
      return "#f59e0b";
    default:
      return "#94a3b8";
  }
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "ALL", label: "All Accounts" },
  { key: "PENDING", label: "Pending" },
  { key: "VERIFIED", label: "Verified" },
  { key: "REJECTED", label: "Rejected" },
];

/* ---------------- Screen ---------------- */
const PendingAprovalsScreen = () => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const dispatch = useDispatch();
  const { bankAcountReqList, loading } = useSelector(
    (state: any) => state.banks
  );

  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 3-dot menu
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAccount, setMenuAccount] = useState<BankAccount | null>(null);

  // Reject modal
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectAccount, setRejectAccount] = useState<BankAccount | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // View details modal
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewAccount, setViewAccount] = useState<BankAccount | null>(null);

  const list: BankAccount[] = Array.isArray(bankAcountReqList)
    ? bankAcountReqList
    : bankAcountReqList?.data ?? [];

  /* ---------------- API ---------------- */
  const fetchBankAccounts = async (
    status: FilterKey = filter,
    searchText: string = search
  ) => {
    const filterPayload = {
      page: 1,
      status,
      search: searchText.trim(),
    };
    await getPendaingAprovalBankAccountListApiCall(filterPayload, dispatch);
  };

  useEffect(() => {
    fetchBankAccounts(filter, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchBankAccounts(filter, search);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBankAccounts(filter, search);
    setRefreshing(false);
  };

  /* ---------------- View details ---------------- */
  const openViewModal = (account: BankAccount) => {
    setViewAccount(account);
    setViewModalVisible(true);
  };

  const closeViewModal = () => {
    setViewModalVisible(false);
    setViewAccount(null);
  };

  /* ---------------- Menu ---------------- */
  const openMenu = (account: BankAccount) => {
    setMenuAccount(account);
    setMenuVisible(true);
  };

  const closeMenu = () => {
    setMenuVisible(false);
    setMenuAccount(null);
  };

  /* ---------------- Approve ---------------- */
  const handleApprove = async () => {
    if (!menuAccount) return;
    const id = menuAccount.id;
    closeMenu();

    const payload = {
      bankDetailId: id,
      approvalNotes: "",
      rejectionReason: "",
    };
    await udateStatusBankAccountApiCall(payload, "approve", dispatch);
    await fetchBankAccounts(filter, search);
  };

  /* ---------------- Reject ---------------- */
  const openRejectForm = () => {
    if (!menuAccount) return;
    setRejectAccount(menuAccount);
    setRejectionReason("");
    closeMenu();
    setRejectModalVisible(true);
  };

  const closeRejectForm = () => {
    setRejectModalVisible(false);
    setRejectAccount(null);
    setRejectionReason("");
  };

  const submitReject = async () => {
    if (!rejectAccount || !rejectionReason.trim()) return;

    const payload = {
      bankDetailId: rejectAccount.id,
      rejectionReason: rejectionReason.trim(),
    };
    await udateStatusBankAccountApiCall(payload, "reject", dispatch);
    closeRejectForm();
    await fetchBankAccounts(filter, search);
  };

  /* ---------------- Render Item (minimized) ---------------- */
  const renderItem = ({ item }: { item: BankAccount }) => {
    const userName = item.user
      ? `${item.user.firstName ?? ""} ${item.user.lastName ?? ""}`.trim()
      : "Unknown User";

    const sc = statusColor(item.verificationStatus);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => openViewModal(item)}
        style={[
          styles.card,
          {
            backgroundColor: colors.surfaceTertiary,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Left icon */}
        <View
          style={[styles.bankIcon, { backgroundColor: colors.surfacePrimary }]}
        >
          <Ionicons
            name="business-outline"
            size={16}
            color={colors.buttonPrimary}
          />
        </View>

        {/* Middle: bank + holder + acct */}
        <View style={styles.cardMid}>
          <View style={styles.bankRow}>
            <Text
              style={[styles.bankName, { color: colors.text }]}
              numberOfLines={1}
            >
              {safe(item.bankName, "Unknown Bank")}
            </Text>
            {item.isPrimary && (
              <Ionicons
                name="star"
                size={10}
                color={colors.buttonPrimary}
              />
            )}
          </View>

          <Text
            style={[styles.holderName, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {safe(item.accountHolderName, userName)}
          </Text>

          <Text
            style={[styles.acctNum, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {maskAccount(item.accountNumber)} • {safe(item.ifscCode)}
          </Text>
        </View>

        {/* Right: status pill + 3-dot */}
        <View style={styles.cardRight}>
          <View style={[styles.statusPill, { backgroundColor: sc + "22" }]}>
            <View style={[styles.statusDot, { backgroundColor: sc }]} />
            <Text style={[styles.statusText, { color: sc }]}>
              {safe(item.verificationStatus, "PENDING")}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={(e) => {
              e.stopPropagation?.();
              openMenu(item);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.dotsBtn}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={14}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  /* ---------------- UI ---------------- */
  const currentFilter =
    FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const currentFilterColor = statusColor(filter);

  return (
    <LinearGradient       
      colors={[colors.backgroundTop , colors.backgroundBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }} 
       style={[styles.container, { backgroundColor: colors.background }]}>


      <HeaderSection title="Manage Accounts" />

      {/* ---------- Search + Dropdown ---------- */}
      <View style={styles.controlsRow}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.surfaceTertiary,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="search-outline" size={15} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search accounts…"
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            returnKeyType="search"
            onSubmitEditing={() => fetchBankAccounts(filter, search)}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons
                name="close-circle"
                size={15}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setDropdownOpen(true)}
          style={[
            styles.dropdownBtn,
            {
              backgroundColor: colors.surfaceTertiary,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[styles.chipDot, { backgroundColor: currentFilterColor }]}
          />
          <Text
            style={[styles.dropdownText, { color: colors.text }]}
            numberOfLines={1}
          >
            {currentFilter.label}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ---------- List ---------- */}
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{
          padding: 12,
          gap: 8,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.buttonPrimary}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: colors.surfaceTertiary },
                ]}
              >
                <Ionicons
                  name="file-tray-outline"
                  size={28}
                  color={colors.textMuted}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No accounts found
              </Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Try changing filter or search.
              </Text>
            </View>
          ) : null
        }
      />

      {/* ---------- Filter Dropdown ---------- */}
      <Modal
        visible={dropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownOpen(false)}
      >
        <Pressable
          style={styles.dropdownBackdrop}
          onPress={() => setDropdownOpen(false)}
        >
          <View
            style={[
              styles.dropdownCard,
              {
                backgroundColor: colors.surfaceTertiary,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.menuTitle, { color: colors.textMuted }]}>
              Filter by status
            </Text>
            {FILTERS.map((f) => {
              const active = f.key === filter;
              const c = statusColor(f.key);
              return (
                <TouchableOpacity
                  key={f.key}
                  activeOpacity={0.7}
                  onPress={() => {
                    setFilter(f.key);
                    setDropdownOpen(false);
                  }}
                  style={styles.menuItem}
                >
                  <View
                    style={[
                      styles.menuItemIcon,
                      { backgroundColor: c + "22" },
                    ]}
                  >
                    <View style={[styles.chipDot, { backgroundColor: c }]} />
                  </View>
                  <Text
                    style={[
                      styles.menuItemText,
                      {
                        color: colors.text,
                        fontWeight: active ? "700" : "500",
                      },
                    ]}
                  >
                    {f.label}
                  </Text>
                  {active && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={colors.buttonPrimary}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* ---------- 3-dot menu ---------- */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.menuBackdrop} onPress={closeMenu}>
          <View
            style={[
              styles.menuCard,
              {
                backgroundColor: colors.surfaceTertiary,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.menuTitle, { color: colors.textMuted }]}>
              {menuAccount?.bankName}
            </Text>

            {/* View details */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                const acc = menuAccount;
                closeMenu();
                if (acc) openViewModal(acc);
              }}
              style={styles.menuItem}
            >
              <View
                style={[
                  styles.menuItemIcon,
                  { backgroundColor: colors.surfacePrimary },
                ]}
              >
                <Ionicons
                  name="eye-outline"
                  size={14}
                  color={colors.buttonPrimary}
                />
              </View>
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                View Details
              </Text>
            </TouchableOpacity>

            {menuAccount?.verificationStatus !== "VERIFIED" && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleApprove}
                style={styles.menuItem}
              >
                <View
                  style={[
                    styles.menuItemIcon,
                    { backgroundColor: "#22c55e22" },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={14}
                    color="#22c55e"
                  />
                </View>
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  Approve
                </Text>
              </TouchableOpacity>
            )}

            {menuAccount?.verificationStatus !== "REJECTED" && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={openRejectForm}
                style={styles.menuItem}
              >
                <View
                  style={[
                    styles.menuItemIcon,
                    { backgroundColor: "#ef444422" },
                  ]}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={14}
                    color="#ef4444"
                  />
                </View>
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  Reject
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* ---------- Reject form ---------- */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeRejectForm}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeRejectForm}>
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surfaceTertiary,
                borderColor: colors.border,
              },
            ]}
            onPress={() => {}}
          >
            <View style={styles.modalHeader}>
              <View
                style={[styles.modalIcon, { backgroundColor: "#ef444422" }]}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={20}
                  color="#ef4444"
                />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Reject Account
              </Text>
            </View>

            {rejectAccount && (
              <View
                style={[
                  styles.modalPreview,
                  { backgroundColor: colors.surfacePrimary },
                ]}
              >
                <Text style={[styles.previewBank, { color: colors.text }]}>
                  {rejectAccount.bankName}
                </Text>
                <Text style={[styles.previewSub, { color: colors.textMuted }]}>
                  {rejectAccount.accountHolderName} •{" "}
                  {maskAccount(rejectAccount.accountNumber)}
                </Text>
              </View>
            )}

            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
              Rejection Reason *
            </Text>
            <TextInput
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Why is this being rejected?"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.surfacePrimary,
                },
              ]}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={closeRejectForm}
                style={[
                  styles.modalBtn,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surfacePrimary,
                  },
                ]}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={submitReject}
                disabled={!rejectionReason.trim()}
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: "#ef4444",
                    borderColor: "#ef4444",
                    opacity: rejectionReason.trim() ? 1 : 0.5,
                  },
                ]}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                  Reject
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ---------- View details modal ---------- */}
      <ViewReqBankAccountModal
        visible={viewModalVisible}
        onClose={closeViewModal}
        account={viewAccount}
      />

      <FullScreenLoader loading={loading} />
    </LinearGradient>
  );
};

export default PendingAprovalsScreen;

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Search + dropdown row */
  controlsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    maxWidth: 140,
  },
  dropdownText: { fontSize: 12, fontWeight: "600", flexShrink: 1 },

  chipDot: { width: 7, height: 7, borderRadius: 4 },

  /* Minimized card */
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  bankIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  cardMid: { flex: 1, gap: 2 },
  bankRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  bankName: { fontSize: 13, fontWeight: "700", flexShrink: 1 },
  holderName: { fontSize: 11, fontWeight: "500" },
  acctNum: { fontSize: 10, fontWeight: "500" },

  cardRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 9, fontWeight: "700" },

  dotsBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Empty */
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 6 },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 14, fontWeight: "700" },
  emptySub: { fontSize: 12 },

  /* Dropdown modal */
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 130,
    paddingRight: 12,
  },
  dropdownCard: {
    width: 200,
    borderRadius: 12,
    borderWidth: 1,
    padding: 6,
    gap: 2,
  },

  /* Menu */
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  menuCard: {
    width: "100%",
    maxWidth: 260,
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
    gap: 2,
  },
  menuTitle: {
    fontSize: 10,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 8,
  },
  menuItemIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemText: { fontSize: 13, fontWeight: "600", flex: 1 },

  /* Reject modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { fontSize: 14, fontWeight: "700" },
  modalPreview: { borderRadius: 9, padding: 10, gap: 2 },
  previewBank: { fontSize: 12, fontWeight: "700" },
  previewSub: { fontSize: 11, fontWeight: "500" },
  inputLabel: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  input: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    minHeight: 70,
    textAlignVertical: "top",
  },
  modalActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  modalBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 10,
  },
  modalBtnText: { fontSize: 13, fontWeight: "700" },
});