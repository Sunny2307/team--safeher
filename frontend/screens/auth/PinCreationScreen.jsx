import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { register, savePin } from '../../api/api';
import customAlertService from '../../services/customAlertService';

const PinCreationScreen = () => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [confirmFocusedIndex, setConfirmFocusedIndex] = useState(null);
  const pinInputRefs = useRef([]);
  const confirmPinInputRefs = useRef([]);
  const navigation = useNavigation();
  const route = useRoute();
  const { phoneNumber } = route.params;

  const handlePinChange = (text, index) => {
    const newPin = [...pin];
    newPin[index] = text.replace(/[^0-9]/g, '');
    setPin(newPin);
    if (text && index < 3) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  const handleConfirmPinChange = (text, index) => {
    const newConfirmPin = [...confirmPin];
    newConfirmPin[index] = text.replace(/[^0-9]/g, '');
    setConfirmPin(newConfirmPin);
    if (text && index < 3) {
      confirmPinInputRefs.current[index + 1]?.focus();
    }
  };

  const toggleShowPin = () => {
    setShowPin(!showPin);
  };

  const enableBiometricAuth = async (enteredPin) => {
    const rnBiometrics = new ReactNativeBiometrics();
    try {
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();
      let biometricLabel = '';
      if (available) {
        if (biometryType === BiometryTypes.TouchID) {
          biometricLabel = 'Touch ID';
        } else if (biometryType === BiometryTypes.FaceID) {
          biometricLabel = 'Face ID';
        } else if (biometryType === BiometryTypes.Biometrics) {
          biometricLabel = 'Biometrics';
        }
        customAlertService.showConfirm(
          `${biometricLabel} Authentication`,
          `Would you like to enable ${biometricLabel} authentication for future logins?`,
          async () => {
            await Keychain.setGenericPassword('userPin', enteredPin, {
              accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
              accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
            });
            customAlertService.showSuccess('Success', `${biometricLabel} authentication enabled!`);
            navigation.navigate('CompleteProfileScreen', { phoneNumber });
          },
          async () => {
            await Keychain.setGenericPassword('userPin', enteredPin);
            navigation.navigate('CompleteProfileScreen', { phoneNumber });
          }
        );
      } else {
        await Keychain.setGenericPassword('userPin', enteredPin);
        customAlertService.showInfo('Info', 'Biometric authentication not supported.');
        navigation.navigate('CompleteProfileScreen', { phoneNumber });
      }
    } catch (error) {
      console.error('Error enabling biometrics:', error);
      customAlertService.showError('Error', 'Failed to enable biometrics. Proceeding without it.');
      await Keychain.setGenericPassword('userPin', enteredPin);
      navigation.navigate('CompleteProfileScreen', { phoneNumber });
    }
  };

  const handleSubmit = async () => {
    const enteredPin = pin.join('');
    const enteredConfirmPin = confirmPin.join('');

    if (enteredPin.length !== 4 || enteredConfirmPin.length !== 4) {
      customAlertService.showError('Error', 'Please enter a 4-digit PIN in both fields');
      return;
    }
    if (enteredPin !== enteredConfirmPin) {
      customAlertService.showError('Error', 'PINs do not match. Please try again.');
      return;
    }

    try {
      const registerResponse = await register(phoneNumber, enteredPin);
      const { token } = registerResponse.data;
      console.log('Generated token:', token); // Debug: Log the token
      await AsyncStorage.setItem('jwtToken', token);
      const savedToken = await AsyncStorage.getItem('jwtToken');
      console.log('Saved token:', savedToken); // Debug: Confirm token was saved

      await savePin(enteredPin, enteredPin);

      await AsyncStorage.setItem('isSetupComplete', 'true');

      customAlertService.showSuccess('Success', 'PIN created and user registered successfully');
      await enableBiometricAuth(enteredPin);
    } catch (error) {
      console.error('Error saving PIN or registering:', {
        message: error.message,
        response: error.response
          ? {
            status: error.response.status,
            data: error.response.data,
          }
          : 'No response received',
      });
      const errorMessage = error.response?.data?.error || 'Failed to save PIN';
      customAlertService.showError('Error', errorMessage);
      if (error.response?.status === 401) {
        navigation.navigate('SignUpLogin');
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoSection}>
          <Text style={styles.logoText}>SafeHer</Text>
        </View>
      </View>
      <Text style={styles.title}>Create a New PIN</Text>
      <Text style={styles.subtitle}>
        Please create a 4-digit PIN to access your account
      </Text>
      <Text style={styles.sectionTitle}>Enter PIN</Text>
      <View style={styles.inputSection}>
        <View style={styles.pinContainer}>
          {pin.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (pinInputRefs.current[index] = ref)}
              style={[
                styles.pinInput,
                focusedIndex === index && styles.pinInputActive
              ]}
              value={digit}
              onChangeText={(text) => handlePinChange(text, index)}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(null)}
              keyboardType="numeric"
              maxLength={1}
              textAlign="center"
              secureTextEntry={!showPin}
              returnKeyType={index < 3 ? 'next' : 'done'}
              onSubmitEditing={() => {
                if (index < 3) pinInputRefs.current[index + 1]?.focus();
              }}
              blurOnSubmit={false}
            />
          ))}
        </View>
        <TouchableOpacity onPress={toggleShowPin}>
          <Icon name={showPin ? 'visibility' : 'visibility-off'} size={24} color="#4B1C46" />
        </TouchableOpacity>
      </View>
      <Text style={styles.sectionTitle}>Confirm PIN</Text>
      <View style={styles.inputSection}>
        <View style={styles.pinContainer}>
          {confirmPin.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (confirmPinInputRefs.current[index] = ref)}
              style={[
                styles.pinInput,
                confirmFocusedIndex === index && styles.pinInputActive
              ]}
              value={digit}
              onChangeText={(text) => handleConfirmPinChange(text, index)}
              onFocus={() => setConfirmFocusedIndex(index)}
              onBlur={() => setConfirmFocusedIndex(null)}
              keyboardType="numeric"
              maxLength={1}
              textAlign="center"
              secureTextEntry={!showPin}
              returnKeyType={index < 3 ? 'next' : 'done'}
              onSubmitEditing={() => {
                if (index < 3) confirmPinInputRefs.current[index + 1]?.focus();
              }}
              blurOnSubmit={false}
            />
          ))}
        </View>
      </View>
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    backgroundColor: '#fff',
    justifyContent: 'flex-start',
  },
  header: {
    marginBottom: 25,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 35,
    fontWeight: 'bold',
    color: '#FF69B4',
    marginTop: -30,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  inputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '70%',
  },
  pinInput: {
    width: 56,
    height: 56,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    fontSize: 24,
    textAlign: 'center',
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  pinInputActive: {
    borderColor: '#FF69B4',
    borderWidth: 2,
    backgroundColor: '#fff',
  },
  submitButton: {
    backgroundColor: '#4B1C46',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PinCreationScreen;
