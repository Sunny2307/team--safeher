import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Header from '../../components/Header';
import {
  getForumPost,
  getForumComments,
  createForumComment,
  toggleForumLike,
  checkForumLiked,
  reportForumPost,
  deleteForumPost,
} from '../../api/api';
import customAlertService from '../../services/customAlertService';

function getAvatarColor(name) {
  const n = (name || 'U').charCodeAt(0);
  const colors = ['#E8B4BC', '#C9A9A6', '#B8A9C9', '#A9C9D4', '#C9D4A9'];
  return colors[n % colors.length];
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString();
}

export default function PostDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { postId } = route.params || {};
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  const loadPost = useCallback(async () => {
    if (!postId) return;
    try {
      const res = await getForumPost(postId);
      const p = res.data?.post;
      setPost(p);
      if (p) {
        setLikesCount(p.likesCount || 0);
        const likeRes = await checkForumLiked(postId).catch(() => ({}));
        setLiked(likeRes.data?.liked === true);
      }
    } catch (err) {
      if (err.response?.status === 404 || err.response?.data?.isHidden) {
        setPost({ isHidden: true });
      } else {
        customAlertService.showError('Error', err.response?.data?.error || 'Failed to load post');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [postId]);

  const loadComments = useCallback(async (cursor = null, append = false) => {
    if (!postId) return;
    try {
      if (append) setLoadingMore(true);
      const params = { limit: 50 };
      if (cursor) params.cursor = cursor;
      const res = await getForumComments(postId, params);
      const data = res.data || {};
      const list = data.comments || [];
      setComments(prev => append ? [...prev, ...list] : list);
      setNextCursor(data.nextCursor || null);
    } catch (err) {
      customAlertService.showError('Error', err.response?.data?.error || 'Failed to load comments');
    } finally {
      setLoadingMore(false);
    }
  }, [postId]);

  React.useEffect(() => {
    loadPost();
  }, [loadPost]);

  React.useEffect(() => {
    if (post && !post.isHidden) loadComments();
  }, [post?.id, post?.isHidden]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPost().then(() => post && !post.isHidden && loadComments(null, false));
  };

  const handleLike = async () => {
    try {
      const res = await toggleForumLike(postId);
      setLiked(res.data?.liked === true);
      if (typeof res.data?.likesCount === 'number') setLikesCount(res.data.likesCount);
      else setLikesCount(prev => liked ? prev - 1 : prev + 1);
    } catch (_) {}
  };

  const handleReport = () => {
    Alert.alert(
      'Report post',
      'Submit a report for inappropriate content? Our team will review it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          onPress: async () => {
            try {
              await reportForumPost(postId, 'Inappropriate content');
              customAlertService.showSuccess('Report sent', 'Thank you. Our team will review.');
            } catch (err) {
              customAlertService.showError('Error', err.response?.data?.error || 'Failed to submit report');
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete post?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteForumPost(postId);
              customAlertService.showSuccess('Deleted', 'Post removed.');
              navigation.goBack();
            } catch (err) {
              customAlertService.showError('Error', err.response?.data?.error || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const submitComment = async () => {
    const text = commentText.trim();
    if (!text || submittingComment) return;
    setSubmittingComment(true);
    try {
      await createForumComment(postId, text);
      setCommentText('');
      loadComments(null, false);
      if (post) setPost({ ...post, commentsCount: (post.commentsCount || 0) + 1 });
    } catch (err) {
      customAlertService.showError('Error', err.response?.data?.error || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading && !post) {
    return (
      <View style={styles.container}>
        <Header showBack showIcons={false} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#9C7BB8" />
        </View>
      </View>
    );
  }

  if (post?.isHidden && !post.content) {
    return (
      <View style={styles.container}>
        <Header showBack showIcons={false} />
        <View style={styles.centered}>
          <Text style={styles.hiddenText}>This post is under review for safety.</Text>
        </View>
      </View>
    );
  }

  const bg = getAvatarColor(post?.anonymousName);

  return (
    <View style={styles.container}>
      <Header showBack showIcons={false} />
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.postBlock}>
            <View style={styles.cardHeader}>
              <View style={[styles.avatar, { backgroundColor: bg }]}>
                <Text style={styles.avatarText}>{(post?.anonymousName || 'U').slice(-1)}</Text>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.anonymousName}>{post?.anonymousName}</Text>
                <View style={styles.row}>
                  <View style={[styles.badge, styles.badgeCategory]}>
                    <Text style={styles.badgeText}>{post?.category || 'other'}</Text>
                  </View>
                  <Text style={styles.date}>{formatDate(post?.createdAt)}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.title}>{post?.title}</Text>
            <Text style={styles.content}>{post?.content}</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
                <Text style={styles.actionText}>{liked ? '♥' : '♡'} {likesCount}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={handleReport}>
                <Text style={styles.actionText}>Report</Text>
              </TouchableOpacity>
              {post?.isOwner && (
                <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={handleDelete}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.commentRow}>
            <View style={[styles.commentAvatar, { backgroundColor: getAvatarColor(item.isDoctor ? item.doctorName : item.anonymousName) }]}>
              <Text style={styles.avatarText}>{(item.isDoctor ? item.doctorName : item.anonymousName || 'U').slice(-1)}</Text>
            </View>
            <View style={styles.commentBubble}>
              <View style={styles.commentNameRow}>
                <Text style={styles.commentName}>{item.isDoctor ? item.doctorName : item.anonymousName}</Text>
                {item.isDoctor && (
                  <View style={styles.doctorBadge}>
                    <Text style={styles.doctorBadgeText}>👩‍⚕️ Doctor</Text>
                  </View>
                )}
              </View>
              <Text style={styles.commentBody}>{item.comment}</Text>
              <Text style={styles.commentDate}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
        )}
        ListFooterComponent={
          <>
            {loadingMore && <ActivityIndicator style={{ padding: 12 }} color="#9C7BB8" />}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor="#999"
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!commentText.trim() || submittingComment) && styles.sendBtnDisabled]}
                onPress={submitComment}
                disabled={!commentText.trim() || submittingComment}
              >
                {submittingComment ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.sendText}>Send</Text>}
              </TouchableOpacity>
            </View>
          </>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#9C7BB8']} />}
        onEndReached={() => nextCursor && !loadingMore && loadComments(nextCursor, true)}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8FB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  hiddenText: { fontSize: 15, color: '#666', textAlign: 'center' },
  listContent: { padding: 16, paddingBottom: 24 },
  postBlock: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cardMeta: { flex: 1 },
  anonymousName: { fontSize: 14, fontWeight: '600', color: '#444' },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 8 },
  badgeCategory: { backgroundColor: '#F3E8FF' },
  badgeText: { fontSize: 10, color: '#6B21A8', fontWeight: '500' },
  date: { fontSize: 11, color: '#888' },
  title: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  content: { fontSize: 15, color: '#333', lineHeight: 22, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 16 },
  actionBtn: { paddingVertical: 6 },
  actionText: { fontSize: 14, color: '#666' },
  deleteBtn: {},
  deleteText: { fontSize: 14, color: '#B91C1C' },
  commentRow: { flexDirection: 'row', marginBottom: 12 },
  commentBubble: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#E5E5E5' },
  commentNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, flexWrap: 'wrap' },
  commentName: { fontSize: 12, fontWeight: '600', color: '#444', marginRight: 6 },
  doctorBadge: { backgroundColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  doctorBadgeText: { fontSize: 10, color: '#1E40AF', fontWeight: '600' },
  commentBody: { fontSize: 14, color: '#333' },
  commentDate: { fontSize: 11, color: '#888', marginTop: 4 },
  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 },
  commentInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1a1a1a',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  sendBtn: { backgroundColor: '#9C7BB8', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
