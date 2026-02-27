const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db, admin } = require('../firebase');

const TYPES = ['diet', 'exercise', 'lifestyle', 'medical'];
const PAGE_SIZE = 30;

const authenticateToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    req.userId = decoded.phoneNumber;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
};

const requireAdminOrDoctor = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin' && decoded.role !== 'doctor') return res.status(403).json({ error: 'Admin or doctor access required' });
    req.userId = decoded.phoneNumber;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// GET /pcos/resources — list resources (optional type filter), cache-friendly
router.get('/resources', authenticateToken, async (req, res) => {
  try {
    const { type, limit, cursor } = req.query;
    const limitNum = Math.min(parseInt(limit, 10) || PAGE_SIZE, 50);
    let query = db.collection('pcos_resources')
      .orderBy('createdAt', 'desc')
      .limit(limitNum + 1);
    if (type && TYPES.includes(type)) {
      query = db.collection('pcos_resources')
        .where('type', '==', type)
        .orderBy('createdAt', 'desc')
        .limit(limitNum + 1);
    }
    if (cursor) {
      try {
        const doc = await db.collection('pcos_resources').doc(cursor).get();
        if (doc.exists) query = query.startAfter(doc);
      } catch (_) {}
    }
    const snapshot = await query.get();
    const docs = snapshot.docs.slice(0, limitNum);
    const resources = docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        title: d.title,
        content: d.content,
        type: d.type,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() || null,
      };
    });
    const nextCursor = docs.length === limitNum && snapshot.docs.length > limitNum ? docs[docs.length - 1].id : null;
    res.set('Cache-Control', 'public, max-age=300'); // 5 min
    res.json({ success: true, resources, nextCursor });
  } catch (err) {
    console.error('PCOS list resources error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch resources' });
  }
});

// POST /pcos/resources — admin or doctor create
router.post('/resources', requireAdminOrDoctor, async (req, res) => {
  try {
    const { title, content, type } = req.body || {};
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
    const resourceType = type && TYPES.includes(type) ? type : 'lifestyle';
    const ref = db.collection('pcos_resources').doc();
    await ref.set({
      title: title.trim(),
      content: content.trim(),
      type: resourceType,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const created = await ref.get();
    const d = created.data();
    res.status(201).json({
      success: true,
      resource: {
        id: ref.id,
        title: d.title,
        content: d.content,
        type: d.type,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() || null,
      },
    });
  } catch (err) {
    console.error('PCOS create resource error:', err);
    res.status(500).json({ success: false, error: 'Failed to create resource' });
  }
});

// PUT /pcos/resources/:id — admin update
router.put('/resources/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, type } = req.body || {};
    const ref = db.collection('pcos_resources').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Resource not found' });
    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (content !== undefined) updates.content = content.trim();
    if (type !== undefined && TYPES.includes(type)) updates.type = type;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    await ref.update(updates);
    res.json({ success: true, message: 'Resource updated' });
  } catch (err) {
    console.error('PCOS update resource error:', err);
    res.status(500).json({ success: false, error: 'Failed to update resource' });
  }
});

// DELETE /pcos/resources/:id — admin delete
router.delete('/resources/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const ref = db.collection('pcos_resources').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Resource not found' });
    await ref.delete();
    res.json({ success: true, message: 'Resource deleted' });
  } catch (err) {
    console.error('PCOS delete resource error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete resource' });
  }
});

module.exports = router;
