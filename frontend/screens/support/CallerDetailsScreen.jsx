import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, Animated, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const CallerDetailsScreen = () => {
  const navigation = useNavigation();
  const [callerName, setCallerName] = useState('');
  const [callerNumber, setCallerNumber] = useState('');
  const [selectedTime, setSelectedTime] = useState('5 sec');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  // Single preset avatar - no selection needed
  const defaultAvatar = 'https://i.pravatar.cc/150?img=1';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSave = () => {
    console.log('=== CALLER DETAILS SCREEN DEBUG ===');
    console.log('Input values:', { callerName, callerNumber });
    console.log('Trimmed values:', {
      callerName: callerName.trim(),
      callerNumber: callerNumber.trim()
    });

    if (!callerName.trim() || !callerNumber.trim()) {
      alert('Please fill in both name and number');
      return;
    }

    const params = {
      callerName: callerName.trim(),
      callerNumber: callerNumber.trim(),
      callerImage: defaultAvatar
    };

    console.log('=== NAVIGATING TO FAKE CALL SCREEN ===');
    console.log('Params being passed:', params);
    console.log('Default avatar:', defaultAvatar);

    // Use navigate instead of replace to ensure we return to the existing screen
    // merge: true ensures params are updated on the existing screen
    navigation.navigate({
      name: 'FakeCallScreen',
      params: params,
      merge: true,
    });
  };


  const timerOptions = ['5 sec', '10 sec', '1 min', '5 min'];

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Icon name="arrow-back" size={28} color="#FF69B4" />
      </TouchableOpacity>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Caller Details</Text>
            <Text style={styles.subtitle}>Set up a realistic fake caller for emergency situations</Text>
          </View>

          {/* Avatar Display */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Caller Image</Text>

            {/* Avatar Preview */}
            <View style={styles.avatarPreviewCard}>
              <View style={styles.avatarPreviewContainer}>
                <Image
                  source={{ uri: defaultAvatar }}
                  style={styles.selectedAvatar}
                  onError={(error) => {
                    console.log('Avatar load error:', error);
                  }}
                  onLoad={() => {
                    console.log('Avatar loaded successfully');
                  }}
                />
                <View style={styles.avatarBorder} />
              </View>
              <Text style={styles.avatarPreviewText}>Default Avatar</Text>
            </View>
          </View>

          {/* Caller Information */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Caller Information</Text>
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Icon name="person-outline" size={18} color="#FF69B4" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter caller name"
                  placeholderTextColor="#999"
                  value={callerName}
                  onChangeText={setCallerName}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.inputWrapper}>
                <Icon name="call-outline" size={18} color="#FF69B4" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone number"
                  placeholderTextColor="#999"
                  value={callerNumber}
                  onChangeText={setCallerNumber}
                  keyboardType="phone-pad"
                  maxLength={15}
                />
              </View>
            </View>
          </View>

          {/* Timer Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Call Duration</Text>
            <View style={styles.timerContainer}>
              {timerOptions.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timerButton,
                    selectedTime === time && styles.timerButtonSelected
                  ]}
                  onPress={() => {
                    console.log('Selected time:', time);
                    setSelectedTime(time);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={selectedTime === time ? styles.timerTextSelected : styles.timerText}
                  >
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Icon name="checkmark" size={20} color="#FFF" />
          <Text style={styles.saveButtonText}>Save & Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
    padding: 8,
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    borderRadius: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 20,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2A2A2A',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#5A5A5A',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A2A2A',
    marginBottom: 12,
  },
  avatarPreviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 105, 180, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarPreviewContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  selectedAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FF69B4',
  },
  avatarBorder: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 46,
    borderWidth: 2,
    borderColor: 'rgba(255, 105, 180, 0.3)',
  },
  avatarPreviewText: {
    fontSize: 14,
    color: '#5A5A5A',
    fontWeight: '600',
  },
  inputContainer: {
    gap: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 105, 180, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2A2A2A',
    fontWeight: '500',
  },
  timerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timerButton: {
    flexBasis: '48%',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 105, 180, 0.2)',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  timerButtonSelected: {
    backgroundColor: '#FF69B4',
    borderColor: '#FF69B4',
  },
  timerText: {
    fontSize: 16,
    color: '#5A5A5A',
    fontWeight: '500',
  },
  timerTextSelected: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 20,
  },
  saveButton: {
    backgroundColor: '#FF69B4',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default CallerDetailsScreen;