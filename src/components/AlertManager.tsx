// components/AlertManager.tsx
import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import CustomAlertModal from './modal/CustomAlertModal';


const AlertManager = forwardRef<any>((props, ref) => {
  const [alertState, setAlertState] = useState<any>({
    visible: false,
    type: 'success',
    message: '',
    title: '',
    autoDismiss: true,
    autoDismissTime: 5000,
  });

  const timerRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    show: (
      type: any,
      message: string,
      title: string = '',
      options: any = {}
    ) => {
      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      setAlertState({
        visible: true,
        type,
        message,
        title,
        autoDismiss: options.autoDismiss !== undefined ? options.autoDismiss : true,
        autoDismissTime: options.autoDismissTime || 5000,
        onClose: options.onClose,
      });
    },
    hide: () => {
      setAlertState((prev:any) => ({ ...prev, visible: false }));
    },
  }));

  const handleClose = () => {
    setAlertState((prev:any) => ({ ...prev, visible: false }));
    if (alertState.onClose) {
      alertState.onClose();
    }
  };

  return (
    <CustomAlertModal
      visible={alertState.visible}
      type={alertState.type}
      message={alertState.message}
      title={alertState.title}
      onClose={handleClose}
      autoDismiss={alertState.autoDismiss}
      autoDismissTime={alertState.autoDismissTime}
    />
  );
});

AlertManager.displayName = 'AlertManager';

export default AlertManager;