const admin = require('firebase-admin');

// Initialize Firebase Admin with environment-based credentials
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  // Production: Read from environment variable
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    console.log('✅ Firebase credentials loaded from environment variable');
  } catch (error) {
    console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', error.message);
    process.exit(1);
  }
} else {
  // Development: Read from file
  try {
    serviceAccount = require('./serviceAccountKey.json');
    console.log('✅ Firebase credentials loaded from serviceAccountKey.json');
  } catch (error) {
    console.error('❌ Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT_JSON environment variable or add serviceAccountKey.json file');
    process.exit(1);
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

module.exports = { admin, db };