import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated, Dimensions, StatusBar, Vibration } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const IncomingCallScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { callerName, callerNumber, callerImage, callTimer } = route.params || {};

  const [callDuration, setCallDuration] = useState(callTimer || 0);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCallActive, setIsCallActive] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Start pulse animation for avatar
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Call duration timer
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
      pulseAnimation.stop();
    };
  }, []);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    console.log('=== INCOMING CALL SCREEN - ENDING CALL ===');
    console.log('Current caller data:', { callerName, callerNumber, callerImage });

    // Haptic feedback for ending call
    try {
      Vibration.vibrate(300);
    } catch (error) {
      console.log('Vibration not available:', error);
    }

    setIsCallActive(false);

    // Exit animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Navigate back to FakeCallScreen with caller details
      const paramsToPass = {
        callerName,
        callerNumber,
        callerImage
      };

      console.log('=== NAVIGATING BACK TO FAKE CALL SCREEN ===');
      console.log('Params being passed back:', paramsToPass);

      // Navigate back to FakeCallScreen with caller details (pop back to it)
      // using navigate ensures we don't create a new instance if it exists
      navigation.navigate({
        name: 'FakeCallScreen',
        params: paramsToPass,
        merge: true,
      });
    });
  };

  const toggleSpeaker = () => {
    try {
      Vibration.vibrate(50);
    } catch (error) {
      console.log('Vibration not available:', error);
    }
    setIsSpeakerOn(!isSpeakerOn);
  };

  const toggleMute = () => {
    try {
      Vibration.vibrate(50);
    } catch (error) {
      console.log('Vibration not available:', error);
    }
    setIsMuted(!isMuted);
  };

  const addCall = () => {
    // Future feature: Add another caller
  };

  const toggleKeypad = () => {
    // Future feature: Show keypad
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim }
            ]
          }
        ]}
      >
        {/* Caller Information */}
        <View style={styles.callerInfo}>
          <View style={styles.avatarContainer}>
            <Animated.View
              style={[
                styles.avatarWrapper,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <Image
                source={{ uri: callerImage || 'https://via.placeholder.com/150' }}
                style={styles.avatar}
              />
              <View style={styles.avatarRing} />
            </Animated.View>
          </View>

          <Text style={styles.callerName}>{callerName || 'Unknown Caller'}</Text>
          <Text style={styles.callerNumber}>{callerNumber || 'Unknown Number'}</Text>
          <Text style={styles.callDuration}>{formatDuration(callDuration)}</Text>
        </View>

        {/* Call Controls */}
        <View style={styles.callControls}>
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={[styles.controlButton, isMuted && styles.controlButtonActive]}
              onPress={toggleMute}
              activeOpacity={0.8}
            >
              <Icon
                name={isMuted ? 'mic-off' : 'mic'}
                size={28}
                color={isMuted ? '#FFF' : '#B0B0B0'}
              />
              <Text style={[styles.controlText, isMuted && styles.controlTextActive]}>
                Mute
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
              onPress={toggleSpeaker}
              activeOpacity={0.8}
            >
              <Icon
                name={isSpeakerOn ? 'volume-high' : 'volume-low'}
                size={28}
                color={isSpeakerOn ? '#FFF' : '#B0B0B0'}
              />
              <Text style={[styles.controlText, isSpeakerOn && styles.controlTextActive]}>
                Speaker
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={addCall}
              activeOpacity={0.8}
            >
              <Icon name="person-add" size={28} color="#B0B0B0" />
              <Text style={styles.controlText}>Add Call</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.controlRow}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={toggleKeypad}
              activeOpacity={0.8}
            >
              <Icon name="keypad" size={28} color="#B0B0B0" />
              <Text style={styles.controlText}>Keypad</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              activeOpacity={0.8}
            >
              <Icon name="videocam" size={28} color="#B0B0B0" />
              <Text style={styles.controlText}>Video</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              activeOpacity={0.8}
            >
              <Icon name="share" size={28} color="#B0B0B0" />
              <Text style={styles.controlText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* End Call Button */}
        <TouchableOpacity
          style={styles.endCallButton}
          onPress={handleEndCall}
          activeOpacity={0.8}
        >
          <Icon name="call" size={32} color="#FFF" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  callerInfo: {
    alignItems: 'center',
    marginTop: 40,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 30,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: '#FF69B4',
  },
  avatarRing: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 83,
    borderWidth: 2,
    borderColor: 'rgba(255, 105, 180, 0.3)',
  },
  callerName: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  callerNumber: {
    fontSize: 20,
    color: '#B0B0B0',
    marginBottom: 12,
    textAlign: 'center',
  },
  callStatus: {
    fontSize: 18,
    color: '#4CAF50',
    marginBottom: 8,
    fontWeight: '500',
  },
  callDuration: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  callControls: {
    marginBottom: 40,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  controlButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 16,
    minWidth: 80,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  controlButtonActive: {
    backgroundColor: '#FF69B4',
    borderColor: '#FF69B4',
  },
  controlText: {
    fontSize: 12,
    color: '#B0B0B0',
    marginTop: 8,
    fontWeight: '500',
  },
  controlTextActive: {
    color: '#FFFFFF',
  },
  endCallButton: {
    alignSelf: 'center',
    backgroundColor: '#F44336',
    borderRadius: 40,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
});

export default IncomingCallScreen;