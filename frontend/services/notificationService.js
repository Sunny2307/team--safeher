import { Alert } from 'react-native';
import liveLocationService from './liveLocationService';

class NotificationService {
  constructor() {
    this.setupListeners();
  }

  setupListeners() {
    // Listen for incoming live location requests
    liveLocationService.on('friend-location-started', this.handleIncomingLiveLocation.bind(this));
  }

  handleIncomingLiveLocation(data) {
    try {
      const { sessionId, sharerId, duration } = data;
      
      // Use push notification service to show proper notification
      const pushNotificationService = require('./pushNotificationService').default;
      pushNotificationService.showLiveLocationRequest(
        sessionId,
        sharerId,
        sharerId
      );
    } catch (error) {
      console.error('Error handling incoming live location:', error);
    }
  }

  navigateToLiveLocation(sessionId, sharerId) {
    // This would need to be implemented with proper navigation handling
    // For now, we'll store the session info for later use
    console.log('Navigate to live location:', { sessionId, sharerId });
  }

  // Method to show custom notifications
  showNotification(title, message, actions = []) {
    Alert.alert(title, message, actions);
  }
}

export default new NotificationService();

