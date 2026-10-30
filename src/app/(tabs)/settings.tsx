import { Colors } from "@/constants/theme";
import { getMeApiCall } from "@/redux/slices/authSlice";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
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
type NavItem = {
  id: string;
  label: string;
  subLabel?: string;
  icon: keyof typeof Ionicons.glyphMap;
  value?: string;
  badge?: string;
  badgeColor?: string;
  danger?: boolean;
  routes?: any;
  permissionKey?: string;
};

type Section = {
  id: string;
  title: string;
  titleColor?: string;
  danger?: boolean;
  data: NavItem[];
};

type PermissionEntry = {
  id?: string;
  resource: string;
  action: string;
  source?: string;
  effect?: string;
};

type PermissionsPayload = {
  isSuperAdmin?: boolean;
  role?: PermissionEntry[];
  user?: PermissionEntry[];
};

/* ---------------- Permission requirements per nav item ---------------- */
const PERMISSION_MAP: Record<string, { resource: string; actions: string[] }> =
  {
    users: { resource: "USER", actions: ["READ"] },
    role: { resource: "ROLE", actions: ["READ"] },
    employees: { resource: "EMPLOYEE", actions: ["READ"] },
    departments: { resource: "DEPARTMENT", actions: ["READ"] },
    commission: { resource: "COMMISSION", actions: ["READ", "SET_RULE"] },
    "commission-applicable": { resource: "COMMISSION", actions: ["READ"] },
    "kyc-request": { resource: "KYC", actions: ["READ", "APPROVE"] },
    "my-kyc": { resource: "KYC", actions: ["SUBMIT"] },
    "bank-accounts": { resource: "BANK", actions: ["READ"] },
    ledger: { resource: "LEDGER", actions: ["READ"] },
    reports: { resource: "TRANSACTION", actions: ["READ"] },
    "activity-logs": { resource: "LOGS", actions: ["READ"] },
    server: { resource: "SERVER", actions: ["READ", "UPSERT"] },
    domain: { resource: "DOMAIN", actions: ["READ"] },
    smtp: { resource: "SMTP", actions: ["READ"] },
  };

/* ---------------- Data ---------------- */
const SECURITY_ITEMS: NavItem[] = [
  {
    id: "sec-users",
    label: "Users",
    subLabel: "Manage users",
    icon: "people-outline",
    routes: "/screens/users/users",
    permissionKey: "users",
  },
  {
    id: "sec-role",
    label: "Role",
    subLabel: "Access control",
    icon: "shield-checkmark-outline",
    routes: "/screens/users/role",
    permissionKey: "role",
  },
];

const EMPLOYEES_ITEMS: NavItem[] = [
  {
    id: "emp-employees",
    label: "Employees",
    subLabel: "Manage employees",
    icon: "id-card-outline",
    routes: "/screens/employees/employees",
    permissionKey: "employees",
  },
  {
    id: "emp-departments",
    label: "Departments",
    subLabel: "Team structure",
    icon: "git-branch-outline",
    routes: "/screens/employees/department",
    permissionKey: "departments",
  },
];

