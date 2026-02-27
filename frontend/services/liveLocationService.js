import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServerURL } from '../utils/serverConfig';

class LiveLocationService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentSession = null;
    this.locationUpdateInterval = null;
    this.listeners = new Map();
  }

  async connect() {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Get the server URL dynamically (local in dev, production in release)
      const SOCKET_URL = await getServerURL();

      console.log('Connecting to socket server at:', SOCKET_URL);

      this.socket = io(SOCKET_URL, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'], // Support both transports
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to live location server at', SOCKET_URL);
        this.isConnected = true;
        this.emit('connection-status', { connected: true });

        // Register device token for push notifications
        this.registerDeviceToken();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Disconnected from live location server. Reason:', reason);
        this.isConnected = false;
        this.emit('connection-status', { connected: false });
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message);
        console.error('Make sure:');
        console.error('1. Backend is accessible at', SOCKET_URL);
        console.error('2. Check your internet connection');
        this.isConnected = false;
        this.emit('connection-status', { connected: false, error: error.message });
      });

      this.socket.on('live-location-session-created', (data) => {
        console.log('Live location session created:', data);
        this.currentSession = data.sessionId;
        this.emit('session-created', data);
      });

      this.socket.on('live-location-started', (data) => {
        console.log('Live location started by friend:', data);
        this.emit('friend-location-started', data);
      });

      this.socket.on('location-updated', (data) => {
        console.log('Location updated:', data);
        this.emit('location-updated', data);
      });

      this.socket.on('live-location-ended', (data) => {
        console.log('Live location ended:', data);
        this.stopLocationUpdates();
        this.currentSession = null;
        this.emit('session-ended', data);
      });

      this.socket.on('joined-live-location', (data) => {
        console.log('Joined live location:', data);
        this.emit('joined-session', data);
      });

      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
        this.emit('error', error);
      });

    } catch (error) {
      console.error('Failed to connect to live location server:', error);
      throw error;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
    this.stopLocationUpdates();
  }

  async registerDeviceToken() {
    try {
      // Import pushNotificationService dynamically to avoid circular dependency
      const { default: pushNotificationService } = await import('./pushNotificationService');
      const deviceToken = await pushNotificationService.getFCMToken();

      if (deviceToken && this.socket && this.isConnected) {
        this.socket.emit('register-device-token', { deviceToken });
        console.log('✅ Device token registered with backend');
      }
    } catch (error) {
      console.error('⚠️ Failed to register device token:', error.message);
      // Non-critical error, app can continue without push notifications
    }
  }


  startLiveLocationSharing(friendPhoneNumbers, duration = 3600000) {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to server');
    }

    // Ensure friendPhoneNumbers is an array
    const recipients = Array.isArray(friendPhoneNumbers) ? friendPhoneNumbers : [friendPhoneNumbers];

    this.socket.emit('start-live-location', {
      friendPhoneNumbers: recipients,
      duration
    });
  }

  stopLiveLocationSharing() {
    if (this.currentSession && this.socket) {
      this.socket.emit('stop-live-location', {
        sessionId: this.currentSession
      });
    }
    this.stopLocationUpdates();
  }

  joinLiveLocationSession(sessionId) {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to server');
    }

    this.socket.emit('join-live-location', { sessionId });
  }

  startLocationUpdates(getCurrentLocation) {
    this.stopLocationUpdates();

    const updateLocation = async () => {
      if (!this.isConnected || !this.currentSession) return;

      try {
        const location = await getCurrentLocation();
        if (location && this.currentSession && this.socket) {
          console.log('Sending location update:', location);
          this.socket.emit('location-update', {
            sessionId: this.currentSession,
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('Error in location update loop:', error);
      } finally {
        // Schedule next update only after previous one finished (or failed)
        if (this.currentSession && this.isConnected) {
          this.locationUpdateInterval = setTimeout(updateLocation, 5000);
        }
      }
    };

    // Kick off the first update
    updateLocation();
  }

  stopLocationUpdates() {
    if (this.locationUpdateInterval) {
      clearTimeout(this.locationUpdateInterval);
      this.locationUpdateInterval = null;
    }
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

  getCurrentSession() {
    return this.currentSession;
  }

  isSessionActive() {
    return this.currentSession !== null;
  }

  // Expose connection status for other services (getter to avoid circular reference)
  get connectionStatus() {
    return this.isConnected && this.socket?.connected;
  }

  async registerDeviceToken() {
    try {
      const pushNotificationService = require('./pushNotificationService').default;
      const deviceToken = await pushNotificationService.getDeviceToken();

      if (deviceToken && this.socket) {
        this.socket.emit('register-device-token', { deviceToken });
        console.log('Device token registered with server');
      }
    } catch (error) {
      console.error('Error registering device token:', error);
    }
  }
}

// Export singleton instance
export default new LiveLocationService();