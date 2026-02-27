import { AppState } from 'react-native';
import backgroundLocationService from './backgroundLocationService';
import liveLocationService from './liveLocationService';

class AppStateService {
  constructor() {
    this.appState = AppState.currentState;
    this.isInitialized = false;
    this.setupAppStateListener();
  }

  setupAppStateListener() {
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  handleAppStateChange(nextAppState) {
    console.log('App state changed from', this.appState, 'to', nextAppState);
    
    if (this.appState.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to the foreground
      this.handleAppForeground();
    } else if (this.appState === 'active' && nextAppState.match(/inactive|background/)) {
      // App has gone to the background
      this.handleAppBackground();
    }
    
    this.appState = nextAppState;
  }

  handleAppForeground() {
    console.log('App came to foreground');
    
    // Restart location tracking if it was active
    if (backgroundLocationService.isLocationTrackingActive()) {
      console.log('Restarting location tracking after foreground');
      backgroundLocationService.restartLocationTracking();
    }

    // Reconnect to live location service if needed
    if (!liveLocationService.isConnected) {
      console.log('Reconnecting to live location service');
      liveLocationService.connect().catch(error => {
        console.error('Failed to reconnect to live location service:', error);
      });
    }
  }

  handleAppBackground() {
    console.log('App went to background');
    
    // Ensure background location tracking is active if session is active
    if (backgroundLocationService.isLocationTrackingActive()) {
      console.log('Ensuring background location tracking is active');
      backgroundLocationService.startBackgroundTracking();
    }
  }

  initialize() {
    if (this.isInitialized) return;
    
    console.log('Initializing app state service');
    this.isInitialized = true;
  }

  cleanup() {
    console.log('Cleaning up app state service');
    // Remove listeners if needed
  }
}

// Export singleton instance
export default new AppStateService();
