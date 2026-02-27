import { AppState, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { check, PERMISSIONS, request, RESULTS } from 'react-native-permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import liveLocationService from './liveLocationService';

class BackgroundLocationService {
  constructor() {
    this.isTracking = false;
    this.watchId = null;
    this.appState = AppState.currentState;
    this.sessionId = null;
    this.isBackgroundMode = false;
    this.backgroundInterval = null;
    this.listeners = new Map();
    this.setupAppStateListener();
  }

  setupAppStateListener() {
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  handleAppStateChange(nextAppState) {
    console.log('App state changed from', this.appState, 'to', nextAppState);

    if (this.appState.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to the foreground
      console.log('App came to foreground');
      this.isBackgroundMode = false;
      this.restartLocationTracking();
    } else if (this.appState === 'active' && nextAppState.match(/inactive|background/)) {
      // App has gone to the background
      console.log('App went to background');
      this.isBackgroundMode = true;
      this.startBackgroundTracking();
    }

    this.appState = nextAppState;
  }

  async requestBackgroundLocationPermission() {
    try {
      let permissionStatus;
      if (Platform.OS === 'android') {
        // First request foreground location permission
        const foregroundPermission = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
        if (foregroundPermission !== RESULTS.GRANTED) {
          return false;
        }

        // Then request background location permission
        permissionStatus = await request(PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION);
      } else if (Platform.OS === 'ios') {
        permissionStatus = await request(PERMISSIONS.IOS.LOCATION_ALWAYS);
      }

      return permissionStatus === RESULTS.GRANTED;
    } catch (error) {
      console.error('Error requesting background location permission:', error);
      return false;
    }
  }

  async startLocationTracking(sessionId) {
    console.log('Starting location tracking for session:', sessionId);
    this.sessionId = sessionId;
    this.isTracking = true;

    // Request background location permission
    const hasPermission = await this.requestBackgroundLocationPermission();
    if (!hasPermission) {
      console.warn('Background location permission not granted, using foreground tracking only');
    }

    // Start location tracking
    this.startWatchingPosition();
  }

  startWatchingPosition() {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
    }

    this.watchId = Geolocation.watchPosition(
      (position) => {
        console.log('Location updated:', position.coords);
        this.handleLocationUpdate(position.coords);
      },
      (error) => {
        console.error('Location watch error:', error);
        this.handleLocationError(error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // Update every 10 meters
        interval: 10000, // Every 10 seconds
        fastestInterval: 5000,
        timeout: 30000,
        maximumAge: 10000,
        showsBackgroundLocationIndicator: true,
      }
    );
  }

  startBackgroundTracking() {
    if (!this.isTracking || !this.sessionId) return;

    console.log('Starting background location tracking');

    // Clear any existing background interval
    if (this.backgroundInterval) {
      clearInterval(this.backgroundInterval);
    }

    // Use a more frequent interval for background tracking
    this.backgroundInterval = setInterval(async () => {
      try {
        const position = await this.getCurrentPosition();
        if (position) {
          this.handleLocationUpdate(position.coords);
        }
      } catch (error) {
        console.error('Background location update failed:', error);
      }
    }, 10000); // Update every 10 seconds in background
  }

  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => reject(error),
        {
          enableHighAccuracy: false, // Use less battery in background
          timeout: 20000,
          maximumAge: 60000,
        }
      );
    });
  }

  handleLocationUpdate(coords) {
    if (!this.sessionId || !liveLocationService.isConnected) {
      console.log('No active session or not connected, skipping location update');
      return;
    }

    const locationData = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      timestamp: Date.now(),
      accuracy: coords.accuracy,
      isBackground: this.isBackgroundMode
    };

    console.log('Sending location update:', locationData);

    // Emit event for other services
    this.emit('location-updated', locationData);

    // Send to live location service
    if (liveLocationService.socket && liveLocationService.socket.connected) {
      liveLocationService.socket.emit('location-update', {
        sessionId: this.sessionId,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        timestamp: locationData.timestamp,
        accuracy: locationData.accuracy,
        isBackground: locationData.isBackground
      });
    }

    // Store location in AsyncStorage for persistence
    this.storeLocation(locationData);
  }

  async storeLocation(locationData) {
    try {
      await AsyncStorage.setItem('last_location', JSON.stringify(locationData));
    } catch (error) {
      console.error('Error storing location:', error);
    }
  }

  async getLastLocation() {
    try {
      const stored = await AsyncStorage.getItem('last_location');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error getting last location:', error);
      return null;
    }
  }

  handleLocationError(error) {
    console.error('Location error:', error);

    // Try to restart with lower accuracy if high accuracy fails
    if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
      console.log('Restarting location tracking with lower accuracy...');
      this.startWatchingPosition();
    }
  }

  restartLocationTracking() {
    if (this.isTracking && this.sessionId) {
      console.log('Restarting location tracking');
      this.startWatchingPosition();

      // Clear background interval
      if (this.backgroundInterval) {
        clearInterval(this.backgroundInterval);
        this.backgroundInterval = null;
      }
    }
  }

  stopLocationTracking() {
    console.log('Stopping location tracking');
    this.isTracking = false;
    this.sessionId = null;
    this.isBackgroundMode = false;

    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.backgroundInterval) {
      clearInterval(this.backgroundInterval);
      this.backgroundInterval = null;
    }
  }

  isLocationTrackingActive() {
    return this.isTracking && this.sessionId !== null;
  }

  getCurrentSessionId() {
    return this.sessionId;
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event callback:', error);
        }
      });
    }
  }
}

// Export singleton instance
export default new BackgroundLocationService();
