const express = require('express');
const router = express.Router();
const { authenticate } = require('./authRoutes');
const symptomService = require('../services/symptomService');

// POST /api/symptoms/add
router.post('/add', authenticate, async (req, res) => {
    try {
        const { date, symptoms, mood, flow, painLevel, notes } = req.body;

        if (!date) {
            return res.status(400).json({ error: 'Date is required' });
        }

        const symptom = await symptomService.addOrUpdateSymptom(req.user.phoneNumber, {
            date, symptoms, mood, flow, painLevel, notes
        });

        res.status(201).json({ success: true, symptom });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/symptoms/history
router.get('/history', authenticate, async (req, res) => {
    try {
        const history = await symptomService.getSymptomHistory(req.user.phoneNumber);
        res.json({ success: true, history });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/symptoms/:date
router.get('/:date', authenticate, async (req, res) => {
    try {
        const { date } = req.params;
        const symptom = await symptomService.getSymptomByDate(req.user.phoneNumber, date);
        res.json({ success: true, symptom });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
