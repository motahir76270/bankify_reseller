// services/AlertService.ts
import { Alert } from 'react-native';

export type AlertType = 'success' | 'failed' | 'warning' | 'info';

export interface AlertOptions {
  autoDismiss?: boolean;
  autoDismissTime?: number;
  onClose?: () => void;
}

export interface AlertManagerRef {
  show: (type: AlertType, message: string, title?: string, options?: AlertOptions) => void;
  hide: () => void;
}

let globalAlertRef: AlertManagerRef | null = null;

export const setGlobalAlertRef = (ref: AlertManagerRef | null) => {
  globalAlertRef = ref;
};

export const showAlert = (
  type: AlertType,
  message: string,
  title: string = '',
  options: AlertOptions = {}
): void => {
  if (globalAlertRef) {
    globalAlertRef.show(type, message, title, options);
  } else {
    // Fallback to native Alert
    const titles: Record<AlertType, string> = {
      'success': 'Success',
      'failed': 'Error',
      'warning': 'Warning',
      'info': 'Information'
    };
    Alert.alert(
      title || titles[type] || 'Alert',
      message,
      [{ text: 'OK' }]
    );
  }
};

export const showSuccess = (message: string, title: string = 'Success'): void => {
  showAlert('success', message, title);
};

export const showError = (message: string, title: string = 'Error'): void => {
  showAlert('failed', message, title);
};

export const showWarning = (message: string, title: string = 'Warning'): void => {
  showAlert('warning', message, title);
};

export const showInfo = (message: string, title: string = 'Information'): void => {
  showAlert('info', message, title);
};