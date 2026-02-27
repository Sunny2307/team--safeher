// Mock location service for testing when WebSocket connection fails
class MockLocationService {
  constructor() {
    this.isConnected = false;
    this.currentSession = null;
    this.locationUpdateInterval = null;
    this.listeners = new Map();
  }

  async connect() {
    console.log('Mock location service connected');
    this.isConnected = true;
    this.emit('connection-status', { connected: true });
    return Promise.resolve();
  }

  disconnect() {
    console.log('Mock location service disconnected');
    this.isConnected = false;
    this.stopLocationUpdates();
  }

  startLiveLocationSharing(friendPhoneNumber, duration = 3600000) {
    console.log('Mock: Starting live location sharing with', friendPhoneNumber);
    const sessionId = `mock_${Date.now()}`;
    this.currentSession = sessionId;
    this.emit('session-created', { sessionId });
  }

  stopLiveLocationSharing() {
    console.log('Mock: Stopping live location sharing');
    this.currentSession = null;
    this.stopLocationUpdates();
  }

  joinLiveLocationSession(sessionId) {
    console.log('Mock: Joining session', sessionId);
    this.currentSession = sessionId;
    this.emit('joined-session', { sessionId });
  }

  startLocationUpdates(getCurrentLocation) {
    console.log('Mock: Starting location updates');
    // Mock location updates every 10 seconds
    this.locationUpdateInterval = setInterval(async () => {
      try {
        const location = await getCurrentLocation();
        if (location && this.currentSession) {
          console.log('Mock: Sending location update:', location);
          // Simulate receiving location updates
          setTimeout(() => {
            this.emit('location-updated', {
              sessionId: this.currentSession,
              latitude: location.latitude + (Math.random() - 0.5) * 0.001, // Add small random offset
              longitude: location.longitude + (Math.random() - 0.5) * 0.001,
              timestamp: Date.now(),
              sharerId: 'mock_user'
            });
          }, 1000);
        }
      } catch (error) {
        console.error('Mock location update error:', error);
      }
    }, 10000);
  }

  stopLocationUpdates() {
    if (this.locationUpdateInterval) {
      clearInterval(this.locationUpdateInterval);
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
          console.error('Error in mock event callback:', error);
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
}

export default new MockLocationService();

