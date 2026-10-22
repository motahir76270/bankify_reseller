import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal,
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
  Image,
  Alert,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import AddFundValiation from '@/validations/addFund';
import {
  addFundRequestApiCall,
  getBankFundReqApiCall,
} from '@/redux/slices/addFundSlice';

type PaymentMode = 'BANK' | 'UPI';

type FormValues = {
  amount: number;
  paymentMode: PaymentMode;
  providerTxnId: string;
  imageUrl?: {
    uri: string;
    fileName?: string | null;
    mimeType?: string | null;
  } | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  loading?: boolean;
};

const PAYMENT_MODES: PaymentMode[] = ['BANK', 'UPI'];

const AddFundModal = ({ visible, onClose }: Props) => {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const { bankDetails, loading } = useSelector((state: any) => state.addFund);

  const [modeOpen, setModeOpen] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(AddFundValiation.addFundSchema),
    defaultValues: {
      amount: undefined as any,
      paymentMode: 'BANK',
      providerTxnId: '',
      imageUrl: null,
    },
  });

  const selectedMode = watch('paymentMode');
  const imageValue = watch('imageUrl');

  /* ----------------------------- Close Handler ----------------------------- */
  const handleClose = useCallback(() => {
    reset();
    setModeOpen(false);
    onClose();
  }, [reset, onClose]);

  /* ------------------------- Fetch Bank Details ---------------------------- */
  useEffect(() => {
    if (!visible || selectedMode !== 'BANK') return;

    let cancelled = false;

    const fetchBank = async () => {
      try {
        setBankLoading(true);
        await getBankFundReqApiCall(dispatch);
      } catch (e) {
        console.log('bank fetch error', e);
      } finally {
        if (!cancelled) setBankLoading(false);
      }
    };

    fetchBank();

    return () => {
      cancelled = true;
    };
  }, [selectedMode, visible, dispatch]);

  /* --------------------- Reset state when modal closes --------------------- */
  useEffect(() => {
    if (!visible) {
      setBankLoading(false);
      setModeOpen(false);
    }
  }, [visible]);

  /* ------------------------------- Pick Image ------------------------------ */
  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your gallery to upload a receipt.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setValue(
          'imageUrl',
          {
            uri: asset.uri,
            fileName: asset.fileName ?? 'receipt.jpg',
            mimeType: asset.mimeType ?? 'image/jpeg',
          },
          { shouldValidate: true }
        );
      }
    } catch (error) {
      console.log('Image picker error:', error);
      Alert.alert('Error', 'Something went wrong while picking the image.');
    }
  };

  const removeImage = () => {
    setValue('imageUrl', null, { shouldValidate: true });
  };

  /* --------------------------------- Submit -------------------------------- */
  const submit = async (values: FormValues) => {
    try {
      const formData = new FormData();
      formData.append('amount', String(values.amount * 100));
      formData.append('paymentMode', values.paymentMode);
      formData.append('providerTxnId', values.providerTxnId);
      formData.append('idempotencyKey', Crypto.randomUUID());

      if (values.imageUrl?.uri) {
        formData.append('imageUrl', {
          uri: values.imageUrl.uri,
          name: values.imageUrl.fileName ?? 'receipt.jpg',
          type: values.imageUrl.mimeType ?? 'image/jpeg',
        } as any);
      }

      const res = await addFundRequestApiCall(formData, dispatch);
      if (res?.success === true) {
        onClose();
      }
    } catch (error) {
      console.log('Submit error:', error);
    }
  };

  /* --------------------------- Mode Dropdown UI ---------------------------- */
  const renderModeDropdown = () => (
    <View>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setModeOpen((p) => !p)}
        style={[
          styles.input,
          styles.dropdown,
          {
            borderColor: errors.paymentMode ? colors.error : colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <Text style={{ color: colors.text, fontSize: 15 }}>
          {selectedMode || 'Select payment mode'}
        </Text>
        <Ionicons
          name={modeOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.text}
        />
      </TouchableOpacity>

      {modeOpen && (
        <View
          style={[
            styles.dropdownList,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {PAYMENT_MODES.map((mode) => (
            <TouchableOpacity
              key={mode}
              style={styles.dropdownItem}
              onPress={() => {
                setValue('paymentMode', mode, { shouldValidate: true });
                setModeOpen(false);
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontWeight: selectedMode === mode ? '700' : '400',
                }}
              >
                {mode}
              </Text>
              {selectedMode === mode && (
                <Ionicons name="checkmark" size={18} color={colors.text} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {errors.paymentMode && (
        <Text style={[styles.error, { color: colors.error }]}>
          {errors.paymentMode.message}
        </Text>
      )}
    </View>
  );

  /* -------------------------- Bank Details Card ---------------------------- */
  const renderBankDetails = () => {
    if (selectedMode !== 'BANK') return null;

    if (bankLoading) {
      return (
        <View style={[styles.centerBox, { paddingVertical: 24 }]}>
          <ActivityIndicator color={colors.text} />
        </View>
      );
    }

    const bank = bankDetails?.bankDetail ?? bankDetails;
    if (!bank) return null;

    const rows: [string, any][] = [
      ['Bank Name', bank.bankName],
      ['Account Holder', bank.accountHolderName],
      ['Account Number', bank.accountNumber],
      ['IFSC Code', bank.ifscCode],
      ['Branch', bank.branchName],
      ['UPI ID', bank.upiId],
    ];

    return (
      <View
        style={[
          styles.infoCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.infoTitle, { color: colors.text }]}>
          Bank Details
        </Text>
        {rows.map(([label, val]) => (
          <View key={label} style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              {label}
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {val ?? '-'}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  /* ----------------------------- UPI QR Card ------------------------------- */
  const renderUpiQr = () => {
    if (selectedMode !== 'UPI') return null;
    return (
      <View
        style={[
          styles.infoCard,
          styles.centerBox,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.infoTitle, { color: colors.text }]}>
          Scan & Pay
        </Text>
        {/* Uncomment when you have the QR image */}
        {/* <Image
          source={require('@/assets/images/upi-qr.png')}
          style={styles.qrImage}
          resizeMode="contain"
        /> */}
        <Text style={[styles.qrHint, { color: colors.textSecondary }]}>
          Pay to the above UPI QR, then submit the transaction ID below.
        </Text>
      </View>
    );
  };

  /* --------------------------- Image Picker UI ----------------------------- */
  const renderImagePicker = () => (
    <View>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        Payment Receipt (Optional)
      </Text>

      {imageValue?.uri ? (
        <View style={styles.previewWrapper}>
          <Image
            source={{ uri: imageValue.uri }}
            style={styles.preview}
            resizeMode="cover"
          />
          <TouchableOpacity
            style={[
              styles.removeBtn,
              { backgroundColor: colors.error ?? '#ef4444' },
            ]}
            onPress={removeImage}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={pickImage}
          style={[
            styles.uploadBox,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <Ionicons
            name="cloud-upload-outline"
            size={30}
            color={colors.textMuted}
          />
          <Text style={[styles.uploadText, { color: colors.textSecondary }]}>
            Tap to upload receipt
          </Text>
        </TouchableOpacity>
      )}

      {errors.imageUrl && (
        <Text style={[styles.error, { color: colors.error }]}>
          {(errors.imageUrl as any).message}
        </Text>
      )}
    </View>
  );

  /* --------------------------------- Render -------------------------------- */
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surfaceTertiary,
                borderColor: colors.border,
                paddingBottom: Math.max(insets.bottom, 16) + 12,
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>
                Add Fund
              </Text>
              <TouchableOpacity onPress={handleClose} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Amount */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Amount
              </Text>
              <Controller
                control={control}
                name="amount"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: colors.text,
                        borderColor: errors.amount
                          ? colors.error
                          : colors.border,
                        backgroundColor: colors.surface,
                      },
                    ]}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    onBlur={onBlur}
                    value={value === undefined ? '' : String(value)}
                    onChangeText={(t) => {
                      const cleaned = t.replace(/[^0-9.]/g, '');
                      onChange(cleaned === '' ? undefined : Number(cleaned));
                    }}
                  />
                )}
              />
              {errors.amount && (
                <Text style={[styles.error, { color: colors.error }]}>
                  {errors.amount.message}
                </Text>
              )}

              {/* Payment Mode */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Payment Mode
              </Text>
              {renderModeDropdown()}

              {/* Bank / UPI */}
              {renderBankDetails()}
              {renderUpiQr()}

              {/* Provider Txn ID */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Provider Transaction ID
              </Text>
              <Controller
                control={control}
                name="providerTxnId"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: colors.text,
                        borderColor: errors.providerTxnId
                          ? colors.error
                          : colors.border,
                        backgroundColor: colors.surface,
                      },
                    ]}
                    placeholder="TXN123456"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="characters"
                    onBlur={onBlur}
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
              {errors.providerTxnId && (
                <Text style={[styles.error, { color: colors.error }]}>
                  {errors.providerTxnId.message}
                </Text>
              )}

              {/* Image Upload */}
              {renderImagePicker()}
            </ScrollView>

            {/* Submit */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={loading}
              onPress={handleSubmit(submit)}
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
                <Text style={styles.primaryBtnText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default AddFundModal;

/* --------------------------------- Styles -------------------------------- */
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  kav: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '92%',
    // paddingBottom is applied dynamically via insets in the component
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '800' },
  scrollContent: {
    paddingBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
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
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownList: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  error: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  primaryBtn: {
    marginTop: 16,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  infoCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: { fontSize: 12, fontWeight: '500' },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  centerBox: { alignItems: 'center', justifyContent: 'center' },
  qrImage: { width: 200, height: 200, marginVertical: 12 },
  qrHint: { fontSize: 12, textAlign: 'center' },

  /* ---- Image picker styles ---- */
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  uploadText: {
    fontSize: 13,
    marginTop: 8,
    fontWeight: '500',
  },
  previewWrapper: {
    marginTop: 4,
    alignSelf: 'flex-start',
    position: 'relative',
  },
  preview: {
    width: 130,
    height: 130,
    borderRadius: 12,
  },
  removeBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});