// ProfileKycScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useColorScheme,
  ActivityIndicator,
  StatusBar,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import z from 'zod';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';

import { Colors } from '@/constants/theme';
import HeaderSection from '@/components/ui/headerSections';
import KycValidation from '@/validations/profileKyc';
import {
  getAllCitiesApiCall,
  getAllStatesApiCall,
  kycSubmitApiCall,
} from '@/redux/slices/profileKycSlice';
import {
  getServiceMapingIdDataApiCall,
  verifyPanApiCall,
} from '@/redux/slices/serviceSlice';
import { showError } from '@/components/service/AlertService';

/* ----------------- types ----------------- */

type ProfileKycFormValues = z.infer<typeof KycValidation.profileKYC>;
type FieldName = keyof ProfileKycFormValues;

export type DocumentType =
  | 'PAN'
  | 'AADHAAR_FRONT'
  | 'AADHAAR_BACK'
  | 'ADDRESS_PROOF'
  | 'USER_PHOTO';

type Props = {
  onSubmit?: (formData: FormData) => Promise<void> | void;
  loading?: boolean;
};

type StateItem = { id: string; stateName: string; stateCode: string };
type CityItem = { id: string; cityName: string; cityCode: string };

type FieldMeta = {
  label: string;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
  autoCapitalize?: 'none' | 'characters' | 'words' | 'sentences';
  options?: readonly string[];
  isDocument?: boolean;
};

/* ----------------- steps ----------------- */

const STEPS: { title: string; fields: FieldName[] }[] = [
  { title: 'Identity', fields: ['pan', 'aadhaar'] },
  {
    title: 'Personal Details',
    fields: ['first_name', 'last_name', 'father_name', 'dob', 'gender'],
  },
  { title: 'Address', fields: ['state', 'city', 'address', 'pinCode'] },
  {
    title: 'Documents',
    fields: [
      'pan_document',
      'aadhaar_front_doc',
      'aadhaar_back_doc',
      'address_proof_doc',
      'user_photo_doc',
    ],
  },
];

const GENDER_OPTIONS = ['male', 'female', 'other'] as const;

const DOC_FIELD_MAP: Record<
  | 'pan_document'
  | 'aadhaar_front_doc'
  | 'aadhaar_back_doc'
  | 'address_proof_doc'
  | 'user_photo_doc',
  { type: DocumentType; label: string; numberFrom?: FieldName; fallback: string }
> = {
  pan_document: {
    type: 'PAN',
    label: 'PAN Document',
    numberFrom: 'pan',
    fallback: '',
  },
  aadhaar_front_doc: {
    type: 'AADHAAR_FRONT',
    label: 'Aadhaar Front',
    numberFrom: 'aadhaar',
    fallback: '',
  },
  aadhaar_back_doc: {
    type: 'AADHAAR_BACK',
    label: 'Aadhaar Back',
    numberFrom: 'aadhaar',
    fallback: '',
  },
  address_proof_doc: {
    type: 'ADDRESS_PROOF',
    label: 'Address Proof',
    fallback: 'ADDRESS_PROOF',
  },
  user_photo_doc: {
    type: 'USER_PHOTO',
    label: 'User Photo',
    fallback: 'USER_PHOTO',
  },
};

const FIELD_META: Record<FieldName, FieldMeta> = {
  first_name: { label: 'First Name', autoCapitalize: 'words' },
  last_name: { label: 'Last Name', autoCapitalize: 'words' },
  father_name: { label: "Father's Name", autoCapitalize: 'words' },
  dob: { label: 'Date of Birth', placeholder: 'DD/MM/YYYY' },
  gender: { label: 'Gender', options: GENDER_OPTIONS },
  pan: {
    label: 'PAN',
    placeholder: 'ABCDE1234F',
    autoCapitalize: 'characters',
  },
  aadhaar: {
    label: 'Aadhaar',
    placeholder: '12 digits',
    keyboardType: 'numeric',
  },
  address: { label: 'Address', autoCapitalize: 'words' },
  city: { label: 'City', autoCapitalize: 'words' },
  state: { label: 'State', autoCapitalize: 'words' },
  pinCode: {
    label: 'PIN Code',
    placeholder: '6 digits',
    keyboardType: 'numeric',
  },
  pan_document: { label: 'PAN Document', isDocument: true },
  aadhaar_front_doc: { label: 'Aadhaar Front', isDocument: true },
  aadhaar_back_doc: { label: 'Aadhaar Back', isDocument: true },
  address_proof_doc: { label: 'Address Proof', isDocument: true },
  user_photo_doc: { label: 'User Photo', isDocument: true },
};

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/* ----------------- date helpers ----------------- */

