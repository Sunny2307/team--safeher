const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db, admin } = require('../firebase');

const REPORT_THRESHOLD = parseInt(process.env.FORUM_REPORT_THRESHOLD, 10) || 3;
const MAX_POSTS_PER_HOUR = parseInt(process.env.FORUM_MAX_POSTS_PER_HOUR, 10) || 5;
const MAX_COMMENTS_PER_HOUR = parseInt(process.env.FORUM_MAX_COMMENTS_PER_HOUR, 10) || 20;
const TITLE_MAX = 200;
const CONTENT_MAX = 5000;
const COMMENT_MAX = 1000;
const PAGE_SIZE = 20;
const COMMENT_PAGE_SIZE = 50;

const CATEGORIES = ['PCOS', 'periods', 'fertility', 'mental_health', 'safety', 'other'];

// Simple profanity blocklist (extend as needed)
const BLOCKED_WORDS = [
  'abuseword1', 'abuseword2', // placeholder; add real list in production
];

function containsBlockedWord(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase();
  return BLOCKED_WORDS.some(word => lower.includes(word));
}

const authenticateToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.phoneNumber;
    req.role = decoded.role || 'user';
    next();
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
};

async function ensureForumProfile(req, res, next) {
  try {
    const userId = req.userId;
    const role = req.role || 'user';
    
    // If doctor, fetch doctor name
    if (role === 'doctor') {
      try {
        const doctorsSnap = await db.collection('doctors').where('userId', '==', userId).limit(1).get();
        if (!doctorsSnap.empty) {
          const doctorData = doctorsSnap.docs[0].data();
          req.isDoctor = true;
          req.doctorName = doctorData.name || 'Doctor';
          req.anonymousName = doctorData.name || 'Doctor'; // Use doctor name as display name
          return next();
        }
      } catch (err) {
        console.warn('Failed to fetch doctor name:', err);
      }
    }
    
    // Regular user: use anonymous alias
    const profileRef = db.collection('forum_profiles').doc(userId);
    let profileSnap = await profileRef.get();
    if (!profileSnap.exists) {
      const num = Math.floor(1000 + Math.random() * 9000);
      const anonymousName = `User_${num}`;
      await profileRef.set({
        userId,
        anonymousName,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      req.anonymousName = anonymousName;
      req.isDoctor = false;
    } else {
      req.anonymousName = profileSnap.data().anonymousName;
      req.isDoctor = false;
    }
    next();
  } catch (err) {
    console.error('ensureForumProfile error:', err);
    res.status(500).json({ error: 'Failed to get forum profile' });
  }
}

function forumRateLimiter(action) {
  return async (req, res, next) => {
    try {
      const userId = req.userId;
      const metaRef = db.collection('forum_user_meta').doc(userId);
      const metaSnap = await metaRef.get();
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      let meta = metaSnap.exists ? metaSnap.data() : {};
      let postCountHour = meta.postCountHour || 0;
      let commentCountHour = meta.commentCountHour || 0;
      const lastPostAt = meta.lastPostAt?.toMillis?.() || 0;
      const lastCommentAt = meta.lastCommentAt?.toMillis?.() || 0;

      if (action === 'post') {
        if (now - lastPostAt > oneHour) postCountHour = 0;
        if (postCountHour >= MAX_POSTS_PER_HOUR) {
          return res.status(429).json({ error: 'Too many posts. Please try again later.' });
        }
      } else if (action === 'comment') {
        if (now - lastCommentAt > oneHour) commentCountHour = 0;
        if (commentCountHour >= MAX_COMMENTS_PER_HOUR) {
          return res.status(429).json({ error: 'Too many comments. Please try again later.' });
        }
      }

      const isBanned = meta.isBanned === true;
      if (isBanned) return res.status(403).json({ error: 'You are not allowed to post or comment.' });

      req._forumMeta = { postCountHour, commentCountHour, lastPostAt, lastCommentAt };
      next();
    } catch (err) {
      console.error('forumRateLimiter error:', err);
      res.status(500).json({ error: 'Rate limit check failed' });
    }
  };
}

function contentModeration(req, res, next) {
  const body = req.body || {};
  const title = (body.title || '').trim();
  const content = (body.content || '').trim();
  const comment = (body.comment || '').trim();
  if (title && (title.length > TITLE_MAX || containsBlockedWord(title))) {
    return res.status(400).json({ error: 'Invalid or too long title.' });
  }
  if (content && (content.length > CONTENT_MAX || containsBlockedWord(content))) {
    return res.status(400).json({ error: 'Invalid or too long content.' });
  }
  if (comment && (comment.length > COMMENT_MAX || containsBlockedWord(comment))) {
    return res.status(400).json({ error: 'Invalid or too long comment.' });
  }
  next();
}

// ——— POST /forum/posts —————————————————————————————————————————————————————
router.post('/posts', authenticateToken, forumRateLimiter('post'), ensureForumProfile, contentModeration, async (req, res) => {
  try {
    const { title, content, category } = req.body || {};
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    if (category && !CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    const postRef = db.collection('forum_posts').doc();
    const data = {
      userId: req.userId,
      anonymousName: req.anonymousName,
      title: title.trim(),
      content: content.trim(),
      category: category || 'other',
      likesCount: 0,
      commentsCount: 0,
      reportsCount: 0,
      isReported: false,
      isHidden: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await postRef.set(data);

    const metaRef = db.collection('forum_user_meta').doc(req.userId);
    const update = {
      lastPostAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      postCountHour: admin.firestore.FieldValue.increment(1),
    };
    await metaRef.set(update, { merge: true });

    const created = await postRef.get();
    const d = created.data();
    res.status(201).json({
      success: true,
      post: {
        id: postRef.id,
        anonymousName: d.anonymousName,
        title: d.title,
        content: d.content,
        category: d.category,
        likesCount: d.likesCount,
        commentsCount: d.commentsCount,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Forum create post error:', err);
    res.status(500).json({ success: false, error: 'Failed to create post' });
  }
});

// ——— GET /forum/posts ——————————————————————————————————————————————————————
router.get('/posts', authenticateToken, async (req, res) => {
  try {
    const { category, limit, cursor, mine } = req.query;
    const limitNum = Math.min(parseInt(limit, 10) || PAGE_SIZE, 50);
    const isMine = mine === 'true';

    let query;

    if (isMine) {
      // User's own posts (all categories), newest first
      query = db.collection('forum_posts')
        .where('userId', '==', req.userId)
        .orderBy('createdAt', 'desc')
        .limit(limitNum + 1);
    } else {
      // Public feed: only non-hidden posts, optional category filter
      query = db.collection('forum_posts')
        .where('isHidden', '==', false)
        .orderBy('createdAt', 'desc')
        .limit(limitNum + 1);

      if (category && CATEGORIES.includes(category)) {
        query = db.collection('forum_posts')
          .where('isHidden', '==', false)
          .where('category', '==', category)
          .orderBy('createdAt', 'desc')
          .limit(limitNum + 1);
      }
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
        content: d.content?.substring?.(0, 200) + (d.content?.length > 200 ? '...' : ''),
        category: d.category,
        likesCount: d.likesCount,
        commentsCount: d.commentsCount,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() || null,
      };
    });
    const nextCursor = docs.length === limitNum && snapshot.docs.length > limitNum
      ? docs[docs.length - 1].id
      : null;
    res.json({ success: true, posts, nextCursor });
  } catch (err) {
    console.error('Forum list posts error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch posts' });
  }
});

// ——— GET /forum/posts/:id ——————————————————————————————————————————————————
router.get('/posts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('forum_posts').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const d = doc.data();
    if (d.isHidden && req.role !== 'admin') {
      return res.status(404).json({ error: 'Post not found', isHidden: true });
    }
    res.json({
      success: true,
      post: {
        id: doc.id,
        anonymousName: d.anonymousName,
        title: d.title,
        content: d.content,
        category: d.category,
        likesCount: d.likesCount,
        commentsCount: d.commentsCount,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() || null,
        isHidden: d.isHidden,
        isOwner: d.userId === req.userId,
      },
    });
  } catch (err) {
    console.error('Forum get post error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch post' });
  }
});

// ——— DELETE /forum/posts/:id ———————————————————————————————————————————————
router.delete('/posts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('forum_posts').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Post not found' });
    const d = doc.data();
    if (d.userId !== req.userId && req.role !== 'admin') {
      return res.status(403).json({ error: 'Not allowed to delete this post' });
    }
    await db.collection('forum_posts').doc(id).update({
      isHidden: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true, message: 'Post removed' });
  } catch (err) {
    console.error('Forum delete post error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete post' });
  }
});

