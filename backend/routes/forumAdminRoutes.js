const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db, admin } = require('../firebase');

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

router.use(requireAdmin);

// GET /forum/admin/reported — list reported or hidden posts
router.get('/reported', async (req, res) => {
  try {
    const { status, category, limit, cursor } = req.query;
    const limitNum = Math.min(parseInt(limit, 10) || 20, 50);
    const useHidden = status === 'hidden';
    let query = db.collection('forum_posts')
      .where(useHidden ? 'isHidden' : 'isReported', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(limitNum + 1);
    if (category) {
      query = db.collection('forum_posts')
        .where(useHidden ? 'isHidden' : 'isReported', '==', true)
        .where('category', '==', category)
        .orderBy('createdAt', 'desc')
        .limit(limitNum + 1);
    }
    if (cursor) {
      try {
        const doc = await db.collection('forum_posts').doc(cursor).get();
        if (doc.exists) query = query.startAfter(doc);
      } catch (_) {}
    }

    const snapshot = await query.get();
    const docs = snapshot.docs.slice(0, limitNum);
    const posts = docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        anonymousName: d.anonymousName,
        title: d.title,
        content: d.content?.substring?.(0, 300),
        category: d.category,
        likesCount: d.likesCount,
        commentsCount: d.commentsCount,
        reportsCount: d.reportsCount,
        isReported: d.isReported,
        isHidden: d.isHidden,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() || null,
        userId: d.userId,
      };
    });
    const nextCursor = docs.length === limitNum && snapshot.docs.length > limitNum ? docs[docs.length - 1].id : null;
    res.json({ success: true, posts, nextCursor });
  } catch (err) {
    console.error('Forum admin reported list error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch reported posts' });
  }
});

// GET /forum/admin/post/:id — full post + reports (admin only)
router.get('/post/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const postSnap = await db.collection('forum_posts').doc(id).get();
    if (!postSnap.exists) return res.status(404).json({ error: 'Post not found' });
    const postData = postSnap.data();
    const reportsSnap = await db.collection('forum_reports').where('postId', '==', id).orderBy('createdAt', 'desc').get();
    const reports = reportsSnap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        reason: d.reason,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() || null,
        reportedBy: d.reportedBy,
      };
    });
    res.json({
      success: true,
      post: {
        id: postSnap.id,
        userId: postData.userId,
        anonymousName: postData.anonymousName,
        title: postData.title,
        content: postData.content,
        category: postData.category,
        likesCount: postData.likesCount,
        commentsCount: postData.commentsCount,
        reportsCount: postData.reportsCount,
        isReported: postData.isReported,
        isHidden: postData.isHidden,
        createdAt: postData.createdAt?.toDate?.()?.toISOString?.() || null,
      },
      reports,
    });
  } catch (err) {
    console.error('Forum admin get post error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch post' });
  }
});

// POST /forum/admin/post/:id/hide
router.post('/post/:id/hide', async (req, res) => {
  try {
    const { id } = req.params;
    const ref = db.collection('forum_posts').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Post not found' });
    await ref.update({
      isHidden: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true, message: 'Post hidden' });
  } catch (err) {
    console.error('Forum admin hide error:', err);
    res.status(500).json({ success: false, error: 'Failed to hide post' });
  }
});

// POST /forum/admin/post/:id/unhide
router.post('/post/:id/unhide', async (req, res) => {
  try {
    const { id } = req.params;
    const ref = db.collection('forum_posts').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Post not found' });
    await ref.update({
      isHidden: false,
      isReported: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true, message: 'Post unhidden' });
  } catch (err) {
    console.error('Forum admin unhide error:', err);
    res.status(500).json({ success: false, error: 'Failed to unhide post' });
  }
});

// POST /forum/admin/user/:userId/ban — set isBanned in forum_user_meta
router.post('/user/:userId/ban', async (req, res) => {
  try {
    const { userId } = req.params;
    await db.collection('forum_user_meta').doc(userId).set({
      isBanned: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    res.json({ success: true, message: 'User banned from forum' });
  } catch (err) {
    console.error('Forum admin ban error:', err);
    res.status(500).json({ success: false, error: 'Failed to ban user' });
  }
});

module.exports = router;