const parseISO = (s?: string): Date | null => {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
};
const toISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const toDisplay = (d: Date): string => {
  const day = String(d.getDate()).padStart(2, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${m}/${d.getFullYear()}`;
};

/* ----------------- helpers ----------------- */

const isRemoteUri = (uri?: string): boolean =>
  !!uri && /^https?:\/\//i.test(uri);

const inferMimeType = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
};

const safeFileName = (uri: string, fallback: string): string => {
  const raw = uri.split('/').pop()?.split('?')[0];
  if (!raw) return fallback;
  return raw;
};

/* ----------------- picker modal ----------------- */

type PickerModalProps = {
  visible: boolean;
  title: string;
  searchPlaceholder?: string;
  items: { label: string; value: string }[];
  onClose: () => void;
  onSelect: (value: string) => void;
  colors: any;
  emptyText?: string;
};

const PickerModal = ({
  visible,
  title,
  searchPlaceholder = 'Search...',
  items,
  onClose,
  onSelect,
  colors,
  emptyText = 'No options available',
}: PickerModalProps) => {
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  const safeItems = Array.isArray(items) ? items : [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return safeItems;
    return safeItems.filter((it) => it.label.toLowerCase().includes(q));
  }, [safeItems, query]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalBackdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[styles.modalCard, { backgroundColor: colors.surface }]}
          onStartShouldSetResponder={() => true}
        >
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {title}
          </Text>

          <View
            style={[
              styles.searchWrap,
              {
                borderColor: colors.border,
                backgroundColor: colors.surfaceTertiary,
              },
            ]}
          >
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
              autoCapitalize="none"
              style={[styles.searchInput, { color: colors.text }]}
            />
            {query?.length > 0 && (
              <TouchableOpacity
                onPress={() => setQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ color: colors.textMuted, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(it) => it.value}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 340 }}
            ListEmptyComponent={
              <Text
                style={{
                  color: colors.textMuted,
                  padding: 12,
                  textAlign: 'center',
                }}
              >
                {emptyText}
              </Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.modalRow, { borderBottomColor: colors.border }]}
                onPress={() => {
                  onSelect(item.value);
                  onClose();
                }}
              >
                <Text style={{ color: colors.text }}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

/* ----------------- screen ----------------- */

const ProfileKycScreen = () => {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state: any) => state.auth);
  const id = user?.user?.id;

  const servicesState = useSelector((state: any) => state?.services);
  const serviceMapRaw = servicesState?.serviceMapingId?.mappings;

  const servicesdata = useMemo(() => {
    if (!Array.isArray(serviceMapRaw)) return undefined;
    return serviceMapRaw.find(
      (item: any) =>
        (item?.serviceCode ?? '').toUpperCase() === 'PAN_VERIFICATION',
    );
  }, [serviceMapRaw]);

  const [step, setStep] = useState(0);

  const [showDobPicker, setShowDobPicker] = useState(false);
  const [openPicker, setOpenPicker] = useState<null | 'state' | 'city'>(null);
  const [uploadingField, setUploadingField] = useState<FieldName | null>(null);
  const [verifyingPan, setVerifyingPan] = useState(false);

  /* ---------- Redux slice data ---------- */
  const states: StateItem[] = useSelector(
    (s: any) => s?.profileKyc?.states ?? [],
  );
  const cities: CityItem[] = useSelector(
    (s: any) => s?.profileKyc?.cities ?? [],
  );
  const loading: boolean = useSelector(
    (s: any) => s?.profileKyc?.loading ?? false,
  );
  const KYCData: any = useSelector(
    (s: any) => s?.profileKyc?.KYCData ?? null,
  );

  const {
    control,
    handleSubmit,
    trigger,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<ProfileKycFormValues>({
    resolver: zodResolver(KycValidation.profileKYC),
    mode: 'onTouched',
    defaultValues: {
      pan: '',
      aadhaar: '',
      first_name: '',
      last_name: '',
      father_name: '',
      dob: '',
      gender: '',
      state: '', // UUID
      city: '',  // UUID
      address: '',
      pinCode: '',
      pan_document: '',
      aadhaar_front_doc: '',
      aadhaar_back_doc: '',
      address_proof_doc: '',
      user_photo_doc: '',
    },
  });

  const selectedStateId = watch('state');
  const selectedCityId = watch('city');

  /* ---------- load states + services once ---------- */
  useEffect(() => {
    getAllStatesApiCall(dispatch);
    getServiceMapingIdDataApiCall(dispatch);
  }, [dispatch]);

  /* ---------- load cities when state changes ---------- */
  useEffect(() => {
    if (!selectedStateId) return;
    const stateObj = states?.find((s) => s.id === selectedStateId);
    const stateCode = stateObj?.stateCode ?? selectedStateId;
    getAllCitiesApiCall(stateCode, dispatch);
  }, [selectedStateId, states, dispatch]);

  /* ---------- prefill from existing KYC ---------- */
  useEffect(() => {
    if (!KYCData) return;

    const docByType = (t: DocumentType) =>
      (Array.isArray(KYCData.documents) ? KYCData.documents : [])?.find(
        (d: any) => d?.documentType === t,
      );

    const backendStateId: string | undefined = KYCData?.address?.stateId;
    const backendCityId: string | undefined = KYCData?.address?.cityId;

    if (backendStateId && states.length === 0) return;

    const stateMatch = backendStateId
      ? states?.find((s) => s.id === backendStateId)
      : undefined;

    const cityMatch = backendCityId && Array.isArray(cities)
      ? cities.find((c: any) => c?.id === backendCityId)
      : undefined;

    reset({
      pan: docByType('PAN')?.documentNumber ?? '',
      aadhaar:
        docByType('AADHAAR_FRONT')?.documentNumber ??
        docByType('AADHAAR_BACK')?.documentNumber ??
        '',
      first_name: KYCData?.personalInfo?.firstName ?? '',
      last_name: KYCData?.personalInfo?.lastName ?? '',
      father_name: KYCData?.personalInfo?.fatherName ?? '',
      dob: (KYCData?.personalInfo?.dob ?? '').slice(0, 10),
      gender: (KYCData?.personalInfo?.gender ?? '').toLowerCase(),
      address: KYCData?.address?.address ?? '',
      pinCode: KYCData?.address?.pinCode ?? '',
      state: stateMatch?.id ?? backendStateId ?? '',
      city: cityMatch?.id ?? backendCityId ?? '',
      pan_document: docByType('PAN')?.documentUrl ?? '',
      aadhaar_front_doc: docByType('AADHAAR_FRONT')?.documentUrl ?? '',
      aadhaar_back_doc: docByType('AADHAAR_BACK')?.documentUrl ?? '',
      address_proof_doc: docByType('ADDRESS_PROOF')?.documentUrl ?? '',
      user_photo_doc: docByType('USER_PHOTO')?.documentUrl ?? '',
    });
  }, [KYCData, states, cities, reset]);

  const currentFields = useMemo(() => STEPS[step].fields, [step]);
  const isLastStep = step === STEPS.length - 1;

  /* ---------- PAN verification ---------- */
  const handlePanVerifybnt = useCallback(async () => {
    const panNumber = (getValues('pan') ?? '').trim().toUpperCase();
    if (!panNumber) {
      showError('Please enter PAN number first.');
      return;
    }
    if (!servicesdata?.id) {
      showError('PAN verification service is not available right now.');
      return;
    }

    try {
      setVerifyingPan(true);
      const payload = {
        panNumber,
        serviceProviderMappingId: servicesdata.id,
      };

      // NOTE: pass payload to the API call (original code dropped it)
      const res = await verifyPanApiCall(payload, dispatch);

      if (res?.success === true) {
        const data = res?.data ?? {};
        // Map each field to its correct form field (original set first_name 3x)
        if (data.firstName) setValue('first_name', data.firstName);
        if (data.lastName) setValue('last_name', data.lastName);
        if (data.fatherName) setValue('father_name', data.fatherName);
      } else {
        showError(res?.message);
      }
    } catch (error: any) {
      showError(error?.message ?? 'Unable to verify PAN.');
    } finally {
      setVerifyingPan(false);
    }
  }, [dispatch, getValues, setValue, servicesdata?.id]);

  /* -------------- build FormData — UNCHANGED -------------- */
  const submit = async (values: ProfileKycFormValues) => {
    const formData = new FormData();

    // ---------- scalar fields ----------
    formData.append('userId', String(id ?? ''));

    const kycId =
      KYCData?.kycId ?? KYCData?.id ?? KYCData?.kyc?.id ?? undefined;
    if (kycId) formData.append('kycId', String(kycId));

    // ---------- JSON-encoded nested objects ----------
    formData.append(
      'personalInfo',
      JSON.stringify({
        firstName: values.first_name.trim(),
        lastName: values.last_name.trim(),
        fatherName: values.father_name.trim(),
        dob: values.dob,
        gender: values.gender.toUpperCase(),
      }),
    );

    formData.append(
      'address',
      JSON.stringify({
        address: values.address.trim(),
        pinCode: values.pinCode.trim(),
        stateId: values.state, // UUID
        cityId: values.city,   // UUID
      }),
    );

    // ---------- documents metadata + files ----------
    const documents: Array<{
      documentType: DocumentType;
      documentNumber: string;
      documentUrl?: string;
    }> = [];

    (Object.keys(DOC_FIELD_MAP) as Array<keyof typeof DOC_FIELD_MAP>).forEach(
      (formKey) => {
        const meta = DOC_FIELD_MAP[formKey];
        const uri = values[formKey];
        if (!uri) return;

        const num = meta.numberFrom
          ? (values[meta.numberFrom] as string) || meta.fallback
          : meta.fallback;

        const remote = isRemoteUri(uri);

        documents.push({
          documentType: meta.type,
          documentNumber: num,
          ...(remote ? { documentUrl: uri } : {}),
        });

        // Skip remote URLs — only freshly picked local files get uploaded
        if (remote) return;

        const name = safeFileName(uri, `${meta.type.toLowerCase()}.jpg`);
        const type = inferMimeType(name);

        // ✅ Same RN FormData file pattern as AddFundModal
        formData.append(`files[${meta.type}]`, {
          uri,
          name,
          type,
        } as any);
      },
    );

    formData.append('documents', JSON.stringify(documents));

    // ---------- call slice with FormData ----------
    await kycSubmitApiCall(formData, dispatch);
  };

  const handleNext = async () => {
    const valid = await trigger(currentFields);
    if (!valid) return;

    if (isLastStep) {
      await handleSubmit(submit)();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (step === 0) {
      // Don't reset the form — would wipe prefilled KYC data
      if (router.canGoBack()) router.back();
    } else {
      setStep((s) => s - 1);
    }
  };

  /* -------------- document picker -------------- */
  const pickDocument = async (
    fieldName: FieldName,
    onChange: (uri: string) => void,
    allowTypes: string[] = ['application/pdf', 'image/*'],
  ) => {
    try {
      setUploadingField(fieldName);

      const result = await DocumentPicker.getDocumentAsync({
        type: allowTypes,
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const file = result.assets?.[0];
      if (!file) return;

      if (file.size && file.size > MAX_FILE_SIZE_BYTES) {
        Alert.alert(
          'File too large',
          `Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`,
        );
        return;
      }

      onChange(file.uri);
    } catch (e) {
      console.warn('DocumentPicker error', e);
      Alert.alert('Error', 'Could not pick document. Please try again.');
    } finally {
      setUploadingField(null);
    }
  };

  /* -------------- label -------------- */
  const renderLabel = (name: FieldName) => {
    const meta = FIELD_META[name];
    return (
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {meta.label}
        <Text style={{ color: colors.error }}> *</Text>
      </Text>
    );
  };

  /* -------------- field renderer -------------- */
  const renderField = (name: FieldName) => {
    const meta = FIELD_META[name];
    const errorMsg = errors[name]?.message as string | undefined;

    /* ---- PAN (with Verify button) ---- */
    if (name === 'pan') {
      return (
        <View key={name} style={styles.field}>
          {renderLabel(name)}
          <View style={styles.panRow}>
            <Controller
              control={control}
              name="pan"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[
                    styles.input,
                    styles.panInput,
                    {
                      color: colors.text,
                      borderColor: errorMsg ? colors.error : colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                  placeholder={meta.placeholder}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  onBlur={onBlur}
                  value={value == null ? '' : String(value)}
                  onChangeText={(t) => onChange(t.toUpperCase())}
                  maxLength={10}
                />
              )}
            />
            <TouchableOpacity
              onPress={handlePanVerifybnt}
              disabled={verifyingPan}
              style={[
                styles.verifyBtn,
                {
                  backgroundColor: colors.buttonPrimary,
                  opacity: verifyingPan ? 0.7 : 1,
                },
              ]}
            >
              {verifyingPan ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.verifyBtnText}>Verify</Text>
              )}
            </TouchableOpacity>
          </View>
          {errorMsg ? (
            <Text style={[styles.error, { color: colors.error }]}>
              {errorMsg}
            </Text>
          ) : null}
        </View>
      );
    }

    /* ---- DOCUMENT picker ---- */
    if (meta.isDocument) {
      const docInfo = DOC_FIELD_MAP[name as keyof typeof DOC_FIELD_MAP];
      const allowImageOnly = docInfo.type === 'USER_PHOTO';
      const allowTypes = allowImageOnly
        ? ['image/*']
        : ['application/pdf', 'image/*'];

      return (
        <View key={name} style={styles.field}>
          {renderLabel(name)}
          <Controller
            control={control}
            name={name}
            render={({ field: { value, onChange } }) => {
              const uri = value as string | undefined;
              const remote = isRemoteUri(uri);
              const fileName = uri
                ? remote
                  ? uri.split('/').pop()?.split('?')[0] ?? 'Uploaded file'
                  : uri.split('/').pop() ?? ''
                : '';
              const isBusy = uploadingField === name;

              return (
                <>
                  {!uri ? (
                    <TouchableOpacity
                      disabled={isBusy}
                      onPress={() => pickDocument(name, onChange, allowTypes)}
                      style={[
                        styles.input,
                        styles.docBtn,
                        {
                          borderColor: errorMsg ? colors.error : colors.border,
                          backgroundColor: colors.surface,
                          opacity: isBusy ? 0.7 : 1,
                        },
                      ]}
                    >
                      {isBusy ? (
                        <ActivityIndicator size="small" />
                      ) : (
                        <Text
                          style={{
                            color: colors.buttonPrimary,
                            fontWeight: '600',
                          }}
                        >
                          + Choose {allowImageOnly ? 'Photo' : 'File'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View
                      style={[
                        styles.input,
                        styles.docRow,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.surface,
                        },
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={{ color: colors.text, flex: 1 }}
                      >
                        {remote ? '☁️ ' : '📎 '}
                        {fileName}
                      </Text>
                      <TouchableOpacity
                        onPress={() => onChange('')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text
                          style={{
                            color: colors.error,
                            fontWeight: '700',
                            marginLeft: 12,
                          }}
                        >
                          Remove
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {errorMsg ? (
                    <Text style={[styles.error, { color: colors.error }]}>
                      {errorMsg}
                    </Text>
                  ) : null}
                </>
              );
            }}
          />
        </View>
      );
    }

    /* ---- DOB picker ---- */
    if (name === 'dob') {
      return (
        <View key={name} style={styles.field}>
          {renderLabel(name)}
          <Controller
            control={control}
            name="dob"
            render={({ field: { value, onChange } }) => {
              const dateObj = parseISO(value);
              const display = dateObj ? toDisplay(dateObj) : '';

              const onPick = (_e: DateTimePickerEvent, picked?: Date) => {
                if (Platform.OS !== 'ios') setShowDobPicker(false);
                if (picked) onChange(toISO(picked));
              };

              return (
                <>
                  <TouchableOpacity
                    onPress={() => setShowDobPicker(true)}
                    style={[
                      styles.input,
                      {
                        justifyContent: 'center',
                        borderColor: errorMsg ? colors.error : colors.border,
                        backgroundColor: colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: display ? colors.text : colors.textMuted,
                      }}
                    >
                      {display || meta.placeholder || 'DD/MM/YYYY'}
                    </Text>
                  </TouchableOpacity>

                  {showDobPicker && (
                    <DateTimePicker
                      value={dateObj ?? new Date(2000, 0, 1)}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      maximumDate={new Date()}
                      onChange={onPick}
                    />
                  )}

                  {showDobPicker && Platform.OS === 'ios' && (
                    <TouchableOpacity
                      onPress={() => setShowDobPicker(false)}
                      style={{ alignSelf: 'flex-end', padding: 8 }}
                    >
                      <Text
                        style={{
                          color: colors.buttonPrimary,
                          fontWeight: '700',
                        }}
                      >
                        Done
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              );
            }}
          />
          {errorMsg ? (
            <Text style={[styles.error, { color: colors.error }]}>
              {errorMsg}
            </Text>
          ) : null}
        </View>
      );
    }

    /* ---- STATE ---- */
    if (name === 'state') {
      const selected = states?.find((s) => s.id === selectedStateId);
      return (
        <View key={name} style={styles.field}>
          {renderLabel(name)}
          <TouchableOpacity
            disabled={loading}
            onPress={() => setOpenPicker('state')}
            style={[
              styles.input,
              {
                justifyContent: 'center',
                borderColor: errorMsg ? colors.error : colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text
                style={{ color: selected ? colors.text : colors.textMuted }}
              >
                {selected?.stateName ?? 'Select State'}
              </Text>
            )}
          </TouchableOpacity>
          {errorMsg ? (
            <Text style={[styles.error, { color: colors.error }]}>
              {errorMsg}
            </Text>
          ) : null}

          <PickerModal
            visible={openPicker === 'state'}
            title="Select State"
            searchPlaceholder="Search state..."
            colors={colors}
            items={states.map((s) => ({
              label: s.stateName,
              value: s.id, // UUID
            }))}
            onClose={() => setOpenPicker(null)}
            onSelect={(uuid) => {
              const currentState = getValues('state');
              setValue('state', uuid, { shouldValidate: true });
              if (uuid !== currentState) {
                setValue('city', '', { shouldValidate: false });
              }
            }}
          />
        </View>
      );
    }

    /* ---- CITY ---- */
    if (name === 'city') {
      const selected = cities?.find((c) => c.id === selectedCityId);
      return (
        <View key={name} style={styles.field}>
          {renderLabel(name)}
          <TouchableOpacity
            disabled={!selectedStateId || loading}
            onPress={() => setOpenPicker('city')}
            style={[
              styles.input,
              {
                justifyContent: 'center',
                borderColor: errorMsg ? colors.error : colors.border,
                backgroundColor: colors.surface,
                opacity: !selectedStateId ? 0.6 : 1,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text
                style={{ color: selected ? colors.text : colors.textMuted }}
              >
                {selected?.cityName ??
                  (selectedStateId ? 'Select City' : 'Select state first')}
              </Text>
            )}
          </TouchableOpacity>
          {errorMsg ? (
            <Text style={[styles.error, { color: colors.error }]}>
              {errorMsg}
            </Text>
          ) : null}

          <PickerModal
            visible={openPicker === 'city'}
            title="Select City"
            searchPlaceholder="Search city..."
            colors={colors}
            items={cities?.map((c) => ({
              label: c.cityName,
              value: c.id, // UUID
            }))}
            onClose={() => setOpenPicker(null)}
            onSelect={(uuid) =>
              setValue('city', uuid, { shouldValidate: true })
            }
            emptyText={
              selectedStateId ? 'No cities found' : 'Select a state first'
            }
          />
        </View>
      );
    }

    /* ---- GENDER ---- */
    if (meta.options && meta.options.length > 0) {
      return (
        <View key={name} style={styles.field}>
          {renderLabel(name)}
          <Controller
            control={control}
            name={name}
            render={({ field: { onChange, value } }) => (
              <View style={styles.optionRow}>
                {meta.options!.map((opt) => {
                  const isSel = value === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => onChange(opt)}
                      style={[
                        styles.option,
                        {
                          borderColor: isSel
                            ? colors.buttonPrimary
                            : colors.border,
                          backgroundColor: isSel
                            ? colors.buttonPrimary
                            : colors.surface,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: isSel ? '#fff' : colors.text,
                          fontWeight: '600',
                          textTransform: 'capitalize',
                        }}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          />
          {errorMsg ? (
            <Text style={[styles.error, { color: colors.error }]}>
              {errorMsg}
            </Text>
          ) : null}
        </View>
      );
    }

    /* ---- TEXT input ---- */
    return (
      <View key={name} style={styles.field}>
        {renderLabel(name)}
        <Controller
          control={control}
          name={name}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: errorMsg ? colors.error : colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
              placeholder={meta.placeholder}
              placeholderTextColor={colors.textMuted}
              keyboardType={meta.keyboardType ?? 'default'}
              autoCapitalize={meta.autoCapitalize ?? 'none'}
              onBlur={onBlur}
              value={value == null ? '' : String(value)}
              onChangeText={onChange}
              maxLength={
                name === 'aadhaar'
                  ? 12
                  : name === 'pinCode'
                  ? 6
                  : undefined
              }
            />
          )}
        />
        {errorMsg ? (
          <Text style={[styles.error, { color: colors.error }]}>
            {errorMsg}
          </Text>
        ) : null}
      </View>
    );
  };

  /* -------------- render -------------- */
  const isRejected = KYCData?.status === 'REJECTED';

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surfaceTertiary }]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
      >
        <HeaderSection title="Profile KYC" />

        {isRejected && (
          <View
            style={[
              styles.banner,
              {
                backgroundColor: isDark ? '#3A0F0F' : '#FEE2E2',
                borderColor: colors.error,
              },
            ]}
          >
            <Text style={[styles.bannerTitle, { color: colors.error }]}>
              KYC Rejected
            </Text>
            {!!KYCData?.rejectionReason && (
              <Text style={[styles.bannerText, { color: colors.text }]}>
                Reason: {KYCData.rejectionReason}
              </Text>
            )}
          </View>
        )}

        <View style={styles.progressWrap}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 12,
              fontWeight: '600',
            }}
          >
            Step {step + 1} of {STEPS.length} · {STEPS[step].title}
          </Text>
          <View style={styles.progressTrack}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressBar,
                  {
                    backgroundColor:
                      i <= step ? colors.buttonPrimary : colors.border,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {currentFields.map(renderField)}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleBack}
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.text, fontWeight: '600' }}>
              {step === 0 ? 'Cancel' : 'Back'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={loading}
            onPress={handleNext}
            style={[
              styles.primaryBtn,
              {
                backgroundColor: colors.buttonPrimary,
                opacity: loading ? 0.7 : 1,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {isLastStep ? 'Submit' : 'Next'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ProfileKycScreen;

/* -------------- styles -------------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  kav: { flex: 1 },
  progressWrap: { paddingHorizontal: 20, paddingTop: 16 },
  progressTrack: { flexDirection: 'row', gap: 6, marginTop: 10 },
  progressBar: { flex: 1, height: 4, borderRadius: 2 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  field: { marginTop: 16 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 46,
  },
  panRow: { flexDirection: 'row', gap: 8 },
  panInput: { flex: 1 },
  verifyBtn: {
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  verifyBtnText: { color: '#fff', fontWeight: '700' },
  error: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  optionRow: { flexDirection: 'row', gap: 10 },
  option: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom:50
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  primaryBtn: {
    flex: 1.4,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: { borderRadius: 16, padding: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700', padding: 12 },
  modalRow: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginHorizontal: 8,
    marginBottom: 8,
    height: 42,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },

  docBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  banner: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  bannerTitle: { fontWeight: '700', marginBottom: 4 },
  bannerText: { fontSize: 13 },
});