// ——— POST /forum/comments ———————————————————————————————————————————————————
router.post('/comments', authenticateToken, forumRateLimiter('comment'), ensureForumProfile, contentModeration, async (req, res) => {
  try {
    const { postId, comment } = req.body || {};
    if (!postId || !comment?.trim()) {
      return res.status(400).json({ error: 'postId and comment are required' });
    }
    const postRef = db.collection('forum_posts').doc(postId);
    const postSnap = await postRef.get();
    if (!postSnap.exists) return res.status(404).json({ error: 'Post not found' });
    const postData = postSnap.data();
    if (postData.isHidden && req.role !== 'admin') {
      return res.status(404).json({ error: 'Post not found' });
    }
    const commentRef = db.collection('forum_comments').doc();
    const commentData = {
      postId,
      userId: req.userId,
      anonymousName: req.anonymousName,
      comment: comment.trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (req.isDoctor && req.doctorName) {
      commentData.isDoctor = true;
      commentData.doctorName = req.doctorName;
    }
    await commentRef.set(commentData);
    await postRef.update({
      commentsCount: admin.firestore.FieldValue.increment(1),
    });
    const metaRef = db.collection('forum_user_meta').doc(req.userId);
    await metaRef.set({
      lastCommentAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      commentCountHour: admin.firestore.FieldValue.increment(1),
    }, { merge: true });

    const created = await commentRef.get();
    const d = created.data();
    res.status(201).json({
      success: true,
      comment: {
        id: commentRef.id,
        postId,
        anonymousName: d.anonymousName,
        comment: d.comment,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
        isDoctor: d.isDoctor === true,
        doctorName: d.doctorName || null,
      },
    });
  } catch (err) {
    console.error('Forum create comment error:', err);
    res.status(500).json({ success: false, error: 'Failed to create comment' });
  }
});

// ——— GET /forum/comments/:postId —————————————————————————————————────────——
router.get('/comments/:postId', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { limit, cursor } = req.query;
    const limitNum = Math.min(parseInt(limit, 10) || COMMENT_PAGE_SIZE, 100);
    let query = db.collection('forum_comments')
      .where('postId', '==', postId)
      .orderBy('createdAt', 'asc')
      .limit(limitNum + 1);
    if (cursor) {
      try {
        const doc = await db.collection('forum_comments').doc(cursor).get();
        if (doc.exists) query = query.startAfter(doc);
      } catch (_) {}
    }
    const snapshot = await query.get();
    const docs = snapshot.docs.slice(0, limitNum);
    const comments = docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        anonymousName: d.anonymousName,
        comment: d.comment,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() || null,
        isDoctor: d.isDoctor === true,
        doctorName: d.doctorName || null,
      };
    });
    const nextCursor = docs.length === limitNum && snapshot.docs.length > limitNum
      ? docs[docs.length - 1].id
      : null;
    res.json({ success: true, comments, nextCursor });
  } catch (err) {
    console.error('Forum list comments error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch comments' });
  }
});

