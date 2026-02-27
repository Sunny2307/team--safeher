const cron = require('node-cron');
const { db } = require('../firebase');
const pushNotificationService = require('../pushNotificationService');
const cycleService = require('./cycleService');

class NotificationScheduler {
    constructor() {
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;

        // Run every day at 9:00 AM
        cron.schedule('0 9 * * *', async () => {
            console.log('⏰ Running daily cycle notification check...');
            await this.checkAndSendNotifications();
        });

        this.isInitialized = true;
        console.log('✅ Cycle notification scheduler initialized (9:00 AM daily)');
    }

    async checkAndSendNotifications() {
        try {
            // Get all users who have cycle data
            // optimization: getting all users might be heavy, but for now it's okay.
            // Better approach: query users collection.
            const usersSnapshot = await db.collection('users').get();

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const promises = usersSnapshot.docs.map(async (userDoc) => {
                const userId = userDoc.id;
                const userData = userDoc.data();
                const deviceToken = userData.deviceToken;

                if (!deviceToken) return;

                // Get predictions
                const prediction = await cycleService.getPredictions(userId);

                if (!prediction) return;

                const nextPeriod = new Date(prediction.nextPeriodDate);
                nextPeriod.setHours(0, 0, 0, 0);

                const fertileStart = new Date(prediction.fertileWindow.start);
                fertileStart.setHours(0, 0, 0, 0);

                const ovulation = new Date(prediction.ovulationDate);
                ovulation.setHours(0, 0, 0, 0);

                // 1. Check for Period Tomorrow
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);

                if (nextPeriod.getTime() === tomorrow.getTime()) {
                    await pushNotificationService.sendNotificationToDevice(
                        deviceToken,
                        'Period Reminder',
                        'Your period is predicted to start tomorrow.',
                        { type: 'cycle_alert' }
                    );
                }

                // 2. Check for Fertile Window Start
                if (fertileStart.getTime() === today.getTime()) {
                    await pushNotificationService.sendNotificationToDevice(
                        deviceToken,
                        'Fertile Window Started',
                        'Your fertile window starts today. High chance of conception.',
                        { type: 'cycle_alert' }
                    );
                }

                // 3. Check for Ovulation Day
                if (ovulation.getTime() === today.getTime()) {
                    await pushNotificationService.sendNotificationToDevice(
                        deviceToken,
                        'Ovulation Day',
                        'Today is your predicted ovulation day.',
                        { type: 'cycle_alert' }
                    );
                }

                // 4. Late Period check (e.g., 3 days late)
                /*
                const lateThreshold = new Date(nextPeriod);
                lateThreshold.setDate(lateThreshold.getDate() + 3);
                if (lateThreshold.getTime() === today.getTime()) {
                   await pushNotificationService.sendNotificationToDevice(
                    deviceToken,
                    'Period Late?',
                    'Your period seems to be late based on predictions.',
                    { type: 'cycle_alert' }
                  );
                }
                */

            });

            await Promise.all(promises);
            console.log('✅ Cycle notifications checked and sent.');

        } catch (error) {
            console.error('Error in cycle notification scheduler:', error);
        }
    }
}

module.exports = new NotificationScheduler();
