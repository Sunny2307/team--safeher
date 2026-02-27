const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db, admin } = require('../firebase');

// ─── Auth middleware — admin only ─────────────────────────────────────────────
const requireAdmin = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token provided' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
        req.userId = decoded.phoneNumber;
        req.role = decoded.role;
        next();
    } catch {
        res.status(403).json({ error: 'Invalid token' });
    }
};

// ─── GET /admin/doctors — list all doctors (including inactive) ───────────────
router.get('/doctors', requireAdmin, async (req, res) => {
    try {
        const snapshot = await db.collection('doctors').orderBy('createdAt', 'desc').get();
        const doctors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ success: true, doctors });
    } catch (err) {
        console.error('Admin list doctors error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch doctors' });
    }
});

// ─── POST /admin/doctors — add a new doctor ───────────────────────────────────
router.post('/doctors', requireAdmin, async (req, res) => {
    try {
        const {
            phoneNumber, name, specialization, hospital,
            experienceYears, languages, consultationFee,
            availabilitySlots, about,
        } = req.body;

        if (!phoneNumber || !name || !specialization) {
            return res.status(400).json({ error: 'phoneNumber, name, and specialization are required' });
        }

        // Ensure the user account exists (or create it)
        const userRef = db.collection('users').doc(phoneNumber);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            await userRef.set({
                phoneNumber,
                role: 'doctor',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        } else {
            await userRef.update({ role: 'doctor' });
        }

        // Create doctor document
        const doctorRef = db.collection('doctors').doc();
        const doctorData = {
            userId: phoneNumber,
            name,
            specialization,
            hospital: hospital || '',
            experienceYears: Number(experienceYears) || 0,
            languages: languages || [],
            consultationFee: Number(consultationFee) || 0,
            availabilitySlots: availabilitySlots || [],
            about: about || '',
            verified: true,  // admin-added doctors are verified by default
            active: true,
            rating: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await doctorRef.set(doctorData);

        res.status(201).json({
            success: true,
            doctor: { id: doctorRef.id, ...doctorData },
            message: `Doctor added. User ${phoneNumber} role set to doctor.`,
        });
    } catch (err) {
        console.error('Admin add doctor error:', err);
        res.status(500).json({ success: false, error: 'Failed to add doctor' });
    }
});

// ─── PUT /admin/doctors/:id — edit doctor details ─────────────────────────────
router.put('/doctors/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const allowedFields = [
            'name', 'specialization', 'hospital', 'experienceYears',
            'languages', 'consultationFee', 'availabilitySlots', 'about',
        ];
        const updates = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        await db.collection('doctors').doc(id).update(updates);
        res.json({ success: true, message: 'Doctor updated' });
    } catch (err) {
        console.error('Admin edit doctor error:', err);
        res.status(500).json({ success: false, error: 'Failed to update doctor' });
    }
});

// ─── PUT /admin/doctors/:id/toggle — activate / deactivate ───────────────────
router.put('/doctors/:id/toggle', requireAdmin, async (req, res) => {
    try {
        const docRef = db.collection('doctors').doc(req.params.id);
        const doc = await docRef.get();
        if (!doc.exists) return res.status(404).json({ error: 'Doctor not found' });

        const newActive = !doc.data().active;
        await docRef.update({ active: newActive });
        res.json({ success: true, active: newActive });
    } catch (err) {
        console.error('Admin toggle doctor error:', err);
        res.status(500).json({ success: false, error: 'Failed to toggle doctor status' });
    }
});

// ─── PUT /admin/doctors/:id/verify — verify / unverify ───────────────────────
router.put('/doctors/:id/verify', requireAdmin, async (req, res) => {
    try {
        const docRef = db.collection('doctors').doc(req.params.id);
        const doc = await docRef.get();
        if (!doc.exists) return res.status(404).json({ error: 'Doctor not found' });

        const newVerified = !doc.data().verified;
        await docRef.update({ verified: newVerified });
        res.json({ success: true, verified: newVerified });
    } catch (err) {
        console.error('Admin verify doctor error:', err);
        res.status(500).json({ success: false, error: 'Failed to update verification' });
    }
});

module.exports = router;
