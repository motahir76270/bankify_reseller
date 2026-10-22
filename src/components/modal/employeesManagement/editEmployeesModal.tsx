import Dropdown from "@/components/ui/dropdown";
import { Colors } from "@/constants/theme";
import {
  getDepartmentDataApiCall,
  updateEmployeesApiCall,
} from "@/redux/slices/employeeManagementSlice";
import EmplyeesManagementValidation, { EmployessFormValues } from "@/validations/emplyeesManagement";
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
import { useDispatch, useSelector } from "react-redux";

const EMPLOYEE_STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;

type Props = {
  visible: boolean;
  employee: any | null;
  onClose: () => void;
  onSuccess?: () => void;
};

const EditEmployeeModal: React.FC<Props> = ({
  visible,
  employee,
  onClose,
  onSuccess,
}) => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const deptRaw = useSelector(
    (state: any) => state.employees?.departmentData,
  );
  const departments = Array.isArray(deptRaw) ? deptRaw : [];

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmployessFormValues>({
    resolver: zodResolver(EmplyeesManagementValidation.employessSchema),
    mode: "onSubmit",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      mobileNumber: "",
      departmentId: undefined as any,
      employeeStatus: "ACTIVE",
    },
  });

  useEffect(() => {
    if (!visible) return;
    getDepartmentDataApiCall(dispatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (visible && employee) {
      reset({
        firstName: employee.firstName ?? "",
        lastName: employee.lastName ?? "",
        email: employee.email ?? "",
        mobileNumber: employee.mobileNumber ?? "",
        departmentId: employee.departmentId ?? (undefined as any),
        employeeStatus:
          employee.employeeStatus ?? employee.status ?? "ACTIVE",
      });
    }
  }, [visible, employee, reset]);

  const onSubmit = async (values: EmployessFormValues) => {
    if (!employee) return;
    const ok = await updateEmployeesApiCall(employee.id, values, dispatch);
    if (ok) {
      onSuccess?.();
      onClose();
    }
  };

  const departmentOptions = departments.map((d: any) => ({
    label: d?.departmentName ?? d?.name ?? "Unknown",
    value: String(d?.id ?? ""),
  }));

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
                Edit Employee
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
                name="firstName"
                render={({ field: { value, onChange } }) => (
                  <View>
                    <Text style={[styles.label, { color: colors.text }]}>
                      First Name
                    </Text>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      style={[
                        styles.input,
                        {
                          color: colors.text,
                          backgroundColor: colors.surfacePrimary,
                          borderColor: errors.firstName
                            ? colors.error
                            : colors.border,
                        },
                      ]}
                    />
                    {!!errors.firstName?.message && (
                      <Text
                        style={[styles.errorText, { color: colors.error }]}
                      >
                        {errors.firstName.message}
                      </Text>
                    )}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="lastName"
                render={({ field: { value, onChange } }) => (
                  <View style={{ marginTop: 14 }}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      Last Name
                    </Text>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      style={[
                        styles.input,
                        {
                          color: colors.text,
                          backgroundColor: colors.surfacePrimary,
                          borderColor: errors.lastName
                            ? colors.error
                            : colors.border,
                        },
                      ]}
                    />
                    {!!errors.lastName?.message && (
                      <Text
                        style={[styles.errorText, { color: colors.error }]}
                      >
                        {errors.lastName.message}
                      </Text>
                    )}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="email"
                render={({ field: { value, onChange } }) => (
                  <View style={{ marginTop: 14 }}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      Email
                    </Text>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={[
                        styles.input,
                        {
                          color: colors.text,
                          backgroundColor: colors.surfacePrimary,
                          borderColor: errors.email
                            ? colors.error
                            : colors.border,
                        },
                      ]}
                    />
                    {!!errors.email?.message && (
                      <Text
                        style={[styles.errorText, { color: colors.error }]}
                      >
                        {errors.email.message}
                      </Text>
                    )}
                  </View>
                )}
              />

              <Controller
                control={control}
                name="mobileNumber"
                render={({ field: { value, onChange } }) => (
                  <View style={{ marginTop: 14 }}>
                    <Text style={[styles.label, { color: colors.text }]}>
                      Mobile Number
                    </Text>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      keyboardType="phone-pad"
                      maxLength={10}
                      style={[
                        styles.input,
                        {
                          color: colors.text,
                          backgroundColor: colors.surfacePrimary,
                          borderColor: errors.mobileNumber
                            ? colors.error
                            : colors.border,
                        },
                      ]}
                    />
                    {!!errors.mobileNumber?.message && (
                      <Text
                        style={[styles.errorText, { color: colors.error }]}
                      >
                        {errors.mobileNumber.message}
                      </Text>
                    )}
                  </View>
                )}
              />

              <View style={{ marginTop: 14 }}>
                <Controller
                  control={control}
                  name="departmentId"
                  render={({ field: { value, onChange } }) => (
                    <Dropdown
                      label="Department"
                      placeholder="Select department"
                      value={value}
                      options={departmentOptions}
                      onChange={onChange}
                      error={errors.departmentId?.message}
                    />
                  )}
                />
              </View>

              <View style={{ marginTop: 14 }}>
                <Controller
                  control={control}
                  name="employeeStatus"
                  render={({ field: { value, onChange } }) => (
                    <Dropdown
                      label="Status"
                      placeholder="Select status"
                      value={value}
                      options={EMPLOYEE_STATUS_OPTIONS}
                      onChange={onChange}
                      error={errors.employeeStatus?.message}
                    />
                  )}
                />
              </View>

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

export default EditEmployeeModal;

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
    minHeight: "90%",
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