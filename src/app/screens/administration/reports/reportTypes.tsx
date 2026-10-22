import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/theme";
import HeaderSection from "@/components/ui/headerSections";
import { LinearGradient } from "expo-linear-gradient";

type ReportType = {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const REPORT_TYPES: ReportType[] = [
  {
    key: "transactions",
    title: "Transactions",
    subtitle: "All service transactions",
    icon: "swap-horizontal-outline",
    color: "#4F46E5",
  },
  {
    key: "ledger",
    title: "Ledger",
    subtitle: "Wallet credit / debit entries",
    icon: "book-outline",
    color: "#10B981",
  },
  {
    key: "earnings",
    title: "Earnings",
    subtitle: "Commission, surcharge, TDS, GST",
    icon: "trending-up-outline",
    color: "#F59E0B",
  },
  {
    key: "refunds",
    title: "Refunds",
    subtitle: "Refund history",
    icon: "refresh-circle-outline",
    color: "#8B5CF6",
  },
];

const ReportsScreen = () => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const cardBg = colors.card;
  const mutedBg = isDark ? "#1A1D2A" : "#F8FAFC";
  const borderColor = colors.border;
  const brandPrimary = isDark ? "#7C6BFF" : "#4F46E5";

  return (
    <LinearGradient
      colors={[colors.backgroundTop , colors.backgroundBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }} 
       style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderSection title="Reports" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16 }}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Choose a report
        </Text>
        <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
          View detailed history across all your services
        </Text>

        <View style={styles.grid}>
          {REPORT_TYPES.map((r) => (
            <TouchableOpacity
              key={r.key}
              activeOpacity={0.8}
              style={[
                styles.card,
                { backgroundColor: cardBg, borderColor },
              ]}
              onPress={() =>
                router.push(
                  `/screens/administration/reports/${r.key}` as any,
                )
              }
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: `${r.color}20` },
                ]}
              >
                <Ionicons name={r.icon} size={22} color={r.color} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {r.title}
              </Text>
              <Text
                style={[styles.cardSub, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {r.subtitle}
              </Text>

              <View style={styles.cardFooter}>
                <Text style={[styles.openText, { color: r.color }]}>
                  Open
                </Text>
                <Ionicons name="arrow-forward" size={14} color={r.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

export default ReportsScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  sectionSub: {
    fontSize: 12.5,
    fontWeight: "500",
    marginTop: 4,
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    width: "48%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    letterSpacing: -0.2,
    marginTop: 4,
  },
  cardSub: {
    fontSize: 11.5,
    fontWeight: "500",
    lineHeight: 15,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  openText: { fontSize: 11.5, fontWeight: "800", letterSpacing: 0.3 },
});