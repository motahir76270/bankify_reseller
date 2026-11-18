import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { logoutApiCall } from "@/redux/slices/authSlice";

type Props = {
  visible: boolean;
  onClose: () => void;

};

const UserProfileModal = ({ visible, onClose }: Props) => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const { user } = useSelector((state: any) => state.auth);
  const userData = user?.user ?? {};

  /* ---------------- Theme tokens ---------------- */     
  const menuBg = colors.surfaceSecondary;    // inner menu card
  const chipBg = colors.surfaceTertiary;     // avatar / icon / pill bg
  const borderColor = colors.border;
  const brandPrimary = colors.buttonPrimary;
  const dangerColor = colors.error;

  /* ---------------- Display name ---------------- */
  const displayName =
    [userData?.firstName, userData?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || "Guest User";

  /* ---------------- Logout ---------------- */
  const handleLogout = useCallback(() => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await logoutApiCall(dispatch);
            } catch (_) {}
            await AsyncStorage.removeItem("user");
            await AsyncStorage.removeItem("token");
            onClose?.();
          },
        },
      ],
      { cancelable: true }
    );
  }, [dispatch, onClose]);

  /* ---------------- Menu items ---------------- */
  const menuItems = [
    {
      id: "kyc",
      label: "My KYC Status",
      icon: "shield-checkmark-outline",
      onPress: () => {
        onClose?.();
        router.push("/screens/administration/kyc/myKyc");
      },
    }
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable
        style={[styles.backdrop, { backgroundColor: "rgba(0,0,0,0.45)" }]}
        onPress={onClose}
      >
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              marginBottom: insets.bottom + 16,
              borderColor,
            },
          ]}
          onPress={() => {}}
        >
          {/* Drag handle */}
          <View style={[styles.handle, { backgroundColor: borderColor }]} />

          {/* ---------- User Header ---------- */}
          <View style={styles.profileHeader}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: chipBg, borderColor },
              ]}
            >
              <Ionicons name="person" size={22} color={brandPrimary} />
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={[styles.userName, { color: colors.text }]}
                numberOfLines={1}
              >
                {displayName}
              </Text>
              <Text
                style={[styles.userMeta, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {userData?.email || userData?.phone || "—"}
              </Text>
            </View>

            <View
              style={[
                styles.rolePill,
                { backgroundColor: chipBg, borderColor },
              ]}
            >
              <Text style={[styles.roleText, { color: brandPrimary }]}>
                {user?.role?.roleCode || "USER"}
              </Text>
            </View>
          </View>

          {/* ---------- Menu Items ---------- */}
          <View
            style={[
              styles.menuCard,
              { backgroundColor: menuBg, borderColor },
            ]}
          >
            {menuItems.map((item, idx) => (
              <View key={item.id}>
                <TouchableOpacity
                  style={styles.menuRow}
                  activeOpacity={0.7}
                  onPress={item.onPress}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                >
                  <View
                    style={[
                      styles.menuIcon,
                      { backgroundColor: chipBg },
                    ]}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={14}
                      color={brandPrimary}
                    />
                  </View>
                  <Text style={[styles.menuLabel, { color: colors.text }]}>
                    {item.label}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
                {idx !== menuItems.length - 1 && (
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: borderColor, marginLeft: 48 },
                    ]}
                  />
                )}
              </View>
            ))}
          </View>

          {/* ---------- Logout Button ---------- */}
          <TouchableOpacity
            style={[
              styles.logoutBtn,
              {
                backgroundColor: chipBg,
                borderColor: dangerColor,
              },
            ]}
            activeOpacity={0.7}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Logout"
          >
            <Ionicons name="log-out-outline" size={16} color={dangerColor} />
            <Text style={[styles.logoutText, { color: dangerColor }]}>
              Logout
            </Text>
          </TouchableOpacity>

          {/* ---------- Cancel ---------- */}
          <TouchableOpacity
            style={styles.cancelBtn}
            activeOpacity={0.6}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default UserProfileModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    marginHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
    opacity: 0.6,
  },

  /* Profile header */
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingBottom: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  userMeta: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  /* Menu */
  menuCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginBottom: 10,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
    minHeight: 44,
  },
  menuIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },

  /* Logout */
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 44,
  },
  logoutText: {
    fontSize: 13.5,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  /* Cancel */
  cancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginTop: 4,
    minHeight: 44,
  },
  cancelText: {
    fontSize: 12.5,
    fontWeight: "600",
  },
});