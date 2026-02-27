import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
  Linking,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import { check, PERMISSIONS, request, RESULTS } from 'react-native-permissions';
import { useNavigation, useRoute } from '@react-navigation/native';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import liveLocationService from '../services/liveLocationService';
import mockLocationService from '../services/mockLocationService';
import backgroundLocationService from '../services/backgroundLocationService';
import customAlertService from '../services/customAlertService';

const LiveLocationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { sessionId, friendName, isSharing = false, friendCount = 1 } = route.params || {};

  const [location, setLocation] = useState(null);
  const [friendLocation, setFriendLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [duration, setDuration] = useState(3600000); // 1 hour default
  const watchIdRef = useRef(null);
  const processedSessionsRef = useRef(new Set());
  const popupTimeoutRef = useRef(null);

  useEffect(() => {
    initializeLiveLocation();

    return () => {
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
      }
      // Clean up background location service
      backgroundLocationService.stopLocationTracking();
      // Clear processed sessions
      processedSessionsRef.current.clear();
      // Clear timeout
      if (popupTimeoutRef.current) {
        clearTimeout(popupTimeoutRef.current);
      }
    };
  }, []);

  const initializeLiveLocation = async () => {
    try {
      setLoading(true);

      let service = liveLocationService;

      // Try to connect to live location service
      try {
        await liveLocationService.connect();
        console.log('Connected to real live location service');
      } catch (connectionError) {
        console.log('Real service failed, using mock service:', connectionError);
        service = mockLocationService;
        await mockLocationService.connect();
      }

      // Set up event listeners
      service.on('connection-status', handleConnectionStatus);
      service.on('session-created', handleSessionCreated);
      service.on('friend-location-started', handleFriendLocationStarted);
      service.on('location-updated', handleLocationUpdated);
      service.on('session-ended', handleSessionEnded);
      service.on('joined-session', handleJoinedSession);
      service.on('error', handleError);

      // Get current location with retry logic
      try {
        await getCurrentLocation();
      } catch (locationError) {
        console.error('Location failed:', locationError);
        // Show user-friendly error message
        customAlertService.showWarning(
          'Location Error',
          'Unable to get your current location. Please check your location permissions and try again.',
          [
            {
              text: 'Retry',
              onPress: () => initializeLiveLocation()
            },
            {
              text: 'Continue Anyway',
              onPress: () => {
                setLoading(false);
                // Continue without location for viewing friend's location
                if (sessionId && !isSharing) {
                  service.joinLiveLocationSession(sessionId);
                }
              }
            }
          ]
        );
        return;
      }

      // If joining an existing session
      if (sessionId && !isSharing) {
        service.joinLiveLocationSession(sessionId);
      }

    } catch (error) {
      console.error('Failed to initialize live location:', error);
      customAlertService.showError('Error', 'Failed to connect to live location service. Please check your internet connection and try again.');
      setLoading(false);
    }
  };

  const checkLocationPermission = async () => {
    try {
      let currentStatus;
      if (Platform.OS === 'android') {
        currentStatus = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      } else if (Platform.OS === 'ios') {
        currentStatus = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      }

      if (currentStatus === RESULTS.GRANTED) {
        return true;
      }

      // Request permission if not granted
      let permissionStatus;
      if (Platform.OS === 'android') {
        permissionStatus = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      } else if (Platform.OS === 'ios') {
        permissionStatus = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      }

      if (permissionStatus === RESULTS.DENIED || permissionStatus === RESULTS.BLOCKED) {
        customAlertService.showWarning(
          'Location Permission Required',
          'This app needs location permission to share your live location. Please enable location permission in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings()
            }
          ]
        );
        return false;
      }

      return permissionStatus === RESULTS.GRANTED;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  };

  const getCurrentLocation = async () => {
    // Check permission first
    const hasPermission = await checkLocationPermission();
    if (!hasPermission) {
      console.log('Location permission denied, requesting permission...');
      const granted = await requestLocationPermission();
      if (!granted) {
        throw new Error('Location permission denied');
      }
    }

    return new Promise((resolve, reject) => {
      // First try with high accuracy
      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('Location obtained:', { latitude, longitude });
          setLocation({ latitude, longitude });
          setLoading(false);
          resolve({ latitude, longitude });
        },
        (error) => {
          console.log('High accuracy location failed, trying low accuracy...', error);
          // If high accuracy fails, try with low accuracy
          Geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              console.log('Location obtained with low accuracy:', { latitude, longitude });
              setLocation({ latitude, longitude });
              setLoading(false);
              resolve({ latitude, longitude });
            },
            (fallbackError) => {
              console.error('All location attempts failed:', fallbackError);
              setLoading(false);
              reject(fallbackError);
            },
            {
              enableHighAccuracy: false,
              timeout: 20000,
              maximumAge: 30000,
            }
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000,
        }
      );
    });
  };

  const startLocationTracking = () => {
    if (watchIdRef.current !== null) {
      Geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
      },
      (error) => {
        console.error('Watch Error:', error);
        // Try to restart with lower accuracy if high accuracy fails
        if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
          console.log('Restarting location tracking with lower accuracy...');
          Geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = Geolocation.watchPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              setLocation({ latitude, longitude });
            },
            (fallbackError) => {
              console.error('Fallback Watch Error:', fallbackError);
            },
            {
              enableHighAccuracy: false,
              distanceFilter: 50,
              interval: 10000,
              fastestInterval: 5000,
            }
          );
        }
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10,
        interval: 5000,
        fastestInterval: 2000,
      }
    );
  };

  const handleConnectionStatus = (data) => {
    setIsConnected(data.connected);
  };

  const handleSessionCreated = (data) => {
    setSessionActive(true);
    setDuration(data.duration || 3600000);
    startLocationTracking();
    startLocationUpdates();
    // Start background location tracking
    backgroundLocationService.startLocationTracking(data.sessionId);
  };

  const handleFriendLocationStarted = (data) => {
    console.log('Friend location started:', data);

    // Check if we've already processed this session
    if (processedSessionsRef.current.has(data.sessionId)) {
      console.log('Session already processed, ignoring duplicate request');
      return;
    }

    // Clear any existing timeout
    if (popupTimeoutRef.current) {
      clearTimeout(popupTimeoutRef.current);
    }

    // Mark this session as processed
    processedSessionsRef.current.add(data.sessionId);

    setSessionActive(true);
    setDuration(data.duration || 3600000);
    startLocationTracking();

    // Show custom popup notification to user
    customAlertService.showLiveLocationRequest(
      data.sessionId,
      () => {
        console.log('User accepted live location request, joining session:', data.sessionId);
        // Join the live location session
        const service = liveLocationService.isConnected ? liveLocationService : mockLocationService;
        service.joinLiveLocationSession(data.sessionId);
      },
      () => {
        console.log('User declined live location request');
      },
      data.sharerName || 'A friend'
    );

    // Set a timeout to allow the same session to be processed again after 30 seconds
    popupTimeoutRef.current = setTimeout(() => {
      processedSessionsRef.current.delete(data.sessionId);
      console.log('Session timeout cleared, can process again:', data.sessionId);
    }, 30000);
  };

  const handleLocationUpdated = (data) => {
    console.log('Location updated received:', data);
    setFriendLocation({
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: data.timestamp
    });
  };

  const handleSessionEnded = (data) => {
    setSessionActive(false);
    setFriendLocation(null);
    setTimeRemaining(null);
    liveLocationService.stopLocationUpdates();
    // Stop background location tracking
    backgroundLocationService.stopLocationTracking();
  };

  const handleJoinedSession = (data) => {
    console.log('Joined session:', data);
    setSessionActive(true);
    startLocationTracking();
  };

  const handleError = (error) => {
    customAlertService.showError('Error', error.message || 'An error occurred');
  };

  const startLocationUpdates = () => {
    console.log('Starting location updates...');
    const service = liveLocationService.isConnected ? liveLocationService : mockLocationService;

    const getCurrentLocationForUpdates = async () => {
      return new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          (position) => {
            console.log('Location obtained for update:', position.coords);
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          },
          (error) => {
            console.log('Location update failed, trying fallback...', error);
            // Try with lower accuracy
            Geolocation.getCurrentPosition(
              (position) => {
                console.log('Fallback location obtained:', position.coords);
                resolve({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude
                });
              },
              (fallbackError) => {
                console.error('Fallback location update failed:', fallbackError);
                reject(fallbackError);
              },
              {
                enableHighAccuracy: false,
                timeout: 20000,
                maximumAge: 60000,
              }
            );
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000,
          }
        );
      });
    };

    service.startLocationUpdates(getCurrentLocationForUpdates);
  };

  const stopLiveLocation = () => {
    customAlertService.showConfirm(
      'Stop Live Location',
      'Are you sure you want to stop sharing your live location?',
      () => {
        const service = liveLocationService.isConnected ? liveLocationService : mockLocationService;
        service.stopLiveLocationSharing();
        // Stop background location tracking
        backgroundLocationService.stopLocationTracking();
        navigation.goBack();
      }
    );
  };

  const getMapRegion = () => {
    console.log('Getting map region - friendLocation:', friendLocation, 'location:', location);

    if (friendLocation && location) {
      // Show both locations
      const latDelta = Math.abs(friendLocation.latitude - location.latitude) * 1.5;
      const lngDelta = Math.abs(friendLocation.longitude - location.longitude) * 1.5;

      return {
        latitude: (friendLocation.latitude + location.latitude) / 2,
        longitude: (friendLocation.longitude + location.longitude) / 2,
        latitudeDelta: Math.max(latDelta, 0.01),
        longitudeDelta: Math.max(lngDelta, 0.01),
      };
    } else if (location) {
      return {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    } else if (friendLocation) {
      return {
        latitude: friendLocation.latitude,
        longitude: friendLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    return null;
  };

  const formatTimeRemaining = (milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let interval;
    if (sessionActive && duration) {
      interval = setInterval(() => {
        const elapsed = Date.now() - (Date.now() - duration);
        const remaining = Math.max(0, duration - elapsed);
        setTimeRemaining(remaining);

        if (remaining <= 0) {
          setSessionActive(false);
          setTimeRemaining(null);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionActive, duration]);

  return (
    <SafeAreaView style={styles.container}>
      <Header />

      <View style={styles.header}>
        <Text style={styles.title}>
          {isSharing ? 'Sharing Live Location' : 'Viewing Live Location'}
        </Text>
        {friendName && (
          <Text style={styles.subtitle}>
            {isSharing
              ? `with ${friendName}${friendCount > 1 ? ` (${friendCount} friends)` : ''}`
              : `from ${friendName}`
            }
          </Text>
        )}
      </View>

      <View style={styles.statusContainer}>
        <View style={[styles.statusIndicator, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]} />
        <Text style={styles.statusText}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </Text>
        {sessionActive && timeRemaining && (
          <Text style={styles.timeText}>
            {formatTimeRemaining(timeRemaining)} remaining
          </Text>
        )}
      </View>

      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF69B4" />
            <Text style={styles.loadingText}>Loading location...</Text>
          </View>
        ) : (
          <MapView
            style={styles.map}
            region={getMapRegion()}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {location && (
              <Marker
                coordinate={location}
                title={isSharing ? "Your Location (Sharing)" : "Your Location"}
                pinColor="blue"
                description={isSharing ? "You are sharing your location" : "Your current location"}
              />
            )}
            {friendLocation && (
              <Marker
                coordinate={friendLocation}
                title={isSharing ? `${friendName}'s Location` : `${friendName}'s Live Location`}
                pinColor="red"
                description={isSharing ? "Friend's location" : "Live location from friend"}
              />
            )}
          </MapView>
        )}
      </View>

      {isSharing && sessionActive && (
        <View style={styles.controlsContainer}>
          <TouchableOpacity style={styles.stopButton} onPress={stopLiveLocation}>
            <Text style={styles.stopButtonText}>Stop Sharing</Text>
          </TouchableOpacity>
        </View>
      )}

      <BottomNav location={location} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    marginRight: 16,
  },
  timeText: {
    fontSize: 14,
    color: '#FF69B4',
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  controlsContainer: {
    padding: 16,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#F44336',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LiveLocationScreen;