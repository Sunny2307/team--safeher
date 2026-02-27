const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db, admin } = require('../firebase');

// ─── Auth middleware — doctor only ────────────────────────────────────────────
const requireDoctor = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token provided' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'doctor' && decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Doctor access required' });
        }
        req.userId = decoded.phoneNumber;
        req.role = decoded.role;
        next();
    } catch {
        res.status(403).json({ error: 'Invalid token' });
    }
};

// ─── GET /doctor/profile — get doctor's own profile ──────────────────────────
router.get('/profile', requireDoctor, async (req, res) => {
    try {
        const snapshot = await db.collection('doctors')
            .where('userId', '==', req.userId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.status(404).json({ error: 'Doctor profile not found' });
        }

        const doc = snapshot.docs[0];
        res.json({ success: true, doctor: { id: doc.id, ...doc.data() } });
    } catch (err) {
        console.error('Get doctor profile error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch profile' });
    }
});

// ─── PUT /doctor/availability — update availability slots ─────────────────────
router.put('/availability', requireDoctor, async (req, res) => {
    try {
        const { availabilitySlots } = req.body;
        if (!Array.isArray(availabilitySlots)) {
            return res.status(400).json({ error: 'availabilitySlots must be an array' });
        }

        const snapshot = await db.collection('doctors')
            .where('userId', '==', req.userId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.status(404).json({ error: 'Doctor profile not found' });
        }

        await snapshot.docs[0].ref.update({ availabilitySlots });
        res.json({ success: true, message: 'Availability updated' });
    } catch (err) {
        console.error('Update availability error:', err);
        res.status(500).json({ success: false, error: 'Failed to update availability' });
    }
});

// ─── GET /doctor/appointments — get doctor's appointments ─────────────────────
router.get('/appointments', requireDoctor, async (req, res) => {
    try {
        // Get the doctor's document ID first
        const doctorSnap = await db.collection('doctors')
            .where('userId', '==', req.userId)
            .limit(1)
            .get();

        if (doctorSnap.empty) return res.status(404).json({ error: 'Doctor profile not found' });

        const doctorId = doctorSnap.docs[0].id;
        const snapshot = await db.collection('appointments')
            .where('doctorId', '==', doctorId)
            .get();

        const appointments = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                scheduledAt: data.scheduledAt?.toDate?.()?.toISOString() || data.scheduledAt,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            };
        }).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

        res.json({ success: true, appointments });
    } catch (err) {
        console.error('Get doctor appointments error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch appointments' });
    }
});

// ─── PUT /doctor/appointments/:id/accept ─────────────────────────────────────
router.put('/appointments/:id/accept', requireDoctor, async (req, res) => {
    try {
        const apptRef = db.collection('appointments').doc(req.params.id);
        const apptDoc = await apptRef.get();
        if (!apptDoc.exists) return res.status(404).json({ error: 'Appointment not found' });

        await apptRef.update({
            status: 'accepted',
            acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Notify patient
        try {
            const appt = apptDoc.data();
            const userDoc = await db.collection('users').doc(appt.userId).get();
            const token = userDoc.data()?.deviceToken;
            if (token) {
                const pushNotificationService = require('../pushNotificationService');
                await pushNotificationService.sendNotificationToDevice(
                    token,
                    '✅ Appointment Accepted',
                    `Dr. ${appt.doctorName} has accepted your appointment.`,
                    { type: 'appointment-accepted', appointmentId: req.params.id }
                );
            }
        } catch { /* non-fatal */ }

        res.json({ success: true, message: 'Appointment accepted' });
    } catch (err) {
        console.error('Accept appointment error:', err);
        res.status(500).json({ success: false, error: 'Failed to accept appointment' });
    }
});

// ─── PUT /doctor/appointments/:id/cancel ─────────────────────────────────────
router.put('/appointments/:id/cancel', requireDoctor, async (req, res) => {
    try {
        const apptRef = db.collection('appointments').doc(req.params.id);
        const apptDoc = await apptRef.get();
        if (!apptDoc.exists) return res.status(404).json({ error: 'Appointment not found' });

        await apptRef.update({
            status: 'cancelled',
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            cancelledBy: 'doctor',
        });

        res.json({ success: true, message: 'Appointment cancelled' });
    } catch (err) {
        console.error('Doctor cancel appointment error:', err);
        res.status(500).json({ success: false, error: 'Failed to cancel appointment' });
    }
});

// ─── PUT /doctor/appointments/:id/complete ────────────────────────────────────
router.put('/appointments/:id/complete', requireDoctor, async (req, res) => {
    try {
        const apptRef = db.collection('appointments').doc(req.params.id);
        const apptDoc = await apptRef.get();
        if (!apptDoc.exists) return res.status(404).json({ error: 'Appointment not found' });

        await apptRef.update({
            status: 'completed',
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.json({ success: true, message: 'Appointment marked as completed' });
    } catch (err) {
        console.error('Complete appointment error:', err);
        res.status(500).json({ success: false, error: 'Failed to complete appointment' });
    }
});

module.exports = router;
