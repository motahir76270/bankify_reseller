import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from "react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { Colors } from "@/constants/theme";
import { showError } from "@/components/service/AlertService";
import {
  getVarifyBankAccount,
  createBankAccountApiCall,
  getBankListApiCall,
} from "@/redux/slices/bankAccountSlice";
import BankAccountValiation from "@/validations/bankAccount";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

type Bank = {
  id: string | number;
  name?: string;
  ifscGlobal?: string;
};

const emptyForm = {
  accountHolderName: "",
  accountNumber: "",
  bankId: "",
  bankName: "",
  branchName: "",
  ifscCode: "",
  isPrimary: false,
  mobileNumber: "",
  upiId: "",
};

const REQUIRE_VERIFICATION = true;

/* --------------------- Bank Picker Sub-Modal --------------------- */

type BankPickerProps = {
  visible: boolean;
  banks: Bank[];
  selectedId?: string | number;
  colors: any;
  onClose: () => void;
  onSelect: (b: Bank) => void;
  onRequestFetch: () => Promise<void>;
};

const BankPickerModal = ({
  visible,
  banks,
  selectedId,
  colors,
  onClose,
  onSelect,
  onRequestFetch,
}: BankPickerProps) => {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const fetchedOnceRef = useRef(false);

  // Set loader true SYNCHRONOUSLY the moment the picker opens.
  useEffect(() => {
    if (!visible) {
      fetchedOnceRef.current = false;
      setSearch("");
      setLoading(false);
      return;
    }
    if (banks.length > 0) return;
    if (fetchedOnceRef.current) return;

    fetchedOnceRef.current = true;
    setLoading(true);
    onRequestFetch()
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return banks;
    return banks.filter(
      (b) =>
        (b.name ?? "").toLowerCase().includes(q) ||
        (b.ifscGlobal ?? "").toLowerCase().includes(q)
    );
  }, [banks, search]);

  const renderRow = useCallback(
    ({ item }: { item: Bank }) => {
      const active = String(selectedId) === String(item.id);
      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onSelect(item)}
          style={[
            styles.bankRow,
            { backgroundColor: active ? colors.surfaceTertiary : "transparent" },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.bankName, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.name ?? "Bank"}
            </Text>
            {!!item.ifscGlobal && (
              <Text
                style={[styles.bankIfsc, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {item.ifscGlobal}
              </Text>
            )}
          </View>
          {active && (
            <Ionicons
              name="checkmark"
              size={18}
              color={colors.buttonPrimary}
            />
          )}
        </TouchableOpacity>
      );
    },
    [selectedId, colors, onSelect]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.pickerBackdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ width: "100%" }}
        >
          <View
            style={[styles.pickerSheet, { backgroundColor: colors.background }]}
          >
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>
                Select Bank
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.pickerSearch,
                {
                  backgroundColor: colors.surfaceTertiary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="search-outline"
                size={16}
                color={colors.textMuted}
              />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search bank or IFSC"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.pickerSearchInput, { color: colors.text }]}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              )}
            </View>

            {loading ? (
              <View style={styles.loaderBox}>
                <ActivityIndicator color={colors.buttonPrimary} />
                <Text
                  style={[
                    styles.emptyText,
                    { color: colors.textMuted, marginTop: 8 },
                  ]}
                >
                  Loading banks...
                </Text>
              </View>
            ) : filtered.length === 0 ? (
              <View style={styles.loaderBox}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {search.trim().length > 0
                    ? "No banks match your search"
                    : "No banks available"}
                </Text>
                {search.trim().length === 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setLoading(true);
                      onRequestFetch()
                        .catch(() => {})
                        .finally(() => setLoading(false));
                    }}
                    style={{ marginTop: 10 }}
                  >
                    <Text
                      style={[
                        styles.retryText,
                        { color: colors.buttonPrimary },
                      ]}
                    >
                      Tap to retry
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderRow}
                keyboardShouldPersistTaps="always"
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 360 }}
                contentContainerStyle={{ paddingVertical: 6 }}
                initialNumToRender={12}
                windowSize={10}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

/* --------------------------- Component --------------------------- */

