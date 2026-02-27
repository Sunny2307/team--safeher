// test-notification.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// Get FCM token from your app's console log
const fcmToken = 'cad1GslUSFOp5nYVsxpNlE:APA91bEbAv-k_g_GtdFlG1o7FqJyKovBa_dZj-zaPVj6h4pYqATkbxzPaxr_rwJqm_HoXYU5LHMB75eUKghl0FK3yquTA1KHLul6fpmil6Yu0IK6nXwbsqQ';

const message = {
    notification: {
        title: '🔔 Test Notification',
        body: 'FCM is working perfectly!'
    },
    token: fcmToken
};

admin.messaging().send(message)
    .then((response) => {
        console.log('✅ Successfully sent message:', response);
    })
    .catch((error) => {
        console.log('❌ Error sending message:', error);
    });