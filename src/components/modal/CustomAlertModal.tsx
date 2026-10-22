import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';


interface CustomAlertModalProps {
  visible: boolean;
  type: any;
  message: string;
  title?: string;
  onClose: () => void;
  autoDismiss?: boolean;
  autoDismissTime?: number; // in milliseconds
}

const CustomAlertModal: React.FC<CustomAlertModalProps> = ({
  visible,
  type,
  message,
  title,
  onClose,
  autoDismiss = true,
  autoDismissTime = 30000, // 30 seconds default
}) => {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<any>(null);

  // Get alert configuration based on type
  const getAlertConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'checkmark-circle',
          iconColor: '#4CAF50',
          backgroundColor: '#4CAF50',
          defaultTitle: 'Success',
        };
      case 'failed':
        return {
          icon: 'close-circle',
          iconColor: '#F44336',
          backgroundColor: '#F44336',
          defaultTitle: 'Failed',
        };
      case 'warning':
        return {
          icon: 'warning',
          iconColor: '#FF9800',
          backgroundColor: '#FF9800',
          defaultTitle: 'Warning',
        };
      default:
        return {
          icon: 'information-circle',
          iconColor: '#2196F3',
          backgroundColor: '#2196F3',
          defaultTitle: 'Information',
        };
    }
  };

  const config = getAlertConfig();
  const displayTitle = title || config.defaultTitle;

  // Animate modal entry
  const animateIn = () => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Animate modal exit
  const animateOut = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
    ]).start(() => {
      if (callback) callback();
    });
  };

  // Start auto-dismiss timer
  const startAutoDismiss = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Reset progress animation
    progressAnim.setValue(0);

    if (autoDismiss) {
      // Animate progress bar
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: autoDismissTime,
        useNativeDriver: false,
        easing: Easing.linear,
      }).start();

      // Set timeout to dismiss
      timerRef.current = setTimeout(() => {
        handleClose();
      }, autoDismissTime);
    }
  };

  // Handle close
  const handleClose = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    animateOut(() => {
      onClose();
      // Reset progress
      progressAnim.setValue(0);
    });
  };

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      animateIn();
      startAutoDismiss();
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      progressAnim.setValue(0);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible]);


  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.card,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: config.backgroundColor + '15' }]}>
            <Ionicons name={config.icon as any} size={48} color={config.iconColor} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: config.iconColor }]}>
            {displayTitle}
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: colors.text }]}>
            {message}
          </Text>

          {/* Progress Bar (only for auto-dismiss) */}
          {autoDismiss && (
            <View style={styles.progressContainer}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: config.backgroundColor,
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          )}

          {/* OK Button */}
          <TouchableOpacity
            style={[styles.okButton, { backgroundColor: config.backgroundColor }]}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Text style={styles.okButtonText}>OK</Text>
          </TouchableOpacity>

          {/* Auto-dismiss timer text */}
          {autoDismiss && (
            <Text style={[styles.timerText, { color: colors.textSecondary }]}>
              Auto-dismissing in {Math.ceil(autoDismissTime / 1000)}s
            </Text>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: Dimensions.get('window').width - 50,
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  progressContainer: {
    width: '100%',
    height: 3,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  okButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  okButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  timerText: {
    fontSize: 11,
    marginTop: 10,
    opacity: 0.7,
  },
});

export default CustomAlertModal;