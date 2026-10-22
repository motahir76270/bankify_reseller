import AddDepartmentModal from "@/components/modal/employeesManagement/departmentManagement/addDepartmentModal";
import DepartmentPermissionModal from "@/components/modal/employeesManagement/departmentManagement/DepartmentPermissionModal";
import EditDepartmentModal from "@/components/modal/employeesManagement/departmentManagement/editDepartmentModal.tsx";
import HeaderSection from "@/components/ui/headerSections";
import { Colors } from "@/constants/theme";
import { getDepartmentDataApiCall } from "@/redux/slices/employeeManagementSlice";
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

export type Department = {
  id: string;
  departmentCode: string;
  departmentName: string;
  departmentDescription?: string;
  permissions?: any[];
  [key: string]: any;
};

const DepartmentScreen = () => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const { departmentData, loading } = useSelector(
    (state: any) => state.employees,
  );

  const [addVisible, setAddVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [permVisible, setPermVisible] = useState(false);
  const [selected, setSelected] = useState<Department | null>(null);

  const fetchDepartments = async () => {
    await getDepartmentDataApiCall(dispatch);
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleEdit = (dept: Department) => {
    setSelected(dept);
    setEditVisible(true);
  };

  const handlePermissions = (dept: Department) => {
    setSelected(dept);
    setPermVisible(true);
  };

  const renderDepartment = ({ item }: { item: Department }) => (
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
          style={[styles.iconWrap, { backgroundColor: colors.surfacePrimary }]}
        >
          <Ionicons
            name="business-outline"
            size={20}
            color={colors.buttonPrimary}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]}>
            {item.departmentName || "Unnamed Department"}
          </Text>
          <Text style={[styles.code, { color: colors.textMuted }]}>
            {item.departmentCode}
          </Text>
        </View>
      </View>

      {!!item.departmentDescription && (
        <Text
          style={[styles.description, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {item.departmentDescription}
        </Text>
      )}

      <View style={styles.metaRow}>
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
          activeOpacity={0.7}
          onPress={() => handlePermissions(item)}
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
          activeOpacity={0.7}
          onPress={() => handleEdit(item)}
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
      <HeaderSection title="Departments" />

      {loading && !departmentData?.length ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.buttonPrimary} />
        </View>
      ) : (
        <FlatList
          data={Array.isArray(departmentData) ? departmentData : []}
          keyExtractor={(item, idx) => item.id ?? String(idx)}
          renderItem={renderDepartment}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 120,
            gap: 12,
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons
                name="business-outline"
                size={40}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No departments yet
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

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

      {/* Add */}
      <AddDepartmentModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSuccess={fetchDepartments}
      />

      {/* Edit */}
      <EditDepartmentModal
        visible={editVisible}
        department={selected}
        onClose={() => {
          setEditVisible(false);
          setSelected(null);
        }}
        onSuccess={fetchDepartments}
      />

      {/* Permissions — receives the tapped department */}
      <DepartmentPermissionModal
        visible={permVisible}
        department={selected}
        onClose={() => {
          setPermVisible(false);
          setSelected(null);
        }}
        onSuccess={fetchDepartments}
      />
    </LinearGradient>
  );
};

export default DepartmentScreen;

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
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 15, fontWeight: "700" },
  code: { fontSize: 12, marginTop: 2, fontWeight: "500" },
  description: {
    fontSize: 12.5,
    fontWeight: "500",
    marginTop: 10,
    lineHeight: 18,
  },

  metaRow: { flexDirection: "row", marginTop: 12, gap: 20 },
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