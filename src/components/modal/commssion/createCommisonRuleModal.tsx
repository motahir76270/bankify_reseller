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
import CommissionValidation from "@/validations/commission";
import { showError, showSuccess } from "@/components/service/AlertService";
import {
  createCommissionRuleApiCall,
  getServiceMapingListDataApiCall,
} from "@/redux/slices/comissionSlice";
import {
  getRolesDataApiCall,
  getUsersListApiCall,
} from "@/redux/slices/userMangementSlice";

/* ----------------------------- Types ----------------------------- */

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

type Slab = { minAmount: string; maxAmount: string; value: string };
type Mode = "COMMISSION" | "SURCHARGE";

type FormState = {
  scope: "ROLE" | "USER";
  roleId: string;
  targetUserId: string;
  serviceProviderMappingId: string;
  mode: Mode;
  type: "FLAT" | "PERCENTAGE";
  value: string;
  supportsSlab: boolean;
  slabs: Slab[];
  applyTDS: boolean;
  tdsPercent: string;
  applyGST: boolean;
  gstPercent: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  scope: "ROLE",
  roleId: "",
  targetUserId: "",
  serviceProviderMappingId: "",
  mode: "COMMISSION",
  type: "FLAT",
  value: "",
  supportsSlab: false,
  slabs: [{ minAmount: "", maxAmount: "", value: "" }],
  applyTDS: false,
  tdsPercent: "",
  applyGST: false,
  gstPercent: "",
  isActive: true,
};

const SCOPE_OPTIONS: { label: string; value: FormState["scope"] }[] = [
  { label: "Role", value: "ROLE" },
  { label: "User", value: "USER" },
];

const MODE_OPTIONS: { label: string; value: Mode }[] = [
  { label: "Commission", value: "COMMISSION" },
  { label: "Surcharge", value: "SURCHARGE" },
];

const TYPE_OPTIONS: { label: string; value: FormState["type"] }[] = [
  { label: "Flat (₹)", value: "FLAT" },
  { label: "Percentage (%)", value: "PERCENTAGE" },
];

/* ------------------------ Safe extractors ------------------------ */

/** Turn any of: array | {roles:[...]} | {data:[...]} | null into array */
const asArray = (raw: any): any[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.roles)) return raw.roles;
  if (Array.isArray(raw.users)) return raw.users;
  if (Array.isArray(raw.data)) return raw.data;
  if (Array.isArray(raw.mappings)) return raw.mappings;
  if (Array.isArray(raw.list)) return raw.list;
  if (Array.isArray(raw.data?.roles)) return raw.data.roles;
  if (Array.isArray(raw.data?.users)) return raw.data.users;
  if (Array.isArray(raw.data?.mappings)) return raw.data.mappings;
  return [];
};

/* --------------------------- Component --------------------------- */

