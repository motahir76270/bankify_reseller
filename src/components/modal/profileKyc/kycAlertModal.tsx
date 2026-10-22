// components/KycAlertModal.tsx
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import React from 'react';
import { Colors } from '@/constants/theme';
import { router } from 'expo-router';
import { useSelector } from 'react-redux';

interface KycAlertModalProps {
  visible: boolean;
  onClose: () => void;
}

const KycAlertModal: React.FC<KycAlertModalProps> = ({ visible, onClose }) => {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const KYCData = useSelector((s: any) => s?.profileKyc?.KYCData ?? null);
//   console.log(KYCData);
  
  const status: string | undefined = KYCData?.status;

  const isRejected = status === 'REJECTED';
  const isPending = status === 'PENDING' || status === 'UNDER_REVIEW';

  const title = isRejected
    ? 'KYC Rejected'
    : isPending
    ? 'KYC Under Review'
    : 'KYC Verification Required';

  const description = isRejected
    ? KYCData?.rejectionReason
      ? `Your KYC was rejected. Reason: ${KYCData.rejectionReason}. Please update and resubmit.`
      : 'Your KYC was rejected. Please update your details and resubmit.'
    : isPending
    ? 'Your KYC is being reviewed. You will be able to add funds once it is approved.'
    : 'Your KYC is not verified yet. To add funds and start investing, please complete your KYC verification.';

  const buttonLabel = isRejected
    ? 'Re-submit KYC'
    : isPending
    ? 'View Status'
    : 'Complete KYC';

const handleBtn = () => {
    if (!isPending) {
        router.push('/screens/profileKyc');
    }
    onClose();
};

const handleLogout = async()=>{

}

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isRejected
                  ? isDark
                    ? '#3A0F0F'
                    : '#FEE2E2'
                  : isDark
                  ? '#3A2A00'
                  : '#FFF4D6',
              },
            ]}
          >
            <Text style={styles.iconText}>{isRejected ? '❌' : '⚠️'}</Text>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

          <Text
            style={[
              styles.description,
              { color: colors.textSecondary ?? '#888' },
            ]}
          >
            {description}
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.primaryButton,
              { backgroundColor: colors.buttonPrimary },
            ]}
            onPress={handleBtn}
          >
            <Text style={styles.primaryButtonText}>{buttonLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.secondaryButton,{backgroundColor:colors.error}]}
            onPress={handleLogout}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                { color: colors.text ?? '#888' },
              ]}
            >
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default KycAlertModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    minHeight:"80%",
    borderRadius: 20,
    justifyContent:"center",
    paddingHorizontal: 22,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: { fontSize: 34 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 22,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondaryButton: {    
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,},
  secondaryButtonText: { fontSize: 14, fontWeight: '500' },
});