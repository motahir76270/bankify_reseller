import React, { useEffect, useMemo, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { Colors } from "@/constants/theme";
import ExpressTransferValidation from "@/validations/expressTransfer";
import { showError, showSuccess } from "@/components/service/AlertService";
import {
  getBanksApiCall,
  getVerifyBank,
  updateBeneficiaryApiCall,
  deleteBeneficiaryApiCall,
} from "@/redux/slices/expressTransferSlice";

/* ----------------------------- Types ----------------------------- */

type Beneficiary = {
  beneficiaryId: string;
  userId?: string;
  tenantId?: string;
  name?: string;
  mobileNumber?: string;
  areaPinCode?: string;
  beneficiaryIsActive?: boolean;
  bankAccountId?: string;
  bankId?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  verificationStatus?: string;
  bankIsActive?: boolean;
  [key: string]: any;
};

type Bank = {
  id: string;
  name: string;
  ifscGlobal?: string;
};

type Props = {
  visible: boolean;
  beneficiary: Beneficiary | null;
  onClose: () => void;
  onSuccess?: () => void;
};

type FormState = {
  accountNumber: string;
  bankName: string;
  bankId: string;
  ifscCode: string;
  accountHolderName: string;
};

const emptyForm: FormState = {
  accountNumber: "",
  bankName: "",
  bankId: "",
  ifscCode: "",
  accountHolderName: "",
};

/* --------------------------- Helpers ----------------------------- */

const asArray = (raw: any): Bank[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.banks)) return raw.banks;
  if (Array.isArray(raw.BankList)) return raw.BankList;
  if (Array.isArray(raw.data)) return raw.data;
  return [];
};

/* --------------------------- Component --------------------------- */

