import AddRoleModal from "@/components/modal/usersManagement/roleManagement/addRoleModal";
import EditRoleModal from "@/components/modal/usersManagement/roleManagement/editRoleModal";
import RolePermissionModal from "@/components/modal/usersManagement/roleManagement/rolePermissionModal";
import HeaderSection from "@/components/ui/headerSections";
import { Colors } from "@/constants/theme";
import { getRolesDataApiCall } from "@/redux/slices/userMangementSlice";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

/* ---------------- Types ---------------- */
export type Permission = {
  id: string;
  permissionName?: string;
  permissionCode?: string;
  name?: string;
  code?: string;
  moduleName?: string;
  module?: string;
  method?: string;
  path?: string;
  [key: string]: any;
};

export type Role = {
  id: string;
  roleCode: string;
  roleName: string;
  roleLevel: number;
  isSystem: boolean;
  permissions?: Permission[];
};

const RoleScreen = () => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const { rolesData, loading } = useSelector((state: any) => state.users);

  /* Modal state */
  const [addVisible, setAddVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [permVisible, setPermVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const fetchRoles = async () => {
    await getRolesDataApiCall(dispatch);
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    setEditVisible(true);
  };

  const handlePermissions = (role: Role) => {
    setSelectedRole(role);
    setPermVisible(true);
  };

  const renderRole = ({ item }: { item: Role }) => (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.cardTop}>
        <View
          style={[styles.roleAvatar, { backgroundColor: colors.surfacePrimary }]}
        >
          <Ionicons
            name="shield-outline"
            size={20}
            color={colors.buttonPrimary}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.roleName, { color: colors.text }]}>
            {item.roleName || "Unnamed Role"}
          </Text>
          <Text style={[styles.roleCode, { color: colors.textMuted }]}>
            {item.roleCode}
          </Text>
        </View>

        {item.isSystem && (
          <View
            style={[styles.systemPill, { backgroundColor: colors.surfacePrimary }]}
          >
            <Text
              style={[styles.systemPillText, { color: colors.buttonPrimary }]}
            >
              SYSTEM
            </Text>
          </View>
        )}
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
            Level
          </Text>
          <Text style={[styles.metaValue, { color: colors.text }]}>
            {item.roleLevel ?? "-"}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
            Permissions
          </Text>
          <Text style={[styles.metaValue, { color: colors.text }]}>
            {item.permissions?.length ?? 0}
          </Text>
        </View>
      </View>

      <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handlePermissions(item)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="key-outline"
            size={16}
            color={colors.buttonPrimary}
          />
          <Text style={[styles.actionText, { color: colors.text }]}>
            Permissions
          </Text>
        </TouchableOpacity>

        <View
          style={[styles.verticalDivider, { backgroundColor: colors.border }]}
        />

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleEdit(item)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="create-outline"
            size={16}
            color={colors.buttonPrimary}
          />
          <Text style={[styles.actionText, { color: colors.text }]}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <LinearGradient
     colors={[colors.backgroundTop , colors.backgroundBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }} 
       style={[styles.container, { backgroundColor: colors.background }]}>
      <HeaderSection title="Roles" />

      {loading && !rolesData?.length ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.buttonPrimary} />
        </View>
      ) : (
        <FlatList
          data={Array.isArray(rolesData) ? rolesData : []}
          keyExtractor={(item, idx) => item.id ?? String(idx)}
          renderItem={renderRole}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 120,
            gap: 12,
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons
                name="shield-outline"
                size={40}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No roles yet
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB — Add Role */}
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

      {/* Modals */}
      <AddRoleModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSuccess={fetchRoles}
      />
      <EditRoleModal
        visible={editVisible}
        role={selectedRole}
        onClose={() => {
          setEditVisible(false);
          setSelectedRole(null);
        }}
        onSuccess={fetchRoles}
      />
      <RolePermissionModal
        visible={permVisible}
        role={selectedRole}
        onClose={() => {
          setPermVisible(false);
          setSelectedRole(null);
        }}
        onSuccess={fetchRoles}
      />
    </LinearGradient>
  );
};

export default RoleScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 8,
  },
  emptyText: { fontSize: 13, fontWeight: "500" },

  card: { borderRadius: 14, borderWidth: 1, padding: 14 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  roleAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  roleName: { fontSize: 15, fontWeight: "700" },
  roleCode: { fontSize: 12, marginTop: 2, fontWeight: "500" },
  systemPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  systemPillText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },

  metaRow: { flexDirection: "row", marginTop: 14, gap: 20 },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
  metaValue: { fontSize: 14, fontWeight: "700", marginTop: 2 },

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