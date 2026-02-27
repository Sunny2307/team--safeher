const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db, admin } = require('../firebase');
const pushNotificationService = require('../pushNotificationService');

// ─── Auth middleware ───────────────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token provided' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.phoneNumber;
        next();
    } catch {
        res.status(403).json({ error: 'Invalid token' });
    }
};

// ─── Helper: get device token for a user ─────────────────────────────────────
async function getDeviceToken(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        return userDoc.exists ? userDoc.data()?.deviceToken : null;
    } catch {
        return null;
    }
}

// ─── POST /appointments/book ──────────────────────────────────────────────────
router.post('/book', authenticateToken, async (req, res) => {
    try {
        const { doctorId, scheduledAt, notes } = req.body;
        if (!doctorId || !scheduledAt) {
            return res.status(400).json({ error: 'doctorId and scheduledAt are required' });
        }

        // Validate doctor exists
        const doctorDoc = await db.collection('doctors').doc(doctorId).get();
        if (!doctorDoc.exists) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        const doctorData = doctorDoc.data();
        const meetingRoomId = require('crypto').randomUUID();
        const chatId = `${req.userId}_${doctorId}_${Date.now()}`;

        const appointmentRef = db.collection('appointments').doc();
        const appointmentData = {
            userId: req.userId,
            doctorId,
            doctorName: doctorData.name,
            scheduledAt: new Date(scheduledAt),
            status: 'scheduled',
            meetingRoomId,
            chatId,
            notes: notes || '',
            reminderSent: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await appointmentRef.set(appointmentData);

        // Initialize the chat document
        await db.collection('chats').doc(chatId).set({
            appointmentId: appointmentRef.id,
            userId: req.userId,
            doctorId,
            doctorName: doctorData.name,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Send confirmation FCM notification to patient
        const deviceToken = await getDeviceToken(req.userId);
        if (deviceToken) {
            const appointmentDate = new Date(scheduledAt);
            const dateStr = appointmentDate.toLocaleDateString('en-IN', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            });
            const timeStr = appointmentDate.toLocaleTimeString('en-IN', {
                hour: '2-digit', minute: '2-digit',
            });
            await pushNotificationService.sendNotificationToDevice(
                deviceToken,
                '✅ Appointment Confirmed',
                `Your appointment with ${doctorData.name} is confirmed for ${dateStr} at ${timeStr}`,
                { type: 'appointment-confirmation', appointmentId: appointmentRef.id, meetingRoomId, chatId }
            );
        }

        // Send FCM notification to doctor
        try {
            const doctorUserRef = db.collection('users').doc(doctorData.userId);
            const doctorUserDoc = await doctorUserRef.get();
            const doctorToken = doctorUserDoc.data()?.deviceToken;
            if (doctorToken) {
                const apptDate = new Date(scheduledAt);
                const apptStr = apptDate.toLocaleDateString('en-IN', {
                    weekday: 'short', month: 'short', day: 'numeric',
                }) + ' at ' + apptDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                await pushNotificationService.sendNotificationToDevice(
                    doctorToken,
                    '📅 New Appointment',
                    `New appointment booked for ${apptStr}`,
                    { type: 'new-appointment', appointmentId: appointmentRef.id }
                );
            }
        } catch (notifErr) {
            console.warn('Doctor FCM notification failed (non-fatal):', notifErr.message);
        }

        res.json({
            success: true,
            appointment: { id: appointmentRef.id, ...appointmentData, scheduledAt },
        });
    } catch (err) {
        console.error('Error booking appointment:', err);
        res.status(500).json({ success: false, error: 'Failed to book appointment' });
    }
});

// ─── GET /appointments/user ───────────────────────────────────────────────────
router.get('/user', authenticateToken, async (req, res) => {
    try {
        // Single where clause — no composite index required.
        // Sort by scheduledAt is done in memory.
        const snapshot = await db
            .collection('appointments')
            .where('userId', '==', req.userId)
            .get();

        const appointments = snapshot.docs
            .map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    scheduledAt: data.scheduledAt?.toDate?.()?.toISOString() || data.scheduledAt,
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                };
            })
            .sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));

        res.json({ success: true, appointments });
    } catch (err) {
        console.error('Error fetching user appointments:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch appointments' });
    }
});

// ─── GET /appointments/doctor ─────────────────────────────────────────────────
router.get('/doctor', authenticateToken, async (req, res) => {
    try {
        const { doctorId } = req.query;
        if (!doctorId) return res.status(400).json({ error: 'doctorId query param required' });

        const snapshot = await db
            .collection('appointments')
            .where('doctorId', '==', doctorId)
            .get();

        const appointments = snapshot.docs
            .map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    scheduledAt: data.scheduledAt?.toDate?.()?.toISOString() || data.scheduledAt,
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                };
            })
            .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

        res.json({ success: true, appointments });
    } catch (err) {
        console.error('Error fetching doctor appointments:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch appointments' });
    }
});

// ─── PUT /appointments/cancel/:id ─────────────────────────────────────────────
router.put('/cancel/:id', authenticateToken, async (req, res) => {
    try {
        const apptRef = db.collection('appointments').doc(req.params.id);
        const apptDoc = await apptRef.get();

        if (!apptDoc.exists) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        const appt = apptDoc.data();
        if (appt.userId !== req.userId) {
            return res.status(403).json({ error: 'Not authorised to cancel this appointment' });
        }
        if (appt.status === 'cancelled') {
            return res.status(400).json({ error: 'Appointment is already cancelled' });
        }

        await apptRef.update({
            status: 'cancelled',
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.json({ success: true, message: 'Appointment cancelled successfully' });
    } catch (err) {
        console.error('Error cancelling appointment:', err);
        res.status(500).json({ success: false, error: 'Failed to cancel appointment' });
    }
});

module.exports = router;
