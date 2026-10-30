// components/screens/digilocker.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  useColorScheme,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Linking from 'expo-linking';
import { useDispatch } from 'react-redux';
import * as Crypto from 'expo-crypto';

import { Colors } from '@/constants/theme';
import {
  digilockerInitiateApiCall,
  verifyDigilockerCallbackApiCall,
} from '@/redux/slices/serviceSlice';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showError, showSuccess } from '../service/AlertService';

type Props = {
  serviceMappingId: string;
  onSuccess: (data: any) => void;
  onCancel?: () => void;
};

const CALLBACK_MARKER = 'digilocker-callback';

const DigilockerPage = ({ serviceMappingId, onSuccess, onCancel }: Props) => {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [webviewLoading, setWebviewLoading] = useState(true);


   
  // ✅ refId stored in a ref so verify() always sees the current value
  //    (fixes the stale-closure bug where it was sending "" to the backend)
  const refIdRef = useRef<string>('');

  // Guard so verify runs only once per callback hit
  const processedRef = useRef<boolean>(false);

  // ✅ Close WebView IMMEDIATELY, then call verify API with serviceMappingId + refId
  const verify = useCallback(async () => {
    if (processedRef.current) return;
    processedRef.current = true;

    // Close WebView first — user sees it disappear on submit
    setAuthUrl(null);

    try {
      const payload = {
        serviceProviderMappingId: serviceMappingId,
        refId: refIdRef.current, // ✅ always current — no stale closure
      };
      const res = await verifyDigilockerCallbackApiCall(payload, dispatch);
      if (res?.success === true) {
        showSuccess(res?.message)
        onSuccess(res);
      } else{
        showError(res?.message)
      }
    } catch (e: any) {
      processedRef.current = false;
      Alert.alert('Error', e?.message ?? 'DigiLocker callback failed');
    }
  }, [dispatch, serviceMappingId, onSuccess]);

  // Cold-start fallback (app was killed during redirect)
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (!url.includes(CALLBACK_MARKER)) return;
      verify();
    });
    return () => sub.remove();
  }, [verify]);

  const startDigilocker = useCallback(async () => {
    try {
      setLoading(true);
      const res = await digilockerInitiateApiCall(
        {
          serviceProviderMappingId: serviceMappingId,
          idempotencyKey: Crypto.randomUUID(),
        },
        dispatch,
      );


      if (res?.success === true && res?.data?.authorizationUrl) {
        // ✅ store refId in a ref so verify() sees the current value
        refIdRef.current = res?.data?.refId ?? res?.data?.refid ?? '';
        processedRef.current = false; // reset guard for this attempt
        setWebviewLoading(true);
        setAuthUrl(res.data.authorizationUrl);
      } else {
        Alert.alert('DigiLocker', res?.message ?? 'Unable to start DigiLocker');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'DigiLocker error');
    } finally {
      setLoading(false);
    }
  }, [dispatch, serviceMappingId]);

  // ✅ Detect callback by URL marker only — no code/state parsing needed
  const handleShouldStartLoad = (request: { url: string }): boolean => {
    const { url } = request;
    const lower = url.toLowerCase();

    // 1) Callback hit → close WebView + verify, block navigation
    if (url.includes(CALLBACK_MARKER)) {
      verify();
      return false;
    }

    // 2) Block ALL non-http(s) schemes → stops Android OS handoff
    //    (this was the "app redirects away from WebView" bug)
    if (
      !lower.startsWith('http://') &&
      !lower.startsWith('https://') &&
      !lower.startsWith('about:blank') &&
      !lower.startsWith('data:')
    ) {
      return false;
    }

    return true;
  };

  const closeWebView = useCallback(() => {
    setAuthUrl(null);
    onCancel?.();
  }, [onCancel]);



  // ---------- WebView Mode ----------
  if (authUrl) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceTertiary }}>
        <View
          style={[
            styles.webviewHeader,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.webviewTitle, { color: colors.text }]}>
            DigiLocker
          </Text>
          <TouchableOpacity onPress={closeWebView} hitSlop={12}>
            <Text style={[styles.closeText, { color: colors.buttonPrimary }]}>
              Close
            </Text>
          </TouchableOpacity>
        </View>

        <WebView
          source={{ uri: authUrl }}
          style={{ flex: 1 }}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          onNavigationStateChange={(navState) => {
            console.log("sffsdg",navState);
             if(navState?.canGoBack === true && navState?.title === "KYC Submit"){
                verify();
                closeWebView();
             }
            // Catch JS-driven redirects (DigiLocker submit → redirect)
            // if (navState.url.includes(CALLBACK_MARKER)) {
            //   verify();
            // }
          }}
          onLoadStart={() => setWebviewLoading(true)}
          onLoadEnd={() => setWebviewLoading(false)}
          startInLoadingState={false}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          originWhitelist={['*']}
        />

        {webviewLoading && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={colors.buttonPrimary} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ---------- Initial Screen ----------
  return (
    <View
      style={[styles.container, { backgroundColor: colors.surfaceTertiary }]}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>
          Verify via DigiLocker
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          You'll be redirected to DigiLocker to authorize your Aadhaar & PAN.
          All data is fetched securely.
        </Text>

        <TouchableOpacity
          onPress={startDigilocker}
          disabled={loading}
          style={[
            styles.btn,
            {
              backgroundColor: colors.buttonPrimary,
              opacity: loading ? 0.7 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Continue with DigiLocker</Text>
          )}
        </TouchableOpacity>

        {!!onCancel && (
          <TouchableOpacity
            onPress={onCancel}
            disabled={loading}
            style={{ marginTop: 12, alignItems: 'center' }}
          >
            <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>
              Cancel
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default DigilockerPage;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  card: { borderWidth: 1, borderRadius: 16, padding: 20 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 13, lineHeight: 20, marginBottom: 20 },
  btn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  webviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: Platform.OS === 'android' ? 16 : 12,
  },
  webviewTitle: { fontSize: 16, fontWeight: '700' },
  closeText: { fontSize: 15, fontWeight: '600' },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
});