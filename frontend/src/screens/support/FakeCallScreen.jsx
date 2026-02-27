import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Modal, Animated, Dimensions, StatusBar, Vibration, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../../components/Header';
import BottomNav from '../../components/BottomNav';

const { width, height } = Dimensions.get('window');

const FakeCallScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const [callerName, setCallerName] = useState('Mom');
  const [callerNumber, setCallerNumber] = useState('+91 98765 43210');
  const [callerImage, setCallerImage] = useState('https://i.pravatar.cc/150?img=1');
  const [showNotification, setShowNotification] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [callTimer, setCallTimer] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Force set data from route params
  const setDataFromParams = () => {
    console.log('=== SETTING DATA FROM ROUTE PARAMS ===');
    console.log('Route params:', route.params);

    if (route.params) {
      if (route.params.callerName) {
        console.log('Setting caller name:', route.params.callerName);
        setCallerName(route.params.callerName);
      }
      if (route.params.callerNumber) {
        console.log('Setting caller number:', route.params.callerNumber);
        setCallerNumber(route.params.callerNumber);
      }
      if (route.params.callerImage) {
        console.log('Setting caller image:', route.params.callerImage);
        setCallerImage(route.params.callerImage);
      }
    } else {
      console.log('No route params, keeping default data');
    }
  };

  useEffect(() => {
    console.log('=== FAKE CALL SCREEN MOUNT EFFECT ===');
    console.log('Component mounted with params:', route.params);

    // Set data from route params immediately
    setDataFromParams();

    let isMounted = true;

    try {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.log('Error starting entrance animations:', error);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let timer = null;

    if (isCalling) {
      timer = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isCalling]);

  // Effect to handle route params changes
  useEffect(() => {
    console.log('=== ROUTE PARAMS CHANGED ===');
    console.log('New route params:', route.params);
    setDataFromParams();
  }, [route.params]);

  useEffect(() => {
    console.log('FakeCallScreen - State updated:', { callerName, callerNumber, callerImage });
  }, [callerName, callerNumber, callerImage]);

  // Handle screen focus - when coming back from IncomingCallScreen
  useFocusEffect(
    React.useCallback(() => {
      console.log('=== FAKE CALL SCREEN FOCUS EFFECT ===');
      console.log('Screen focused, checking route params:', route.params);

      // Reload data from route params when screen comes into focus
      setDataFromParams();

      // Force a small delay to ensure data is set
      setTimeout(() => {
        console.log('=== FORCED DATA REFRESH AFTER FOCUS ===');
        setDataFromParams();
      }, 100);
    }, [route.params])
  );

  const handleGetCall = () => {
    console.log('=== GETTING CALL ===');
    console.log('Current caller data:', { callerName, callerNumber, callerImage });

    if (!callerName || !callerNumber) {
      Alert.alert('Missing Details', 'Please set caller details first by clicking "Set Caller Details"');
      return;
    }

    // Haptic feedback for button press (with error handling)
    try {
      Vibration.vibrate(50);
    } catch (error) {
      console.log('Vibration not available:', error);
    }

    setIsCalling(true);
    setCallTimer(0);

    // Start pulse animation safely
    try {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } catch (error) {
      console.log('Error starting pulse animation:', error);
    }

    // Show notification after 2 seconds with haptic feedback
    setTimeout(() => {
      try {
        Vibration.vibrate([0, 500, 200, 500]); // Call incoming pattern
      } catch (error) {
        console.log('Vibration not available:', error);
      }
      setShowNotification(true);
    }, 2000);
  };

  const handleAcceptCall = () => {
    console.log('=== ACCEPTING CALL ===');
    console.log('Current caller data:', { callerName, callerNumber, callerImage, callTimer });

    // Haptic feedback for accepting call
    try {
      Vibration.vibrate(100);
    } catch (error) {
      console.log('Vibration not available:', error);
    }

    setShowNotification(false);
    setIsCalling(false);

    // Ensure we have valid caller data before navigating
    if (!callerName || !callerNumber) {
      Alert.alert('Error', 'Caller details are missing. Please set caller details first.');
      return;
    }

    const params = {
      callerName,
      callerNumber,
      callerImage: callerImage || 'https://via.placeholder.com/150',
      callTimer: callTimer || 0
    };

    console.log('Navigating to IncomingCallScreen with params:', params);

    try {
      navigation.navigate('IncomingCallScreen', params);
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Navigation Error', 'Unable to navigate to call screen. Please try again.');
    }
  };

  const handleDeclineCall = () => {
    // Haptic feedback for declining call
    try {
      Vibration.vibrate(200);
    } catch (error) {
      console.log('Vibration not available:', error);
    }

    setShowNotification(false);
    setIsCalling(false);
    setCallTimer(0);

    // Stop pulse animation safely
    try {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    } catch (error) {
      console.log('Error stopping pulse animation:', error);
    }
  };

  const handleSetCallerDetails = () => {
    navigation.navigate('CallerDetailsScreen');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <Header showBack={false} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <View style={styles.titleContainer}>
          <View style={styles.iconWrapper}>
            <Icon name="call-outline" size={32} color="#FF69B4" />
          </View>
          <Text style={styles.title}>Fake Call</Text>
        </View>

        <Text style={styles.subtitle}>
          Create a realistic fake phone call to help you in emergency situations
        </Text>



        {/* Caller Details Card */}
        <View style={styles.callerDetailsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Caller Information</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleSetCallerDetails}
              activeOpacity={0.7}
            >
              <Icon name="create-outline" size={18} color="#FF69B4" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.callerDetailsContent}>
            <View style={styles.callerImageContainer}>
              <Image
                source={{ uri: callerImage }}
                style={styles.avatar}
              />
              {isCalling && (
                <Animated.View
                  style={[
                    styles.pulseRing,
                    { transform: [{ scale: pulseAnim }] }
                  ]}
                />
              )}
            </View>

            <View style={styles.callerInfo}>
              {callerName || callerNumber ? (
                <>
                  <Text style={styles.callerName}>{callerName || 'Unknown Caller'}</Text>
                  <Text style={styles.callerNumber}>{callerNumber || 'Unknown Number'}</Text>
                  {isCalling && (
                    <View style={styles.callingStatusContainer}>
                      <View style={styles.callingIndicator} />
                      <Text style={styles.callingStatus}>
                        Calling... {formatTime(callTimer)}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Icon name="person-add-outline" size={32} color="#FF69B4" />
                  <Text style={styles.emptyStateText}>No caller set</Text>
                  <Text style={styles.emptyStateSubtext}>Tap Edit to add caller details</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Quick Actions Removed */}\n
      </Animated.View>

      {/* Full Screen Call Notification */}
      <Modal
        transparent={false}
        visible={showNotification}
        animationType="slide"
        onRequestClose={() => setShowNotification(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.fullScreenCallOverlay}>
          <StatusBar barStyle="light-content" backgroundColor="#000" translucent={true} />

          {/* Caller Info */}
          <View style={styles.fullScreenCallerInfo}>
            <View style={styles.fullScreenImageWrapper}>
              <Image
                source={{ uri: callerImage }}
                style={styles.fullScreenAvatar}
              />
              <Animated.View
                style={[
                  styles.fullScreenPulseRing,
                  { transform: [{ scale: pulseAnim }] }
                ]}
              />
            </View>

            <Text style={styles.fullScreenCallerName}>
              {callerName || 'Unknown Caller'}
            </Text>
            <Text style={styles.fullScreenCallerNumber}>
              {callerNumber || 'Unknown Number'}
            </Text>
            <Text style={styles.fullScreenCallType}>Mobile</Text>
          </View>

          {/* Call Controls */}
          <View style={styles.fullScreenCallControls}>
            <TouchableOpacity
              style={[styles.fullScreenControlButton, styles.fullScreenDeclineButton]}
              onPress={handleDeclineCall}
              activeOpacity={0.8}
            >
              <Icon name="call" size={32} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.fullScreenControlButton, styles.fullScreenAcceptButton]}
              onPress={handleAcceptCall}
              activeOpacity={0.8}
            >
              <Icon name="call" size={32} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Swipe to Answer Hint */}
          <View style={styles.fullScreenSwipeHint}>
            <Text style={styles.fullScreenSwipeHintText}>Swipe up to answer</Text>
          </View>
        </View>
      </Modal>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.getCallButton,
            isCalling && styles.getCallButtonActive
          ]}
          onPress={handleGetCall}
          activeOpacity={0.9}
          disabled={isCalling}
        >
          <View style={styles.buttonContent}>
            {isCalling ? (
              <>
                <Animated.View
                  style={[
                    styles.buttonIcon,
                    { transform: [{ scale: pulseAnim }] }
                  ]}
                >
                  <Icon name="call" size={24} color="#FFF" />
                </Animated.View>
                <Text style={styles.getCallButtonText}>Calling...</Text>
              </>
            ) : (
              <>
                <Icon name="call-outline" size={24} color="#FFF" />
                <Text style={styles.getCallButtonText}>Start Fake Call</Text>
              </>
            )}
          </View>
        </TouchableOpacity>
      </View>
      <BottomNav />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    flex: 1,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2A2A2A',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#5A5A5A',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '400',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  callerDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#FF69B4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
    minHeight: 100,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A2A2A',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 12,
    color: '#FF69B4',
    fontWeight: '600',
    marginLeft: 4,
  },
  callerDetailsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    minHeight: 70,
  },
  callerImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#FF69B4',
  },
  pulseRing: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: '#FF69B4',
    opacity: 0.6,
  },
  callerInfo: {
    flex: 1,
  },
  callerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  callerNumber: {
    fontSize: 14,
    color: '#5A5A5A',
    fontWeight: '600',
    marginBottom: 6,
  },
  callingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF69B4',
    marginRight: 8,
  },
  callingStatus: {
    fontSize: 14,
    color: '#FF69B4',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#5A5A5A',
    fontWeight: '600',
    marginTop: 6,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  actionButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 105, 180, 0.2)',
    minWidth: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionText: {
    fontSize: 10,
    color: '#5A5A5A',
    marginTop: 4,
    fontWeight: '500',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 20,
  },
  getCallButton: {
    backgroundColor: '#FF69B4',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  getCallButtonActive: {
    backgroundColor: '#FF1493',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 12,
  },
  getCallButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  // Full Screen Call Notification Styles
  fullScreenCallOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  fullScreenCallerInfo: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  fullScreenImageWrapper: {
    position: 'relative',
    marginBottom: 40,
  },
  fullScreenAvatar: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: '#FF69B4',
  },
  fullScreenPulseRing: {
    position: 'absolute',
    top: -15,
    left: -15,
    right: -15,
    bottom: -15,
    borderRadius: 115,
    borderWidth: 4,
    borderColor: '#FF69B4',
    opacity: 0.7,
  },
  fullScreenCallerName: {
    fontSize: 42,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  fullScreenCallerNumber: {
    fontSize: 24,
    color: '#B0B0B0',
    marginBottom: 12,
    textAlign: 'center',
  },
  fullScreenCallType: {
    fontSize: 18,
    color: '#FF69B4',
    fontWeight: '500',
  },
  fullScreenCallControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  fullScreenControlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  fullScreenAcceptButton: {
    backgroundColor: '#4CAF50',
  },
  fullScreenDeclineButton: {
    backgroundColor: '#F44336',
  },
  fullScreenSwipeHint: {
    alignItems: 'center',
    marginTop: 20,
  },
  fullScreenSwipeHintText: {
    fontSize: 18,
    color: '#B0B0B0',
    fontWeight: '400',
  },
});

export default FakeCallScreen;