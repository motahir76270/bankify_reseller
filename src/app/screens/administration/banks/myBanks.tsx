import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  useColorScheme,
  Alert,
} from "react-native";
import React, { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import HeaderSection from "@/components/ui/headerSections";
import { Colors } from "@/constants/theme";
import {
  getMyBankListApiCall,
  deleteBankAccountApiCall,
} from "@/redux/slices/bankAccountSlice";
import AddBankModal from "@/components/modal/bankAcounts/myBanks/addBankModal";
import EditBankModal from "@/components/modal/bankAcounts/myBanks/editBankModal";
import { LinearGradient } from "expo-linear-gradient";

type Bank = {
  id: string;
  userId?: string;
  bankId?: string;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  mobileNumber?: string;
  isPrimary?: boolean;
  upiId?: string;
  verificationStatus?: "PENDING" | "APPROVED" | "REJECTED" | string;
  submittedAt?: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  approvalNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
};

const MyBanksScreen = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const { mybankList, loading } = useSelector((state: any) => state?.banks);
  const { user } = useSelector((state: any) => state?.auth);
  const id = user?.user?.id;

  // API shape: { userId, bankDetails: [...], total, primaryBank }
  const banks = useMemo<Bank[]>(() => {
    if (Array.isArray(mybankList?.bankDetails)) return mybankList.bankDetails;
    if (Array.isArray(mybankList)) return mybankList;
    return [];
  }, [mybankList]);

  const primaryBankId = mybankList?.primaryBank?.id ?? null;
  const total = mybankList?.total ?? banks.length;

  // Count pending banks for badge
  const pendingCount = useMemo(
    () =>
      banks.filter(
        (b) => String(b.verificationStatus ?? "").toUpperCase() === "PENDING",
      ).length,
    [banks],
  );

  const [addVisible, setAddVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [selected, setSelected] = useState<Bank | null>(null);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    getMyBankListApiCall(id, dispatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredBanks = useMemo(() => {
    if (!search.trim()) return banks;
    const q = search.trim().toLowerCase();
    return banks.filter(
      (b: Bank) =>
        (b.accountHolderName ?? "").toLowerCase().includes(q) ||
        (b.accountNumber ?? "").toLowerCase().includes(q) ||
        (b.bankName ?? "").toLowerCase().includes(q) ||
        (b.ifscCode ?? "").toLowerCase().includes(q) ||
        (b.mobileNumber ?? "").toLowerCase().includes(q),
    );
  }, [banks, search]);

  const handleEdit = (bank: Bank) => {
    setSelected(bank);
    setEditVisible(true);
  };

  // -------- Delete flow --------
  const performDelete = async (bank: Bank) => {
    setDeletingId(bank.id);
    try {
      const res = await deleteBankAccountApiCall(bank.id, dispatch);
      if (res?.success) {
        // Refresh with the user id so the API returns the latest list
        await getMyBankListApiCall(id, dispatch);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = (bank: Bank) => {
    Alert.alert(
      "Delete Bank Account",
      `Are you sure you want to delete ${
        bank.bankName ?? "this account"
      } ending with ${maskAccount(bank.accountNumber)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => performDelete(bank),
        },
      ],
      { cancelable: true },
    );
  };

  const maskAccount = (acc?: string) => {
    if (!acc) return "-";
    const s = String(acc);
    if (s.length <= 4) return s;
    return "•••• " + s.slice(-4);
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "-";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const getStatusStyle = (status?: string) => {
    const s = (status ?? "").toUpperCase();
    switch (s) {
      case "APPROVED":
        return {
          color: colors.success,
          bg: "rgba(16,185,129,0.15)",
          icon: "checkmark-circle" as const,
        };
      case "REJECTED":
        return {
          color: colors.error,
          bg: "rgba(239,68,68,0.15)",
          icon: "close-circle" as const,
        };
      case "PENDING":
      default:
        return {
          color: "#F59E0B",
          bg: "rgba(245,158,11,0.15)",
          icon: "time" as const,
        };
    }
  };

  const renderBank = ({ item }: { item: Bank }) => {
    const isPrimary = item.isPrimary === true || item.id === primaryBankId;
    const statusStyle = getStatusStyle(item.verificationStatus);
    const isDeleting = deletingId === item.id;
    const blockActions = deletingId !== null;

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: isPrimary ? colors.buttonPrimary : colors.border,
            borderWidth: isPrimary ? 1.5 : 1,
            opacity: isDeleting ? 0.5 : 1,
          },
        ]}
      >
        <View style={styles.cardTop}>
          <View
            style={[styles.avatar, { backgroundColor: colors.surfacePrimary }]}
          >
            <Ionicons
              name="card-outline"
              size={20}
              color={colors.buttonPrimary}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.bankName, { color: colors.text }]}>
              {item.bankName ?? "Bank"}
            </Text>
            <Text style={[styles.accHolder, { color: colors.textMuted }]}>
              {item.accountHolderName ?? "-"}
            </Text>
          </View>

          {isPrimary && (
            <View
              style={[
                styles.primaryPill,
                { backgroundColor: "rgba(16,185,129,0.15)" },
              ]}
            >
              <Ionicons name="star" size={10} color={colors.success} />
              <Text style={[styles.primaryText, { color: colors.success }]}>
                PRIMARY
              </Text>
            </View>
          )}
        </View>

        {/* Verification status */}
        <View style={styles.statusRow}>
          <View
            style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}
          >
            <Ionicons
              name={statusStyle.icon}
              size={12}
              color={statusStyle.color}
            />
            <Text style={[styles.statusText, { color: statusStyle.color }]}>
              {(item.verificationStatus ?? "PENDING").toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
              Account No
            </Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>
              {maskAccount(item.accountNumber)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
              IFSC
            </Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>
              {item.ifscCode ?? "-"}
            </Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
              Branch
            </Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>
              {item.branchName ?? "-"}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
              UPI
            </Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>
              {item.upiId ?? "-"}
            </Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
              Mobile
            </Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>
              {item.mobileNumber ?? "-"}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
              Submitted
            </Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>
              {formatDate(item.submittedAt ?? item.createdAt)}
            </Text>
          </View>
        </View>

        {/* Rejection reason */}
        {String(item.verificationStatus ?? "").toUpperCase() === "REJECTED" &&
          item.rejectionReason && (
            <View
              style={[
                styles.rejectionBox,
                {
                  borderColor: colors.error,
                  backgroundColor: "rgba(239,68,68,0.08)",
                },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={14}
                color={colors.error}
              />
              <Text style={[styles.rejectionText, { color: colors.error }]}>
                {item.rejectionReason}
              </Text>
            </View>
          )}

        {/* Actions: Edit + Delete */}
        <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.7}
            disabled={blockActions}
            onPress={() => handleEdit(item)}
          >
            <Ionicons
              name="create-outline"
              size={16}
              color={blockActions ? colors.textMuted : colors.buttonPrimary}
            />
            <Text
              style={[
                styles.actionText,
                { color: blockActions ? colors.textMuted : colors.text },
              ]}
            >
              Edit
            </Text>
          </TouchableOpacity>

          <View
            style={[styles.verticalDivider, { backgroundColor: colors.border }]}
          />

          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.7}
            disabled={blockActions}
            onPress={() => handleDelete(item)}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <>
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={blockActions ? colors.textMuted : colors.error}
                />
                <Text
                  style={[
                    styles.actionText,
                    { color: blockActions ? colors.textMuted : colors.error },
                  ]}
                >
                  Delete
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const showInitialLoader = loading && banks.length === 0;

  return (
    <LinearGradient
      colors={[colors.backgroundTop, colors.backgroundBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <HeaderSection title="My Banks" />

      {/* Pending Approvals button */}
      <View style={styles.topActionWrapper}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() =>
            router.push("/screens/administration/banks/pendingAprovals")
          }
          style={[
            styles.pendingBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.pendingBtnLeft}>
            <View
              style={[
                styles.pendingIconWrap,
                { backgroundColor: "rgba(245,158,11,0.15)" },
              ]}
            >
              <Ionicons name="time-outline" size={16} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pendingTitle, { color: colors.text }]}>
                Pending Approvals
              </Text>
              <Text
                style={[styles.pendingSubtitle, { color: colors.textMuted }]}
              >
                Review submitted bank requests
              </Text>
            </View>
          </View>

          <View style={styles.pendingBtnRight}>
            {pendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {pendingCount > 99 ? "99+" : pendingCount}
                </Text>
              </View>
            )}
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textMuted}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Search + count */}
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
            placeholder="Search banks..."
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
      </View>

      {showInitialLoader ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.buttonPrimary} />
        </View>
      ) : (
        <FlatList
          data={filteredBanks}
          keyExtractor={(item, idx) => item.id ?? String(idx)}
          renderItem={renderBank}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 120,
            gap: 12,
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons
                name="card-outline"
                size={40}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {search ? "No matching banks" : "No bank accounts yet"}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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

      <AddBankModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSuccess={() => getMyBankListApiCall(id, dispatch)}
      />

      <EditBankModal
        visible={editVisible}
        bank={selected}
        onClose={() => {
          setEditVisible(false);
          setSelected(null);
        }}
        onSuccess={() => getMyBankListApiCall(id, dispatch)}
      />
    </LinearGradient>
  );
};

export default MyBanksScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 8,
  },
  emptyText: { fontSize: 13, fontWeight: "500" },

  // Pending approvals top button
  topActionWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  pendingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  pendingBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  pendingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingTitle: { fontSize: 13.5, fontWeight: "700" },
  pendingSubtitle: { fontSize: 11, fontWeight: "500", marginTop: 1 },
  pendingBtnRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F59E0B",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "800",
  },

  filterBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
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
  countText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  card: { borderRadius: 14, padding: 14 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bankName: { fontSize: 15, fontWeight: "700" },
  accHolder: { fontSize: 12, marginTop: 2, fontWeight: "500" },
  primaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  primaryText: { fontSize: 9.5, fontWeight: "800", letterSpacing: 0.4 },

  statusRow: {
    flexDirection: "row",
    marginTop: 10,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },

  metaGrid: { flexDirection: "row", marginTop: 12, gap: 20 },
  metaItem: { flex: 1 },
  metaLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  metaValue: { fontSize: 13, fontWeight: "700", marginTop: 2 },

  rejectionBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  rejectionText: { fontSize: 12, fontWeight: "600", flex: 1 },

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