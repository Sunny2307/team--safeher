import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Header from '../../components/Header';
import {
  getForumPosts,
} from '../../api/api';
import customAlertService from '../../services/customAlertService';

const CATEGORIES = [
  { key: '', label: 'All' },
  { key: 'mine', label: 'My posts' },
  { key: 'PCOS', label: 'PCOS' },
  { key: 'periods', label: 'Periods' },
  { key: 'fertility', label: 'Fertility' },
  { key: 'mental_health', label: 'Mental Health' },
  { key: 'safety', label: 'Safety' },
  { key: 'other', label: 'Other' },
];

function getAvatarColor(name) {
  const n = (name || 'U').charCodeAt(0);
  const colors = ['#E8B4BC', '#C9A9A6', '#B8A9C9', '#A9C9D4', '#C9D4A9'];
  return colors[n % colors.length];
}

function PostCard({ item, onPress }) {
  const bg = getAvatarColor(item.anonymousName);
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: bg }]}>
          <Text style={styles.avatarText}>{(item.anonymousName || 'U').slice(-1)}</Text>
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.anonymousName}>{item.anonymousName}</Text>
          <View style={styles.row}>
            <View style={[styles.badge, styles.badgeCategory]}>
              <Text style={styles.badgeText}>{item.category || 'other'}</Text>
            </View>
            <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.preview} numberOfLines={2}>{item.content}</Text>
      <View style={styles.stats}>
        <Text style={styles.statText}>♥ {item.likesCount || 0}</Text>
        <Text style={styles.statText}>💬 {item.commentsCount || 0}</Text>
      </View>
    </TouchableOpacity>
  );
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

export default function ForumHomeScreen() {
  const navigation = useNavigation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [filterKey, setFilterKey] = useState('');

  const load = useCallback(async (cursor = null, append = false) => {
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);
      const params = { limit: 20 };
      if (filterKey && filterKey !== 'mine') params.category = filterKey;
      if (filterKey === 'mine') params.mine = 'true';
      if (cursor) params.cursor = cursor;
      const res = await getForumPosts(params);
      const data = res.data || {};
      const list = data.posts || [];
      setPosts(prev => append ? [...prev, ...list] : list);
      setNextCursor(data.nextCursor || null);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to load posts';
      customAlertService.showError('Error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [filterKey]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(null, false);
  }, [load]);

  React.useEffect(() => {
    load(null, false);
  }, [filterKey]);

  const onEndReached = useCallback(() => {
    if (loadingMore || !nextCursor) return;
    load(nextCursor, true);
  }, [load, nextCursor, loadingMore]);

  const openPost = (item) => {
    navigation.navigate('PostDetail', { postId: item.id });
  };

  return (
    <View style={styles.container}>
      <Header showBack showIcons={false} />
      <View style={styles.content}>
        {/* Fixed header */}
        <View style={styles.headerSection}>
          <Text style={styles.screenTitle}>Anonymous Health Forum</Text>
          <Text style={styles.safetyNote}>A safe space to share. Your identity stays private.</Text>
        </View>
        {/* Fixed category row */}
        <View style={styles.chipRowContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {CATEGORIES.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.chip, filterKey === item.key && styles.chipActive]}
                onPress={() => setFilterKey(item.key)}
              >
                <Text style={[styles.chipText, filterKey === item.key && styles.chipTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        {/* Fixed posts container - list scrolls inside */}
        <View style={styles.postsContainer}>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#9C7BB8" />
            </View>
          ) : (
            <FlatList
              style={styles.postsList}
              data={posts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <PostCard item={item} onPress={openPost} />}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#9C7BB8']} />}
              onEndReached={onEndReached}
              onEndReachedThreshold={0.3}
              ListEmptyComponent={<Text style={styles.empty}>No posts yet. Be the first to share.</Text>}
              ListFooterComponent={loadingMore ? <ActivityIndicator style={{ padding: 12 }} color="#9C7BB8" /> : null}
            />
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreatePost')}
      >
        <Text style={styles.fabText}>+ Create Post</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8FB' },
  content: { flex: 1, paddingHorizontal: 16 },
  headerSection: { marginTop: 8, marginBottom: 4 },
  screenTitle: { fontSize: 22, fontWeight: '700', color: '#2D2D2D' },
  safetyNote: { fontSize: 13, color: '#666', marginTop: 4 },
  chipRowContainer: { height: 48, marginVertical: 12, justifyContent: 'center' },
  chipRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    marginRight: 10,
    justifyContent: 'center',
    height: 40,
  },
  chipActive: { backgroundColor: '#9C7BB8' },
  chipText: { fontSize: 14, color: '#555' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  postsContainer: { flex: 1, minHeight: 200 },
  postsList: { flex: 1 },
  listContent: { paddingBottom: 80, flexGrow: 1 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cardMeta: { flex: 1 },
  anonymousName: { fontSize: 14, fontWeight: '600', color: '#444' },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 8 },
  badgeCategory: { backgroundColor: '#F3E8FF' },
  badgeText: { fontSize: 11, color: '#6B21A8', fontWeight: '500' },
  date: { fontSize: 12, color: '#888' },
  title: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 6, lineHeight: 22 },
  preview: { fontSize: 14, color: '#555', marginBottom: 10, lineHeight: 20 },
  stats: { flexDirection: 'row', gap: 20 },
  statText: { fontSize: 13, color: '#888' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  empty: { textAlign: 'center', color: '#888', paddingVertical: 32 },
  fab: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: '#9C7BB8',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
