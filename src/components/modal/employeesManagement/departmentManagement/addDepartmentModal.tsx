import Dropdown from "@/components/ui/dropdown";
import { Colors } from "@/constants/theme";
import { createDepartmentApiCall } from "@/redux/slices/employeeManagementSlice";
import EmplyeesManagementValidation, { DEPARTMENT_CODE_OPTIONS, DepartmentFormValues } from "@/validations/emplyeesManagement";


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

const DEPARTMENT_CODE_DROPDOWN = DEPARTMENT_CODE_OPTIONS.map((v) => ({
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

const AddDepartmentModal: React.FC<Props> = ({
  visible,
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
  } = useForm<DepartmentFormValues>({
    resolver: zodResolver(EmplyeesManagementValidation.departmentSchema),
    mode: "onSubmit",
    defaultValues: {
      departmentCode: undefined as any,
      departmentName: "",
      departmentDescription: "",
    },
  });

  useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  const onSubmit = async (values: DepartmentFormValues) => {
    const ok = await createDepartmentApiCall(
      {
        departmentCode: values.departmentCode,
        departmentName: values.departmentName.trim(),
        departmentDescription: values.departmentDescription.trim(),
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
                Add Department
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Controller
                control={control}
                name="departmentCode"
                render={({ field: { value, onChange } }) => (
                  <Dropdown
                    label="Department Code"
                    placeholder="Select department code"
                    value={value as string | undefined}
                    options={DEPARTMENT_CODE_DROPDOWN}
                    onChange={onChange}
                    error={errors.departmentCode?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="departmentName"
                render={({ field: { value, onChange } }) => (
                  <View style={{ marginTop: 14 }}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      Department Name
                    </Text>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      placeholder="e.g. Sales"
                      placeholderTextColor={colors.textMuted}
                      style={[
                        styles.input,
                        {
                          color: colors.text,
                          backgroundColor: colors.surfacePrimary,
                          borderColor: errors.departmentName
                            ? colors.error
                            : colors.border,
                        },
                      ]}
                    />
                    {!!errors.departmentName?.message && (
                      <Text
                        style={[styles.errorText, { color: colors.error }]}
                      >
                        {errors.departmentName.message}
                      </Text>
                    )}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="departmentDescription"
                render={({ field: { value, onChange } }) => (
                  <View style={{ marginTop: 14 }}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      Department Description
                    </Text>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      placeholder="Describe this department"
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
                          borderColor: errors.departmentDescription
                            ? colors.error
                            : colors.border,
                        },
                      ]}
                    />
                    {!!errors.departmentDescription?.message && (
                      <Text
                        style={[styles.errorText, { color: colors.error }]}
                      >
                        {errors.departmentDescription.message}
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
                  <Text style={styles.primaryBtnText}>Create Department</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default AddDepartmentModal;

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