const AddBankModal = ({ visible, onClose, onSuccess }: Props) => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const bankList = useSelector(
    (state: any) => state?.banks?.bankList ?? []
  ) as Bank[];
  const loading = useSelector((state: any) => state?.banks?.loading);

  const [form, setForm] = useState<any>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  /* -------- Reset on close -------- */
  useEffect(() => {
    if (!visible) {
      setForm(emptyForm);
      setErrors({});
      setVerified(false);
      setVerifiedName(null);
      setVerifying(false);
      setPickerOpen(false);
    }
  }, [visible]);

  /* -------- Reset verification when account / ifsc change -------- */
  useEffect(() => {
    setVerified(false);
    setVerifiedName(null);
  }, [form.accountNumber, form.ifscCode]);

  const setField = (key: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  /* -------- Fetch banks (promise) for picker -------- */
  const fetchBanks = useCallback(async () => {
    await getBankListApiCall(dispatch);
  }, [dispatch]);

  /* -------- Select bank -------- */
  const selectBank = (b: Bank) => {
    setField("bankId", b.id);
    setField("bankName", b.name ?? "");
    if (!form.ifscCode && b.ifscGlobal) {
      setField("ifscCode", b.ifscGlobal);
    }
    setPickerOpen(false);
  };

  const canVerify = useMemo(() => {
    return (
      form.accountNumber.trim().length >= 6 &&
      /^\d+$/.test(form.accountNumber.trim()) &&
      /^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifscCode.trim().toUpperCase())
    );
  }, [form.accountNumber, form.ifscCode]);

  const validate = () => {
    const schema = BankAccountValiation.addBankSchema;
    const result = schema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue: any) => {
        fieldErrors[issue.path[0]] = issue.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    if (REQUIRE_VERIFICATION && !verified) {
      showError("Verification", "Please verify the bank account first");
      return false;
    }
    return true;
  };

  const handleVerify = async () => {
    if (!canVerify) {
      showError("Invalid", "Enter a valid account number and IFSC code");
      return;
    }

    setVerifying(true);
    try {
      const payload = {
        account_number: form.accountNumber.trim(),
        ifsc_code: form.ifscCode.trim().toUpperCase(),
      };

      const res = await getVarifyBankAccount(payload, dispatch);

      if (res?.success === true) {
        const name = res?.data?.beneficiaryName ?? null;
        if (name) {
          setVerifiedName(name);
          setField("accountHolderName", name);
        } else {
          setVerifiedName(null);
        }
        setVerified(true);
      }
    } catch (err: any) {
      showError("Failed", err?.message || "Verification failed");
      setVerified(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const payload = {
      accountHolderName: form.accountHolderName.trim(),
      accountNumber: form.accountNumber.trim(),
      bankId: form.bankId,
      bankName: form.bankName || undefined,
      branchName: form.branchName.trim(),
      ifscCode: form.ifscCode.trim().toUpperCase(),
      isPrimary: form.isPrimary,
      mobileNumber: form.mobileNumber.trim(),
      upiId: form.upiId.trim() || undefined,
    };

    const res = await createBankAccountApiCall(payload, dispatch);
    if (res) {
      onSuccess?.();
      onClose();
    }
  };

  const renderField = (
    label: string,
    key: keyof typeof emptyForm,
    opts: {
      placeholder?: string;
      keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
      secure?: boolean;
      autoCapitalize?: "none" | "sentences" | "words" | "characters";
      maxLength?: number;
      editable?: boolean;
      required?: boolean;
    } = {}
  ) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textMuted }]}>
        {label}
        {opts.required && <Text style={{ color: colors.error }}> *</Text>}
      </Text>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.surfaceTertiary,
            borderColor: errors[key] ? colors.error : colors.border,
            opacity: opts.editable === false ? 0.7 : 1,
          },
        ]}
      >
        <TextInput
          value={(form as any)[key]}
          onChangeText={(v) => setField(key, v)}
          placeholder={opts.placeholder ?? ""}
          placeholderTextColor={colors.textMuted}
          keyboardType={opts.keyboardType ?? "default"}
          autoCapitalize={opts.autoCapitalize ?? "none"}
          autoCorrect={false}
          maxLength={opts.maxLength}
          secureTextEntry={opts.secure}
          editable={opts.editable !== false}
          style={[styles.input, { color: colors.text, flex: 1 }]}
        />
      </View>
      {!!errors[key] && (
        <Text style={[styles.errorText, { color: colors.error }]}>
          {errors[key]}
        </Text>
      )}
    </View>
  );

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.backdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.kavWrap}
          >
            <View
              style={[styles.sheet, { backgroundColor: colors.background }]}
            >
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>
                  Add Bank Account
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 30 }}
                keyboardShouldPersistTaps="handled"
              >
                {/* ---------- Bank selector (opens sub-modal) ---------- */}
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>
                    Bank<Text style={{ color: colors.error }}> *</Text>
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setPickerOpen(true)}
                    style={[
                      styles.inputWrap,
                      styles.dropdownTrigger,
                      {
                        backgroundColor: colors.surfaceTertiary,
                        borderColor: errors.bankId
                          ? colors.error
                          : colors.border,
                      },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.input,
                        {
                          color: form.bankName
                            ? colors.text
                            : colors.textMuted,
                          flex: 1,
                        },
                      ]}
                    >
                      {form.bankName || "Select Bank"}
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>

                  {!!errors.bankId && (
                    <Text style={[styles.errorText, { color: colors.error }]}>
                      {errors.bankId}
                    </Text>
                  )}
                </View>

                {/* ---------- Account Number ---------- */}
                {renderField("Account Number", "accountNumber", {
                  placeholder: "09876543212",
                  keyboardType: "numeric",
                  required: true,
                })}
                {renderField("IFSC Code", "ifscCode", {
                  placeholder: "SBIN0000001",
                  autoCapitalize: "characters",
                  maxLength: 11,
                  required: true,
                })}

                {/* ---------- Verify button ---------- */}
                {canVerify && !verified && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    disabled={verifying || loading}
                    onPress={handleVerify}
                    style={[
                      styles.verifyBtn,
                      {
                        borderColor: colors.buttonPrimary,
                        opacity: verifying ? 0.6 : 1,
                      },
                    ]}
                  >
                    {verifying ? (
                      <ActivityIndicator color={colors.buttonPrimary} />
                    ) : (
                      <>
                        <Ionicons
                          name="shield-checkmark-outline"
                          size={16}
                          color={colors.buttonPrimary}
                        />
                        <Text
                          style={[
                            styles.verifyText,
                            { color: colors.buttonPrimary },
                          ]}
                        >
                          Verify Bank Account
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {verified && (
                  <View
                    style={[
                      styles.verifiedBox,
                      {
                        borderColor: colors.success,
                        backgroundColor: "rgba(16,185,129,0.08)",
                      },
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={colors.success}
                    />
                    <Text
                      style={[styles.verifiedText, { color: colors.success }]}
                    >
                      {verifiedName
                        ? `Verified · ${verifiedName}`
                        : "Account verified"}
                    </Text>
                  </View>
                )}

                {renderField("Account Holder Name", "accountHolderName", {
                  placeholder: "Auto-filled on verification",
                  autoCapitalize: "words",
                  editable: !verifiedName,
                  required: true,
                })}

                {renderField("Mobile Number", "mobileNumber", {
                  placeholder: "9876543210",
                  keyboardType: "phone-pad",
                  maxLength: 10,
                  required: true,
                })}
                {renderField("Branch Name", "branchName", {
                  placeholder: "Main Branch",
                  autoCapitalize: "words",
                  required: true,
                })}
                {renderField("UPI ID (optional)", "upiId", {
                  placeholder: "john@upi",
                })}

                {/* isPrimary toggle */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setField("isPrimary", !form.isPrimary)}
                  style={styles.toggleRow}
                >
                  <Ionicons
                    name={
                      form.isPrimary ? "checkbox-outline" : "square-outline"
                    }
                    size={22}
                    color={colors.buttonPrimary}
                  />
                  <Text style={[styles.toggleText, { color: colors.text }]}>
                    Set as primary account
                  </Text>
                </TouchableOpacity>

                {/* Submit */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={loading}
                  onPress={handleSubmit}
                  style={[
                    styles.submitBtn,
                    {
                      backgroundColor: colors.buttonPrimary,
                      opacity: loading ? 0.5 : 1,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons
                        name="add-circle-outline"
                        size={18}
                        color="#fff"
                      />
                      <Text style={styles.submitText}>Save Bank Account</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ---------- Bank picker sub-modal ---------- */}
      <BankPickerModal
        visible={pickerOpen}
        banks={bankList}
        selectedId={form.bankId}
        colors={colors}
        onClose={() => setPickerOpen(false)}
        onSelect={selectBank}
        onRequestFetch={fetchBanks}
      />
    </>
  );
};

export default AddBankModal;

/* --------------------------- Styles ------------------------------ */

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  kavWrap: { width: "100%" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: "800" },
  field: { marginBottom: 12 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  inputWrap: {
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
  },
  input: { fontSize: 14, fontWeight: "500", paddingVertical: 0 },
  errorText: { fontSize: 11, marginTop: 4, fontWeight: "600" },

  dropdownTrigger: { justifyContent: "space-between" },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    marginBottom: 12,
  },
  toggleText: { fontSize: 13.5, fontWeight: "600" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
    marginTop: 8,
  },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  verifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  verifyText: { fontSize: 13.5, fontWeight: "800" },

  verifiedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  verifiedText: { fontSize: 12.5, fontWeight: "700", flex: 1 },

  /* -------- Bank picker modal styles -------- */
  pickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  pickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    minHeight: "55%",
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  pickerTitle: { fontSize: 16, fontWeight: "800" },
  pickerSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "500",
    paddingVertical: 0,
  },
  bankRow: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
  },
  bankName: { fontSize: 14, fontWeight: "600" },
  bankIfsc: { fontSize: 11.5, fontWeight: "500", marginTop: 2 },
  loaderBox: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
  },
  retryText: { fontSize: 13, fontWeight: "700" },
});