import { Colors } from "@/constants/theme";
import { logoutApiCall } from "@/redux/slices/authSlice";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

/* ---------------- Types ---------------- */
type DetailRow = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type DetailCardProps = {
  title: string;
  titleIcon: keyof typeof Ionicons.glyphMap;
  rows: DetailRow[];
  footer?: React.ReactNode;
  colors: (typeof Colors)["light"] | (typeof Colors)["dark"];
};

/* ---------------- Helpers ---------------- */
const safe = (v: any, fallback = "Not provided") => {
  if (v === undefined || v === null || v === "") return fallback;
  if (typeof v === "boolean") return v ? "YES" : "NO";
  return String(v);
};

const formatMoney = (v: any) => {
  if (v === undefined || v === null) return "₹ —";
  const n = Number(v);
  if (Number.isNaN(n)) return "₹ —";
  return `₹ ${n.toLocaleString("en-IN")}`;
};

const getInitials = (firstName?: string, lastName?: string) => {
  const f = firstName?.[0] ?? "";
  const l = lastName?.[0] ?? "";
  return (f + l).toUpperCase() || "?";
};

/* ---------------- Card Component ---------------- */
const DetailCard: React.FC<DetailCardProps> = ({
  title,
  titleIcon,
  rows,
  footer,
  colors,
}) => (
  <View
    style={[
      styles.card,
      {
        backgroundColor: colors.card,
        borderColor: colors.border,
      },
    ]}
  >
    <View style={styles.cardHeader}>
      <Ionicons name={titleIcon} size={14} color={colors.buttonPrimary} />
      <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
    </View>

    {rows.length > 0 && (
      <View style={styles.rowsWrap}>
        {rows.map((row, i) => (
          <View key={`${row.label}-${i}`} style={styles.row}>
            <View
              style={[
                styles.rowIcon,
                { backgroundColor: colors.card },
              ]}
            >
              <Ionicons
                name={row.icon}
                size={13}
                color={colors.buttonPrimary}
              />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: colors.textMuted }]}>
                {row.label}
              </Text>
              <Text
                style={[styles.rowValue, { color: colors.text }]}
                numberOfLines={1}
              >
                {row.value}
              </Text>
            </View>
          </View>
        ))}
      </View>
    )}

    {footer}
  </View>
);

