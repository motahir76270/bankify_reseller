import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback } from "react";
import {
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
};

type Section = {
  id: string;
  title: string;
  titleColor?: string;
  danger?: boolean;
  data: NavItem[];
};

/* ---------------- Data with proper icons ---------------- */
const SECURITY_ITEMS: NavItem[] = [
  {
    id: "1",
    label: "Users",
    subLabel: "Manage users",
    icon: "people-outline",
    routes: "/screens/users/users",
  },
  {
    id: "2",
    label: "Role",
    subLabel: "Access control",
    icon: "shield-checkmark-outline",
    routes: "/screens/users/role",
  },
];

const EMPLOYEES_ITEMS: NavItem[] = [
  {
    id: "1",
    label: "Employees",
    subLabel: "Manage employees",
    icon: "id-card-outline",
    routes: "/screens/employees/employees",
  },
  {
    id: "2",
    label: "Departments",
    subLabel: "Team structure",
    icon: "git-branch-outline",
    routes: "/screens/employees/department",
  },
];

const ADMINISTRATION_ITEMS: NavItem[] = [
  {
    id: "10",
    label: "Commission",
    subLabel: "Commission rules",
    icon: "pricetag-outline",
    routes: "/screens/administration/commission/rules",
  },
  {
    id: "11",
    label: "Commission Applicable",
    subLabel: "Applied rules",
    icon: "checkmark-done-outline",
    routes: "/screens/administration/commission/applicable",
  },
  {
    id: "0",
    label: "KYC Request",
    subLabel: "User KYC requests",
    icon: "document-text-outline",
    routes: "/screens/administration/kyc/kycRequests",
  },
  {
    id: "1",
    label: "My KYC Profile",
    subLabel: "Your KYC status",
    icon: "person-circle-outline",
    routes: "/screens/administration/kyc/myKyc",
  },
  {
    id: "2",
    label: "Bank Accounts",
    subLabel: "Statements & receipts",
    icon: "card-outline",
    routes: "/screens/administration/banks/myBanks",
  },
  {
    id: "3",
    label: "Ledger",
    subLabel: "Offers & alerts",
    icon: "book-outline",
    routes: "/screens/administration/ledger",
  },
  {
    id: "5",
    label: "Reports",
    subLabel: "Analytics & summaries",
    icon: "bar-chart-outline",
    routes: "/screens/administration/reports/reportTypes",
  },
  {
    id: "6",
    label: "Activity Logs",
    subLabel: "Recent activity",
    icon: "time-outline",
    routes: "/screens/administration/auditLogs",
  },
];

const PRIVACY_ITEMS: NavItem[] = [
  {
    id: "1564",
    label: "Privacy Policy",
    icon: "shield-outline",
  },
  {
    id: "265",
    label: "Terms of Service",
    icon: "reader-outline",
  },
  {
    id: "3546",
    label: "Contact Support",
    subLabel: "Manage your data",
    icon: "headset-outline",
  },
];

const CONFIGURATION_ITEMS: NavItem[] = [
  {
    id: "17",
    label: "Server",
    icon: "server-outline",
    routes: "/screens/config/server",
  },
  {
    id: "72",
    label: "Domain",
    subLabel: "Avg. response: 2h",
    icon: "globe-outline",
    routes: "/screens/config/domain",
  },
  {
    id: "367",
    label: "SMTP",
    icon: "mail-outline",
    routes: "/screens/config/smtp",
  },
];

/* ---------------- Screen ---------------- */
const SettingsScreen = () => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const borderColor = isDark ? "#242838" : "#EEF0F4";
  const brandPrimary = isDark ? "#7C6BFF" : "#4F46E5";


  const handleRowPress = useCallback((item: NavItem) => {
    if (item?.routes) return router.push(item.routes);
  }, []);


  /* ---------------- Sections ---------------- */
  const sections: Section[] = [
    { id: "security", title: "Users", data: SECURITY_ITEMS },
    { id: "employees", title: "Employees", data: EMPLOYEES_ITEMS },
    { id: "administration", title: "Administration", data: ADMINISTRATION_ITEMS },
    { id: "privacy", title: "Privacy & Help", data: PRIVACY_ITEMS },
    { id: "configuration", title: "Configuration", data: CONFIGURATION_ITEMS },
  ];

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
              style={[styles.badge, { backgroundColor: "rgba(16,185,129,0.12)" }]}
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
            borderColor: section.danger ? "rgba(239,68,68,0.2)" : borderColor,
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
      </View>

    </View>
  );

  return (
    <LinearGradient 
      colors={[colors.backgroundTop , colors.backgroundBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }} 
       style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <FlatList
        data={sections}
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
      />
    </LinearGradient>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },

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
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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

  footer: { alignItems: "center", marginTop: 6, gap: 6 },
  footerText: { fontSize: 11, fontWeight: "500", letterSpacing: 0.2 },
  footerLinks: { flexDirection: "row", alignItems: "center", gap: 8 },
  footerLink: { fontSize: 11.5, fontWeight: "700" },
  footerDot: { width: 3, height: 3, borderRadius: 1.5, opacity: 0.5 },
});