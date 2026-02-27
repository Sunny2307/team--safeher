const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db } = require('../firebase');

// Middleware to verify admin access
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

// GET /config/features - Publicly accessible
router.get('/features', async (req, res) => {
    try {
        const docRef = db.collection('config').doc('appFeatures');
        const doc = await docRef.get();

        let features = {};
        if (doc.exists) {
            features = doc.data();
        } else {
            // Default configuration if it doesn't exist
            features = {
                liveLocation: true,
                stressAssessment: true,
                friends: true,
                pcos: true,
                forum: true,
                appointment: true,
                cycleTracker: true,
                emergencyLocator: true
            };
            await docRef.set(features);
        }

        res.json({ success: true, features });
    } catch (err) {
        console.error('Error fetching feature configuration:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch features' });
    }
});

// PUT /config/features - Admin only
router.put('/features', requireAdmin, async (req, res) => {
    try {
        const { features } = req.body;
        if (!features || typeof features !== 'object') {
            return res.status(400).json({ error: 'Invalid features format' });
        }

        const docRef = db.collection('config').doc('appFeatures');
        // Merge true so we only update the keys provided without deleting others
        await docRef.set(features, { merge: true });

        // Fetch the updated features to return to the caller
        const updatedDoc = await docRef.get();
        res.json({ success: true, features: updatedDoc.data() });
    } catch (err) {
        console.error('Error updating feature configuration:', err);
        res.status(500).json({ success: false, error: 'Failed to update features' });
    }
});

module.exports = router;