/* ---------------- Screen ---------------- */
const ProfileDetailsScreen = () => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const userData = useSelector((state: any) => state.auth?.user);

  const profile = userData?.user ?? {};
  const tenant = userData?.tenant ?? {};
  const role = userData?.role ?? {};
  const mainWallet = userData?.wallets?.MAIN ?? {};

  const fullName =
    `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() ||
    "Not provided";

  const walletBalance =
    mainWallet.balance ?? mainWallet.availableBalance ?? undefined;

  const initials = getInitials(profile.firstName, profile.lastName);

  return (
    <LinearGradient 
      colors={[colors.backgroundTop , colors.backgroundBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}  style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 32,
        }}
      >
        {/* ============ Header (Tab) ============ */}
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 10,
              backgroundColor: colors.card,
              borderBottomColor: colors.border,
            },
          ]}
        >
          {/* Avatar */}
          <View
            style={[styles.avatar, { backgroundColor: colors.buttonPrimary }]}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          {/* Name + Email */}
          <View style={styles.headerInfo}>
            <Text
              style={[styles.headerName, { color: colors.text }]}
              numberOfLines={1}
            >
              {fullName}
            </Text>
            <Text
              style={[styles.headerSub, { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {safe(profile.email, "—")}
            </Text>
          </View>

          {/* Balance pill on the right */}
          <View
            style={[
              styles.balancePill,
              { backgroundColor: colors.surfacePrimary },
            ]}
          >
            <Ionicons
              name="wallet-outline"
              size={12}
              color={colors.buttonPrimary}
            />
            <Text style={[styles.balanceText, { color: colors.text }]}>
              {/* {formatMoney(walletBalance)} */}
            </Text>
          </View>
        </View>

        {/* ============ Body ============ */}
        <View style={styles.body}>
          {/* User Information */}
          <DetailCard
            colors={colors}
            title="User Information"
            titleIcon="person-outline"
            rows={[
              {
                label: "Full Name",
                value: safe(fullName),
                icon: "person-outline",
              },
              {
                label: "User Number",
                value: safe(profile.userNumber),
                icon: "key-outline",
              },
              {
                label: "Email",
                value: safe(profile.email),
                icon: "mail-outline",
              },
              {
                label: "Mobile",
                value: safe(profile.mobileNumber),
                icon: "call-outline",
              },
            ]}
          />

          {/* Wallet */}
          <DetailCard
            colors={colors}
            title="Wallet"
            titleIcon="wallet-outline"
            rows={[
              {
                label: "Balance",
                value: formatMoney(walletBalance),
                icon: "cash-outline",
              },
              {
                label: "Blocked Amount",
                value: formatMoney(mainWallet.blockedAmount),
                icon: "lock-closed-outline",
              },
              {
                label: "Wallet Status",
                value: safe(mainWallet.status),
                icon: "settings-outline",
              },
            ]}
          />

          {/* Role & Access */}
          <DetailCard
            colors={colors}
            title="Role & Access"
            titleIcon="shield-outline"
            rows={[
              {
                label: "Role Name",
                value: safe(role.roleName),
                icon: "person-outline",
              },
              {
                label: "Role Code",
                value: safe(role.roleCode),
                icon: "key-outline",
              },
              {
                label: "Role Level",
                value: safe(role.roleLevel),
                icon: "settings-outline",
              },
              {
                label: "System Role",
                value: safe(role.isSystem),
                icon: "settings-outline",
              },
            ]}
          />

          {/* Tenant Information */}
          <DetailCard
            colors={colors}
            title="Tenant Information"
            titleIcon="business-outline"
            rows={[
              {
                label: "Tenant Name",
                value: safe(tenant.tenantName),
                icon: "business-outline",
              },
              {
                label: "Tenant Number",
                value: safe(tenant.tenantNumber),
                icon: "key-outline",
              },
              {
                label: "Tenant Email",
                value: safe(tenant.tenantEmail),
                icon: "mail-outline",
              },
              {
                label: "WhatsApp",
                value: safe(tenant.tenantWhatsapp),
                icon: "logo-whatsapp",
              },
              {
                label: "Tenant Type",
                value: safe(tenant.tenantType),
                icon: "person-outline",
              },
              {
                label: "User Type",
                value: safe(tenant.userType),
                icon: "person-outline",
              },
            ]}
          />

          {/* System */}
          <DetailCard
            colors={colors}
            title="System"
            titleIcon="settings-outline"
            rows={[
              {
                label: "User ID",
                value: safe(profile.id),
                icon: "key-outline",
              },
              {
                label: "Tenant ID",
                value: safe(tenant.id),
                icon: "key-outline",
              },
            ]}
          />

          {/* Security */}
          <DetailCard
            colors={colors}
            title="Security"
            titleIcon="lock-closed-outline"
            rows={[]}
            footer={
              <View style={styles.securityFooter}>
                <Text
                  style={[styles.securityHint, { color: colors.textMuted }]}
                >
                  Update your account password securely.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[
                    styles.actionBtn,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surfacePrimary,
                    },
                  ]}
                  onPress={() => {
                    router.push("/screens/changePassword" as any);
                  }}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={14}
                    color={colors.text}
                  />
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>
                    Change Password
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[
                    styles.actionBtn,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surfacePrimary,
                    },
                  ]}
                  onPress={async () => {
                    await logoutApiCall(dispatch);
                  }}
                >
                  <Ionicons
                    name="log-out-outline"
                    size={14}
                    color={colors.error}
                  />
                  <Text
                    style={[styles.actionBtnText, { color: colors.error }]}
                  >
                    Logout
                  </Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

export default ProfileDetailsScreen;

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* Header (Tab) */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 15,
    fontWeight: "700",
  },
  headerSub: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  balanceText: {
    fontSize: 12,
    fontWeight: "700",
  },

  /* Body */
  body: {
    padding: 12,
    gap: 10,
  },

  /* Card */
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  rowsWrap: {
    gap: 10,
    backdropFilter:'2'
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth:1,
    borderColor:"#dadada",
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 1,
  },

  /* Security Footer */
  securityFooter: {
    gap: 8,
  },
  securityHint: {
    fontSize: 11,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 9,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
});