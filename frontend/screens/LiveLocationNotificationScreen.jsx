import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Header from '../components/Header';
import liveLocationService from '../services/liveLocationService';

const LiveLocationNotificationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { sessionId, sharerId, duration } = route.params || {};
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(duration || 3600000);

  useEffect(() => {
    // Start countdown timer
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1000) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTimeRemaining = (milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleAccept = async () => {
    try {
      setIsConnecting(true);
      
      // Connect to live location service
      await liveLocationService.connect();
      
      // Join the live location session
      liveLocationService.joinLiveLocationSession(sessionId);
      
      // Navigate to live location screen
      navigation.replace('LiveLocationScreen', {
        sessionId,
        friendName: sharerId,
        isSharing: false
      });
      
    } catch (error) {
      console.error('Failed to join live location:', error);
      Alert.alert('Error', 'Failed to connect to live location. Please try again.');
      setIsConnecting(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      'Decline Live Location',
      'Are you sure you want to decline viewing this live location?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.locationIcon}>📍</Text>
        </View>
        
        <Text style={styles.title}>Live Location Shared</Text>
        <Text style={styles.subtitle}>
          {sharerId} is sharing their live location with you
        </Text>
        
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>From:</Text>
            <Text style={styles.detailValue}>{sharerId}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration:</Text>
            <Text style={styles.detailValue}>
              {formatTimeRemaining(timeRemaining)} remaining
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Updates:</Text>
            <Text style={styles.detailValue}>Every 5 seconds</Text>
          </View>
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            You'll see their real-time location on a map that updates automatically as they move.
          </Text>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.declineButton]}
            onPress={handleDecline}
            disabled={isConnecting}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.acceptButton]}
            onPress={handleAccept}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.acceptButtonText}>View Location</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  locationIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 30,
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  declineButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  acceptButton: {
    backgroundColor: '#FF69B4',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default LiveLocationNotificationScreen;