const ADMINISTRATION_ITEMS: NavItem[] = [
  {
    id: "adm-commission",
    label: "Commission",
    subLabel: "Commission rules",
    icon: "pricetag-outline",
    routes: "/screens/administration/commission/rules",
    permissionKey: "commission",
  },
  {
    id: "adm-commission-applicable",
    label: "Commission Applicable",
    subLabel: "Applied rules",
    icon: "checkmark-done-outline",
    routes: "/screens/administration/commission/applicable",
    permissionKey: "commission-applicable",
  },
  {
    id: "adm-kyc-request",
    label: "KYC Request",
    subLabel: "User KYC requests",
    icon: "document-text-outline",
    routes: "/screens/administration/kyc/kycRequests",
    permissionKey: "kyc-request",
  },
  {
    id: "adm-my-kyc",
    label: "My KYC Profile",
    subLabel: "Your KYC status",
    icon: "person-circle-outline",
    routes: "/screens/administration/kyc/myKyc",
    permissionKey: "my-kyc",
  },
  {
    id: "adm-bank-accounts",
    label: "Bank Accounts",
    subLabel: "Statements & receipts",
    icon: "card-outline",
    routes: "/screens/administration/banks/myBanks",
    permissionKey: "bank-accounts",
  },
  {
    id: "adm-ledger",
    label: "Ledger",
    subLabel: "Offers & alerts",
    icon: "book-outline",
    routes: "/screens/administration/ledger",
    permissionKey: "ledger",
  },
  {
    id: "adm-reports",
    label: "Reports",
    subLabel: "Analytics & summaries",
    icon: "bar-chart-outline",
    routes: "/screens/administration/reports/reportTypes",
    permissionKey: "reports",
  },
  {
    id: "adm-activity-logs",
    label: "Activity Logs",
    subLabel: "Recent activity",
    icon: "time-outline",
    routes: "/screens/administration/auditLogs",
    permissionKey: "activity-logs",
  },
];

const PRIVACY_ITEMS: NavItem[] = [
  { id: "privacy-policy", label: "Privacy Policy", icon: "shield-outline" },
  { id: "terms", label: "Terms of Service", icon: "reader-outline" },
  {
    id: "contact-support",
    label: "Contact Support",
    subLabel: "Manage your data",
    icon: "headset-outline",
  },
];

const CONFIGURATION_ITEMS: NavItem[] = [
  // {
  //   id: "cfg-server",
  //   label: "Server",
  //   icon: "server-outline",
  //   routes: "/screens/config/server",
  //   permissionKey: "server",
  // },
  {
    id: "cfg-domain",
    label: "Domain",
    subLabel: "Avg. response: 2h",
    icon: "globe-outline",
    routes: "/screens/config/domain",
    permissionKey: "domain",
  },
  {
    id: "cfg-smtp",
    label: "SMTP",
    icon: "mail-outline",
    routes: "/screens/config/smtp",
    permissionKey: "smtp",
  },
];

