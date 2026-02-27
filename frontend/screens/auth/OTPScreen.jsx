import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import * as NavigationNative from '@react-navigation/native';
import { Platform } from 'react-native';
import { sendOTP, verifyOTP } from '../../api/api';
import OTPHeader from '../../components/OTPHeader';
import customAlertService from '../../services/customAlertService';
// Optional SMS Retriever (auto-read OTP on Android without SMS permission)
let SmsRetriever = null;
const ENABLE_SMS_RETRIEVER = false; // Temporarily disabled to avoid Metro dynamic require issues

const { width } = Dimensions.get('window');
const OTPScreen = () => {
  // Minimal import diagnostics
  useEffect(() => {
    console.log('OTPScreen API import types:', {
      sendOTP: typeof sendOTP,
      verifyOTP: typeof verifyOTP,
    });
  }, []);
  const navigation = NavigationNative.useNavigation();
  const route = NavigationNative.useRoute();
  const { phoneNumber, sessionId } = route.params;
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [focusedIndex, setFocusedIndex] = useState(null);
  const inputRefs = useRef([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Using centralized API helpers

  // Simple network call without wrapper to avoid Metro/Hermes issues

  // Validate required params
  useEffect(() => {
    const validPhone = typeof phoneNumber === 'string' && /\d{10}$/.test(phoneNumber);
    if (!validPhone) {
      customAlertService.showError('Error', 'Phone number is missing. Please try again.');
      navigation.goBack();
    }
  }, [phoneNumber]);

  // Start SMS listener to auto-read OTP from incoming message (Android)
  useEffect(() => {
    if (!ENABLE_SMS_RETRIEVER) {
      return undefined;
    }
    let isMounted = true;
    const startSmsListener = async () => {
      // Disabled: dynamic require can trigger Metro unknown module errors when unresolved
      if (Platform.OS === 'android') return;
      if (!SmsRetriever || !SmsRetriever.startSmsRetriever) return;
      try {
        await SmsRetriever.startSmsRetriever();
        const subscription = SmsRetriever.addSmsListener(event => {
          if (!isMounted || !event || !event.message) return;
          // Try to match 6 consecutive digits (common OTP format)
          let match = event.message.match(/\b(\d{6})\b/);
          if (!match) {
            // Fallback: extract all digits and take the first 6
            const allDigits = event.message.replace(/\D/g, '');
            if (allDigits.length >= 6) {
              match = [allDigits, allDigits.slice(0, 6)];
            }
          }
          if (match && match[1]) {
            const code = match[1].split('');
            setOtp(code);
            // Slight delay to let UI update before verifying
            setTimeout(() => {
              console.log('Auto-detected OTP from SMS:', code.join(''));
              handleVerify(code.join(''));
            }, 300);
          }
        });
        // Clean up when unmounting
        return () => {
          isMounted = false;
          try { subscription?.remove && subscription.remove(); } catch { }
          try { SmsRetriever.removeSmsListener && SmsRetriever.removeSmsListener(); } catch { }
        };
      } catch (error) {
        // Silent fail; user can still enter OTP manually
        console.log('SMS Retriever not available or failed to start:', error?.message || error);
      }
    };

    const cleanup = startSmsListener();
    return () => {
      isMounted = false;
      if (typeof cleanup === 'function') cleanup();
    };
  }, []);

  const handleOtpChange = (text, index) => {
    const onlyDigits = (text || '').replace(/\D/g, '');
    if (!onlyDigits) {
      const cleared = [...otp];
      cleared[index] = '';
      setOtp(cleared);
      return;
    }

    const digits = onlyDigits.split('');
    const updated = [...otp];

    // Fill starting at current index, supporting paste/autofill of multiple digits
    let currentIndex = index;
    for (let i = 0; i < digits.length && currentIndex < 6; i += 1) {
      updated[currentIndex] = digits[i];
      currentIndex += 1;
    }

    setOtp(updated);

    // Move focus to the next empty cell or stay at last
    const nextIndex = Math.min(currentIndex, 5);
    if (inputRefs.current[nextIndex]) {
      inputRefs.current[nextIndex].focus();
    }
  };

  const handleFocus = (index) => {
    setFocusedIndex(index);
  };

  const handleBlur = () => {
    setFocusedIndex(null);
  };

  const handleVerify = async (prefilledOtp) => {
    try {
      const raw = prefilledOtp ?? otp.join('');
      const enteredOtp = String(raw).replace(/\D/g, '');
      console.log('Verify pressed. Raw OTP:', raw, 'Sanitized:', enteredOtp, 'sessionId:', currentSessionId, 'phone:', phoneNumber);
      if (enteredOtp.length !== 6) {
        customAlertService.showError('Error', 'Please enter a 6-digit OTP');
        console.log('Verify blocked: OTP length not 6');
        return;
      }

      if (isVerifying) return;
      setIsVerifying(true);
      console.log('Verifying OTP with sessionId:', currentSessionId, 'phone:', phoneNumber);
      console.log('Calling verifyOTP API...', typeof verifyOTP);
      const verifyResponse = await verifyOTP(currentSessionId, enteredOtp, phoneNumber);
      console.log('OTP verified response:', verifyResponse?.status, verifyResponse?.data);
      customAlertService.showSuccess('Success', 'OTP verified successfully!');
      navigation.navigate('PinCreationScreen', { phoneNumber });
    } catch (error) {
      const status = error && error.response && error.response.status;
      const backendMsg = error && error.response && error.response.data && error.response.data.error;
      const message = backendMsg || error?.message || 'Failed to verify OTP';
      console.error('OTP verification error:', { status, message, data: error?.response?.data, error, stack: error?.stack });
      customAlertService.showError('Error', message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    try {
      if (isResending) return;
      setIsResending(true);
      console.log('Resending OTP to phone:', phoneNumber);
      console.log('Calling sendOTP API...', typeof sendOTP);
      const otpResponse = await sendOTP(phoneNumber);
      customAlertService.showSuccess('Success', `OTP resent to +91 ${phoneNumber}`);
      const newSessionId = otpResponse?.data?.sessionId;
      if (newSessionId) {
        console.log('New OTP sent with session ID:', newSessionId);
        setCurrentSessionId(newSessionId);
      } else {
        console.warn('Resend OTP response missing sessionId:', otpResponse?.data);
        customAlertService.showError('Error', 'Resend failed: missing session ID from server');
      }
    } catch (error) {
      const backendMsg = error && error.response && error.response.data && error.response.data.error;
      const message = backendMsg || error?.message || 'Failed to resend OTP';
      console.error('Error resending OTP:', message, error);
      customAlertService.showError('Error', message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <OTPHeader />
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit code received on +91 {phoneNumber}
      </Text>
      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={[
              styles.otpInput,
              focusedIndex === index && styles.otpInputFocused,
            ]}
            value={digit}
            onChangeText={(text) => handleOtpChange(text, index)}
            onFocus={() => handleFocus(index)}
            onBlur={handleBlur}
            keyboardType="numeric"
            maxLength={1}
            textAlign="center"
            returnKeyType={index === 5 ? 'done' : 'next'}
            onSubmitEditing={() => {
              if (index < 5) {
                inputRefs.current[index + 1].focus();
              } else {
                handleVerify();
              }
            }}
          />
        ))}
      </View>
      <TouchableOpacity style={[styles.verifyButton, (isVerifying || otp.join('').replace(/\D/g, '').length !== 6) && { opacity: 0.7 }]} onPress={() => handleVerify()} disabled={isVerifying}>
        <Text style={styles.buttonText}>{isVerifying ? 'Verifying…' : 'Verify'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleResend} disabled={isResending}>
        <Text style={styles.resendText}>{isResending ? 'Resending…' : 'Resend OTP'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#F5F7FA',
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    color: '#2A2A2A',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#5A5A5A',
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  otpInput: {
    width: (width - 60) / 6 - 10,
    height: 50,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    marginHorizontal: 5,
    fontSize: 22,
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
    color: '#2A2A2A',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  otpInputFocused: {
    borderColor: '#FF69B4', // Matching the header's logo color
    borderWidth: 2,
  },
  verifyButton: {
    backgroundColor: '#FF69B4', // Matching the header's logo color
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  resendText: {
    fontSize: 16,
    color: '#FF69B4', // Matching the header's logo color
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontWeight: '500',
    marginVertical: 10,
  },
});

export default OTPScreen;