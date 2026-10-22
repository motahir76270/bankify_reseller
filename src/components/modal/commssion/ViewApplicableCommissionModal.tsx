import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Platform,
} from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Colors } from "@/constants/theme";
import { showSuccess } from "@/components/service/AlertService";

type Slab = {
  id?: string;
  minAmount: number;
  maxAmount: number;
  value: number;
  isActive?: boolean;
};

type Props = {
  visible: boolean;
  commission: any | null;
  onClose: () => void;
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const getScopeMeta = (scope: string) => {
  switch (scope?.toUpperCase()) {
    case "ROLE":
      return { icon: "shield", label: "Role" };
    case "USER":
      return { icon: "person", label: "User" };
    case "GLOBAL":
      return { icon: "earth", label: "Global" };
    default:
      return { icon: "help-circle", label: scope };
  }
};

const ViewApplicableCommissionModal = ({
  visible,
  commission,
  onClose,
}: Props) => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  if (!commission) return null;

  const scopeMeta = getScopeMeta(commission.scope);
  const isActive = !!commission.isActive;
  const statusColor = isActive
    ? colors.success ?? "#10B981"
    : colors.error ?? "#EF4444";

  const copy = async (text?: string, label?: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(String(text));
    showSuccess("Copied", `${label ?? "Value"} copied`);
  };

  const InfoRow = ({
    label,
    value,
    copyable,
    valueColor,
  }: {
    label: string;
    value?: any;
    copyable?: boolean;
    valueColor?: string;
  }) => {
    if (value === undefined || value === null || value === "") return null;
    return (
      <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
          {label}
        </Text>
        <TouchableOpacity
          disabled={!copyable}
          activeOpacity={copyable ? 0.6 : 1}
          onPress={() => copyable && copy(String(value), label)}
          style={styles.infoValueWrap}
        >
          <Text
            style={[styles.infoValue, { color: valueColor ?? colors.text }]}
            numberOfLines={3}
          >
            {String(value)}
          </Text>
          {copyable && (
            <Ionicons
              name="copy-outline"
              size={12}
              color={colors.textMuted}
              style={{ marginLeft: 6 }}
            />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const Section = ({
    title,
    icon,
    children,
  }: {
    title: string;
    icon: any;
    children: React.ReactNode;
  }) => (
    <View
      style={[
        styles.section,
        {
          backgroundColor: colors.surfaceTertiary,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={14} color={colors.buttonPrimary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );

  /* ---------- Slab table ---------- */
  const SlabTable = () => {
    const slabs: Slab[] = commission.slabs ?? [];
    if (!slabs.length) return null;
    return (
      <View
        style={[
          styles.table,
          { borderColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <View
          style={[
            styles.tableHeader,
            { backgroundColor: colors.buttonPrimary + "12" },
          ]}
        >
          <Text style={[styles.tableHeadText, { color: colors.text, flex: 1.2 }]}>
            Min
          </Text>
          <Text style={[styles.tableHeadText, { color: colors.text, flex: 1.2 }]}>
            Max
          </Text>
          <Text
            style={[
              styles.tableHeadText,
              { color: colors.text, flex: 0.9, textAlign: "right" },
            ]}
          >
            Value
          </Text>
        </View>

        {slabs.map((s, i) => (
          <View
            key={s.id ?? i}
            style={[
              styles.tableRow,
              {
                borderTopColor: colors.border,
                backgroundColor:
                  i % 2 === 0 ? "transparent" : colors.surfaceTertiary,
              },
            ]}
          >
            <Text style={[styles.tableCell, { color: colors.text, flex: 1.2 }]}>
              ₹{s.minAmount}
            </Text>
            <Text style={[styles.tableCell, { color: colors.text, flex: 1.2 }]}>
              ₹{s.maxAmount}
            </Text>
            <Text
              style={[
                styles.tableCell,
                {
                  color: colors.buttonPrimary,
                  flex: 0.9,
                  textAlign: "right",
                  fontWeight: "800",
                },
              ]}
            >
              {commission.type === "PERCENTAGE"
                ? `${s.value}%`
                : `₹${s.value}`}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>
                Applicable Commission
              </Text>
              <Text
                style={[styles.subTitle, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {commission.service?.name ?? "Service"}
                {commission.service?.providerCode
                  ? ` · ${commission.service.providerCode}`
                  : ""}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 30 }}
          >
            {/* Hero */}
            <View
              style={[
                styles.hero,
                {
                  backgroundColor: (colors.buttonPrimary ?? "#2563EB") + "10",
                  borderColor: colors.buttonPrimary,
                },
              ]}
            >
              <View
                style={[
                  styles.heroIcon,
                  { backgroundColor: colors.buttonPrimary + "22" },
                ]}
              >
                <Ionicons
                  name={scopeMeta.icon as any}
                  size={26}
                  color={colors.buttonPrimary}
                />
              </View>

              <Text style={[styles.heroScope, { color: colors.buttonPrimary }]}>
                {scopeMeta.label.toUpperCase()} SCOPE
              </Text>

              <Text style={[styles.heroService, { color: colors.text }]}>
                {commission.service?.name ?? "—"}
              </Text>

              {!!commission.service?.providerName && (
                <Text
                  style={[styles.heroProvider, { color: colors.textMuted }]}
                >
                  {commission.service.providerName} ·{" "}
                  {commission.service.providerCode}
                </Text>
              )}

              <View
                style={[
                  styles.heroPill,
                  {
                    backgroundColor: statusColor + "25",
                    borderColor: statusColor,
                  },
                ]}
              >
                <View
                  style={[styles.heroPillDot, { backgroundColor: statusColor }]}
                />
                <Text style={[styles.heroPillText, { color: statusColor }]}>
                  {isActive ? "ACTIVE" : "INACTIVE"}
                </Text>
              </View>
            </View>

            {/* Rule info */}
            <Section title="Rule Info" icon="information-circle-outline">
              <InfoRow label="Scope" value={scopeMeta.label} />
              <InfoRow label="Source" value={commission.source} />
              <InfoRow label="Mode" value={commission.mode} />
              <InfoRow label="Type" value={commission.type} />
              {!commission.supportsSlab && (
                <InfoRow
                  label="Value"
                  value={
                    commission.type === "PERCENTAGE"
                      ? `${commission.value ?? 0}%`
                      : `₹${commission.value ?? 0}`
                  }
                  valueColor={colors.buttonPrimary}
                />
              )}
              <InfoRow
                label="Slab Support"
                value={commission.supportsSlab ? "Yes" : "No"}
              />
              <InfoRow
                label="Status"
                value={isActive ? "Active" : "Inactive"}
                valueColor={statusColor}
              />
            </Section>

            {/* Slabs */}
            {commission.supportsSlab && commission.slabs?.length > 0 && (
              <Section title="Slabs" icon="layers-outline">
                <SlabTable />
              </Section>
            )}

            {/* Taxes */}
            <Section title="Taxes" icon="receipt-outline">
              <InfoRow
                label="Apply TDS"
                value={commission.applyTDS ? "Yes" : "No"}
              />
              {commission.applyTDS && (
                <InfoRow
                  label="TDS %"
                  value={`${commission.tdsPercent ?? 0}%`}
                />
              )}
              <InfoRow
                label="Apply GST"
                value={commission.applyGST ? "Yes" : "No"}
              />
              {commission.applyGST && (
                <InfoRow
                  label="GST %"
                  value={`${commission.gstPercent ?? 0}%`}
                />
              )}
            </Section>

            {/* Target */}
            <Section title="Target" icon="person-outline">
              {commission.scope === "ROLE" && commission.role && (
                <>
                  <InfoRow label="Role" value={commission.role.name} />
                  <InfoRow label="Role Code" value={commission.role.code} />
                  <InfoRow
                    label="Role ID"
                    value={commission.role.id}
                    copyable
                  />
                </>
              )}
              {commission.scope === "USER" && commission.user && (
                <>
                  <InfoRow
                    label="Name"
                    value={`${commission.user.firstName ?? ""} ${
                      commission.user.lastName ?? ""
                    }`.trim()}
                  />
                  <InfoRow
                    label="Email"
                    value={commission.user.email}
                    copyable
                  />
                  <InfoRow
                    label="User ID"
                    value={commission.user.id}
                    copyable
                  />
                </>
              )}
              {commission.scope === "GLOBAL" && (
                <Text style={[styles.globalText, { color: colors.textMuted }]}>
                  Applies to all users across the platform.
                </Text>
              )}

              {commission.user && commission.scope !== "USER" && (
                <>
                  <View
                    style={[
                      styles.subSectionDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                  <Text
                    style={[
                      styles.subSectionTitle,
                      { color: colors.textMuted },
                    ]}
                  >
                    Applied to user
                  </Text>
                  <InfoRow
                    label="Name"
                    value={`${commission.user.firstName ?? ""} ${
                      commission.user.lastName ?? ""
                    }`.trim()}
                  />
                  <InfoRow label="Email" value={commission.user.email} />
                  <InfoRow label="Role" value={commission.user.roleName} />
                </>
              )}
            </Section>

            {/* Service */}
            <Section title="Service" icon="briefcase-outline">
              <InfoRow label="Service Name" value={commission.service?.name} />
              <InfoRow label="Service Code" value={commission.service?.code} />
              <InfoRow
                label="Provider"
                value={commission.service?.providerName}
              />
              <InfoRow
                label="Provider Code"
                value={commission.service?.providerCode}
              />
              <InfoRow
                label="SP Mapping ID"
                value={commission.serviceProviderMappingId}
                copyable
              />
            </Section>

            {/* Timeline */}
            <Section title="Timeline" icon="time-outline">
              <InfoRow
                label="Created At"
                value={formatDate(commission.createdAt)}
              />
              <InfoRow
                label="Updated At"
                value={formatDate(commission.updatedAt)}
              />
            </Section>

            {/* Technical */}
            <Section title="Technical" icon="code-slash-outline">
              <InfoRow label="Rule ID" value={commission.id} copyable />
            </Section>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default ViewApplicableCommissionModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 30 : 20,
    minHeight: "90%",
    maxHeight: "95%",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: "800" },
  subTitle: { fontSize: 11.5, fontWeight: "500", marginTop: 3 },

  hero: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    marginBottom: 14,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  heroScope: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroService: { fontSize: 18, fontWeight: "800" },
  heroProvider: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  heroPillDot: { width: 6, height: 6, borderRadius: 3 },
  heroPillText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },

  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: 5,
    gap: 12,
  },
  infoLabel: { fontSize: 12, fontWeight: "500", flexShrink: 0 },
  infoValueWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  infoValue: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
    flexShrink: 1,
  },

  table: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableHeadText: {
    fontSize: 10.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tableCell: { fontSize: 12, fontWeight: "700" },

  globalText: {
    fontSize: 12,
    fontWeight: "600",
    fontStyle: "italic",
    paddingVertical: 4,
  },
  subSectionDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
  subSectionTitle: {
    fontSize: 10.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 6,
  },

  doneBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  doneText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
});