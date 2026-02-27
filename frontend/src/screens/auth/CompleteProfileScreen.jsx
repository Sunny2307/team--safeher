import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { saveName } from '../../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import customAlertService from '../../services/customAlertService';

const CompleteProfileScreen = () => {
  const [name, setName] = useState('');
  const navigation = useNavigation();

  const handleContinue = async () => {
    if (!name.trim()) {
      customAlertService.showError('Error', 'Please enter your name');
      return;
    }

    try {
      await saveName(name);
      await AsyncStorage.setItem('isSetupComplete', 'true'); // ✅ Save setup complete
      customAlertService.showSuccess('Success', 'Profile Completed: Welcome, ' + name);
      navigation.reset({
        index: 0,
        routes: [{ name: 'HomeScreen' }],
      });
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to save name';
      customAlertService.showError('Error', errorMessage);
      if (error.response?.status === 401) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'SignUpLogin' }],
        });
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoSection}>
          {/* <Image
            source={require('../../assets/safeher_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          /> */}
          <Text style={styles.logoText}>SafeHer</Text>
        </View>
      </View>

      <Text style={styles.title}>Enter your name</Text>

      <TextInput
        style={styles.input}
        placeholder="Your Name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={handleContinue}
      />

      <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue</Text>
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
  logo: {
    width: 60,
    height: 60,
    marginRight: 15,
    marginTop: -30,
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
    marginBottom: 32,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 24,
    color: '#333',
  },
  continueButton: {
    backgroundColor: '#4B1C46',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CompleteProfileScreen;