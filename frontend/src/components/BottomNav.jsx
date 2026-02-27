import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert, NativeModules, Linking, PermissionsAndroid } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import RNImmediatePhoneCall from 'react-native-immediate-phone-call';
import { NativeEventEmitter } from 'react-native';
import BluetoothDangerListener from './BluetoothDangerListener';
import { bluetoothService } from '../services/BluetoothService';
import { getFriends } from '../api/api';

const BottomNav = ({ location }) => {
  const navigation = useNavigation();
  const [emergencyContact, setEmergencyContact] = useState('1091'); // Fallback number
  const [friends, setFriends] = useState([]);
  const { PowerButton, SMSModule } = NativeModules;

  // Function to fetch friends and set the first SOS contact
  const fetchEmergencyContact = async () => {
    try {
      const response = await getFriends();
      const friendsList = Array.isArray(response.data.friends) ? response.data.friends : [];
      setFriends(friendsList);

      // Find the first friend marked as SOS contact
      const sosContact = friendsList.find(friend => friend.isSOS === true);
      if (sosContact) {
        setEmergencyContact(sosContact.phoneNumber);
        console.log('SOS Contact set to:', sosContact.phoneNumber, 'Name:', sosContact.name);
      } else {
        console.log('No SOS contacts found, using fallback number');
        // Keep the fallback number if no SOS contacts are found
      }
    } catch (error) {
      console.error('Error fetching emergency contacts:', error);
      // Keep the fallback number if there's an error
    }
  };

  const requestCallPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CALL_PHONE,
          {
            title: 'Emergency Call Permission',
            message: 'SafeHer needs permission to make an emergency call.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        console.log('Call Permission Status:', granted);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Call Permission Error:', err);
        return false;
      }
    }
    return true;
  };

  const requestSMSPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const checkResult = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.SEND_SMS);
        console.log('SEND_SMS Permission Check:', checkResult);
        if (checkResult) {
          return true;
        }

        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.SEND_SMS,
          {
            title: 'SMS Permission',
            message: 'SafeHer needs permission to send an SMS with your location.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        console.log('SEND_SMS Permission Request Result:', granted);
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          return true;
        } else {
          Alert.alert(
            'SMS Permission Required',
            'Please enable SMS permission in Settings > Apps > SafeHer > Permissions to send your location.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ],
          );
          return false;
        }
      } catch (err) {
        console.warn('SMS Permission Error:', err);
        return false;
      }
    }
    return true;
  };

  const handleEmergencyCall = async () => {
    const hasCallPermission = await requestCallPermission();
    if (!hasCallPermission) {
      Alert.alert('Permission Denied', 'Phone call permission is required for the SOS feature.');
      return;
    }

    const hasSMSPermission = await requestSMSPermission();
    if (!hasSMSPermission) {
      Alert.alert('Permission Denied', 'SMS permission is required to send your location.');
      return;
    }

    if (!location) {
      Alert.alert('Location Unavailable', 'Please wait until your location is fetched.');
      return;
    }

    const mapUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    const message = `Emergency: I need help! My location: ${mapUrl}`;

    if (Platform.OS === 'android' && SMSModule && typeof SMSModule.sendSMS === 'function') {
      try {
        console.log('Attempting to send SMS to:', emergencyContact);
        console.log('SMSModule Available:', !!SMSModule, 'Send Function:', typeof SMSModule.sendSMS);
        SMSModule.sendSMS(
          emergencyContact,
          message,
          (success) => {
            console.log('SMSModule Success:', success);
          },
          (error) => {
            console.error('SMSModule Error:', error);
            Alert.alert('Error', 'Failed to send SMS: ' + error);
          }
        );
      } catch (error) {
        console.error('SMSModule Sending Error:', error);
        Alert.alert('Error', 'Failed to send SMS. Falling back to SMS app.');
        const smsUrl = `sms:${emergencyContact}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(message)}`;
        try {
          const supported = await Linking.canOpenURL(smsUrl);
          if (supported) {
            await Linking.openURL(smsUrl);
          } else {
            Alert.alert('Error', 'SMS is not supported on this device.');
          }
        } catch (err) {
          console.error('SMS App Error:', err);
          Alert.alert('Error', 'Failed to open SMS app.');
        }
      }
    } else {
      console.warn('SMSModule unavailable (SMSModule:', !!SMSModule, 'Platform:', Platform.OS, ')');
      const smsUrl = `sms:${emergencyContact}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(message)}`;
      try {
        const supported = await Linking.canOpenURL(smsUrl);
        if (supported) {
          await Linking.openURL(smsUrl);
        } else {
          Alert.alert('Error', 'SMS is not supported on this device.');
        }
      } catch (error) {
        console.error('SMS App Error:', error);
        Alert.alert('Error', 'Failed to open SMS app.');
      }
    }

    try {
      if (RNImmediatePhoneCall && typeof RNImmediatePhoneCall.immediatePhoneCall === 'function') {
        console.log('Attempting direct call with RNImmediatePhoneCall to:', emergencyContact);
        RNImmediatePhoneCall.immediatePhoneCall(emergencyContact);
      } else {
        console.warn('RNImmediatePhoneCall is unavailable, falling back to Linking');
        const url = `tel:${emergencyContact}`;
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Phone call is not supported on this device.');
        }
      }
    } catch (error) {
      console.error('Direct Call Error:', error);
      Alert.alert('Error', 'Failed to initiate emergency call. Please try again.');
    }
  };

  useEffect(() => {
    // Fetch emergency contacts when component mounts
    fetchEmergencyContact();
  }, []);

  useEffect(() => {
    let subscription = null;
    console.log('Available Native Modules:', Object.keys(NativeModules));
    console.log('PowerButton Module:', PowerButton);
    if (Platform.OS === 'android' && PowerButton) {
      if (typeof PowerButton.testModule === 'function') {
        console.log('Calling PowerButton.testModule');
        PowerButton.testModule();
      } else {
        console.warn('PowerButton.testModule is not available');
      }
      try {
        const eventEmitter = new NativeEventEmitter(PowerButton);
        subscription = eventEmitter.addListener('PowerButtonDoublePress', () => {
          console.log('Power button double-pressed, initiating emergency call');
          handleEmergencyCall();
        });
        console.log('PowerButton listener registered successfully');
      } catch (error) {
        console.warn('Failed to register PowerButton listener:', error);
      }
    } else {
      console.log('PowerButton module is not supported on this platform or PowerButton is undefined');
    }

    return () => {
      if (subscription) {
        console.log('Removing PowerButton listener');
        subscription.remove();
      }
    };
  }, [handleEmergencyCall]);

  const handleBottomNav = (label) => {
    if (label === 'Record') {
      navigation.navigate('RecordScreen');
    } else if (label === 'Track Me') {
      navigation.navigate('HomeScreen');
    } else if (label === 'Fake Call') {
      navigation.navigate('FakeCallScreen');
    } else if (label === 'Help') {
      navigation.navigate('HelplineScreen');
    } else if (label === 'SOS') {
      handleEmergencyCall();
    } else {
      Alert.alert('Info', `${label} feature coming soon!`);
    }
  };

  return (
    <>
      <View style={styles.bottomNav}>
        {[
          ['location-outline', 'Track Me'],
          ['mic-outline', 'Record'],
          ['warning-outline', 'SOS', true],
          ['call-outline', 'Fake Call'],
          ['help-circle-outline', 'Help'],
        ].map(([icon, label, isSos], index) => {
          if (isSos) {
            return (
              <View key={index} style={styles.sosContainer}>
                <TouchableOpacity
                  style={styles.sosButton}
                  activeOpacity={0.9}
                  onPress={() => handleBottomNav(label)}
                >
                  <Icon name={icon} size={28} color="#fff" />
                </TouchableOpacity>
              </View>
            );
          }
          return (
            <TouchableOpacity
              key={index}
              style={styles.navItem}
              activeOpacity={0.7}
              onPress={() => handleBottomNav(label)}
            >
              <Icon name={icon} size={24} color="#666" />
              <Text style={styles.navText}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <BluetoothDangerListener onDanger={handleEmergencyCall} />
    </>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navText: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    color: '#666',
    marginTop: 4
  },
  sosContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosButton: {
    backgroundColor: '#FF4B5C',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    top: -15,
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#FF4B5C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
});

export default BottomNav;