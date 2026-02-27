const express = require('express');
const router = express.Router();
const { authenticate } = require('./authRoutes');
const cycleService = require('../services/cycleService');

// POST /api/cycle/add
router.post('/add', authenticate, async (req, res) => {
    try {
        const { startDate, endDate, notes } = req.body;

        if (!startDate) {
            return res.status(400).json({ error: 'Start date is required' });
        }

        const cycle = await cycleService.addCycle(req.user.phoneNumber, { startDate, endDate, notes });
        res.status(201).json({ success: true, cycle });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/cycle/history
router.get('/history', authenticate, async (req, res) => {
    try {
        const cycles = await cycleService.getCycles(req.user.phoneNumber);
        res.json({ success: true, cycles });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/cycle/update/:id
router.put('/update/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const cycle = await cycleService.updateCycle(req.user.phoneNumber, id, req.body);
        res.json({ success: true, cycle });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/cycle/delete/:id
router.delete('/delete/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        await cycleService.deleteCycle(req.user.phoneNumber, id);
        res.json({ success: true, message: 'Cycle deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/cycle/prediction
router.get('/prediction', authenticate, async (req, res) => {
    try {
        const predictions = await cycleService.getPredictions(req.user.phoneNumber);
        res.json({ success: true, predictions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