// ——— POST /forum/like/:postId —————————————————————————————————────────—————
router.post('/like/:postId', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.userId;
    const likeId = `${postId}_${userId}`;
    const likeRef = db.collection('forum_post_likes').doc(likeId);
    const postRef = db.collection('forum_posts').doc(postId);
    const likeSnap = await likeRef.get();
    const postSnap = await postRef.get();
    if (!postSnap.exists) return res.status(404).json({ error: 'Post not found' });
    const batch = db.batch();
    if (likeSnap.exists) {
      batch.delete(likeRef);
      batch.update(postRef, { likesCount: admin.firestore.FieldValue.increment(-1) });
      await batch.commit();
      return res.json({ success: true, liked: false, likesCount: (postSnap.data().likesCount || 0) - 1 });
    }
    batch.set(likeRef, {
      postId,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    batch.update(postRef, { likesCount: admin.firestore.FieldValue.increment(1) });
    await batch.commit();
    res.json({ success: true, liked: true, likesCount: (postSnap.data().likesCount || 0) + 1 });
  } catch (err) {
    console.error('Forum like error:', err);
    res.status(500).json({ success: false, error: 'Failed to update like' });
  }
});

// ——— GET /forum/like/:postId (check if current user liked) ———————————————————
router.get('/like/:postId', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const likeId = `${postId}_${req.userId}`;
    const snap = await db.collection('forum_post_likes').doc(likeId).get();
    res.json({ success: true, liked: snap.exists });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to check like' });
  }
});

// ——— POST /forum/report/:postId —————————————————————————————————────────—————
router.post('/report/:postId', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { reason } = req.body || {};
    const postRef = db.collection('forum_posts').doc(postId);
    const postSnap = await postRef.get();
    if (!postSnap.exists) return res.status(404).json({ error: 'Post not found' });
    await db.collection('forum_reports').add({
      postId,
      reportedBy: req.userId,
      reason: (reason || 'Inappropriate content').trim().substring(0, 500),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const postData = postSnap.data();
    const newCount = (postData.reportsCount || 0) + 1;
    const updates = {
      reportsCount: newCount,
      isReported: true,
    };
    if (newCount >= REPORT_THRESHOLD) {
      updates.isHidden = true;
    }
    await postRef.update(updates);
    res.json({ success: true, message: 'Report submitted' });
  } catch (err) {
    console.error('Forum report error:', err);
    res.status(500).json({ success: false, error: 'Failed to submit report' });
  }
});

module.exports = router;
