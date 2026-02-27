import { AppRegistry } from 'react-native';
import App from './src/App'; // Update the path to point to src/App.js
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';

// ⚠️ CRITICAL: Register background message handler BEFORE AppRegistry
// This enables notifications to work when app is closed or in background
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
   console.log('📬 Background FCM notification received:', remoteMessage);

   // Android automatically displays notifications with 'notification' payload
   // This handler is for custom logic or data-only messages
   const { data } = remoteMessage;

   if (data?.type === 'live-location-request') {
      console.log('📍 Live location request in background:', data);
      // Notification will be displayed automatically by FCM
   }
});

AppRegistry.registerComponent(appName, () => App);