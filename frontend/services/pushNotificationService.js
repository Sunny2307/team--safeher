import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { fcmMessaging } from './firebaseConfig';
import { navigationRef } from '../navigation/AppNavigator';
import liveLocationService from './liveLocationService';

class PushNotificationService {
  constructor() {
    this.isInitialized = false;
    this.listeners = new Map();
    this.fcmToken = null;
    this.notificationHandlers = new Map();
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Request notification permissions
      await this.requestPermissions();

      // Get FCM token
      await this.getFCMToken();

      // Set up notification handlers
      this.setupNotificationHandlers();

      // Set up background message handler
      this.setupBackgroundMessageHandler();

      this.isInitialized = true;
      console.log('✅ Push notification service initialized with FCM');
    } catch (error) {
      console.error('❌ Error initializing push notification service:', error);
    }
  }

  async requestPermissions() {
    try {
      if (Platform.OS === 'android') {
        // Request Android notification permissions (Android 13+)
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn('Notification permission denied');
            return false;
          }
        }
      }

      // Request FCM permissions
      const authStatus = await fcmMessaging.requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.warn('FCM permission not granted');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  async getFCMToken() {
    try {
      if (!this.fcmToken) {
        // Check if Firebase is properly initialized
        const hasPermission = await fcmMessaging.hasPermission();
        if (hasPermission === messaging.AuthorizationStatus.NOT_DETERMINED ||
          hasPermission === messaging.AuthorizationStatus.DENIED) {
          console.log('⚠️ FCM permission not granted, skipping token retrieval');
          return null;
        }

        this.fcmToken = await fcmMessaging.getToken();
        console.log('📱 FCM Token:', this.fcmToken);

        // Store token locally
        await this.storeDeviceToken(this.fcmToken);

        // Note: Token registration with backend is handled by liveLocationService.registerDeviceToken()
      }
      return this.fcmToken;
    } catch (error) {
      console.error('⚠️ Error getting FCM token:', error.message);
      console.log('App will continue without push notifications');
      // Don't throw - allow app to continue without FCM
      return null;
    }
  }

  setupNotificationHandlers() {
    // Handle notification when app is in foreground
    fcmMessaging.onMessage(async (remoteMessage) => {
      console.log('📬 Foreground notification received:', remoteMessage);

      const { notification, data } = remoteMessage;

      if (data?.type === 'live-location-request') {
        this.handleLiveLocationRequest(data);
      } else if (data?.type === 'live-location-update') {
        this.handleLiveLocationUpdate(data);
      }
    });

    // Handle notification tap when app is in background/quit
    fcmMessaging.onNotificationOpenedApp((remoteMessage) => {
      console.log('📱 Notification opened app:', remoteMessage);
      this.handleNotificationTap(remoteMessage);
    });

    // Check if app was opened from a notification (app was quit)
    fcmMessaging
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('📱 App opened from notification:', remoteMessage);
          this.handleNotificationTap(remoteMessage);
        }
      });
  }

  setupBackgroundMessageHandler() {
    // Handle background messages (when app is in background)
    fcmMessaging.setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('📬 Background notification received:', remoteMessage);

      const { data } = remoteMessage;

      if (data?.type === 'live-location-request') {
        // Show notification with action buttons
        this.showLiveLocationRequestNotification(data);
      }
    });
  }

  handleNotificationTap(remoteMessage) {
    const { data } = remoteMessage;

    if (data?.type === 'live-location-request') {
      const { sessionId, sharerId, sharerName } = data;

      // Navigate to live location screen
      if (navigationRef.current) {
        navigationRef.current.navigate('LiveLocationScreen', {
          sessionId,
          sharerId,
          sharerName,
          isIncoming: true
        });
      }

      // Emit event for other services
      this.emit('notification-tap', {
        type: 'live-location-request',
        sessionId,
        sharerId,
        sharerName
      });
    } else if (data?.type === 'live-location-update') {
      const { sessionId, latitude, longitude, sharerName } = data;

      // Navigate to live location screen if not already there
      if (navigationRef.current) {
        navigationRef.current.navigate('LiveLocationScreen', {
          sessionId,
          viewOnly: true
        });
      }
    }
  }

  handleLiveLocationRequest(data) {
    const { sessionId, sharerId, sharerName } = data;

    // If app is open, use WebSocket (real-time)
    if (liveLocationService.connectionStatus) {
      // WebSocket will handle it via 'friend-location-started' event
      console.log('Live location request via WebSocket');
    } else {
      // Show in-app notification
      this.showLiveLocationRequest(sessionId, sharerName, sharerId);
    }
  }

  handleLiveLocationUpdate(data) {
    const { sessionId, latitude, longitude, sharerName } = data;
    this.showLiveLocationUpdate(sessionId, sharerName, latitude, longitude);
  }

  showLiveLocationRequestNotification(data) {
    const { sessionId, sharerId, sharerName } = data;

    // This will be handled by FCM notification with action buttons
    // The notification is sent from backend with actions
    console.log('Showing live location request notification:', {
      sessionId,
      sharerName
    });
  }

  async storeDeviceToken(token) {
    try {
      await AsyncStorage.setItem('deviceToken', token);
      console.log('Device token stored:', token);
    } catch (error) {
      console.error('Error storing device token:', error);
    }
  }

  async getDeviceToken() {
    try {
      if (!this.fcmToken) {
        this.fcmToken = await this.getFCMToken();
      }
      return this.fcmToken || await AsyncStorage.getItem('deviceToken');
    } catch (error) {
      console.error('Error getting device token:', error);
      return null;
    }
  }

  showLiveLocationRequest(sessionId, sharerName, sharerId) {
    console.log('Live location request received:', { sessionId, sharerName, sharerId });

    // Emit event for LiveLocationScreen to handle
    this.emit('live-location-request', {
      sessionId,
      sharerName,
      sharerId
    });
  }

  showLiveLocationUpdate(sessionId, sharerName, latitude, longitude) {
    console.log(`Location update from ${sharerName}: ${latitude}, ${longitude}`);

    this.emit('notification-tap', {
      userInfo: {
        type: 'live-location-update',
        sessionId,
        sharerName,
        latitude,
        longitude,
      }
    });
  }

  // Handle notification action buttons (Accept/Decline)
  async handleNotificationAction(action, data) {
    const { sessionId, sharerId } = data;

    if (action === 'accept') {
      // Join the live location session
      try {
        if (!liveLocationService.isConnected) {
          await liveLocationService.connect();
        }
        liveLocationService.joinLiveLocationSession(sessionId);

        // Navigate to live location screen
        if (navigationRef.current) {
          navigationRef.current.navigate('LiveLocationScreen', {
            sessionId,
            sharerId
          });
        }
      } catch (error) {
        console.error('Error accepting live location:', error);
      }
    } else if (action === 'decline') {
      // Decline the request (can notify backend if needed)
      console.log('Live location request declined:', sessionId);

      // Optionally notify backend
      if (liveLocationService.isConnected && liveLocationService.socket) {
        liveLocationService.socket.emit('decline-live-location', {
          sessionId
        });
      }
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

  async checkPermissions() {
    try {
      const authStatus = await fcmMessaging.hasPermission();
      return {
        alert: authStatus === messaging.AuthorizationStatus.AUTHORIZED,
        badge: true,
        sound: true
      };
    } catch (error) {
      console.error('Error checking permissions:', error);
      return { alert: false, badge: false, sound: false };
    }
  }
}

// Export singleton instance
export default new PushNotificationService();