const EditBeneficiaryModal = ({
  visible,
  beneficiary,
  onClose,
  onSuccess,
}: Props) => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const { BankList, loading } = useSelector(
    (state: any) => state?.expressTransfer,
  );

  const banks = useMemo(() => asArray(BankList), [BankList]);

  // console.log(beneficiary);
  

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  // Dropdown state
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState("");

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const filteredBanks = useMemo(() => {
    const q = bankSearch.trim().toLowerCase();
    if (!q) return banks;
    return banks.filter(
      (b) =>
        (b.name ?? "").toLowerCase().includes(q) ||
        (b.ifscGlobal ?? "").toLowerCase().includes(q),
    );
  }, [banks, bankSearch]);

  /* -------- Hydrate from beneficiary -------- */

  useEffect(() => {
    if (!visible || !beneficiary) return;
    setForm({
      accountNumber: beneficiary.accountNumber ?? "",
      bankName: beneficiary.bankName ?? "",
      bankId: beneficiary.bankId ?? "",
      ifscCode: beneficiary.ifscCode ?? "",
      accountHolderName: beneficiary.accountHolderName ?? "",
    });
    setErrors({});
    setVerified(beneficiary.verificationStatus === "VERIFIED");
    setBankDropdownOpen(false);
    setBankSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, beneficiary]);

  /* -------- Fetch banks if missing -------- */

  useEffect(() => {
    if (!visible) return;
    if (banks.length === 0) getBanksApiCall(dispatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  /* -------- Reset verification when account / ifsc change -------- */

  useEffect(() => {
    // Don't reset on initial hydration
    if (!beneficiary) return;
    const sameAcc =
      form.accountNumber.trim() === (beneficiary.accountNumber ?? "").trim();
    const sameIfsc =
      form.ifscCode.trim().toUpperCase() ===
      (beneficiary.ifscCode ?? "").trim().toUpperCase();
    if (!sameAcc || !sameIfsc) setVerified(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.accountNumber, form.ifscCode]);

  const resetAndClose = () => {
    setForm(emptyForm);
    setErrors({});
    setVerified(false);
    setBankDropdownOpen(false);
    setBankSearch("");
    setDeleteOpen(false);
    onClose();
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  /* -------- Bank select -------- */

  const selectBank = (b: Bank) => {
    setForm((prev) => ({
      ...prev,
      bankId: b.id,
      bankName: b.name,
      ifscCode: b.ifscGlobal ?? prev.ifscCode,
    }));
    setErrors((prev) => ({ ...prev, bankId: "", ifscCode: "" }));
    setBankDropdownOpen(false);
    setBankSearch("");
  };

  /* -------- Verify -------- */

  const canVerify = useMemo(() => {
    const acc = form.accountNumber.trim();
    const ifsc = form.ifscCode.trim().toUpperCase();
    return (
      acc.length >= 6 &&
      /^\d+$/.test(acc) &&
      /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)
    );
  }, [form.accountNumber, form.ifscCode]);

  const handleVerify = async () => {
    if (!canVerify) {
      showError("Invalid", "Enter a valid account number and IFSC code");
      return;
    }

    setVerifying(true);
    try {
      const payload = {
        ifsc_code: form.ifscCode.trim().toUpperCase(),
        account_number: form.accountNumber.trim(),
      };
      const res = await getVerifyBank(payload, dispatch);
      
      if (res?.success === true) {
        const name = res?.data?.beneficiaryName ?? null;
        if (name) {
          setField("accountHolderName", name);
          setVerified(true);
          showSuccess("Verified", `Account holder: ${name}`);
        } else {
          setVerified(true);
          showSuccess("Verified", "Bank account verified");
        }
      } else {
        setVerified(false);
        showError(
          "Verification failed",
          res?.message || "Could not verify the account",
        );
      }
    } catch (err: any) {
      setVerified(false);
      showError("Failed", err?.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  /* -------- Update -------- */

  const handleSubmit = async () => {
    if (!beneficiary?.beneficiaryId) {
      showError("Error", "Missing beneficiary id");
      return;
    }

    const raw: any = {
      accountNumber: form.accountNumber.trim(),
      bankName: form.bankName.trim(),
      bankId: form.bankId,
      ifscCode: form.ifscCode.trim().toUpperCase(),
      accountHolderName: form.accountHolderName.trim(),
    };

    const schema = ExpressTransferValidation.addBeneficiarySchema;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue: any) => {
        fieldErrors[issue.path[0]] = issue.message;
      });
      setErrors(fieldErrors);
      showError("Validation", parsed.error.issues[0]?.message || "Check form");
      return;
    }

    setSubmitting(true);
    try {
      const res = await updateBeneficiaryApiCall(
        parsed.data,
        beneficiary.bankAccountId,
        dispatch,
      );
      if (res) {
        onSuccess?.();
        resetAndClose();
      }
    } catch (err: any) {
      showError("Failed", err?.message || "Could not update beneficiary");
    } finally {
      setSubmitting(false);
    }
  };

  /* -------- Delete -------- */

  const handleDelete = async () => {
    if (!beneficiary?.beneficiaryId) return;

    setDeleting(true);
    console.log(beneficiary);
    
    try {
      const res = await deleteBeneficiaryApiCall(
        beneficiary.bankAccountId,
        dispatch,
      );
      if (res?.success === true || res === true) {
        onSuccess?.();
        setDeleteOpen(false);
        resetAndClose();
      } 
    } catch (err: any) {
      showError("Failed", err?.message || "Could not delete beneficiary");
    } finally {
      setDeleting(false);
    }
  };

  /* -------- Renderers -------- */

  const renderTextInput = (
    label: string,
    key: keyof FormState,
    opts: {
      placeholder?: string;
      keyboardType?: "default" | "numeric" | "phone-pad" | "number-pad";
      autoCapitalize?: "none" | "words" | "characters";
      maxLength?: number;
      required?: boolean;
      editable?: boolean;
    } = {},
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
          style={[styles.input, { color: colors.text, flex: 1 }]}
          editable={opts.editable !== false && !submitting}
        />
      </View>
      {!!errors[key] && (
        <Text style={[styles.errorText, { color: colors.error }]}>
          {errors[key]}
        </Text>
      )}
    </View>
  );

  if (!beneficiary) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={resetAndClose}
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ width: "100%" }}
        >
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>
                  Edit Beneficiary
                </Text>
                <Text
                  style={[styles.subTitle, { color: colors.textMuted }]}
                  numberOfLines={1}
                >
                  {beneficiary.name ?? "—"} ·{" "}
                  {beneficiary.accountNumber?.slice(-4) ?? ""}
                </Text>
              </View>
              <TouchableOpacity onPress={resetAndClose} disabled={submitting}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Bank dropdown */}
              <View style={[styles.field, { zIndex: 20 }]}>
                <Text style={[styles.label, { color: colors.textMuted }]}>
                  Bank <Text style={{ color: colors.error }}>*</Text>
                </Text>

                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={submitting}
                  onPress={() => setBankDropdownOpen((p) => !p)}
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
                    {form.bankName || "Select a bank"}
                  </Text>
                  <Ionicons
                    name={bankDropdownOpen ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>

                {!!errors.bankId && (
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    {errors.bankId}
                  </Text>
                )}

                {bankDropdownOpen && (
                  <View
                    style={[
                      styles.dropdownPanel,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.searchWrap,
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
                        value={bankSearch}
                        onChangeText={setBankSearch}
                        placeholder="Search bank name or IFSC"
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[styles.searchInput, { color: colors.text }]}
                      />
                      {bankSearch.length > 0 && (
                        <TouchableOpacity onPress={() => setBankSearch("")}>
                          <Ionicons
                            name="close-circle"
                            size={16}
                            color={colors.textMuted}
                          />
                        </TouchableOpacity>
                      )}
                    </View>

                    <ScrollView
                      style={styles.dropdownList}
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                    >
                      {loading && banks.length === 0 ? (
                        <Text
                          style={[
                            styles.emptyText,
                            { color: colors.textMuted },
                          ]}
                        >
                          Loading banks...
                        </Text>
                      ) : filteredBanks.length === 0 ? (
                        <Text
                          style={[
                            styles.emptyText,
                            { color: colors.textMuted },
                          ]}
                        >
                          No banks found
                        </Text>
                      ) : (
                        filteredBanks.map((b) => {
                          const active = form.bankId === b.id;
                          return (
                            <TouchableOpacity
                              key={b.id}
                              onPress={() => selectBank(b)}
                              activeOpacity={0.7}
                              style={[
                                styles.dropdownItem,
                                {
                                  backgroundColor: active
                                    ? colors.surfaceTertiary
                                    : "transparent",
                                },
                              ]}
                            >
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={[
                                    styles.dropdownItemText,
                                    { color: colors.text },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {b.name}
                                </Text>
                                {!!b.ifscGlobal && (
                                  <Text
                                    style={[
                                      styles.dropdownItemSub,
                                      { color: colors.textMuted },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {b.ifscGlobal}
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
                        })
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

              {renderTextInput("Account Number", "accountNumber", {
                placeholder: "0123456789",
                keyboardType: "number-pad",
                required: true,
              })}

              {renderTextInput("IFSC Code", "ifscCode", {
                placeholder: "SBIN0000001",
                autoCapitalize: "characters",
                maxLength: 11,
                required: true,
              })}

              {/* Verify */}
              {canVerify && !verified && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={verifying || submitting}
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
                      backgroundColor: (colors.success ?? "#10B981") + "15",
                    },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={colors.success ?? "#10B981"}
                  />
                  <Text
                    style={[
                      styles.verifiedText,
                      { color: colors.success ?? "#10B981" },
                    ]}
                  >
                    Account verified
                  </Text>
                </View>
              )}

              {renderTextInput("Account Holder Name", "accountHolderName", {
                placeholder: "Auto-filled on verification",
                autoCapitalize: "words",
                required: true,
                editable: !verified,
              })}

              {/* Update button */}
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={submitting}
                onPress={handleSubmit}
                style={[
                  styles.submitBtn,
                  {
                    backgroundColor: colors.buttonPrimary,
                    opacity: submitting ? 0.6 : 1,
                  },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color="#FFF" />
                    <Text style={styles.submitText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Delete button */}
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={submitting || deleting}
                onPress={() => setDeleteOpen(true)}
                style={[
                  styles.deleteBtn,
                  {
                    borderColor: colors.error,
                    opacity: submitting || deleting ? 0.6 : 1,
                  },
                ]}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={colors.error}
                />
                <Text style={[styles.deleteText, { color: colors.error }]}>
                  Delete Beneficiary
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>

        {/* -------- Delete confirm modal -------- */}
        <Modal
          visible={deleteOpen}
          transparent
          animationType="fade"
          onRequestClose={() => !deleting && setDeleteOpen(false)}
        >
          <View style={styles.confirmBackdrop}>
            <View
              style={[
                styles.confirmCard,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.confirmIconWrap,
                  { backgroundColor: (colors.error ?? "#EF4444") + "18" },
                ]}
              >
                <Ionicons
                  name="trash-outline"
                  size={24}
                  color={colors.error ?? "#EF4444"}
                />
              </View>

              <Text style={[styles.confirmTitle, { color: colors.text }]}>
                Delete Beneficiary?
              </Text>
              <Text style={[styles.confirmMsg, { color: colors.textMuted }]}>
                This will permanently remove{" "}
                <Text style={{ fontWeight: "800" }}>
                  {beneficiary.accountHolderName ?? beneficiary.name}
                </Text>{" "}
                from your beneficiaries. This action cannot be undone.
              </Text>

              <View style={styles.confirmActions}>
                <TouchableOpacity
                  onPress={() => setDeleteOpen(false)}
                  disabled={deleting}
                  style={[
                    styles.confirmCancel,
                    { borderColor: colors.border },
                  ]}
                >
                  <Text
                    style={[styles.confirmCancelText, { color: colors.text }]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleDelete}
                  disabled={deleting}
                  style={[
                    styles.confirmDelete,
                    {
                      backgroundColor: colors.error ?? "#EF4444",
                      opacity: deleting ? 0.7 : 1,
                    },
                  ]}
                >
                  {deleting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={16} color="#FFF" />
                      <Text style={styles.confirmDeleteText}>Delete</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

export default EditBeneficiaryModal;

/* --------------------------- Styles ------------------------------ */

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: "80%",
    maxHeight: "95%",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: "800" },
  subTitle: { fontSize: 11.5, fontWeight: "500", marginTop: 3 },

  field: { marginBottom: 12 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
    marginTop: 4,
  },
  inputWrap: {
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  input: { fontSize: 14, fontWeight: "500", paddingVertical: 0 },
  errorText: { fontSize: 11, marginTop: 4, fontWeight: "600" },

  dropdownTrigger: { justifyContent: "space-between" },
  dropdownPanel: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    height: 42,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "500",
    paddingVertical: 0,
  },
  dropdownList: { maxHeight: 240 },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dropdownItemText: { fontSize: 13.5, fontWeight: "600" },
  dropdownItemSub: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  emptyText: {
    textAlign: "center",
    paddingVertical: 16,
    fontSize: 12.5,
    fontWeight: "600",
  },

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

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
    marginTop: 12,
  },
  submitText: { color: "#FFF", fontSize: 14, fontWeight: "800" },

  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 10,
  },
  deleteText: { fontSize: 13.5, fontWeight: "800" },

  /* Confirm delete */
  confirmBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
  },
  confirmIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  confirmTitle: { fontSize: 17, fontWeight: "800" },
  confirmMsg: {
    fontSize: 12.5,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
    width: "100%",
  },
  confirmCancel: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCancelText: { fontSize: 13.5, fontWeight: "700" },
  confirmDelete: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 46,
    borderRadius: 12,
  },
  confirmDeleteText: { color: "#FFF", fontSize: 13.5, fontWeight: "800" },
});