import { AppState } from 'react-native';
import liveLocationService from './liveLocationService';
import pushNotificationService from './pushNotificationService';

/**
 * Background WebSocket Service
 * Keeps WebSocket connection alive when app is in background
 * Falls back to FCM when app is closed
 */
class BackgroundWebSocketService {
  constructor() {
    this.isInitialized = false;
    this.reconnectInterval = null;
    this.keepAliveInterval = null;
    this.appState = AppState.currentState;
  }

  async initialize() {
    if (this.isInitialized) return;

    // Set up app state listener
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));

    // Connect WebSocket initially
    await this.ensureConnection();

    this.isInitialized = true;
    console.log('✅ Background WebSocket service initialized');
  }

  handleAppStateChange(nextAppState) {
    if (this.appState.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground - ensure WebSocket is connected
      this.ensureConnection();
    } else if (this.appState === 'active' && nextAppState.match(/inactive|background/)) {
      // App went to background - keep connection alive
      this.startKeepAlive();
    }

    this.appState = nextAppState;
  }

  async ensureConnection() {
    try {
      if (!liveLocationService.connectionStatus) {
        console.log('🔄 Connecting to WebSocket...');
        await liveLocationService.connect();
        
        // Register FCM token when connected
        const fcmToken = await pushNotificationService.getDeviceToken();
        if (fcmToken && liveLocationService.socket) {
          liveLocationService.socket.emit('register-device-token', {
            deviceToken: fcmToken
          });
        }
      }
      
      // Stop keep-alive when in foreground (not needed)
      this.stopKeepAlive();
    } catch (error) {
      console.error('❌ Error ensuring WebSocket connection:', error);
    }
  }

  startKeepAlive() {
    // Keep WebSocket connection alive when app is in background
    // Send periodic ping to prevent timeout
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }

    this.keepAliveInterval = setInterval(() => {
      if (liveLocationService.socket && liveLocationService.socket.connected) {
        // Send ping to keep connection alive
        liveLocationService.socket.emit('ping');
        console.log('💓 WebSocket keep-alive ping sent');
      } else {
        // Try to reconnect
        this.ensureConnection();
      }
    }, 30000); // Every 30 seconds

    console.log('🔄 Started WebSocket keep-alive');
  }

  stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
      console.log('⏹️ Stopped WebSocket keep-alive');
    }
  }

  cleanup() {
    this.stopKeepAlive();
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
    }
    console.log('🧹 Background WebSocket service cleaned up');
  }
}

// Export singleton instance
export default new BackgroundWebSocketService();

