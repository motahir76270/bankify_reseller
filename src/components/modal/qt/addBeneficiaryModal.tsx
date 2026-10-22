import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Colors } from "@/constants/theme";
import ExpressTransferValidation, {
  type AddBeneficiaryFormValues,
} from "@/validations/expressTransfer";
import { showError } from "@/components/service/AlertService";
import {
  getBanksApiCall,
  getVerifyBank,
  createBeneficiaryApiCall,
} from "@/redux/slices/expressTransferSlice";

/* ----------------------------- Types ----------------------------- */

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

type Bank = {
  id: string;
  name: string;
  ifscGlobal?: string;
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

const DEFAULT_VALUES: AddBeneficiaryFormValues = {
  accountNumber: "",
  bankName: "",
  bankId: "",
  ifscCode: "",
  accountHolderName: "",
};

/* ------------------- Bank Picker Sub-Modal ----------------------- */

type BankPickerProps = {
  visible: boolean;
  banks: Bank[];
  selectedId?: string;
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

  // Fetch banks as soon as the picker opens (only once per open)
  useEffect(() => {
    if (!visible) {
      fetchedOnceRef.current = false;
      setSearch("");
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
      const active = selectedId === item.id;
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
              {item.name}
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
        <View
          style={{ width: "100%",height:"auto" }}
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
                placeholder="Search bank name or IFSC"
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
        </View>
      </View>
    </Modal>
  );
};

/* --------------------------- Component --------------------------- */

const AddBeneficiaryModal = ({ visible, onClose, onSuccess }: Props) => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"] as any;

  const { ETAccountDetials, BankList } = useSelector(
    (state: any) => state?.expressTransfer
  );

  const banks = useMemo(() => asArray(BankList), [BankList]);

  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddBeneficiaryFormValues>({
    resolver: zodResolver(ExpressTransferValidation.addBeneficiarySchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onTouched",
  });

  const accountNumber = watch("accountNumber");
  const ifscCode = watch("ifscCode");
  const bankId = watch("bankId");
  const bankName = watch("bankName");

  /* -------- Reset verification when account / ifsc change -------- */
  useEffect(() => {
    setVerified(false);
  }, [accountNumber, ifscCode]);

  /* -------- Reset form on close -------- */
  const resetAndClose = () => {
    reset(DEFAULT_VALUES);
    setVerified(false);
    setPickerOpen(false);
    onClose();
  };

  /* -------- Fetch banks (returns a promise so picker can await) -------- */
  const fetchBanks = useCallback(async () => {
    await getBanksApiCall(dispatch);
  }, [dispatch]);

  /* -------- Bank select -------- */
  const selectBank = (b: Bank) => {
    setValue("bankId", b.id, { shouldValidate: true, shouldDirty: true });
    setValue("bankName", b.name, { shouldValidate: true, shouldDirty: true });
    if (b.ifscGlobal) {
      setValue("ifscCode", b.ifscGlobal, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
    setPickerOpen(false);
  };

  /* -------- Verify bank account -------- */
  const canVerify = useMemo(() => {
    const acc = (accountNumber ?? "").trim();
    const ifsc = (ifscCode ?? "").trim().toUpperCase();
    return (
      acc.length >= 6 &&
      /^\d+$/.test(acc) &&
      /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)
    );
  }, [accountNumber, ifscCode]);

  const handleVerify = async () => {
    if (!canVerify) {
      showError("Invalid", "Enter a valid account number and IFSC code");
      return;
    }

    setVerifying(true);
    try {
      const payload = {
        ifsc_code: (ifscCode ?? "").trim().toUpperCase(),
        account_number: (accountNumber ?? "").trim(),
      };
      const res = await getVerifyBank(payload, dispatch);

      if (res?.success === true) {
        const name = res?.data?.beneficiaryName || "";
        setValue("accountHolderName", name, {
          shouldValidate: true,
          shouldDirty: true,
        });
        setVerified(true);
      } else {
        setVerified(false);
        showError(
          "Verification failed",
          res?.message || "Could not verify the account"
        );
      }
    } catch (err: any) {
      setVerified(false);
      showError("Failed", err?.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  /* -------- Submit -------- */
  const onSubmit: SubmitHandler<AddBeneficiaryFormValues> = async (values) => {
    const raw: any = {
      accountNumber: values.accountNumber.trim(),
      bankName: values.bankName.trim(),
      bankId: values.bankId,
      ifscCode: values.ifscCode.trim().toUpperCase(),
      accountHolderName: values.accountHolderName.trim(),
      name: ETAccountDetials?.name,
      areaPinCode: ETAccountDetials?.areaPinCode,
      mobileNumber: ETAccountDetials?.mobileNumber,
    };

    setSubmitting(true);
    try {
      const res = await createBeneficiaryApiCall(raw, dispatch);
      if (res) {
        reset(DEFAULT_VALUES);
        onSuccess?.();
        onClose();
      }
    } catch (err: any) {
      showError("Failed", err?.message || "Could not add beneficiary");
    } finally {
      setSubmitting(false);
    }
  };

  /* -------- Renderers -------- */
  const renderTextInput = (
    label: string,
    name: keyof AddBeneficiaryFormValues,
    opts: {
      placeholder?: string;
      keyboardType?: "default" | "numeric" | "phone-pad" | "number-pad";
      autoCapitalize?: "none" | "words" | "characters";
      maxLength?: number;
      required?: boolean;
      editable?: boolean;
    } = {}
  ) => {
    const errorMessage = errors[name]?.message as string | undefined;

    return (
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textMuted }]}>
          {label}
          {opts.required && <Text style={{ color: colors.error }}> *</Text>}
        </Text>

        <Controller
          control={control}
          name={name}
          render={({ field: { onChange, onBlur, value } }) => (
            <View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: colors.surfaceTertiary,
                  borderColor: errorMessage ? colors.error : colors.border,
                  opacity: opts.editable === false ? 0.7 : 1,
                },
              ]}
            >
              <TextInput
                value={value ?? ""}
                onChangeText={onChange}
                onBlur={onBlur}
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
          )}
        />

        {!!errorMessage && (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {errorMessage}
          </Text>
        )}
      </View>
    );
  };

  /* --------------------------- Render --------------------------- */

  return (
    <>
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
            <View
              style={[styles.sheet, { backgroundColor: colors.background }]}
            >
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: colors.text }]}>
                    Add Beneficiary
                  </Text>
                  <Text style={[styles.subTitle, { color: colors.textMuted }]}>
                    Add a new bank account to send money to
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={resetAndClose}
                  disabled={submitting}
                >
                  <Ionicons name="close" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
              >
                {/* -------- Bank selector (opens sub-modal) -------- */}
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>
                    Bank <Text style={{ color: colors.error }}>*</Text>
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={submitting}
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
                          color: bankName ? colors.text : colors.textMuted,
                          flex: 1,
                        },
                      ]}
                    >
                      {bankName || "Select a bank"}
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>

                  {!!errors.bankId && (
                    <Text style={[styles.errorText, { color: colors.error }]}>
                      {errors.bankId.message as string}
                    </Text>
                  )}
                </View>

                {/* -------- Account Number -------- */}
                {renderTextInput("Account Number", "accountNumber", {
                  placeholder: "0123456789",
                  keyboardType: "number-pad",
                  required: true,
                })}

                {/* -------- IFSC -------- */}
                {renderTextInput("IFSC Code", "ifscCode", {
                  placeholder: "SBIN0000001",
                  autoCapitalize: "characters",
                  maxLength: 11,
                  required: true,
                })}

                {/* -------- Verify button -------- */}
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

                {/* -------- Verified badge -------- */}
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

                {/* -------- Account Holder Name -------- */}
                {renderTextInput("Account Holder Name", "accountHolderName", {
                  placeholder: "Auto-filled on verification",
                  autoCapitalize: "words",
                  required: true,
                  editable: !verified,
                })}

                {/* -------- Submit -------- */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={submitting}
                  onPress={handleSubmit(onSubmit)}
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
                      <Ionicons
                        name="add-circle-outline"
                        size={18}
                        color="#FFF"
                      />
                      <Text style={styles.submitText}>Add Beneficiary</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* -------- Bank picker sub-modal (separate Modal = no touch conflicts) -------- */}
      <BankPickerModal
        visible={pickerOpen}
        banks={banks}
        selectedId={bankId}
        colors={colors}
        onClose={() => setPickerOpen(false)}
        onSelect={selectBank}
        onRequestFetch={fetchBanks}
      />
    </>
  );
};

export default AddBeneficiaryModal;

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
    minHeight: "90%",
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
    // marginBottom: 12,
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
    alignItems:"flex-start",
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