/* ---------------- Screen ---------------- */
const SettingsScreen = () => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const { user, loading } = useSelector((state: any) => state.auth);

  // Pull-to-refresh state (kept separate from global `loading`)
  const [refreshing, setRefreshing] = useState(false);

  const borderColor = isDark ? "#242838" : "#EEF0F4";
  const brandPrimary = isDark ? "#7C6BFF" : "#4F46E5";

  /* ---------------- Fetch user ---------------- */
  const fetchMe = useCallback(async () => {
    await getMeApiCall(dispatch);
  }, [dispatch]);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  /* ---------------- Pull-to-refresh handler ---------------- */
  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchMe();
    } finally {
      setRefreshing(false);
    }
  }, [fetchMe]);

  /* ---------------- Permissions payload ---------------- */
  const permissionsPayload: PermissionsPayload | undefined =
    user?.permissions ?? user?.data?.permissions;

  const isSuperAdmin = permissionsPayload?.isSuperAdmin === true;

  const userPermissions: PermissionEntry[] = permissionsPayload?.user ?? [];

  /* ---------------- O(1) lookup set (user perms only) ---------------- */
  const permissionSet = useMemo(() => {
    return new Set(
      userPermissions
        .filter(
          (p) =>
            p &&
            typeof p.resource === "string" &&
            typeof p.action === "string" &&
            (p.effect == null || p.effect === "ALLOW")
        )
        .map((p) => `${p.resource.trim()}:${p.action.trim()}`)
    );
  }, [userPermissions]);

  /* ---------------- Permission gate ---------------- */
  const hasPermission = useCallback(
    (item: NavItem): boolean => {
      if (isSuperAdmin) return true;
      if (!item.permissionKey) return true;

      const req = PERMISSION_MAP[item.permissionKey];
      if (!req) return true;

      return req.actions.some((action) =>
        permissionSet.has(`${req.resource}:${action}`)
      );
    },
    [permissionSet, isSuperAdmin]
  );

  const handleRowPress = useCallback(
    (item: NavItem) => {
      if (!item?.routes) return;
      if (!hasPermission(item)) return;
      router.push(item.routes);
    },
    [hasPermission]
  );

  /* ---------------- Sections ---------------- */
  const allSections: Section[] = useMemo(
    () => [
      { id: "security", title: "Users", data: SECURITY_ITEMS },
      { id: "employees", title: "Employees", data: EMPLOYEES_ITEMS },
      {
        id: "administration",
        title: "Administration",
        data: ADMINISTRATION_ITEMS,
      },
      { id: "privacy", title: "Privacy & Help", data: PRIVACY_ITEMS },
      {
        id: "configuration",
        title: "Configuration",
        data: CONFIGURATION_ITEMS,
      },
    ],
    []
  );

  const visibleSections: Section[] = useMemo(() => {
    return allSections
      .map((section) => ({
        ...section,
        data: section.data.filter(hasPermission),
      }))
      .filter((section) => section.data.length > 0);
  }, [allSections, hasPermission]);

  /* ---------------- Row ---------------- */
  const renderRow = (item: NavItem, isLast: boolean, rowKey: string) => {
    const iconColor = item.danger ? "#EF4444" : brandPrimary;
    const iconBg = item.danger ? "rgba(239,68,68,0.10)" : `${brandPrimary}14`;

    return (
      <View key={rowKey}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.row}
          onPress={() => handleRowPress(item)}
          accessibilityRole="button"
          accessibilityLabel={item.label}
        >
          <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
            <Ionicons name={item.icon} size={15} color={iconColor} />
          </View>

          <View style={styles.rowContent}>
            <Text
              style={[
                styles.rowLabel,
                { color: item.danger ? "#EF4444" : colors.text },
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
            {item.subLabel && (
              <Text
                style={[styles.rowSubLabel, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {item.subLabel}
              </Text>
            )}
          </View>

          {item.badge ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: "rgba(16,185,129,0.12)" },
              ]}
            >
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          ) : null}

          {item.value && (
            <Text style={[styles.rowValue, { color: colors.textSecondary }]}>
              {item.value}
            </Text>
          )}

          <Ionicons
            name="chevron-forward"
            size={15}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {!isLast && (
          <View style={[styles.divider, { backgroundColor: borderColor }]} />
        )}
      </View>
    );
  };

  /* ---------------- Section ---------------- */
  const renderSection = ({ item: section }: { item: Section }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {section.title}
      </Text>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: section.danger
              ? "rgba(239,68,68,0.2)"
              : borderColor,
          },
        ]}
      >
        {section.data.map((row, index) =>
          renderRow(
            row,
            index === section.data.length - 1,
            `${section.id}-${row.id}`
          )
        )}
      </View>
    </View>
  );

  /* ---------------- Header ---------------- */
  const listHeader = (
    <View style={styles.header}>
      <View>
        <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>
          Preferences
        </Text>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Settings
        </Text>
      </View>
    </View>
  );

  /* ---------------- Loading (initial only) ---------------- */


  return (
    <LinearGradient
      colors={[colors.backgroundTop, colors.backgroundBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <FlatList
        data={visibleSections}
        extraData={permissionSet}
        keyExtractor={(item) => item.id}
        renderItem={renderSection}
        ListHeaderComponent={listHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 80,
        }}
        removeClippedSubviews
        initialNumToRender={6}
        windowSize={10}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={brandPrimary}
            colors={[brandPrimary]}
            progressBackgroundColor={colors.card}
          />
        }
      />
    </LinearGradient>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },

  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginTop: 1,
  },

  section: {
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 6,
    marginLeft: 2,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    gap: 10,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: "600" },
  rowSubLabel: { fontSize: 11, fontWeight: "500", marginTop: 1 },
  rowValue: { fontSize: 12, fontWeight: "600", marginRight: 2 },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
    color: "#10B981",
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 40 },
});