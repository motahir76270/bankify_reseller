import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import Svg, {
  Circle,
  Defs,
  LinearGradient as Linear,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";

import { checkFundStatusApiCall } from "@/redux/slices/addFundSlice";
import { getMeApiCall } from "@/redux/slices/authSlice";
import { PrevioutKycApiCall } from "@/redux/slices/profileKycSlice";
import { getDashboardDataApiCall } from "@/redux/slices/serviceSlice";

import AddFundModal from "@/components/modal/addFund/minFundFormModal";
import PendingStatusModal from "@/components/modal/addFund/pendingFundModal";
import KycAlertModal from "@/components/modal/profileKyc/kycAlertModal";
import UserProfileModal from "@/components/modal/userPorfileModal";
import { LinearGradient } from "expo-linear-gradient";
import { showError } from "@/components/service/AlertService";
import { FullScreenLoader } from "@/hooks/use-screensLoder";

/* ---------------- Types ---------------- */
type WalletBalance = {
  availableBalance: number;
  totalBalance: number;
  blockedBalance: number;
  tdsBalance: number;
  gstBalance: number;
};

type DashboardData = {
  role: string;
  userId: string;
  hierarchy: { visibleUserCount: number };
  filters: { fromDate: string; toDate: string };
  wallet: { own: WalletBalance; downline: WalletBalance; total: WalletBalance };
  bankVerification: { pending: number; data: any[] };
  kyc: { total: number; pending: number; verified: number; rejected: number };
  activeSummary: { activeUsers: number; activeTenants: number };
  transactions: {
    total: number;
    totalAmount: number;
    success: number;
    pending: number;
    processing: number;
    failed: number;
    refunded: number;
  };
  services: Record<
    string,
    {
      transactions: number;
      amount: number;
      success: number;
      pending: number;
      processing: number;
      failed: number;
    }
  >;
  earnings: {
    commission: number;
    surcharge: number;
    gst: number;
    tds: number;
    net: number;
  };
  recentTransactions: any[];
  dateWise: any[];
  roleWise: any[];
};

const DashboardScreen = () => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const dispatch = useDispatch();
  const { dashboardData } = useSelector((state: any) => state.services);
  const { user, loading } = useSelector((state: any) => state.auth);
  const userId = user?.user?.id;

  const data: DashboardData | null = dashboardData;

  /* ---------------- Theme tokens ---------------- */
  const cardBg = colors.card;
  const mutedBg = isDark ? "#141826" : "#F4F5F9";
  const borderColor = isDark ? "#232838" : "#E7E9F2";
  const brandPrimary = isDark ? "#7C6BFF" : "#5B4CFF";
  const brandSecondary = isDark ? "#432BBA" : "#3730A3";
  const brandTertiary = isDark ? "#2A188C" : "#1E1B4B";
  const successColor = "#10B981";
  const warnColor = "#F59E0B";
  const dangerColor = "#EF4444";
  const infoColor = "#3B82F6";
  const purpleColor = "#8B5CF6";

  const [refreshing, setRefreshing] = useState(false);

  /* ---------------- Modals ---------------- */
  const [addFundVisible, setAddFundVisible] = useState(false);
  const [pendingModalVisible, setPendingModalVisible] = useState(false);
  const [userProfileModalVisible, setUserProfileModalVisible] = useState(false);
  const [profileKycModalVisible, setProfileKycModalVisible] = useState(false);
  const [submitting] = useState(false);

  const fetchData = async () => {
    await getDashboardDataApiCall(dispatch);
  };

  const checkUserStatus = useCallback(
    async (isRefresh = false) => {
      try {
        const storedUser = JSON.parse((await AsyncStorage.getItem("user")) as any);
        const token = JSON.parse((await AsyncStorage.getItem("token")) as any);

        if (!storedUser && !token) {
          if (!isRefresh) router.replace("/(auth)/initial");
          return;
        }

        const res = await getMeApiCall(dispatch);
        const fundRes = await checkFundStatusApiCall(dispatch);
        const statusFundReq = fundRes?.at(0);

        if (
          res?.wallet?.balance === 0 &&
          res?.user?.isKycVerified === false &&
          statusFundReq?.status === "REJECTED" &&
          statusFundReq?.status !== "PENDING"
        ) {
          setAddFundVisible(true);
        } else {
          if (
            res?.wallet?.balance === 0 &&
            (statusFundReq?.status === "REJECTED" ||
              statusFundReq?.status === "PENDING") &&
            res?.user?.isKycVerified === false
          ) {
            setPendingModalVisible(true);
          } else if (res?.user?.isKycVerified === true) {
            // all good
          } else {
            await PrevioutKycApiCall(userId, dispatch);
            setProfileKycModalVisible(true);
          }
        }
      } catch (error) {
        showError("Error fetching user");
        await AsyncStorage.removeItem("user");
        await AsyncStorage.removeItem("token");
      }
    },
    [dispatch, userId],
  );

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    checkUserStatus(false);
  }, [
    checkUserStatus,
    pendingModalVisible,
    addFundVisible,
    profileKycModalVisible,
  ]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), checkUserStatus(true)]);
    setRefreshing(false);
  };

  /* ---------------- Helpers ---------------- */
  const formatCurrency = (value: number = 0) =>
    `₹${Number(value).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;

  const compactINR = (value: number = 0) => {
    const n = Number(value) || 0;
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n}`;
  };

  const formatNumber = (value: number = 0) =>
    Number(value).toLocaleString("en-IN");

  /* ---------------- Derived data ---------------- */
  const wallet = data?.wallet?.total ?? {
    availableBalance: 0,
    totalBalance: 0,
    blockedBalance: 0,
    tdsBalance: 0,
    gstBalance: 0,
  };

  const availablePct =
    wallet.totalBalance > 0
      ? Math.round((wallet.availableBalance / wallet.totalBalance) * 100)
      : 0;

 

  const sparklineData = useMemo(() => {
    if (!data?.dateWise || data.dateWise.length === 0) return null;
    const pts = data.dateWise
      .map((d: any) => ({
        value: Number(d.amount ?? d.totalAmount ?? d.total ?? d.value ?? 0),
      }))
      .filter((p) => Number.isFinite(p.value));
    if (pts.length < 2) return null;
    return pts;
  }, [data?.dateWise]);

  const trendPct = useMemo(() => {
    if (!sparklineData || sparklineData.length < 2) return null;
    const first = sparklineData[0].value;
    const last = sparklineData[sparklineData.length - 1].value;
    if (first === 0) return null;
    return ((last - first) / first) * 100;
  }, [sparklineData]);

  const successRate = useMemo(() => {
    const t = data?.transactions;
    if (!t || t.total === 0) return 0;
    return Math.round((t.success / t.total) * 100);
  }, [data?.transactions]);

  const pendingBank = data?.bankVerification?.pending ?? 0;
  const pendingKyc = data?.kyc?.pending ?? 0;

  const handleServiceBtn = (item: string) => {
    if (item === "Fund Request") {
      router.push("/screens/services/fundRequest");
    } else if (item === "Express Transfer") {
      router.push("/screens/services/expressTransfer/ETHistory");
    } else if (item === "Payout") {
      router.push("/screens/services/payout/payout");
    }
  };

  /* ---------------- Loading ---------------- */
  if (!data && loading) {
    return (
      <View
        style={[
          styles.container,
          styles.center,
          { backgroundColor: colors.background },
        ]}
      >
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={colors.background}
        />
        <ActivityIndicator size="small" color={brandPrimary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading…
        </Text>
      </View>
    );
  }

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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 80,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={brandPrimary}
            colors={[brandPrimary]}
          />
        }
      >
        {/* ---------------- Header ---------------- */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.headerTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              Overview
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View
              style={[
                styles.rolePill,
                {
                  backgroundColor: `${brandPrimary}14`,
                  borderColor: `${brandPrimary}30`,
                },
              ]}
            >
              <Ionicons name="shield-checkmark" size={10} color={brandPrimary} />
              <Text style={[styles.rolePillText, { color: brandPrimary }]}>
                {data?.role ?? "USER"}
              </Text>
            </View>
            <ScalePressable
              onPress={() => setUserProfileModalVisible(true)}
              scale={0.92}
            >
              <View
                style={[
                  styles.iconBtn,
                  { backgroundColor: mutedBg, borderColor },
                ]}
              >
                <Ionicons name="person-outline" size={18} color={colors.text} />
                <View style={styles.iconBtnDot} />
              </View>
            </ScalePressable>
          </View>
        </View>

        {/* ---------------- Alert Banners ---------------- */}
        {pendingBank > 0 && (
          <AlertBanner
            icon="business-outline"
            title={`${pendingBank} bank verification${pendingBank > 1 ? "s" : ""} pending`}
            subtitle="Review to keep payouts moving"
            accent={warnColor}
            onPress={() => router.push("/screens/services/payout/payout")}
          />
        )}
        {pendingKyc > 0 && (
          <AlertBanner
            icon="id-card-outline"
            title={`${pendingKyc} KYC${pendingKyc > 1 ? "s" : ""} awaiting review`}
            subtitle="Approve to unlock higher limits"
            accent={infoColor}
            onPress={() => {}}
          />
        )}

        {/* ---------------- Hero Balance Card ---------------- */}
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={[brandPrimary, brandSecondary, brandTertiary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            {/* SVG decorative arcs */}
            <Svg
              style={StyleSheet.absoluteFill}
              width="100%"
              height="100%"
              viewBox="0 0 340 240"
              pointerEvents="none"
            >
              <Defs>
                <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.18" />
                  <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </RadialGradient>
                <Linear id="arc" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
                  <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </Linear>
              </Defs>
              <Circle cx="300" cy="20" r="100" fill="url(#glow)" />
              <Circle cx="40" cy="220" r="80" fill="url(#glow)" />
              <Path
                d="M -20 160 Q 120 60 340 140"
                stroke="url(#arc)"
                strokeWidth="1.5"
                fill="none"
              />
              <Path
                d="M -20 200 Q 140 100 360 180"
                stroke="url(#arc)"
                strokeWidth="1"
                fill="none"
              />
            </Svg>

            {/* Top row: label + tier pill */}
            <View style={styles.heroTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroLabel}>TOTAL BALANCE</Text>
                <Text style={styles.heroAmount}>
                  {formatCurrency(wallet.totalBalance)}
                </Text>
                <View style={styles.heroSubRow}>
                  {trendPct !== null ? (
                    <View
                      style={[
                        styles.trendBadge,
                        {
                          backgroundColor:
                            trendPct >= 0
                              ? "rgba(52,211,153,0.20)"
                              : "rgba(248,113,113,0.20)",
                        },
                      ]}
                    >
                      <Ionicons
                        name={trendPct >= 0 ? "trending-up" : "trending-down"}
                        size={10}
                        color={trendPct >= 0 ? "#34D399" : "#F87171"}
                      />
                      <Text
                        style={[
                          styles.trendBadgeText,
                          {
                            color: trendPct >= 0 ? "#34D399" : "#F87171",
                          },
                        ]}
                      >
                        {`${Math.abs(trendPct).toFixed(1)}%`}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.heroLiveDot} />
                  )}
                  <Text style={styles.heroSubText}>vs earlier period</Text>
                </View>
              </View>

            </View>

            {/* Sparkline trend */}
            {sparklineData && (
              <View style={styles.sparkWrap}>
                <Sparkline
                  data={sparklineData.map((p) => p.value)}
                  width={290}
                  height={42}
                  color="#FFFFFF"
                />
              </View>
            )}

            {/* Compact 2x2 grid of wallet composition */}
            <View style={styles.heroGrid}>
              <HeroCell
                icon="checkmark-circle-outline"
                label="Available"
                value={formatCurrency(wallet.availableBalance)}
                accent="#34D399"
              />
              <HeroCell
                icon="lock-closed-outline"
                label="Blocked"
                value={formatCurrency(wallet.blockedBalance)}
                accent="#FBBF24"
              />
              <HeroCell
                icon="document-text-outline"
                label="TDS"
                value={formatCurrency(wallet.tdsBalance)}
                accent="#60A5FA"
              />
              <HeroCell
                icon="receipt-outline"
                label="GST"
                value={formatCurrency(wallet.gstBalance)}
                accent="#C084FC"
              />
            </View>
          </LinearGradient>
        </View>

        {/* ---------------- Quick Actions ---------------- */}
        <View style={styles.quickActions}>
          {[
            {
              icon: "add-circle-outline",
              label: "Add Fund",
              target: "Fund Request",
              grad: ["#6366F1", "#8B5CF6"] as [string, string],
            },
            {
              icon: "swap-horizontal-outline",
              label: "Transfer",
              target: "Express Transfer",
              grad: ["#0EA5E9", "#06B6D4"] as [string, string],
            },
            {
              icon: "receipt-outline",
              label: "Payout",
              target: "Payout",
              grad: ["#F59E0B", "#EF4444"] as [string, string],
            },
          ].map((a) => (
            <ScalePressable
              key={a.label}
              onPress={() => handleServiceBtn(a.target)}
              style={{ flex: 1 }}
            >
              <View style={styles.quickAction}>
                <LinearGradient
                  colors={a.grad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.quickActionTile}
                >
                  <Ionicons name={a.icon as any} size={22} color="#FFFFFF" />
                </LinearGradient>
                <Text
                  style={[styles.quickActionLabel, { color: colors.text }]}
                >
                  {a.label}
                </Text>
              </View>
            </ScalePressable>
          ))}
        </View>

        {/* ---------------- Overview Stats ---------------- */}
        <Section
          title="Overview"
          icon="stats-chart-outline"
          colors={colors}
          trailing={`${formatNumber(data?.hierarchy?.visibleUserCount ?? 0)} in hierarchy`}
          brandPrimary={brandPrimary}
        >
          <View style={styles.statsGrid}>
            <StatCard
              icon="people-outline"
              label="Active Users"
              value={formatNumber(data?.activeSummary?.activeUsers)}
              brandPrimary={brandPrimary}
              cardBg={cardBg}
              borderColor={borderColor}
              textColor={colors.text}
              subTextColor={colors.textSecondary}
            />
            <StatCard
              icon="business-outline"
              label="Tenants"
              value={formatNumber(data?.activeSummary?.activeTenants)}
              brandPrimary={brandPrimary}
              cardBg={cardBg}
              borderColor={borderColor}
              textColor={colors.text}
              subTextColor={colors.textSecondary}
            />
            <StatCard
              icon="document-text-outline"
              label="Transactions"
              value={formatNumber(data?.transactions?.total)}
              brandPrimary={brandPrimary}
              cardBg={cardBg}
              borderColor={borderColor}
              textColor={colors.text}
              subTextColor={colors.textSecondary}
            />
            <StatCard
              icon="cash-outline"
              label="Total Volume"
              value={compactINR(data?.transactions?.totalAmount)}
              brandPrimary={brandPrimary}
              cardBg={cardBg}
              borderColor={borderColor}
              textColor={colors.text}
              subTextColor={colors.textSecondary}
            />
          </View>
        </Section>

        {/* ---------------- Transaction Health ---------------- */}
        {data?.transactions && (
          <Section
            title="Transaction Health"
            icon="pulse-outline"
            colors={colors}
            trailing={`${data.transactions.total} total`}
            brandPrimary={brandPrimary}
          >
            <View
              style={[styles.card, { backgroundColor: cardBg, borderColor }]}
            >
              <View style={styles.txnHealthRow}>
                <DonutChart
                  size={110}
                  strokeWidth={12}
                  centerValue={`${successRate}%`}
                  centerLabel="SUCCESS"
                  trackColor={isDark ? "#22273A" : "#EEF0F7"}
                  segments={[
                    { value: data.transactions.success, color: successColor },
                    { value: data.transactions.pending, color: warnColor },
                    { value: data.transactions.processing, color: infoColor },
                    { value: data.transactions.failed, color: dangerColor },
                    { value: data.transactions.refunded, color: purpleColor },
                  ]}
                />
                <View style={styles.txnLegend}>
                  <LegendRow
                    label="Success"
                    value={data.transactions.success}
                    color={successColor}
                  />
                  <LegendRow
                    label="Pending"
                    value={data.transactions.pending}
                    color={warnColor}
                  />
                  <LegendRow
                    label="Processing"
                    value={data.transactions.processing}
                    color={infoColor}
                  />
                  <LegendRow
                    label="Failed"
                    value={data.transactions.failed}
                    color={dangerColor}
                  />
                  <LegendRow
                    label="Refunded"
                    value={data.transactions.refunded}
                    color={purpleColor}
                  />
                </View>
              </View>
            </View>
          </Section>
        )}

        {/* ---------------- KYC ---------------- */}
        {data?.kyc && (
          <Section
            title="KYC Verification"
            icon="id-card-outline"
            colors={colors}
            trailing={`${data.kyc.verified}/${data.kyc.total}`}
            brandPrimary={brandPrimary}
          >
            <View
              style={[styles.card, { backgroundColor: cardBg, borderColor }]}
            >
              <View style={styles.chipRow}>
                <StatusChip
                  label="Total"
                  value={data.kyc.total}
                  color={brandPrimary}
                />
                <StatusChip
                  label="Verified"
                  value={data.kyc.verified}
                  color={successColor}
                />
                <StatusChip
                  label="Pending"
                  value={data.kyc.pending}
                  color={warnColor}
                />
                <StatusChip
                  label="Rejected"
                  value={data.kyc.rejected}
                  color={dangerColor}
                />
              </View>
            </View>
          </Section>
        )}

        {/* ---------------- Recent Transactions ---------------- */}
        {data?.recentTransactions && data.recentTransactions.length > 0 && (
          <Section
            title="Recent Activity"
            icon="time-outline"
            colors={colors}
            trailing="latest"
            brandPrimary={brandPrimary}
          >
            <View
              style={[styles.card, { backgroundColor: cardBg, borderColor }]}
            >
              {data.recentTransactions.slice(0, 5).map((t: any, idx: number) => {
                const status = (t?.status ?? "").toUpperCase();
                const iconCfg =
                  status === "SUCCESS"
                    ? { name: "checkmark-circle" as const, color: successColor }
                    : status === "PENDING"
                      ? { name: "time" as const, color: warnColor }
                      : status === "FAILED"
                        ? { name: "close-circle" as const, color: dangerColor }
                        : { name: "swap-horizontal" as const, color: infoColor };
                const amt = Number(t?.amount ?? 0);
                return (
                  <View key={t?._id ?? idx}>
                    <View style={styles.txnRow}>
                      <View
                        style={[
                          styles.txnIcon,
                          { backgroundColor: `${iconCfg.color}15` },
                        ]}
                      >
                        <Ionicons
                          name={iconCfg.name}
                          size={16}
                          color={iconCfg.color}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.menuLabel, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {t?.service
                            ? String(t.service).replace(/_/g, " ")
                            : t?.description ?? "Transaction"}
                        </Text>
                        <Text
                          style={[
                            styles.menuSubLabel,
                            { color: colors.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {t?.createdAt
                            ? new Date(t.createdAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                              })
                            : ""}
                          {t?.txnId ? ` · ${String(t.txnId).slice(-6)}` : ""}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.txnAmount,
                          {
                            color:
                              status === "SUCCESS"
                                ? successColor
                                : colors.text,
                          },
                        ]}
                      >
                        {formatCurrency(amt)}
                      </Text>
                    </View>
                    {idx !==
                      Math.min(4, data.recentTransactions.length - 1) && (
                      <View
                        style={[
                          styles.divider,
                          { backgroundColor: borderColor },
                        ]}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </Section>
        )}

        {/* ---------------- Earnings ---------------- */}
        {data?.earnings && (
          <Section
            title="Earnings Breakdown"
            icon="trending-up-outline"
            colors={colors}
            trailing="net"
            brandPrimary={brandPrimary}
          >
            <View
              style={[styles.card, { backgroundColor: cardBg, borderColor }]}
            >
              <EarningRow
                label="Commission"
                value={data.earnings.commission}
                total={
                  (data.earnings.net ?? 0) +
                  (data.earnings.tds ?? 0) +
                  (data.earnings.gst ?? 0)
                }
                colors={colors}
                brandPrimary={brandPrimary}
              />
              <View style={[styles.divider, { backgroundColor: borderColor }]} />
              <EarningRow
                label="Surcharge"
                value={data.earnings.surcharge}
                total={
                  (data.earnings.net ?? 0) +
                  (data.earnings.tds ?? 0) +
                  (data.earnings.gst ?? 0)
                }
                colors={colors}
                brandPrimary={brandPrimary}
              />
              <View style={[styles.divider, { backgroundColor: borderColor }]} />
              <EarningRow
                label="GST"
                value={data.earnings.gst}
                total={
                  (data.earnings.net ?? 0) +
                  (data.earnings.tds ?? 0) +
                  (data.earnings.gst ?? 0)
                }
                colors={colors}
                brandPrimary={brandPrimary}
              />
              <View style={[styles.divider, { backgroundColor: borderColor }]} />
              <EarningRow
                label="TDS"
                value={data.earnings.tds}
                total={
                  (data.earnings.net ?? 0) +
                  (data.earnings.tds ?? 0) +
                  (data.earnings.gst ?? 0)
                }
                colors={colors}
                brandPrimary={brandPrimary}
              />
              <View style={[styles.divider, { backgroundColor: borderColor }]} />
              <EarningRow
                label="Net Earnings"
                value={data.earnings.net}
                colors={colors}
                highlight={brandPrimary}
                isTotal
              />
            </View>
          </Section>
        )}
      </ScrollView>

      {/* ---------------- Modals ---------------- */}
      <AddFundModal
        visible={addFundVisible}
        onClose={() => setAddFundVisible(false)}
        loading={submitting}
      />
      <KycAlertModal
        visible={profileKycModalVisible}
        onClose={() => setProfileKycModalVisible(false)}
      />
      <PendingStatusModal
        visible={pendingModalVisible}
        onClose={() => setPendingModalVisible(false)}
        onContactSupport={() => setPendingModalVisible(false)}
        addFundVisible={addFundVisible}
        setAddFundVisible={setAddFundVisible}
      />
      <UserProfileModal
        visible={userProfileModalVisible}
        onClose={() => setUserProfileModalVisible(false)}
      />
      <FullScreenLoader loading={loading} />
    </LinearGradient>
  );
};

export default DashboardScreen;

/* =========================================================
   Sub Components
   ========================================================= */

/** Pressable with spring scale — premium tactile feedback */
const ScalePressable = ({
  onPress,
  children,
  style,
  scale = 0.96,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  style?: any;
  scale?: number;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const animate = (to: number) =>
    Animated.spring(scaleAnim, {
      toValue: to,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  return (
    <Pressable
      onPressIn={() => animate(scale)}
      onPressOut={() => animate(1)}
      onPress={onPress}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

/** Circular progress ring */
const BalanceRing = ({
  size,
  strokeWidth,
  pct,
}: {
  size: number;
  strokeWidth: number;
  pct: number;
  colors: [string, string];
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset =
    circumference - (Math.min(100, Math.max(0, pct)) / 100) * circumference;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size}>
        <Defs>
          <Linear id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.6" />
          </Linear>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill as any}>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "800" }}>
            {`${pct}%`}
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 8,
              fontWeight: "700",
              letterSpacing: 0.4,
              marginTop: 1,
            }}
          >
            AVAILABLE
          </Text>
        </View>
      </View>
    </View>
  );
};

/** Sparkline area chart */
const Sparkline = ({
  data,
  width,
  height,
  color,
}: {
  data: number[];
  width: number;
  height: number;
  color: string;
}) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = Math.max(max - min, 1);

  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((v - min) / range) * (height - 4) - 2,
  }));

  const pathD = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <Svg width={width} height={height} style={{ overflow: "visible" }}>
      <Defs>
        <Linear id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </Linear>
      </Defs>
      <Path d={areaD} fill="url(#sparkFill)" />
      <Path d={pathD} stroke={color} strokeWidth={2} fill="none" />
      <Circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={3}
        fill="#FFFFFF"
        stroke={color}
        strokeWidth={1.5}
      />
    </Svg>
  );
};

