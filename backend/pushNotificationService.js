const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    let serviceAccount;

    // Try environment variable first (production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Push notification service initialized with FCM (from env)');
    } else {
      // Fallback to file (development)
      serviceAccount = require('./serviceAccountKey.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Push notification service initialized with FCM (from file)');
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error.message);
    console.log('⚠️  Push notifications will be logged only. To enable FCM:');
    console.log('1. Set FIREBASE_SERVICE_ACCOUNT_JSON environment variable');
    console.log('2. Or add serviceAccountKey.json file to backend folder');
  }
}

class PushNotificationService {
  constructor() {
    this.isInitialized = admin.apps.length > 0;
    if (this.isInitialized) {
      console.log('✅ Push notification service initialized with FCM');
    } else {
      console.log('⚠️  Push notification service initialized (logging only - FCM not configured)');
    }
  }

  // Send push notification to a specific device
  async sendNotificationToDevice(deviceToken, title, body, data = {}) {
    if (!this.isInitialized) {
      console.log(`[LOG] Notification to ${deviceToken}: ${title} - ${body}`);
      console.log('[LOG] Data:', data);
      return false;
    }

    try {
      const message = {
        token: deviceToken,
        notification: {
          title: title,
          body: body,
        },
        data: {
          ...data,
          // Convert all data values to strings (FCM requirement)
          ...Object.fromEntries(
            Object.entries(data).map(([key, value]) => [key, String(value)])
          ),
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'live_location_channel',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log('✅ Successfully sent FCM notification:', response);
      return true;
    } catch (error) {
      console.error('❌ Error sending FCM notification:', error);

      // Handle invalid token
      if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
        console.log('⚠️  Invalid or unregistered token, should be removed from database');
      }

      return false;
    }
  }

  // Send live location request notification with Accept/Decline actions
  async sendLiveLocationRequest(deviceToken, sharerName, sessionId, sharerId) {
    const title = '📍 Live Location Request';
    const body = `${sharerName} wants to share their live location with you`;
    const data = {
      type: 'live-location-request',
      sessionId: sessionId,
      sharerId: sharerId,
      sharerName: sharerName,
    };

    if (!this.isInitialized) {
      console.log(`[LOG] Live location request to ${deviceToken}`);
      console.log(`[LOG] ${sharerName} wants to share location (Session: ${sessionId})`);
      return await this.sendNotificationToDevice(deviceToken, title, body, data);
    }

    try {
      const message = {
        token: deviceToken,
        notification: {
          title: title,
          body: body,
        },
        data: {
          type: 'live-location-request',
          sessionId: String(sessionId),
          sharerId: String(sharerId),
          sharerName: String(sharerName),
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'live_location_channel',
            clickAction: 'LIVE_LOCATION_REQUEST',
            // Android action buttons
            actions: [
              {
                action: 'accept',
                title: 'Accept',
                icon: 'ic_check',
              },
              {
                action: 'decline',
                title: 'Decline',
                icon: 'ic_close',
              },
            ],
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              category: 'LIVE_LOCATION_REQUEST',
              // iOS action buttons
              'thread-id': sessionId,
            },
            // iOS notification actions
            'notification-actions': [
              {
                identifier: 'accept',
                title: 'Accept',
              },
              {
                identifier: 'decline',
                title: 'Decline',
              },
            ],
          },
        },
        // Web push actions (if using web)
        webpush: {
          notification: {
            title: title,
            body: body,
            icon: '/icon.png',
            badge: '/badge.png',
            requireInteraction: true,
            actions: [
              {
                action: 'accept',
                title: 'Accept',
                icon: '/accept.png',
              },
              {
                action: 'decline',
                title: 'Decline',
                icon: '/decline.png',
              },
            ],
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log('✅ Live location request notification sent:', response);
      return true;
    } catch (error) {
      console.error('❌ Error sending live location request:', error);
      return false;
    }
  }

  // Send live location update notification
  async sendLiveLocationUpdate(deviceToken, sharerName, sessionId) {
    const title = '📍 Location Update';
    const body = `${sharerName} location updated`;
    const data = {
      type: 'live-location-update',
      sessionId: sessionId,
      sharerName: sharerName,
    };

    return await this.sendNotificationToDevice(deviceToken, title, body, data);
  }

  // Send notification to multiple devices
  async sendNotificationToMultipleDevices(deviceTokens, title, body, data = {}) {
    if (!this.isInitialized) {
      console.log(`[LOG] Sending notifications to ${deviceTokens.length} devices`);
      console.log(`[LOG] Title: ${title}, Body: ${body}`);
      deviceTokens.forEach((token, index) => {
        console.log(`[LOG] Device ${index + 1}: ${token}`);
      });
      return true;
    }

    try {
      const message = {
        tokens: deviceTokens,
        notification: {
          title: title,
          body: body,
        },
        data: {
          ...Object.fromEntries(
            Object.entries(data).map(([key, value]) => [key, String(value)])
          ),
        },
        android: {
          priority: 'high',
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`✅ Successfully sent ${response.successCount} notifications`);

      if (response.failureCount > 0) {
        console.log(`⚠️  ${response.failureCount} notifications failed`);
      }

      return response.successCount > 0;
    } catch (error) {
      console.error('❌ Error sending batch notifications:', error);
      return false;
    }
  }

  // Send live location request to multiple friends with action buttons
  async sendLiveLocationRequestToMultiple(deviceTokens, sharerName, sessionId, sharerId) {
    if (!this.isInitialized) {
      return await this.sendNotificationToMultipleDevices(
        deviceTokens,
        '📍 Live Location Request',
        `${sharerName} wants to share their live location with you`,
        {
          type: 'live-location-request',
          sessionId: sessionId,
          sharerName: sharerName,
          sharerId: sharerId,
        }
      );
    }

    try {
      // Use multicast message for better compatibility
      const message = {
        tokens: deviceTokens, // Array of tokens
        notification: {
          title: '📍 Live Location Request',
          body: `${sharerName} wants to share their live location with you`,
        },
        data: {
          type: 'live-location-request',
          sessionId: String(sessionId),
          sharerId: String(sharerId),
          sharerName: String(sharerName),
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'live_location_channel',
            clickAction: 'LIVE_LOCATION_REQUEST',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              category: 'LIVE_LOCATION_REQUEST',
              'thread-id': sessionId,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`✅ Sent ${response.successCount} live location requests`);

      if (response.failureCount > 0) {
        console.log(`⚠️  ${response.failureCount} notifications failed`);
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error(`   Token ${idx}: ${resp.error?.message}`);
          }
        });
      }

      return response.successCount > 0;
    } catch (error) {
      console.error('❌ Error sending live location requests:', error);
      return false;
    }
  }

}

module.exports = new PushNotificationService();
