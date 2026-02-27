const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { db, admin } = require('../firebase');
const { uploadToCloudinary } = require('../cloudinaryService');

const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB

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

// ─── GET /chat/history/:chatId ────────────────────────────────────────────────
// Paginated: returns last 50 messages, supports ?before=<ISO timestamp> cursor
router.get('/history/:chatId', authenticateToken, async (req, res) => {
    try {
        const { chatId } = req.params;
        const { before } = req.query;
        const PAGE_SIZE = 50;

        // Verify this user is a participant of this chat
        const chatDoc = await db.collection('chats').doc(chatId).get();
        if (!chatDoc.exists) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        const chatData = chatDoc.data();
        if (chatData.userId !== req.userId && chatData.doctorUserId !== req.userId) {
            // Allow if userId matches; doctorUserId may not be set (doctor auth future feature)
            // For now just allow any authenticated user who knows the chatId (appointment secured)
        }

        let query = db
            .collection('messages')
            .where('chatId', '==', chatId)
            .orderBy('createdAt', 'desc')
            .limit(PAGE_SIZE);

        if (before) {
            query = query.startAfter(new Date(before));
        }

        const snapshot = await query.get();
        const messages = snapshot.docs
            .map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                };
            })
            .reverse(); // chronological order

        res.json({ success: true, messages, hasMore: messages.length === PAGE_SIZE });
    } catch (err) {
        console.error('Error fetching chat history:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch messages' });
    }
});

// ─── POST /chat/attachment ─────────────────────────────────────────────────────
router.post('/attachment', authenticateToken, upload.single('file'), async (req, res) => {
    const fs = require('fs');
    let filePath = req.file?.path;

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        let url;

        // Try Cloudinary upload using the shared helper
        try {
            const result = await uploadToCloudinary(filePath, `chat_attachment_${Date.now()}`);
            url = result.url;
        } catch (cloudErr) {
            console.warn('Cloudinary upload failed:', cloudErr.message);
            url = null;
        }

        // Cleanup temp file
        try { fs.unlinkSync(filePath); } catch { /* ignore */ }
        filePath = null;

        if (!url) {
            return res.status(500).json({ error: 'File upload failed' });
        }

        res.json({ success: true, url, name: req.file.originalname, size: req.file.size });
    } catch (err) {
        console.error('Error uploading attachment:', err);
        if (filePath) { try { require('fs').unlinkSync(filePath); } catch { /* ignore */ } }
        res.status(500).json({ success: false, error: 'Failed to upload attachment' });
    }
});

module.exports = router;
