import Dropdown from "@/components/ui/dropdown";
import { Colors } from "@/constants/theme";
import { updateRolePermissionApiCall } from "@/redux/slices/userMangementSlice";

import UserManagementValidation, {
  ROLE_CODE_OPTIONS,
} from "@/validations/userManagement";

import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useDispatch } from "react-redux";
import { z } from "zod";

type RoleFormValues = z.infer<
  ReturnType<typeof UserManagementValidation.userRoleSchema>
>;

type Props = {
  visible: boolean;
  role: any | null;
  onClose: () => void;
  onSuccess?: () => void;
};

/* Prettified dropdown options — turn STATE_HEAD into "State Head" */
const ROLE_CODE_DROPDOWN = ROLE_CODE_OPTIONS.map((v) => ({
  label: v
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" "),
  value: v as string,
}));

const EditRoleModal: React.FC<Props> = ({
  visible,
  role,
  onClose,
  onSuccess,
}) => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(UserManagementValidation.userRoleSchema),
    mode: "onSubmit",
    defaultValues: {
      roleCode: undefined as any,
      roleName: "",
      roleDescription: "",
    },
  });

  /* Populate form when role changes / modal opens */
  useEffect(() => {
    if (visible && role) {
      const code = role.roleCode;
      const isAllowed = (
        ROLE_CODE_OPTIONS as readonly string[]
      ).includes(code);

      reset({
        roleCode: isAllowed ? code : (undefined as any),
        roleName: role.roleName ?? "",
        roleDescription: role.roleDescription ?? "",
      });
    }
  }, [visible, role, reset]);

  const onSubmit = async (values: RoleFormValues) => {
    if (!role) return;
    const ok = await updateRolePermissionApiCall(
      role.id,
      {
        roleCode: values.roleCode,
        roleName: values.roleName.trim(),
        roleDescription: values.roleDescription.trim(),
      },
      dispatch,
    );
    if (ok) {
      onSuccess?.();
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ width: "100%" }}
        >
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
              <Text style={[styles.title, { color: colors.text }]}>
                Edit Role
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Role Code — Dropdown */}
              <Controller
                control={control}
                name="roleCode"
                render={({ field: { value, onChange } }) => (
                  <Dropdown
                    label="Role Code"
                    placeholder="Select role code"
                    value={value as string | undefined}
                    options={ROLE_CODE_DROPDOWN}
                    onChange={onChange}
                    error={errors.roleCode?.message}
                  />
                )}
              />

              {/* Role Name */}
              <Controller
                control={control}
                name="roleName"
                render={({ field: { value, onChange } }) => (
                  <View style={{ marginTop: 14 }}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      Role Name
                    </Text>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      placeholder="e.g. State Head"
                      placeholderTextColor={colors.textMuted}
                      style={[
                        styles.input,
                        {
                          color: colors.text,
                          backgroundColor: colors.surfacePrimary,
                          borderColor: errors.roleName
                            ? colors.error
                            : colors.border,
                        },
                      ]}
                    />
                    {!!errors.roleName?.message && (
                      <Text
                        style={[styles.errorText, { color: colors.error }]}
                      >
                        {errors.roleName.message}
                      </Text>
                    )}
                  </View>
                )}
              />

              {/* Role Description */}
              <Controller
                control={control}
                name="roleDescription"
                render={({ field: { value, onChange } }) => (
                  <View style={{ marginTop: 14 }}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      Role Description
                    </Text>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      placeholder="Describe the responsibilities of this role"
                      placeholderTextColor={colors.textMuted}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      style={[
                        styles.input,
                        styles.textarea,
                        {
                          color: colors.text,
                          backgroundColor: colors.surfacePrimary,
                          borderColor: errors.roleDescription
                            ? colors.error
                            : colors.border,
                        },
                      ]}
                    />
                    {!!errors.roleDescription?.message && (
                      <Text
                        style={[styles.errorText, { color: colors.error }]}
                      >
                        {errors.roleDescription.message}
                      </Text>
                    )}
                  </View>
                )}
              />

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting}
                style={[
                  styles.primaryBtn,
                  { backgroundColor: colors.buttonPrimary },
                  isSubmitting && { opacity: 0.7 },
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default EditRoleModal;

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
    minHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: "800" },
  label: { fontSize: 12.5, fontWeight: "700", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "500",
  },
  textarea: { minHeight: 90, paddingTop: 12 },
  errorText: { fontSize: 11.5, fontWeight: "600", marginTop: 4 },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  primaryBtnText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
});