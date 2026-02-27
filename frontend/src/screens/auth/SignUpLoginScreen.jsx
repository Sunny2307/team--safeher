import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, Image, StatusBar, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { checkUser, sendOTP } from '../../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import customAlertService from '../../services/customAlertService';

const withTimeout = (promise, timeoutMs) => {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]);
};

const SignUpLoginScreen = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();

  const handleContinue = async () => {
    if (isLoading) return;

    setIsLoading(true);

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      if (Platform.OS === 'android') {
        console.log('Error: Please enter a valid mobile number');
      } else {
        customAlertService.showError('Error', 'Please enter a valid mobile number');
      }
      setIsLoading(false);
      return;
    }

    const cleanedPhoneNumber = phoneNumber.replace(/\D/g, '');
    if (cleanedPhoneNumber.length !== 10) {
      if (Platform.OS === 'android') {
        console.log('Error: Please enter a valid 10-digit mobile number');
      } else {
        customAlertService.showError('Error', 'Please enter a valid 10-digit mobile number');
      }
      setIsLoading(false);
      return;
    }

    try {
      console.log('Checking user:', cleanedPhoneNumber);
      const response = await withTimeout(checkUser(cleanedPhoneNumber), 10000);
      console.log('API response:', response);
      const { exists } = response.data;

      if (exists) {
        // User exists, navigate to PIN login
        console.log('Navigating to PinLoginScreen');
        navigation.navigate('PinLoginScreen', { phoneNumber: cleanedPhoneNumber });
      } else {
        console.log('Sending OTP via Twilio', {
          endpoint: '/api/send-otp',
          phone: cleanedPhoneNumber,
        });
        const otpResponse = await withTimeout(sendOTP(cleanedPhoneNumber), 10000);
        console.log('OTP sent successfully:', {
          status: otpResponse?.status,
          data: otpResponse?.data,
        });
        navigation.navigate('OTPScreen', {
          phoneNumber: cleanedPhoneNumber,
          sessionId: otpResponse.data.sessionId,
        });
        console.log('Navigation to OTPScreen triggered');
      }
    } catch (error) {
      try {
        const payload = {
          message: error?.message,
          name: error?.name,
          stackTop: typeof error?.stack === 'string' ? error.stack.split('\n')[0] : undefined,
          response: error?.response
            ? {
              status: error.response.status,
              statusText: error.response.statusText,
              data: error.response.data,
              headers: error.response.headers,
            }
            : 'No response received',
          config: error?.config
            ? {
              url: error.config.url,
              method: error.config.method,
              baseURL: error.config.baseURL,
              headers: error.config.headers,
              timeout: error.config.timeout,
            }
            : undefined,
        };
        console.error('Error checking user or sending OTP:', JSON.stringify(payload));
      } catch (logErr) {
        console.error('Error logging failure payload:', logErr);
      }
      const errorMessage = error.response?.data?.error || error.message || 'Failed to process request';
      if (Platform.OS === 'android') {
        console.log('Error:', errorMessage);
      } else {
        customAlertService.showError('Error', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <Image
              source={require('../../assets/safeher_logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>SafeHer</Text>
          </View>
        </View>

        <Text style={styles.title}>Sign Up / Log in</Text>

        <Text style={styles.label}>Enter your mobile number</Text>
        <View style={styles.inputContainer}>
          <View style={styles.countryCodeContainer}>
            <Text style={styles.countryCode}>+91</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Enter Mobile Number"
            placeholderTextColor="#888"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            returnKeyType="go"
            onSubmitEditing={handleContinue}
          />
        </View>

        <TouchableOpacity
          style={[styles.continueButton, isLoading && styles.disabledButton]}
          onPress={handleContinue}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>{isLoading ? 'Processing...' : 'Continue'}</Text>
        </TouchableOpacity>

        {/* Google login removed */}

        <Text style={styles.termsText}>
          By continuing, you agree that you have read and accepted our{' '}
          <Text style={styles.linkText} onPress={() => navigation.navigate('TermsAndConditions')}>
            T&Cs
          </Text>{' '}
          and{' '}
          <Text style={styles.linkText} onPress={() => navigation.navigate('PrivacyPolicy')}>
            Privacy Policy
          </Text>
        </Text>
        <Text style={styles.copyrightText}>
          © 2026 SafeHer. All rights reserved.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? 20 : 0,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 25,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 45,
    height: 45,
    marginRight: 10,
  },
  logoText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FF69B4',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 25,
    textAlign: 'center',
    color: '#111',
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    marginBottom: 25,
    paddingHorizontal: 10,
    backgroundColor: '#f9f9f9',
  },
  countryCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 5,
  },
  countryCode: {
    fontSize: 18,
    color: '#111',
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#111',
  },
  continueButton: {
    backgroundColor: '#4B1C46',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 25,
  },
  disabledButton: {
    backgroundColor: '#a9a9a9',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 25,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#ccc',
  },
  orText: {
    marginHorizontal: 10,
    color: '#333',
    fontSize: 16,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginBottom: 25,
  },
  googleButtonText: {
    fontSize: 18,
    color: '#111',
    fontWeight: '500',
  },
  termsText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    marginTop: 'auto',
    marginBottom: 16,
    lineHeight: 18,
  },
  linkText: {
    color: '#FF69B4',
    fontWeight: 'bold',
  },
  copyrightText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 10,
  },
});

export default SignUpLoginScreen;