/** Donut chart with multiple segments */
const DonutChart = ({
  size,
  strokeWidth,
  segments,
  centerValue,
  centerLabel,
  trackColor,
}: {
  size: number;
  strokeWidth: number;
  segments: { value: number; color: string }[];
  centerValue: string;
  centerLabel: string;
  trackColor: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  let cumulative = 0;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((seg, i) => {
              const length = (seg.value / total) * circumference;
              const offset = (cumulative / total) * circumference;
              cumulative += seg.value;
              return (
                <Circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={`${length} ${circumference}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  strokeLinecap="butt"
                />
              );
            })}
      </Svg>
      <View style={StyleSheet.absoluteFill as any}>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#10B981" }}>
            {centerValue}
          </Text>
          <Text
            style={{
              fontSize: 8,
              fontWeight: "800",
              letterSpacing: 0.6,
              color: "#9CA3AF",
              marginTop: 1,
            }}
          >
            {centerLabel}
          </Text>
        </View>
      </View>
    </View>
  );
};

/** Alert banner for pending items */
const AlertBanner = ({
  icon,
  title,
  subtitle,
  accent,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  accent: string;
  onPress?: () => void;
}) => (
  <View style={styles.alertWrap}>
    <ScalePressable onPress={onPress} style={{ width: "100%" }}>
      <View
        style={[
          styles.alertBanner,
          {
            backgroundColor: `${accent}10`,
            borderColor: `${accent}30`,
          },
        ]}
      >
        <View
          style={[styles.alertIcon, { backgroundColor: `${accent}20` }]}
        >
          <Ionicons name={icon} size={16} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.alertTitle, { color: accent }]}>{title}</Text>
          <Text style={styles.alertSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={accent} />
      </View>
    </ScalePressable>
  </View>
);

/** Section header + body wrapper */
const Section = ({
  title,
  icon,
  colors,
  children,
  trailing,
  brandPrimary,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: any;
  children: React.ReactNode;
  trailing?: string;
  brandPrimary: string;
}) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ionicons name={icon} size={15} color={brandPrimary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {title}
        </Text>
      </View>
      {!!trailing && (
        <View
          style={[styles.sectionPill, { backgroundColor: `${brandPrimary}12` }]}
        >
          <Text style={[styles.sectionPillText, { color: brandPrimary }]}>
            {trailing}
          </Text>
        </View>
      )}
    </View>
    {children}
  </View>
);

const HeroCell = ({
  icon,
  label,
  value,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent: string;
}) => (
  <View style={styles.heroCell}>
    <View style={styles.heroCellRow}>
      <Ionicons name={icon} size={11} color={accent} />
      <Text style={styles.heroCellLabel}>{label}</Text>
    </View>
    <Text style={styles.heroCellValue} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const StatCard = ({
  icon,
  label,
  value,
  brandPrimary,
  cardBg,
  borderColor,
  textColor,
  subTextColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  brandPrimary: string;
  cardBg: string;
  borderColor: string;
  textColor: string;
  subTextColor: string;
}) => (
  <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
    <View style={[styles.statIcon, { backgroundColor: `${brandPrimary}14` }]}>
      <Ionicons name={icon} size={15} color={brandPrimary} />
    </View>
    <Text
      style={[styles.statValue, { color: textColor }]}
      numberOfLines={1}
      allowFontScaling={false}
    >
      {value}
    </Text>
    <Text style={[styles.statLabel, { color: subTextColor }]} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const StatusChip = ({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) => (
  <View
    style={[
      styles.chip,
      { backgroundColor: `${color}10`, borderColor: `${color}28` },
    ]}
  >
    <View style={[styles.chipDot, { backgroundColor: color }]} />
    <Text style={[styles.chipLabel, { color }]}>{label}</Text>
    <Text style={[styles.chipValue, { color }]}>{String(value ?? 0)}</Text>
  </View>
);

const LegendRow = ({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) => (
  <View style={styles.legendRow}>
    <View style={[styles.legendDot, { backgroundColor: color }]} />
    <Text style={[styles.legendLabel, { color: "#6B7280" }]}>{label}</Text>
    <Text style={[styles.legendValue, { color }]}>{String(value ?? 0)}</Text>
  </View>
);

const EarningRow = ({
  label,
  value,
  total,
  colors,
  highlight,
  brandPrimary,
  isTotal,
}: {
  label: string;
  value: number;
  total?: number;
  colors: any;
  highlight?: string;
  brandPrimary?: string;
  isTotal?: boolean;
}) => {
  const safeValue = Number(value ?? 0);
  const safeTotal = Number(total ?? 0);
  const pct =
    safeTotal > 0 ? Math.min(100, Math.round((safeValue / safeTotal) * 100)) : 0;

  // IMPORTANT: keep these as booleans so a `0` value never renders as a
  // raw text child inside a <View> (which causes the RN runtime error
  // "Text strings must be rendered within a <Text> component").
  const showPct = !isTotal && safeTotal > 0;
  const showBar = !isTotal && typeof brandPrimary === "string" && brandPrimary.length > 0;

  return (
    <View style={styles.earningRow}>
      <View style={{ flex: 1 }}>
        <View
          style={{ flexDirection: "row", justifyContent: "space-between" }}
        >
          <Text
            style={[
              styles.menuLabel,
              {
                color: colors.text,
                fontWeight: isTotal ? "800" : "600",
              },
            ]}
          >
            {label || ""}
          </Text>
          {showPct && (
            <Text style={[styles.earningPct, { color: colors.textSecondary }]}>
              {`${pct}%`}
            </Text>
          )}
        </View>
        {showBar && (
          <View
            style={[
              styles.earningBarTrack,
              { backgroundColor: `${brandPrimary}12` },
            ]}
          >
            <View
              style={[
                styles.earningBarFill,
                { width: `${pct}%`, backgroundColor: brandPrimary },
              ]}
            />
          </View>
        )}
      </View>
      <Text
        style={[
          styles.earningValue,
          {
            color: highlight ?? colors.text,
            fontWeight: isTotal ? "800" : "700",
            fontSize: isTotal ? 15 : 13.5,
          },
        ]}
      >
        {safeValue.toLocaleString("en-IN", {
          style: "currency",
          currency: "INR",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}
      </Text>
    </View>
  );
};

const Badge = ({ text, color }: { text: string; color: string }) => (
  <View
    style={[
      styles.badge,
      { backgroundColor: `${color}15`, borderColor: `${color}40` },
    ]}
  >
    <Text style={[styles.badgeText, { color }]}>{text}</Text>
  </View>
);

/* =========================================================
   Styles
   ========================================================= */
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 8, fontSize: 12, fontWeight: "600" },

  // Header
  header: {
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  rolePillText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnDot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light?.error,
  },

  // Alert banner
  alertWrap: { paddingHorizontal: 20, marginBottom: 10 },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  alertTitle: { fontSize: 12.5, fontWeight: "800" },
  alertSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
    marginTop: 1,
  },

  // Hero Card
  heroWrap: { paddingHorizontal: 20, marginBottom: 18 },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    overflow: "hidden",
    shadowColor: "#5B4CFF",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 12,
  },
  heroLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 4,
    letterSpacing: -1.2,
    fontVariant: ["tabular-nums"],
  },
  heroSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  heroLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#34D399",
  },
  heroSubText: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trendBadgeText: { fontSize: 10.5, fontWeight: "800" },

  sparkWrap: {
    height: 42,
    marginBottom: 12,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  heroGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    overflow: "hidden",
  },
  heroCell: {
    width: "50%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
  },
  heroCellRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 3,
  },
  heroCellLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  heroCellValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    fontVariant: ["tabular-nums"],
  },

  // Quick actions
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 22,
  },
  quickAction: { alignItems: "center", gap: 8 },
  quickActionTile: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.1 },

  // Sections
  section: { marginBottom: 20, paddingHorizontal: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  sectionPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  sectionPillText: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.2 },

  card: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },

  // Stats
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: "48.4%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.4,
    fontVariant: ["tabular-nums"],
  },
  statLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.1 },

  // Txn health
  txnHealthRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 18,
  },
  txnLegend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendLabel: { flex: 1, fontSize: 12, fontWeight: "600" },
  legendValue: {
    fontSize: 12,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },

  // Status chips
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipLabel: { fontSize: 11.5, fontWeight: "700" },
  chipValue: { fontSize: 12, fontWeight: "800", fontVariant: ["tabular-nums"] },

  // Service rows
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    gap: 12,
  },
  serviceIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceBadges: { flexDirection: "row", gap: 5 },
  miniBarTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: 5,
    overflow: "hidden",
  },
  miniBarFill: { height: 3, borderRadius: 2 },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10.5, fontWeight: "800" },

  // Recent transactions
  txnRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  txnIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  txnAmount: {
    fontSize: 13.5,
    fontWeight: "800",
    letterSpacing: -0.2,
    fontVariant: ["tabular-nums"],
  },

  // Earnings rows
  earningRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    gap: 12,
  },
  earningBarTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: 6,
    overflow: "hidden",
  },
  earningBarFill: { height: 3, borderRadius: 2 },
  earningValue: {
    letterSpacing: -0.2,
    fontVariant: ["tabular-nums"],
  },
  earningPct: { fontSize: 10.5, fontWeight: "700" },

  // Shared
  menuLabel: { flex: 1, fontSize: 13, fontWeight: "600" },
  menuSubLabel: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth },
});