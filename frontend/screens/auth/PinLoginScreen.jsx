import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, StatusBar, SafeAreaView, Platform, Animated,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReactNativeBiometrics from 'react-native-biometrics';
import * as Keychain from 'react-native-keychain';
import { useNavigation, useRoute } from '@react-navigation/native';
import { login, getUser } from '../../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import customAlertService from '../../services/customAlertService';

const PinLoginScreen = () => {
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState(['', '', '', '']);
  const [isFocused, setIsFocused] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const successAnim = useRef(new Animated.Value(0)).current;
  const hiddenInputRef = useRef(null);
  const navigation = useNavigation();
  const route = useRoute();
  const { phoneNumber = '' } = route.params || {};

  useEffect(() => {
    if (!phoneNumber) {
      customAlertService.showError('Error', 'Phone number is missing. Please try again.');
      navigation.navigate('SignUpLogin');
      return;
    }
    checkBiometricAuth();
  }, []);

  const navigateByRole = async () => {
    try {
      const response = await getUser();
      const role = response?.data?.role || 'user';
      await AsyncStorage.setItem('userRole', role);

      if (role === 'admin') {
        navigation.reset({ index: 0, routes: [{ name: 'AdminDashboard' }] });
      } else if (role === 'doctor') {
        navigation.reset({ index: 0, routes: [{ name: 'DoctorDashboard' }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
      }
    } catch {
      navigation.reset({ index: 0, routes: [{ name: 'HomeScreen' }] });
    }
  };

  const showSuccessAndNavigate = async () => {
    setShowSuccess(true);
    Animated.sequence([
      Animated.timing(successAnim, { toValue: 1, useNativeDriver: true, duration: 300 }),
      Animated.delay(800),
      Animated.timing(successAnim, { toValue: 0, useNativeDriver: true, duration: 200 }),
    ]).start(async () => {
      setShowSuccess(false);
      await navigateByRole();
    });
  };

  const checkBiometricAuth = async () => {
    const rnBiometrics = new ReactNativeBiometrics();
    try {
      const { available } = await rnBiometrics.isSensorAvailable();
      if (available) {
        const credentials = await Keychain.getGenericPassword({
          authenticationPrompt: { title: 'Authenticate to access SafeHer' },
        });
        if (credentials) {
          try {
            const loginResp = await login(phoneNumber, credentials.password);
            if (loginResp?.data?.token) {
              await AsyncStorage.setItem('jwtToken', loginResp.data.token);
            }
            await showSuccessAndNavigate();
          } catch (error) {
            const errorMessage = error.response?.data?.error || 'Failed to login with biometrics';
            customAlertService.showError('Error', errorMessage);
            if (error.response?.status === 401) {
              navigation.reset({ index: 0, routes: [{ name: 'SignUpLogin' }] });
            }
          }
        } else {
          customAlertService.showInfo('Info', 'Biometric authentication not set up. Please enter your PIN.');
        }
      } else {
        customAlertService.showInfo('Info', 'Biometric authentication not available. Please enter your PIN.');
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      customAlertService.showError('Error', 'Biometric authentication failed. Please enter your PIN.');
    }
  };

  const handleHiddenPinChange = (text) => {
    const digits = text.replace(/\D/g, '').slice(0, 4).split('');
    const newPin = ['', '', '', ''];
    digits.forEach((d, i) => { newPin[i] = d; });
    setPin(newPin);
    if (digits.length === 4) {
      handleSubmitWithPin(digits.join(''));
    }
  };

  const handleSubmitWithPin = async (pinStr) => {
    const enteredPin = pinStr || pin.join('');
    if (enteredPin.length !== 4) {
      customAlertService.showError('Error', 'Please enter a 4-digit PIN');
      return;
    }

    setVerifying(true);
    try {
      const loginResp = await login(phoneNumber, enteredPin);
      if (loginResp?.data?.token) {
        await AsyncStorage.setItem('jwtToken', loginResp.data.token);
      }
      await showSuccessAndNavigate();
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to verify PIN';
      customAlertService.showError('Error', errorMessage);
      if (error.response?.status === 401) {
        navigation.reset({ index: 0, routes: [{ name: 'SignUpLogin' }] });
      }
    } finally {
      setVerifying(false);
    }
  };

  const opacity = successAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const scale = successAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });

  const pinValue = pin.join('');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9F5FF" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.logoSection}>
            <Image
              source={require('../../assets/safeher_logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>SafeHer</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Enter your PIN</Text>
          <Text style={styles.subtitle}>Secure access to your account</Text>

          <TouchableOpacity
            style={styles.pinDotsRow}
            onPress={() => hiddenInputRef.current?.focus()}
            activeOpacity={1}
          >
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.pinDot,
                  pin[i] ? styles.pinDotFilled : null,
                  isFocused && i === pinValue.length ? styles.pinDotActive : null,
                ]}
              >
                {pin[i] ? <Text style={styles.pinDotText}>•</Text> : null}
              </View>
            ))}
            <TextInput
              ref={hiddenInputRef}
              value={pinValue}
              onChangeText={handleHiddenPinChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              editable={!verifying}
              style={styles.hiddenInput}
              autoFocus={false}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, verifying && styles.submitButtonDisabled]}
            onPress={() => handleSubmitWithPin()}
            disabled={verifying}
          >
            <Text style={styles.buttonText}>{verifying ? 'Verifying...' : 'Continue'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.biometricButton} onPress={checkBiometricAuth} disabled={verifying}>
            <Text style={styles.biometricText}>Use Biometrics instead</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {showSuccess && (
        <Animated.View style={[styles.successOverlay, { opacity }]} pointerEvents="none">
          <Animated.View style={[styles.successContent, { transform: [{ scale }] }]}>
            <View style={styles.successIcon}>
              <Text style={styles.successCheckmark}>✓</Text>
            </View>
            <Text style={styles.successText}>Welcome back</Text>
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9F5FF' },
  container: { flex: 1, paddingHorizontal: 24 },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSection: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 44, height: 44, marginRight: 10 },
  logoText: { fontSize: 26, fontWeight: '700', color: '#4B1C46' },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#6B7280', marginBottom: 36 },
  pinDotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 36,
    position: 'relative',
    minHeight: 56,
    paddingHorizontal: 24,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinDotActive: { borderColor: '#9C7BB8' },
  pinDotFilled: {
    borderColor: '#9C7BB8',
    backgroundColor: '#9C7BB8',
  },
  pinDotText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  hiddenInput: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0,
    fontSize: 1,
  },
  submitButton: {
    backgroundColor: '#4B1C46',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  biometricButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  biometricText: { color: '#9C7BB8', fontSize: 15, fontWeight: '600' },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  successContent: { alignItems: 'center' },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successCheckmark: { fontSize: 36, color: '#fff', fontWeight: '700' },
  successText: { fontSize: 20, fontWeight: '600', color: '#1a1a1a' },
});

export default PinLoginScreen;