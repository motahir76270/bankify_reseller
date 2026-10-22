import { Colors } from "@/constants/theme";
import { getEmployeesPermissionsApiCall } from "@/redux/slices/employeeManagementSlice";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";

type Permission = {
  id: string;
  resource: string;
  action: string;
  [key: string]: any;
};

type Props = {
  visible: boolean;
  employee: any | null;
  onClose: () => void;
  onSuccess?: () => void;
};

/* Backend permission shape: { id, resource, action } */
const normalizePermission = (p: any): Permission => ({
  id: p.id,
  resource: String(p.resource ?? p.moduleName ?? p.module ?? "General"),
  action: String(
    p.action ?? p.permissionName ?? p.name ?? p.code ?? "UNKNOWN",
  ),
  ...p,
});

const getActionColor = (action: string, fallback: string) => {
  switch (action.toUpperCase()) {
    case "CREATE":
      return "#10B981";
    case "READ":
      return "#3B82F6";
    case "UPDATE":
      return "#F59E0B";
    case "DELETE":
      return "#EF4444";
    case "ASSIGN_PERMISSIONS":
      return "#8B5CF6";
    default:
      return fallback;
  }
};

const EmployeePermissionModal: React.FC<Props> = ({
  visible,
  employee,
  onClose,
  onSuccess,
}) => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  /* Safe selector — initialState uses "" */
  const permissionsRaw = useSelector(
    (state: any) => state.employees?.permissionsData,
  );
  const permissionsData = Array.isArray(permissionsRaw)
    ? permissionsRaw
    : [];

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  /* Fetch all permissions when modal opens (if not cached) */
  useEffect(() => {
    if (!visible) return;
    const load = async () => {
      const hasData = permissionsData.length > 0;
      if (!hasData) {
        setLoadingPermissions(true);
        try {
          await getEmployeesPermissionsApiCall(dispatch);
        } finally {
          setLoadingPermissions(false);
        }
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  /* Parse the tapped employee's own permissions array */
  useEffect(() => {
    if (visible && employee) {
      const ids = (employee.permissions ?? [])
        .map((p: any) => p?.id ?? p?.permissionId)
        .filter(Boolean);
      setSelectedIds(ids);
    }
  }, [visible, employee]);

  /* Group permissions by resource */
  const grouped = useMemo(() => {
    const normalized: Permission[] = permissionsData.map(normalizePermission);

    const map = new Map<string, Permission[]>();
    normalized.forEach((p) => {
      const key = p.resource || "General";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });

    return Array.from(map.entries())
      .map(([resource, items]) => ({ resource, items }))
      .sort((a, b) => a.resource.localeCompare(b.resource));
  }, [permissionsData]);

  const toggle = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const toggleModule = (items: Permission[], selectAll: boolean) => {
    const ids = items.map((i) => i.id);
    setSelectedIds((prev) =>
      selectAll
        ? Array.from(new Set([...prev, ...ids]))
        : prev.filter((x) => !ids.includes(x)),
    );
  };

  const handleSave = async () => {
    if (!employee) return;
    setSubmitting(true);
    try {
      const ok = await updateEmployeePermissionApiCall(
        { permissionIds: selectedIds },
        employee.id,
        dispatch,
      );
      if (ok) {
        onSuccess?.();
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderModuleBlock = ({
    item,
  }: {
    item: { resource: string; items: Permission[] };
  }) => {
    const allSelected = item.items.every((i) => selectedIds.includes(i.id));
    return (
      <View style={{ marginBottom: 20 }}>
        <View style={styles.moduleHeader}>
          <Text style={[styles.moduleTitle, { color: colors.text }]}>
            {item.resource}
          </Text>
          <TouchableOpacity
            onPress={() => toggleModule(item.items, !allSelected)}
            hitSlop={8}
          >
            <Text style={[styles.selectAll, { color: colors.buttonPrimary }]}>
              {allSelected ? "Clear all" : "Select all"}
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={item.items}
          keyExtractor={(p) => p.id}
          scrollEnabled={false}
          renderItem={({ item: p }) => {
            const checked = selectedIds.includes(p.id);
            const actionColor = getActionColor(p.action, colors.buttonPrimary);
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => toggle(p.id)}
                style={[
                  styles.permRow,
                  {
                    backgroundColor: colors.surfaceTertiary,
                    borderColor: checked ? colors.buttonPrimary : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: checked
                        ? colors.buttonPrimary
                        : colors.border,
                      backgroundColor: checked
                        ? colors.buttonPrimary
                        : "transparent",
                    },
                  ]}
                >
                  {checked && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.permName, { color: colors.text }]}>
                    {p.action}
                  </Text>
                  <Text style={[styles.permCode, { color: colors.textMuted }]}>
                    {p.resource}
                  </Text>
                </View>

                <View
                  style={[
                    styles.methodPill,
                    { backgroundColor: `${actionColor}22` },
                  ]}
                >
                  <Text style={[styles.methodPillText, { color: actionColor }]}>
                    {p.action}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceTertiary,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>
                Permissions
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {employee?.firstName} {employee?.lastName} ·{" "}
                {selectedIds.length} selected
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          {loadingPermissions ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.buttonPrimary} />
            </View>
          ) : grouped.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="key-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No permissions available
              </Text>
            </View>
          ) : (
            <FlatList
              data={grouped}
              keyExtractor={(g) => g.resource}
              renderItem={renderModuleBlock}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={submitting || !employee}
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.buttonPrimary },
              submitting && { opacity: 0.7 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Save Permissions</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default EmployeePermissionModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    padding: 20,
    maxHeight: "90%",
    flex: 1,
    marginTop: 80,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 12, fontWeight: "500", marginTop: 2 },

  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 8,
  },
  emptyText: { fontSize: 13, fontWeight: "500" },

  moduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  moduleTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  selectAll: { fontSize: 12, fontWeight: "700" },

  permRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  permName: { fontSize: 13.5, fontWeight: "700" },
  permCode: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  methodPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  methodPillText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },

  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  primaryBtnText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
});