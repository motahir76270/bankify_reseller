import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useSelector } from 'react-redux';

type FundRequest = {
  id: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'SUCCESS' | 'FAILED' | 'REJECTED' | string;
  referenceId: string;
  providerTxnId: string;
  paymentMode: string;
  createdAt: string;
  failureReason?: string | null;
  imageUrl?: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onContactSupport?: () => void;
};

/* Map API status → UI config */
const STATUS_CONFIG: Record<
  string,
  {
    icon: keyof typeof Ionicons.glyphMap;
    iconBg: string;
    iconColor: string;
    title: string;
    message: string;
  }
> = {
  PENDING: {
    icon: 'time-outline',
    iconBg: 'rgba(211,208,15,0.15)',
    iconColor: '#D3D00F',
    title: 'Payment Pending',
    message:
      "Your fund request is being reviewed. This usually takes a few minutes. You'll be notified once it's approved.",
  },
  APPROVED: {
    icon: 'checkmark-circle-outline',
    iconBg: 'rgba(83,192,61,0.15)',
    iconColor: '#53C03D',
    title: 'Fund Approved',
    message: 'Your fund has been successfully added to your wallet.',
  },
  SUCCESS: {
    icon: 'checkmark-circle-outline',
    iconBg: 'rgba(83,192,61,0.15)',
    iconColor: '#53C03D',
    title: 'Fund Added',
    message: 'Your fund has been successfully added to your wallet.',
  },
  FAILED: {
    icon: 'close-circle-outline',
    iconBg: 'rgba(236,8,8,0.15)',
    iconColor: '#EC0808',
    title: 'Payment Failed',
    message: 'Your fund request could not be processed. Please try again.',
  },
  REJECTED: {
    icon: 'close-circle-outline',
    iconBg: 'rgba(236,8,8,0.15)',
    iconColor: '#EC0808',
    title: 'Request Rejected',
    message: 'Your fund request was rejected. Please contact support.',
  },
};

const DEFAULT_CONFIG = {
  icon: 'information-circle-outline' as const,
  iconBg: 'rgba(120,120,120,0.15)',
  iconColor: '#888',
  title: 'Fund Request',
  message: 'Your request is being processed.',
};

const PendingStatusModal = ({ visible, onClose, onContactSupport,setAddFundVisible,addFundVisible }: any) => {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  /* Redux state — addFund slice */
  const { status, fundRequests } = useSelector((state: any) => state.addFund);

  /**
   * Pick the latest fund request.
   * Priority: fundRequests array (if present) → status (if it's an array) → status (single object)
   */
  const latestRequest: FundRequest | null = useMemo(() => {
    const list: FundRequest[] = Array.isArray(fundRequests)
      ? fundRequests
      : Array.isArray(status)
      ? status
      : status
      ? [status]
      : [];

    if (!list.length) return null;

    return [...list].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
  }, [status, fundRequests]);

  const apiStatus = (latestRequest?.status || 'PENDING').toUpperCase();
  const config = STATUS_CONFIG[apiStatus] ?? DEFAULT_CONFIG;

  const formattedDate = latestRequest?.createdAt
    ? new Date(latestRequest.createdAt).toLocaleString()
    : null;

  const formattedAmount = latestRequest?.amount
    ? `₹${Number(latestRequest.amount).toLocaleString('en-IN')}`
    : null;

    const handleAddfund = async()=> {
      setAddFundVisible(true)
      onClose()
    }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceTertiary,
              borderColor: colors.border,
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Icon */}
            <View
              style={[styles.iconWrap, { backgroundColor: config.iconBg }]}
            >
              <Ionicons
                name={config.icon}
                size={36}
                color={config.iconColor}
              />
            </View>

            {/* Title + Message */}
            <Text style={[styles.title, { color: colors.text }]}>
              {config.title}
            </Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              {config.message}
            </Text>

            {/* Details card */}
            {latestRequest && (
              <View
                style={[
                  styles.detailsCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                {formattedAmount && (
                  <DetailRow
                    label="Amount"
                    value={formattedAmount}
                    colors={colors}
                    highlight
                  />
                )}
                {latestRequest.referenceId && (
                  <DetailRow
                    label="Reference ID"
                    value={latestRequest.referenceId}
                    colors={colors}
                  />
                )}
                {latestRequest.providerTxnId && (
                  <DetailRow
                    label="Transaction ID"
                    value={latestRequest.providerTxnId}
                    colors={colors}
                  />
                )}
                {latestRequest.paymentMode && (
                  <DetailRow
                    label="Payment Mode"
                    value={latestRequest.paymentMode}
                    colors={colors}
                  />
                )}
                {formattedDate && (
                  <DetailRow
                    label="Date"
                    value={formattedDate}
                    colors={colors}
                    isLast={
                      !latestRequest.failureReason ||
                      apiStatus !== 'FAILED'
                    }
                  />
                )}
                {latestRequest.failureReason &&
                  apiStatus === 'FAILED' && (
                    <DetailRow
                      label="Reason"
                      value={latestRequest.failureReason}
                      colors={colors}
                      danger
                      isLast
                    />
                  )}
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
     
             <TouchableOpacity
              activeOpacity={0.85}
              onPress={onClose}
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.buttonPrimary },
              ]}
            >
              <Text style={styles.primaryBtnText}>Check status</Text>
             </TouchableOpacity>
             <TouchableOpacity
              activeOpacity={0.85}
              onPress={onClose}
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.error },
              ]}
            >
              <Text style={styles.primaryBtnText}>Logout</Text>
            </TouchableOpacity>

          </View>
          
        </View>
      </View>
    </Modal>
  );
};

/* Small helper row */
const DetailRow = ({
  label,
  value,
  colors,
  highlight,
  danger,
  isLast,
}: {
  label: string;
  value: string;
  colors: any;
  highlight?: boolean;
  danger?: boolean;
  isLast?: boolean;
}) => (
  <View
    style={[
      styles.detailRow,
      !isLast && {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      },
    ]}
  >
    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
      {label}
    </Text>
    <Text
      style={[
        styles.detailValue,
        {
          color: danger
            ? colors.error
            : highlight
            ? colors.buttonPrimary
            : colors.text,
          fontWeight: highlight ? '800' : '600',
          fontSize: highlight ? 16 : 13,
        },
      ]}
      numberOfLines={2}
    >
      {value}
    </Text>
  </View>
);

export default PendingStatusModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    width: '100%',
    maxHeight: '95%',
    minHeight: '85%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 120,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  detailsCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  detailLabel: { fontSize: 12, fontWeight: '600' },
  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
  },
  actions: {
    paddingBottom: 124,
  },
  primaryBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom:10
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkBtn: { marginTop: 12, padding: 6, alignItems: 'center' },
  linkText: { fontSize: 13, fontWeight: '600' },
});