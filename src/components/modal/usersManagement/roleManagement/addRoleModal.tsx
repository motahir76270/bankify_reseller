import Dropdown from "@/components/ui/dropdown";
import { Colors } from "@/constants/theme";
import { createRoleApiCall } from "@/redux/slices/userMangementSlice";
import {
  ROLE_CODE_OPTIONS,
  UserRoleFormValues,
  userRoleSchema,
} from "@/validations/userManagement";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect } from "react";
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

/* Prettified dropdown options — STATE_HEAD → "State Head" */
const ROLE_CODE_DROPDOWN = ROLE_CODE_OPTIONS.map((v) => ({
  label: v
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" "),
  value: v as string,
}));

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

const AddRoleModal: React.FC<Props> = ({ visible, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserRoleFormValues>({
    resolver: zodResolver(userRoleSchema),
    mode: "onSubmit",
    defaultValues: {
      roleCode: undefined as any,
      roleName: "",
      roleDescription: "",
    },
  });

  /* Clear form whenever the modal closes */
  useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  const onSubmit = async (values: UserRoleFormValues) => {
    const ok = await createRoleApiCall(
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
        <View
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
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>
                Add Role
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

              {/* Submit */}
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
                  <Text style={styles.primaryBtnText}>Create Role</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AddRoleModal;

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
    minHeight:"80%"
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