const cron = require('node-cron');
const { db, admin } = require('../firebase');
const pushNotificationService = require('../pushNotificationService');

/**
 * Appointment Reminder Service
 * Runs every minute, checks for appointments starting in the next 30-31 minutes,
 * and sends FCM push notifications for those that haven't had a reminder sent yet.
 */

async function checkAndSendReminders() {
    try {
        const now = new Date();
        const windowStart = new Date(now.getTime() + 29 * 60 * 1000); // 29 min from now
        const windowEnd = new Date(now.getTime() + 31 * 60 * 1000); // 31 min from now

        const snapshot = await db
            .collection('appointments')
            .where('status', '==', 'scheduled')
            .where('reminderSent', '==', false)
            .where('scheduledAt', '>=', windowStart)
            .where('scheduledAt', '<=', windowEnd)
            .get();

        if (snapshot.empty) return;

        console.log(`🔔 Found ${snapshot.size} appointment(s) needing reminders`);

        const batch = db.batch();

        for (const doc of snapshot.docs) {
            const appt = doc.data();

            // Get user device token
            let deviceToken = null;
            try {
                const userDoc = await db.collection('users').doc(appt.userId).get();
                deviceToken = userDoc.exists ? userDoc.data()?.deviceToken : null;
            } catch (e) {
                console.warn(`Could not get device token for user ${appt.userId}:`, e.message);
            }

            if (deviceToken) {
                const scheduledAt = appt.scheduledAt?.toDate?.() || new Date(appt.scheduledAt);
                const timeStr = scheduledAt.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                });

                await pushNotificationService.sendNotificationToDevice(
                    deviceToken,
                    '⏰ Appointment Reminder',
                    `Your appointment with ${appt.doctorName} starts in 30 minutes at ${timeStr}`,
                    {
                        type: 'appointment-reminder',
                        appointmentId: doc.id,
                        meetingRoomId: appt.meetingRoomId || '',
                        chatId: appt.chatId || '',
                    }
                );
                console.log(`✅ Reminder sent for appointment ${doc.id} (user: ${appt.userId})`);
            } else {
                console.warn(`⚠️  No device token for user ${appt.userId}, skipping reminder`);
            }

            // Mark reminder as sent regardless
            batch.update(doc.ref, {
                reminderSent: true,
                reminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        await batch.commit();
    } catch (err) {
        console.error('❌ Error in appointment reminder check:', err.message);
    }
}

function init() {
    // Run every minute
    cron.schedule('* * * * *', checkAndSendReminders);
    console.log('✅ Appointment reminder service initialized (checks every minute)');
}

module.exports = { init };
