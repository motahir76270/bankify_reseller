import { Colors } from "@/constants/theme";
import { getAllPermissionsApiCall, updateRolePermissionApiCall } from "@/redux/slices/userMangementSlice";
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
  resource: string; // e.g. "ROLE"
  action: string; // e.g. "CREATE"
  [key: string]: any;
};

type Props = {
  visible: boolean;
  role: any | null;
  onClose: () => void;
  onSuccess?: () => void;
};

/* ------------------------------------------------------------------
   Normalize any backend permission shape into { id, resource, action }
   Handles: { id, resource, action }  →  your new shape
            { id, permissionName, moduleName, ... }  →  legacy shape
------------------------------------------------------------------ */
const normalizePermission = (p: any): Permission => {
  const resource =
    p.resource ??
    p.moduleName ??
    p.module ??
    p.group ??
    "General";

  const action =
    p.action ??
    p.permissionName ??
    p.name ??
    p.code ??
    "UNKNOWN";

  return {
    id: p.id,
    resource: String(resource),
    action: String(action),
    ...p,
  };
};

/* Map HTTP-ish / generic actions to colors (optional, makes it prettier) */
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

const RolePermissionModal: React.FC<Props> = ({
  visible,
  role,
  onClose,
  onSuccess,
}) => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  /* Matches your slice */
  const permissionsData = useSelector(
    (state: any) => state.users?.permissionsData,
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  /* Fetch all permissions when modal opens (if not cached) */
  useEffect(() => {
    if (!visible) return;
    const load = async () => {
      const hasData =
        Array.isArray(permissionsData) && permissionsData.length > 0;
      if (!hasData) {
        setLoadingPermissions(true);
        try {
          await getAllPermissionsApiCall(dispatch);
        } finally {
          setLoadingPermissions(false);
        }
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  /* Pre-select role's current permissions (ids from role.permissions) */
  useEffect(() => {
    if (visible && role) {
      const ids = (role.permissions ?? [])
        .map((p: any) => p?.id ?? p?.permissionId)
        .filter(Boolean);
      setSelectedIds(ids);
    }
  }, [visible, role]);

  /* Normalize + group by resource */
  const grouped = useMemo(() => {
    const list = Array.isArray(permissionsData) ? permissionsData : [];
    const normalized: Permission[] = list.map(normalizePermission);

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
    if (!role) return;
    setSubmitting(true);
    try {
      const ok = await updateRolePermissionApiCall(
        { permissionIds: selectedIds },
        role.id,
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

  /* ---------- Module block renderer ---------- */
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
            const actionColor = getActionColor(
              p.action,
              colors.buttonPrimary,
            );
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => toggle(p.id)}
                style={[
                  styles.permRow,
                  {
                    backgroundColor: colors.surfaceTertiary,
                    borderColor: checked
                      ? colors.buttonPrimary
                      : colors.border,
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
                {role?.roleName} · {selectedIds.length} selected
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
            disabled={submitting || !role}
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

export default RolePermissionModal;

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