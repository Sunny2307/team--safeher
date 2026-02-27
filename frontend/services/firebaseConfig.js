// @react-native-firebase automatically reads configuration from google-services.json (Android)
// and GoogleService-Info.plist (iOS), so no manual config is needed

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import messaging from '@react-native-firebase/messaging';

// Get instances - these will use the config from google-services.json
const db = firestore();
const fcmMessaging = messaging();
const authInstance = auth();
const functionsInstance = functions();

console.log('✅ Firebase services initialized from google-services.json');

export { authInstance as auth, db, functionsInstance as functions, fcmMessaging };