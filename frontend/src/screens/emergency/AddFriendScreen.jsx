import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  PermissionsAndroid,
  Platform,
  ScrollView,
  LinearGradient,
} from 'react-native';
import CheckBox from '@react-native-community/checkbox';
import Icon from 'react-native-vector-icons/Ionicons';
import Contacts from 'react-native-contacts';
import { addFriend } from '../../api/api';

const AddFriendScreen = ({ navigation }) => {
  const [countryCode, setCountryCode] = useState('IN');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [friendName, setFriendName] = useState('');
  const [isSOS, setIsSOS] = useState(true);

  const handlePhoneNumberChange = (text) => {
    const sanitizedNumber = text.replace(/[^0-9]/g, '');
    setPhoneNumber(sanitizedNumber);
  };

  const handleFriendNameChange = (text) => {
    const sanitizedName = text.replace(/[^a-zA-Z\s-]/g, '');
    setFriendName(sanitizedName);
  };

  const handleAddContact = async () => {
    const trimmedPhoneNumber = phoneNumber.trim();
    const trimmedFriendName = friendName.trim();
    const fullPhoneNumber = `+91${trimmedPhoneNumber}`;

    if (trimmedPhoneNumber.length !== 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit phone number.');
      return;
    }

    if (!trimmedFriendName || trimmedFriendName.length < 2) {
      Alert.alert('Invalid Name', 'Please enter a valid friend name (at least 2 characters, letters, spaces, or hyphens only).');
      return;
    }

    const payload = { phoneNumber: trimmedPhoneNumber, isSOS, name: trimmedFriendName };
    try {
      await addFriend(trimmedPhoneNumber, isSOS, trimmedFriendName);
      Alert.alert('Success', 'Friend added successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setPhoneNumber('');
            setFriendName('');
            setIsSOS(true);
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.error('Add Friend Error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        requestData: payload,
      });
      let errorMessage = error.response?.data?.error || 'Failed to add friend. Please try again.';
      if (error.response?.status === 404) {
        errorMessage = 'Friend add endpoint not found. Please ensure the server is running and the /user/addFriend route is implemented.';
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Network error. Please check your internet connection and ensure the server is reachable.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.error || 'Invalid request. Please check the name and phone number.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later or contact support.';
      }
      Alert.alert('Error', errorMessage);
    }
  };

  const requestContactsPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts Permission',
            message: 'SafeHer needs access to your contacts to select a friend.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Permission Error:', err);
        return false;
      }
    } else {
      return true;
    }
  };

  const handleContactSelection = async () => {
    const hasPermission = await requestContactsPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Contacts permission is required to select a friend.');
      return;
    }

    try {
      // Navigate to contact selection screen
      navigation.navigate('ContactSelection', {
        onContactSelect: (contact) => {
          console.log('Contact received in AddFriendScreen:', contact);
          selectContact(contact);
        }
      });
    } catch (error) {
      console.error('Contact Selection Error:', error);
      Alert.alert('Error', 'Unable to access contacts. Please try again.');
    }
  };

  const selectContact = (contact) => {
    try {
      console.log('Processing selected contact:', contact.displayName);
      console.log('Contact phone numbers:', contact.phoneNumbers);

      if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
        let number = contact.phoneNumbers[0].number.replace(/[^0-9]/g, '');

        // Handle different number formats
        if (number.startsWith('91') && number.length === 12) {
          number = number.slice(2); // Remove country code
        } else if (number.startsWith('+91') && number.length === 13) {
          number = number.slice(3); // Remove +91
        } else if (number.startsWith('0') && number.length === 11) {
          number = number.slice(1); // Remove leading 0
        }

        console.log('Original number:', contact.phoneNumbers[0].number);
        console.log('Processed number:', number);

        if (number.length === 10) {
          setPhoneNumber(number);
          const contactName = contact.displayName || '';
          const sanitizedName = contactName.replace(/[^a-zA-Z\s-]/g, '');
          setFriendName(sanitizedName);
          console.log('Contact details filled successfully:');
          console.log('- Name:', sanitizedName);
          console.log('- Phone:', number);
          Alert.alert('Contact Selected', `${sanitizedName || 'Contact'} has been selected. You can now click "Add Friend".`);
        } else {
          Alert.alert('Invalid Number', `The selected number "${contact.phoneNumbers[0].number}" is not a valid 10-digit Indian number.`);
        }
      } else {
        Alert.alert('No Phone Number', 'Selected contact does not have a phone number.');
      }
    } catch (error) {
      console.error('Contact Processing Error:', error);
      Alert.alert('Error', 'Unable to process selected contact.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back-outline" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.logoSection}>
          <Text style={styles.logoText}>SafeHer</Text>
        </View>
        <View style={styles.iconContainer}>
          <Icon name="person-outline" size={24} color="#000" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.iconWrapper}>
            <Icon name="people-outline" size={40} color="#FF69B4" />
          </View>
          <Text style={styles.title}>Add a Friend</Text>
          <Text style={styles.subtitle}>Connect with trusted contacts for safety and support</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Phone Number Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={styles.phoneInputContainer}>
              <View style={styles.countryCodeContainer}>
                <Text style={styles.countryCodeEmoji}>🇮🇳</Text>
                <Text style={styles.countryCode}>+91</Text>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Enter 10-digit number"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={phoneNumber}
                  onChangeText={handlePhoneNumberChange}
                  maxLength={10}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={handleContactSelection} style={styles.contactButton}>
                  <Icon name="person-add-outline" size={20} color="#FF69B4" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Friend's Name</Text>
            <View style={styles.inputWrapper}>
              <Icon name="person-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.nameInput}
                placeholder="Enter friend's name"
                placeholderTextColor="#999"
                value={friendName}
                onChangeText={handleFriendNameChange}
                autoCorrect={false}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* SOS Toggle */}
          <View style={styles.sosToggleContainer}>
            <View style={styles.sosToggleContent}>
              <View style={styles.sosIconWrapper}>
                <Icon name="shield-checkmark-outline" size={24} color="#FF69B4" />
              </View>
              <View style={styles.sosTextContainer}>
                <Text style={styles.sosTitle}>SOS Contact</Text>
                <Text style={styles.sosDescription}>Receive emergency alerts</Text>
              </View>
            </View>
            <CheckBox
              value={isSOS}
              onValueChange={setIsSOS}
              tintColors={{ true: '#FF69B4', false: '#ddd' }}
              style={styles.checkbox}
            />
          </View>
        </View>

        {/* Info Cards */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Icon name="people-outline" size={24} color="#FF69B4" />
              <Text style={styles.infoCardTitle}>Friend</Text>
            </View>
            <Text style={styles.infoCardText}>
              Receives your live location when you use the Track Me feature
            </Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Icon name="shield-checkmark-outline" size={24} color="#FF69B4" />
              <Text style={styles.infoCardTitle}>SOS Contact</Text>
            </View>
            <Text style={styles.infoCardText}>
              Receives emergency alerts and notifications during critical situations
            </Text>
          </View>
        </View>

        {/* Add Button */}
        <TouchableOpacity
          style={[
            styles.addButton,
            (phoneNumber?.length !== 10 || friendName.trim().length < 2) && styles.disabledButton,
          ]}
          disabled={phoneNumber?.length !== 10 || friendName.trim().length < 2}
          onPress={handleAddContact}
        >
          <Icon name="add-circle-outline" size={24} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.addButtonText}>Add Friend</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F5FF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: Platform.OS === 'android' ? 35 : 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F9F5FF',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF69B4',
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    color: '#666',
    lineHeight: 16,
  },

  // Form Section
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F5FF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
  },
  countryCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: '#E8E8E8',
  },
  countryCodeEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  countryCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingVertical: 0,
  },
  contactButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginLeft: 6,
  },
  nameInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingVertical: 0,
    marginLeft: 6,
  },
  inputIcon: {
    marginRight: 6,
  },

  // SOS Toggle
  sosToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9F5FF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
  },
  sosToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sosIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sosTextContainer: {
    flex: 1,
  },
  sosTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 1,
  },
  sosDescription: {
    fontSize: 11,
    color: '#666',
  },
  checkbox: {
    transform: [{ scale: 1.0 }],
  },

  // Info Section
  infoSection: {
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF69B4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
  },
  infoCardText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },

  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF69B4',
    paddingVertical: 12,
    borderRadius: 18,
    marginTop: 6,
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#ccc',
    shadowOpacity: 0.1,
  },
  buttonIcon: {
    marginRight: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default AddFriendScreen;