import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from "react-native";
import React, { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { Colors } from "@/constants/theme";
import { showError } from "@/components/service/AlertService";
import { updateBankAccountApiCall } from "@/redux/slices/bankAccountSlice";

type Bank = {
  id: string;
  accountHolderName?: string;
  accountNumber?: string;
  bankId?: string;
  bankName?: string;
  branchName?: string;
  ifscCode?: string;
  isPrimary?: boolean;
  mobileNumber?: string;
  upiId?: string;
  [key: string]: any;
};

type Props = {
  visible: boolean;
  bank: Bank | null;
  onClose: () => void;
  onSuccess?: () => void;
};

const EditBankModal = ({ visible, bank, onClose, onSuccess }: Props) => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const loading = useSelector((state: any) => state?.banks?.loading);
  const bankList = useSelector((state: any) => state?.banks?.bankList ?? []);

  const [form, setForm] = useState<Bank | null>(bank);

  // Dropdown state
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState("");

  // Filtered bank list based on search
  const filteredBanks = useMemo(() => {
    const q = bankSearch.trim().toLowerCase();
    if (!q) return bankList;
    return bankList.filter((b: any) => {
      const name = (b.name ?? "").toLowerCase();
      const ifsc = (b.ifscGlobal ?? "").toLowerCase();
      return name.includes(q) || ifsc.includes(q);
    });
  }, [bankList, bankSearch]);

  useEffect(() => {
    setForm(bank);
  }, [bank]);

  useEffect(() => {
    if (!visible) {
      setBankDropdownOpen(false);
      setBankSearch("");
    }
  }, [visible]);

  if (!form) return null;

  const setField = (key: string, value: any) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const selectBank = (b: any) => {
    setField("bankId", b.id);
    setField("bankName", b.name ?? "");
    if (!form.ifscCode && b.ifscGlobal) {
      setField("ifscCode", b.ifscGlobal);
    }
    setBankDropdownOpen(false);
    setBankSearch("");
  };

  const handleUpdate = async () => {
    if (!form.accountHolderName?.trim()) {
      showError("Validation", "Account holder name is required");
      return;
    }
    const payload = {
      accountHolderName: form.accountHolderName?.trim(),
      accountNumber: form.accountNumber?.trim(),
      bankId: form.bankId,
      bankName: form.bankName,
      branchName: form.branchName?.trim(),
      ifscCode: form.ifscCode?.trim().toUpperCase(),
      isPrimary: !!form.isPrimary,
      mobileNumber: form.mobileNumber?.trim(),
      upiId: form.upiId?.trim() || undefined,
    };
    const res = await updateBankAccountApiCall(form.id, payload, dispatch);
    if (res) {
      onSuccess?.();
      onClose();
    }
  };

  const renderField = (
    label: string,
    key: string,
    opts: {
      placeholder?: string;
      keyboardType?: "default" | "numeric" | "phone-pad";
      autoCapitalize?: "none" | "sentences" | "words" | "characters";
      maxLength?: number;
      editable?: boolean;
      required?: boolean;
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
            borderColor: colors.border,
            opacity: opts.editable === false ? 0.6 : 1,
          },
        ]}
      >
        <TextInput
          value={String((form as any)[key] ?? "")}
          onChangeText={(v) => setField(key, v)}
          placeholder={opts.placeholder ?? ""}
          placeholderTextColor={colors.textMuted}
          keyboardType={opts.keyboardType ?? "default"}
          autoCapitalize={opts.autoCapitalize ?? "none"}
          autoCorrect={false}
          editable={opts.editable !== false}
          maxLength={opts.maxLength}
          style={[styles.input, { color: colors.text, flex: 1 }]}
        />
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ width: "100%" }}
        >
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>
                Edit Bank Account
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 30 }}
            >
              {/* ---------- Bank Dropdown (searchable) — top field ---------- */}
              <View style={[styles.field, { zIndex: 10 }]}>
                <Text style={[styles.label, { color: colors.textMuted }]}>
                  Bank<Text style={{ color: colors.error }}> *</Text>
                </Text>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setBankDropdownOpen((p) => !p)}
                  style={[
                    styles.inputWrap,
                    styles.dropdownTrigger,
                    {
                      backgroundColor: colors.surfaceTertiary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.input,
                      {
                        color: form.bankName ? colors.text : colors.textMuted,
                        flex: 1,
                      },
                    ]}
                  >
                    {form.bankName || "Select Bank"}
                  </Text>
                  <Ionicons
                    name={bankDropdownOpen ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>

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
                    {/* Search box */}
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
                        placeholder="Search bank or IFSC"
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

                    {/* List — plain map (no FlatList) to avoid VirtualizedList nesting error */}
                    <ScrollView
                      style={styles.dropdownList}
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                    >
                      {filteredBanks.length === 0 ? (
                        <Text
                          style={[
                            styles.emptyText,
                            { color: colors.textMuted },
                          ]}
                        >
                          {loading ? "Loading banks..." : "No banks found"}
                        </Text>
                      ) : (
                        filteredBanks.map((item: any) => {
                          const active = form.bankId === item.id;
                          return (
                            <TouchableOpacity
                              key={String(item.id)}
                              onPress={() => selectBank(item)}
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
                                  {item.name ?? "Bank"}
                                </Text>
                                {!!item.ifscGlobal && (
                                  <Text
                                    style={[
                                      styles.dropdownItemSub,
                                      { color: colors.textMuted },
                                    ]}
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
                        })
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

              {renderField("Account Holder Name", "accountHolderName", {
                autoCapitalize: "words",
                required: true,
              })}
              {renderField("Account Number", "accountNumber", {
                keyboardType: "numeric",
                editable: false,
                required: true,
              })}
              {renderField("IFSC Code", "ifscCode", {
                autoCapitalize: "characters",
                maxLength: 11,
                required: true,
              })}
              {renderField("Mobile Number", "mobileNumber", {
                keyboardType: "phone-pad",
                maxLength: 10,
                required: true,
              })}
              {renderField("Branch Name", "branchName", {
                autoCapitalize: "words",
                required: true,
              })}
              {renderField("UPI ID (optional)", "upiId")}

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setField("isPrimary", !form.isPrimary)}
                style={styles.toggleRow}
              >
                <Ionicons
                  name={form.isPrimary ? "checkbox-outline" : "square-outline"}
                  size={22}
                  color={colors.buttonPrimary}
                />
                <Text style={[styles.toggleText, { color: colors.text }]}>
                  Set as primary account
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={loading}
                onPress={handleUpdate}
                style={[
                  styles.submitBtn,
                  {
                    backgroundColor: colors.buttonPrimary,
                    opacity: loading ? 0.6 : 1,
                  },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color="#fff"
                    />
                    <Text style={styles.submitText}>Update Bank Account</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default EditBankModal;

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

  // Dropdown
  dropdownTrigger: {
    justifyContent: "space-between",
  },
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
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "500",
    paddingVertical: 0,
  },
  dropdownList: {
    maxHeight: 220,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  deleteText: { fontSize: 13.5, fontWeight: "700" },
});