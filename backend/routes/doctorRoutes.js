const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db, admin } = require('../firebase');

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

// ─── GET /doctors — only active & verified ────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Single-field where avoids composite index requirement.
        // verified filter + rating sort are done in memory.
        const snapshot = await db.collection('doctors')
            .where('active', '==', true)
            .get();

        const doctors = snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((d) => d.verified === true)
            .sort((a, b) => (b.rating || 0) - (a.rating || 0));

        res.json({ success: true, doctors });
    } catch (err) {
        console.error('Error fetching doctors:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch doctors' });
    }
});

// ─── GET /doctors/:id ─────────────────────────────────────────────────────────
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const doc = await db.collection('doctors').doc(req.params.id).get();
        if (!doc.exists) {
            return res.status(404).json({ success: false, error: 'Doctor not found' });
        }
        res.json({ success: true, doctor: { id: doc.id, ...doc.data() } });
    } catch (err) {
        console.error('Error fetching doctor:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch doctor' });
    }
});

module.exports = router;
