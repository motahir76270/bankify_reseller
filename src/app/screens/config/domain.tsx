import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import React, { useCallback, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HeaderSection from "@/components/ui/headerSections";
import { Colors } from "@/constants/theme";
import { getDomainDataApiCall } from "@/redux/slices/configuration/domainSlice";
import { LinearGradient } from "expo-linear-gradient";

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
const formatDate = (iso?: string | null) => {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
};

const statusColors = (status?: string) => {
  const s = (status ?? "").toUpperCase();
  if (s === "ACTIVE") return { bg: "rgba(16,185,129,0.15)", fg: "#10B981" };
  if (s === "INACTIVE") return { bg: "rgba(239,68,68,0.15)", fg: "#EF4444" };
  if (s === "PENDING") return { bg: "rgba(245,158,11,0.15)", fg: "#F59E0B" };
  return { bg: "rgba(107,114,128,0.15)", fg: "#6B7280" };
};

// ----------------------------------------------------------------
// Screen
// ----------------------------------------------------------------
const DomainScreen = () => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const { user } = useSelector((state: any) => state.auth);
  const { domainData, loading } = useSelector((state: any) => state.domain);

  const tenantId = user?.tenant?.id;

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    await getDomainDataApiCall(tenantId, dispatch);
  }, [tenantId, dispatch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const domains: any[] = Array.isArray(domainData)
    ? domainData
    : domainData
    ? [domainData]
    : [];

  // ----------------------------------------------------------------
  // Loading
  // ----------------------------------------------------------------
  if (loading && domains.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <HeaderSection title="Domain Manage" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.buttonPrimary} />
        </View>
      </View>
    );
  }

  return (
    <LinearGradient
       colors={[colors.backgroundTop , colors.backgroundBottom]}
       start={{ x: 0, y: 0 }}
       end={{ x: 1, y: 1 }} 
       style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderSection title="Domain Manage" />

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 40,
          gap: 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        {domains.length === 0 ? (
          // ---------- EMPTY ----------
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: colors.surfacePrimary },
              ]}
            >
              <Ionicons
                name="globe-outline"
                size={28}
                color={colors.buttonPrimary}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Domain Found
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              No domain has been configured yet.
            </Text>
          </View>
        ) : (
          domains.map((item, idx) => {
            const sc = statusColors(item?.status);
            return (
              <View
                key={item?.id ?? idx}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                {/* -------- Header -------- */}
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: colors.surfacePrimary },
                    ]}
                  >
                    <Ionicons
                      name="globe"
                      size={18}
                      color={colors.buttonPrimary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.cardTitle, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {item?.domainName ?? "-"}
                    </Text>
                    {!!item?.tenantNumber && (
                      <Text
                        style={[
                          styles.cardSubtitle,
                          { color: colors.textMuted },
                        ]}
                        numberOfLines={1}
                      >
                        Tenant: {item.tenantNumber}
                      </Text>
                    )}
                  </View>

                  {/* Status pill */}
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: sc.bg },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: sc.fg },
                      ]}
                    />
                    <Text style={[styles.statusText, { color: sc.fg }]}>
                      {item?.status ?? "UNKNOWN"}
                    </Text>
                  </View>
                </View>

                {/* -------- Divider -------- */}
                <View
                  style={[
                    styles.divider,
                    { borderTopColor: colors.border },
                  ]}
                />

                {/* -------- Details -------- */}
                <View style={styles.detailsWrap}>
                  <DetailRow
                    label="Domain Name"
                    value={item?.domainName}
                    colors={colors}
                  />
                  <DetailRow
                    label="Domain ID"
                    value={item?.id}
                    colors={colors}
                    mono
                  />
                  <DetailRow
                    label="Server Detail ID"
                    value={item?.serverDetailId}
                    colors={colors}
                    mono
                  />
                  <DetailRow
                    label="Tenant ID"
                    value={item?.tenantId}
                    colors={colors}
                    mono
                  />
                  <DetailRow
                    label="Tenant Number"
                    value={item?.tenantNumber}
                    colors={colors}
                  />
                  <DetailRow
                    label="Status"
                    value={item?.status}
                    colors={colors}
                  />
                  <DetailRow
                    label="Created By"
                    value={
                      item?.createdBy
                        ? `${item.createdBy.type} • ${item.createdBy.userNumber}`
                        : "-"
                    }
                    colors={colors}
                  />
                  <DetailRow
                    label="Created By User ID"
                    value={item?.createdByUserId}
                    colors={colors}
                    mono
                  />
                  <DetailRow
                    label="Created By Employee ID"
                    value={item?.createdByEmployeeId}
                    colors={colors}
                  />
                  <DetailRow
                    label="Action Reason"
                    value={item?.actionReason}
                    colors={colors}
                  />
                  <DetailRow
                    label="Actioned At"
                    value={formatDate(item?.actionedAt)}
                    colors={colors}
                  />
                  <DetailRow
                    label="Created At"
                    value={formatDate(item?.createdAt)}
                    colors={colors}
                  />
                  <DetailRow
                    label="Updated At"
                    value={formatDate(item?.updatedAt)}
                    colors={colors}
                    last
                  />
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </LinearGradient>
  );
};

// ----------------------------------------------------------------
// Detail row
// ----------------------------------------------------------------
const DetailRow = ({
  label,
  value,
  colors,
  mono = false,
  last = false,
}: {
  label: string;
  value?: string | null;
  colors: any;
  mono?: boolean;
  last?: boolean;
}) => (
  <View
    style={[
      styles.detailRow,
      !last && {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      },
    ]}
  >
    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
      {label}
    </Text>
    <Text
      style={[
        styles.detailValue,
        {
          color: colors.text,
          fontFamily: mono ? "monospace" : undefined,
        },
      ]}
      numberOfLines={2}
      selectable
    >
      {value || "-"}
    </Text>
  </View>
);

export default DomainScreen;

// ----------------------------------------------------------------
// Styles
// ----------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardSubtitle: { fontSize: 12, fontWeight: "500", marginTop: 2 },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.4 },

  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
    marginBottom: 4,
  },

  detailsWrap: { marginTop: 4 },

  detailRow: {
    paddingVertical: 10,
    gap: 4,
  },
  detailLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Empty
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptySubtitle: { fontSize: 13, textAlign: "center" },
});