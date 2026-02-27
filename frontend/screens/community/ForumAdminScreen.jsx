import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../../components/Header';
import {
  getForumReportedPosts,
  getForumAdminPost,
  hideForumPost,
  unhideForumPost,
} from '../../api/api';
import customAlertService from '../../services/customAlertService';

export default function ForumAdminScreen() {
  const navigation = useNavigation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('reported');
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [role, setRole] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const checkAdmin = async () => {
        try {
          const r = await AsyncStorage.getItem('userRole');
          setRole(r);
          if (r !== 'admin') {
            customAlertService.showError('Access denied', 'Admin only.');
            navigation.goBack();
            return;
          }
          load(null, false);
        } catch (_) {
          navigation.goBack();
        }
      };
      checkAdmin();
    }, [navigation])
  );

  const load = useCallback(async (cursor = null, append = false) => {
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);
      const params = { limit: 20, status: statusFilter };
      if (cursor) params.cursor = cursor;
      const res = await getForumReportedPosts(params);
      const data = res.data || {};
      const list = data.posts || [];
      setPosts(prev => append ? [...prev, ...list] : list);
      setNextCursor(data.nextCursor || null);
    } catch (err) {
      if (err.response?.status === 403) {
        navigation.goBack();
        return;
      }
      customAlertService.showError('Error', err.response?.data?.error || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [statusFilter, navigation]);

  useEffect(() => {
    if (role === 'admin') load(null, false);
  }, [statusFilter, role]);

  const onRefresh = () => {
    setRefreshing(true);
    load(null, false);
  };

  const handleHide = (id) => {
    Alert.alert('Hide post', 'Remove from public view?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Hide', onPress: async () => {
        try {
          await hideForumPost(id);
          setPosts(prev => prev.map(p => p.id === id ? { ...p, isHidden: true } : p));
          customAlertService.showSuccess('Done', 'Post hidden.');
        } catch (err) {
          customAlertService.showError('Error', err.response?.data?.error || 'Failed');
        }
      } },
    ]);
  };

  const handleUnhide = (id) => {
    Alert.alert('Unhide post', 'Make visible again?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unhide', onPress: async () => {
        try {
          await unhideForumPost(id);
          setPosts(prev => prev.map(p => p.id === id ? { ...p, isHidden: false, isReported: false } : p));
          customAlertService.showSuccess('Done', 'Post visible again.');
        } catch (err) {
          customAlertService.showError('Error', err.response?.data?.error || 'Failed');
        }
      } },
    ]);
  };

  if (role !== 'admin' && role !== null) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Header showBack showIcons={false} />
      <View style={styles.content}>
        <View style={styles.headerSection}>
          <Text style={styles.screenTitle}>Forum moderation</Text>
          <Text style={styles.subtitle}>Reported and hidden posts</Text>
        </View>
        <View style={styles.chipRowContainer}>
          <TouchableOpacity
            style={[styles.chip, statusFilter === 'reported' && styles.chipActive]}
            onPress={() => setStatusFilter('reported')}
          >
            <Text style={[styles.chipText, statusFilter === 'reported' && styles.chipTextActive]}>Reported</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, statusFilter === 'hidden' && styles.chipActive]}
            onPress={() => setStatusFilter('hidden')}
          >
            <Text style={[styles.chipText, statusFilter === 'hidden' && styles.chipTextActive]}>Hidden</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.listContainer}>
          {loading && posts.length === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#9C7BB8" />
            </View>
          ) : (
            <FlatList
              style={styles.postsList}
              data={posts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.cardMeta}>{item.anonymousName} · {item.reportsCount || 0} reports · {item.category}</Text>
                  <Text style={styles.cardExcerpt} numberOfLines={2}>{item.content}</Text>
                  <View style={styles.cardActions}>
                    {item.isHidden ? (
                      <TouchableOpacity style={styles.unhideBtn} onPress={() => handleUnhide(item.id)}>
                        <Text style={styles.unhideBtnText}>Unhide</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={styles.hideBtn} onPress={() => handleHide(item.id)}>
                        <Text style={styles.hideBtnText}>Hide</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.detailBtn}
                      onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
                    >
                      <Text style={styles.detailBtnText}>View</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#9C7BB8']} />}
              onEndReached={() => nextCursor && !loadingMore && load(nextCursor, true)}
              onEndReachedThreshold={0.3}
              ListEmptyComponent={<Text style={styles.empty}>No posts in this list.</Text>}
              ListFooterComponent={loadingMore ? <ActivityIndicator style={{ padding: 12 }} color="#9C7BB8" /> : null}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8FB' },
  content: { flex: 1, paddingHorizontal: 16 },
  headerSection: { marginTop: 8, marginBottom: 4 },
  screenTitle: { fontSize: 22, fontWeight: '700', color: '#2D2D2D' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  chipRowContainer: { flexDirection: 'row', marginVertical: 12, gap: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', marginRight: 8, minHeight: 40, justifyContent: 'center' },
  chipActive: { backgroundColor: '#9C7BB8' },
  chipText: { fontSize: 14, color: '#555' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  listContainer: { flex: 1, minHeight: 200 },
  postsList: { flex: 1 },
  listContent: { paddingBottom: 40, flexGrow: 1 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  cardMeta: { fontSize: 12, color: '#666', marginBottom: 4 },
  cardExcerpt: { fontSize: 13, color: '#555', marginBottom: 10 },
  cardActions: { flexDirection: 'row', gap: 10 },
  hideBtn: { backgroundColor: '#FEE2E2', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  hideBtnText: { fontSize: 13, color: '#B91C1C', fontWeight: '600' },
  unhideBtn: { backgroundColor: '#D1FAE5', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  unhideBtnText: { fontSize: 13, color: '#065F46', fontWeight: '600' },
  detailBtn: { backgroundColor: '#E0E7FF', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  detailBtnText: { fontSize: 13, color: '#4338CA', fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  empty: { textAlign: 'center', color: '#888', paddingVertical: 32 },
});