const CreateCommisonRuleModal = ({ visible, onClose, onSuccess }: Props) => {
  const dispatch = useDispatch();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  // -------- Redux selectors --------
  const usersState = useSelector((state: any) => state?.users);
  const commissionState = useSelector((state: any) => state?.commission);

  const rolesData = useMemo(
    () => asArray(usersState?.rolesData ?? usersState?.roles),
    [usersState],
  );

  const usersList = useMemo(
    () => asArray(usersState?.usersList ?? usersState?.users),
    [usersState],
  );

  const serviceMappings = useMemo(
    () =>
      asArray(
        commissionState?.serviceMapList ??
          commissionState?.serviceMappings,
      ),
    [commissionState],
  );

  // Loading flag — try every plausible key
  const loading =
    usersState?.loading ??
    usersState?.laoding ??
    commissionState?.loading ??
    commissionState?.laoding ??
    false;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Dropdown open state
  const [openDropdown, setOpenDropdown] = useState<
    null | "role" | "user" | "service"
  >(null);
  const [search, setSearch] = useState({
    role: "",
    user: "",
    service: "",
  });

  /* -------- Fetch data when modal opens / scope changes -------- */

  useEffect(() => {
    if (!visible) return;
    getServiceMapingListDataApiCall(dispatch);
    if (form.scope === "USER") {
      getUsersListApiCall("", dispatch);
    } else {
      getRolesDataApiCall(dispatch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, form.scope]);

  /* -------- Reset on close -------- */

  const resetAndClose = () => {
    setForm(emptyForm);
    setErrors({});
    setOpenDropdown(null);
    setSearch({ role: "", user: "", service: "" });
    onClose();
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  /* -------- Auto-fill from service mapping -------- */

  const applyServiceMappingDefaults = (mapping: any) => {
    setForm((prev) => {
      const next: FormState = {
        ...prev,
        serviceProviderMappingId: mapping.id ?? "",
        type: mapping.pricingValueType ?? "FLAT",
        supportsSlab: !!mapping.supportsSlab,
        applyTDS: !!mapping.applyTDS,
        tdsPercent:
          mapping.tdsPercent !== null && mapping.tdsPercent !== undefined
            ? String(mapping.tdsPercent)
            : "",
        applyGST: !!mapping.applyGST,
        gstPercent:
          mapping.gstPercent !== null && mapping.gstPercent !== undefined
            ? String(mapping.gstPercent)
            : "",
      };

      if (
        mapping.supportsSlab &&
        Array.isArray(mapping.slabs) &&
        mapping.slabs.length
      ) {
        next.slabs = mapping.slabs.map((s: any) => ({
          minAmount: String(s.minAmount ?? ""),
          maxAmount: String(s.maxAmount ?? ""),
          value: String(s.providerCost ?? s.value ?? ""),
        }));
        next.value = "";
      } else {
        next.slabs = [{ minAmount: "", maxAmount: "", value: "" }];
        if (
          mapping.providerCost !== undefined &&
          mapping.providerCost !== null
        ) {
          next.value = String(mapping.providerCost);
        }
      }

      return next;
    });
  };

  /* -------- Slab helpers -------- */

  const updateSlab = (idx: number, key: keyof Slab, value: string) => {
    setForm((prev) => {
      const slabs = [...prev.slabs];
      slabs[idx] = { ...slabs[idx], [key]: value };
      return { ...prev, slabs };
    });
  };

  const addSlab = () => {
    setForm((prev) => ({
      ...prev,
      slabs: [...prev.slabs, { minAmount: "", maxAmount: "", value: "" }],
    }));
  };

  const removeSlab = (idx: number) => {
    setForm((prev) => {
      const slabs = prev.slabs.filter((_, i) => i !== idx);
      return {
        ...prev,
        slabs: slabs.length
          ? slabs
          : [{ minAmount: "", maxAmount: "", value: "" }],
      };
    });
  };

  /* -------- Submit -------- */

  const handleSubmit = async () => {
    const raw: any = {
      scope: form.scope,
      mode: form.mode,
      type: form.type,
      isActive: form.isActive,
      applyTDS: form.applyTDS,
      applyGST: form.applyGST,
      supportsSlab: form.supportsSlab,
    };

    if (form.scope === "ROLE" && form.roleId.trim()) {
      raw.roleId = form.roleId.trim();
    }
    if (form.scope === "USER" && form.targetUserId.trim()) {
      raw.targetUserId = form.targetUserId.trim();
    }
    if (form.serviceProviderMappingId.trim()) {
      raw.serviceProviderMappingId = form.serviceProviderMappingId.trim();
    }

    if (!form.supportsSlab) {
      if (form.value.trim()) raw.value = Number(form.value);
    } else {
      const slabs = form.slabs
        .filter(
          (s) => s.minAmount.trim() || s.maxAmount.trim() || s.value.trim(),
        )
        .map((s) => ({
          minAmount: Number(s.minAmount || 0),
          maxAmount: Number(s.maxAmount || 0),
          value: Number(s.value || 0),
        }));
      if (!slabs.length) {
        showError("Validation", "Add at least one slab");
        return;
      }
      raw.slabs = slabs;
      raw.value = null;
    }

    if (form.applyTDS) raw.tdsPercent = Number(form.tdsPercent || 0);
    if (form.applyGST) raw.gstPercent = Number(form.gstPercent || 0);

    const schema = CommissionValidation.addCommissionRuleSchema;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue: any) => {
        fieldErrors[issue.path.join(".")] = issue.message;
      });
      setErrors(fieldErrors);
      showError("Validation", parsed.error.issues[0]?.message || "Check form");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createCommissionRuleApiCall(parsed.data, dispatch);
      if (res !== false) {
        showSuccess("Created", "Commission rule created successfully");
        onSuccess?.();
        resetAndClose();
      }
    } catch (err: any) {
      showError("Failed", err?.message || "Could not create rule");
    } finally {
      setSubmitting(false);
    }
  };

  /* -------- Filtered lists -------- */

  const rolesFiltered = useMemo(() => {
    const q = search.role.trim().toLowerCase();
    if (!q) return rolesData;
    return rolesData.filter(
      (r: any) =>
        (r.roleName ?? "").toLowerCase().includes(q) ||
        (r.roleCode ?? "").toLowerCase().includes(q),
    );
  }, [rolesData, search.role]);

  const usersFiltered = useMemo(() => {
    const q = search.user.trim().toLowerCase();
    if (!q) return usersList;
    return usersList.filter((u: any) => {
      const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
      const tenant = (u.tenantName ?? "").toLowerCase();
      return name.includes(q) || tenant.includes(q);
    });
  }, [usersList, search.user]);

  const servicesFiltered = useMemo(() => {
    const q = search.service.trim().toLowerCase();
    if (!q) return serviceMappings;
    return serviceMappings.filter((m: any) => {
      const s = (m.serviceCode ?? "").toLowerCase();
      const p = (m.providerCode ?? "").toLowerCase();
      return s.includes(q) || p.includes(q);
    });
  }, [serviceMappings, search.service]);

  /* -------- Label lookups (safe) -------- */

  const roleLabel = useMemo(() => {
    const r = rolesData.find((x: any) => x.id === form.roleId);
    return r ? r.roleName ?? r.roleCode ?? "" : "";
  }, [rolesData, form.roleId]);

  const userLabel = useMemo(() => {
    const u = usersList.find((x: any) => x.id === form.targetUserId);
    if (!u) return "";
    const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
    return name || u.id;
  }, [usersList, form.targetUserId]);

  const serviceLabel = useMemo(() => {
    const m = serviceMappings.find(
      (x: any) => x.id === form.serviceProviderMappingId,
    );
    if (!m) return "";
    return `${m.serviceCode ?? ""} · ${m.providerCode ?? ""}`;
  }, [serviceMappings, form.serviceProviderMappingId]);

  /* -------- Renderers -------- */

  const renderTextInput = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts: {
      placeholder?: string;
      keyboardType?: "default" | "numeric";
      required?: boolean;
      errorKey?: string;
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
            borderColor:
              opts.errorKey && errors[opts.errorKey]
                ? colors.error
                : colors.border,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={opts.placeholder ?? ""}
          placeholderTextColor={colors.textMuted}
          keyboardType={opts.keyboardType ?? "default"}
          style={[styles.input, { color: colors.text }]}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!submitting}
        />
      </View>
      {opts.errorKey && errors[opts.errorKey] && (
        <Text style={[styles.errorText, { color: colors.error }]}>
          {errors[opts.errorKey]}
        </Text>
      )}
    </View>
  );

  const Chip = ({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={submitting}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.buttonPrimary : colors.surfaceTertiary,
          borderColor: active ? colors.buttonPrimary : colors.border,
        },
      ]}
    >
      <Text
        style={[styles.chipText, { color: active ? "#FFF" : colors.text }]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const Toggle = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onChange(!value)}
      disabled={submitting}
      style={styles.toggleRow}
    >
      <Ionicons
        name={value ? "checkbox-outline" : "square-outline"}
        size={22}
        color={colors.buttonPrimary}
      />
      <Text style={[styles.toggleText, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  /**
   * Generic dropdown trigger + inline list (no extra modal).
   */
  const Dropdown = ({
    dropdownKey,
    label,
    placeholder,
    selectedLabel,
    items,
    loading,
    onSelect,
    required,
    errorKey,
  }: {
    dropdownKey: "role" | "user" | "service";
    label: string;
    placeholder: string;
    selectedLabel: string;
    items: any[];
    loading?: boolean;
    onSelect: (item: any) => void;
    required?: boolean;
    errorKey?: string;
  }) => {
    const isOpen = openDropdown === dropdownKey;
    return (
      <View style={[styles.field, { zIndex: isOpen ? 20 : 1 }]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>
          {label}
          {required && <Text style={{ color: colors.error }}> *</Text>}
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          disabled={submitting}
          onPress={() => setOpenDropdown(isOpen ? null : dropdownKey)}
          style={[
            styles.inputWrap,
            styles.dropdownTrigger,
            {
              backgroundColor: colors.surfaceTertiary,
              borderColor:
                errorKey && errors[errorKey] ? colors.error : colors.border,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.input,
              {
                color: selectedLabel ? colors.text : colors.textMuted,
                flex: 1,
              },
            ]}
          >
            {selectedLabel || placeholder}
          </Text>
          <Ionicons
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.textMuted}
          />
        </TouchableOpacity>

        {errorKey && errors[errorKey] && (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {errors[errorKey]}
          </Text>
        )}

        {isOpen && (
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
                value={search[dropdownKey]}
                onChangeText={(v) =>
                  setSearch((prev) => ({ ...prev, [dropdownKey]: v }))
                }
                placeholder={`Search ${label.toLowerCase()}`}
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, { color: colors.text }]}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {search[dropdownKey].length > 0 && (
                <TouchableOpacity
                  onPress={() =>
                    setSearch((prev) => ({ ...prev, [dropdownKey]: "" }))
                  }
                >
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
              {loading ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Loading…
                </Text>
              ) : items.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No results
                </Text>
              ) : (
                items.map((item) => {
                  let primary = "";
                  let secondary = "";
                  let isActive = false;

                  if (dropdownKey === "role") {
                    primary = item.roleName ?? item.roleCode ?? "Role";
                    secondary = item.roleCode ?? "";
                    isActive = form.roleId === item.id;
                  } else if (dropdownKey === "user") {
                    primary =
                      `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() ||
                      item.id;
                    secondary = item.tenantName ?? item.email ?? "";
                    isActive = form.targetUserId === item.id;
                  } else {
                    primary = item.serviceCode ?? "Service";
                    secondary = item.providerCode ?? "";
                    isActive = form.serviceProviderMappingId === item.id;
                  }

                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.7}
                      onPress={() => {
                        onSelect(item);
                        setOpenDropdown(null);
                        setSearch((prev) => ({
                          ...prev,
                          [dropdownKey]: "",
                        }));
                      }}
                      style={[
                        styles.dropdownItem,
                        {
                          backgroundColor: isActive
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
                          {primary}
                        </Text>
                        {!!secondary && (
                          <Text
                            style={[
                              styles.dropdownItemSub,
                              { color: colors.textMuted },
                            ]}
                            numberOfLines={1}
                          >
                            {secondary}
                          </Text>
                        )}
                      </View>
                      {isActive && (
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
    );
  };

  /* --------------------------- Render --------------------------- */

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
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>
                Create Commission Rule
              </Text>
              <TouchableOpacity onPress={resetAndClose} disabled={submitting}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Scope */}
              <Text style={[styles.label, { color: colors.textMuted }]}>
                Scope <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <View style={styles.chipRow}>
                {SCOPE_OPTIONS.map((s) => (
                  <Chip
                    key={s.value}
                    label={s.label}
                    active={form.scope === s.value}
                    onPress={() => {
                      setField("scope", s.value);
                      if (s.value === "ROLE") setField("targetUserId", "");
                      else setField("roleId", "");
                    }}
                  />
                ))}
              </View>

              {/* Role dropdown */}
              {form.scope === "ROLE" && (
                <Dropdown
                  dropdownKey="role"
                  label="Role"
                  placeholder="Select a role"
                  selectedLabel={roleLabel}
                  items={rolesFiltered}
                  loading={loading}
                  required
                  errorKey="roleId"
                  onSelect={(item) => setField("roleId", item.id)}
                />
              )}

              {/* User dropdown */}
              {form.scope === "USER" && (
                <Dropdown
                  dropdownKey="user"
                  label="User"
                  placeholder="Select a user"
                  selectedLabel={userLabel}
                  items={usersFiltered}
                  loading={loading}
                  required
                  errorKey="targetUserId"
                  onSelect={(item) => setField("targetUserId", item.id)}
                />
              )}

              {/* Service mapping dropdown */}
              <Dropdown
                dropdownKey="service"
                label="Service Mapping"
                placeholder="Select a service / provider"
                selectedLabel={serviceLabel}
                items={servicesFiltered}
                loading={false}
                required
                errorKey="serviceProviderMappingId"
                onSelect={(item) => applyServiceMappingDefaults(item)}
              />

              {/* Mode */}
              <Text style={[styles.label, { color: colors.textMuted }]}>
                Mode <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <View style={styles.chipRow}>
                {MODE_OPTIONS.map((m) => (
                  <Chip
                    key={m.value}
                    label={m.label}
                    active={form.mode === m.value}
                    onPress={() => setField("mode", m.value)}
                  />
                ))}
              </View>

              {/* Type */}
              <Text
                style={[styles.label, { color: colors.textMuted, marginTop: 8 }]}
              >
                Type <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <View style={styles.chipRow}>
                {TYPE_OPTIONS.map((t) => (
                  <Chip
                    key={t.value}
                    label={t.label}
                    active={form.type === t.value}
                    onPress={() => setField("type", t.value)}
                  />
                ))}
              </View>

              {/* Slab toggle */}
              <View style={{ marginTop: 12 }}>
                <Toggle
                  label="Use slabs (tiered amounts)"
                  value={form.supportsSlab}
                  onChange={(v) => setField("supportsSlab", v)}
                />
              </View>

              {/* Value / Slabs */}
              {!form.supportsSlab ? (
                renderTextInput(
                  form.type === "PERCENTAGE" ? "Value (%)" : "Value (₹)",
                  form.value,
                  (v) => setField("value", v),
                  {
                    placeholder: form.type === "PERCENTAGE" ? "5" : "10",
                    keyboardType: "numeric",
                    required: true,
                    errorKey: "value",
                  },
                )
              ) : (
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>
                    Slabs
                  </Text>

                  {form.slabs.map((s, i) => (
                    <View
                      key={i}
                      style={[
                        styles.slabCard,
                        {
                          backgroundColor: colors.surfaceTertiary,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.slabRow}>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.slabMiniLabel,
                              { color: colors.textMuted },
                            ]}
                          >
                            Min
                          </Text>
                          <TextInput
                            value={s.minAmount}
                            onChangeText={(v) => updateSlab(i, "minAmount", v)}
                            placeholder="0"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="numeric"
                            style={[
                              styles.slabInput,
                              {
                                color: colors.text,
                                borderColor: colors.border,
                              },
                            ]}
                            editable={!submitting}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.slabMiniLabel,
                              { color: colors.textMuted },
                            ]}
                          >
                            Max
                          </Text>
                          <TextInput
                            value={s.maxAmount}
                            onChangeText={(v) => updateSlab(i, "maxAmount", v)}
                            placeholder="1000"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="numeric"
                            style={[
                              styles.slabInput,
                              {
                                color: colors.text,
                                borderColor: colors.border,
                              },
                            ]}
                            editable={!submitting}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.slabMiniLabel,
                              { color: colors.textMuted },
                            ]}
                          >
                            Value
                          </Text>
                          <TextInput
                            value={s.value}
                            onChangeText={(v) => updateSlab(i, "value", v)}
                            placeholder={form.type === "PERCENTAGE" ? "2" : "20"}
                            placeholderTextColor={colors.textMuted}
                            keyboardType="numeric"
                            style={[
                              styles.slabInput,
                              {
                                color: colors.text,
                                borderColor: colors.border,
                              },
                            ]}
                            editable={!submitting}
                          />
                        </View>
                      </View>

                      {form.slabs.length > 1 && (
                        <TouchableOpacity
                          onPress={() => removeSlab(i)}
                          disabled={submitting}
                          style={styles.slabRemove}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={14}
                            color={colors.error}
                          />
                          <Text
                            style={[
                              styles.slabRemoveText,
                              { color: colors.error },
                            ]}
                          >
                            Remove slab
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  <TouchableOpacity
                    onPress={addSlab}
                    disabled={submitting}
                    style={[
                      styles.addSlabBtn,
                      { borderColor: colors.buttonPrimary },
                    ]}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={16}
                      color={colors.buttonPrimary}
                    />
                    <Text
                      style={[
                        styles.addSlabText,
                        { color: colors.buttonPrimary },
                      ]}
                    >
                      Add slab
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Taxes */}
              <View style={{ marginTop: 8 }}>
                <Toggle
                  label="Apply TDS"
                  value={form.applyTDS}
                  onChange={(v) => setField("applyTDS", v)}
                />
                {form.applyTDS &&
                  renderTextInput(
                    "TDS %",
                    form.tdsPercent,
                    (v) => setField("tdsPercent", v),
                    {
                      placeholder: "6",
                      keyboardType: "numeric",
                      errorKey: "tdsPercent",
                    },
                  )}

                <Toggle
                  label="Apply GST"
                  value={form.applyGST}
                  onChange={(v) => setField("applyGST", v)}
                />
                {form.applyGST &&
                  renderTextInput(
                    "GST %",
                    form.gstPercent,
                    (v) => setField("gstPercent", v),
                    {
                      placeholder: "18",
                      keyboardType: "numeric",
                      errorKey: "gstPercent",
                    },
                  )}
              </View>

              {/* Active */}
              <View style={{ marginTop: 8 }}>
                <Toggle
                  label="Active"
                  value={form.isActive}
                  onChange={(v) => setField("isActive", v)}
                />
              </View>

              {/* Submit */}
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
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color="#FFF"
                    />
                    <Text style={styles.submitText}>Create Rule</Text>
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

export default CreateCommisonRuleModal;

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
    marginBottom: 8,
    marginTop: 8,
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

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 12.5, fontWeight: "700" },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  toggleText: { fontSize: 13.5, fontWeight: "600" },

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
  dropdownList: {
    maxHeight: 220,
  },
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

  slabCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  slabRow: { flexDirection: "row", gap: 8 },
  slabMiniLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  slabInput: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: "600",
  },
  slabRemove: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  slabRemoveText: { fontSize: 11.5, fontWeight: "700" },

  addSlabBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 2,
  },
  addSlabText: { fontSize: 12.5, fontWeight: "700" },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
    marginTop: 16,
  },
  submitText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
});