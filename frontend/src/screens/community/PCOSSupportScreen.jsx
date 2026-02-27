import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../../components/Header';
import { getPcosResources, createPcosResource } from '../../api/api';
import customAlertService from '../../services/customAlertService';

const CACHE_KEY = 'pcos_resources_cache';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const TYPES = [
  { key: '', label: 'All' },
  { key: 'diet', label: 'Diet' },
  { key: 'exercise', label: 'Exercise' },
  { key: 'lifestyle', label: 'Lifestyle' },
  { key: 'medical', label: 'Medical' },
];

function ResourceCard({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.85}>
      <View style={styles.badgeWrap}>
        <View style={[styles.typeBadge, { backgroundColor: '#F3E8FF' }]}>
          <Text style={styles.typeBadgeText}>{item.type || 'lifestyle'}</Text>
        </View>
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.cardExcerpt} numberOfLines={2}>
        {(item.content || '').replace(/\s+/g, ' ').trim()}
      </Text>
      <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
    </TouchableOpacity>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PCOSSupportScreen() {
  const navigation = useNavigation();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [contributeModalVisible, setContributeModalVisible] = useState(false);
  const [contributeTitle, setContributeTitle] = useState('');
  const [contributeContent, setContributeContent] = useState('');
  const [contributeType, setContributeType] = useState('lifestyle');
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem('userRole').then((r) => setUserRole(r || null));
    load(null, false);
  }, [load]));

  const loadFromCache = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts < CACHE_TTL_MS && Array.isArray(data)) {
          setResources(data);
          return true;
        }
      }
    } catch (_) {}
    return false;
  }, []);

  const load = useCallback(async (cursor = null, append = false) => {
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);
      const params = { limit: typeFilter ? 20 : 50 };
      if (typeFilter) params.type = typeFilter;
      if (cursor) params.cursor = cursor;
      const res = await getPcosResources(params);
      const data = res.data || {};
      const list = data.resources || [];
      setResources(prev => append ? [...prev, ...list] : list);
      setNextCursor(data.nextCursor || null);
      if (!append && !typeFilter) {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ data: list, ts: Date.now() }));
      }
    } catch (err) {
      customAlertService.showError('Error', err.response?.data?.error || 'Failed to load resources');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    loadFromCache().then(cached => {
      if (!cached) load(null, false);
      else load(null, false); // still refresh in background
    });
  }, [typeFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    AsyncStorage.removeItem(CACHE_KEY).then(() => load(null, false));
  };

  const onEndReached = () => {
    if (loadingMore || !nextCursor) return;
    load(nextCursor, true);
  };

  const openDetail = (item) => setDetailItem(item);
  const closeDetail = () => setDetailItem(null);

  const openContribute = () => {
    setContributeTitle('');
    setContributeContent('');
    setContributeType('lifestyle');
    setContributeModalVisible(true);
  };

  const saveContribution = async () => {
    const t = contributeTitle.trim();
    const c = contributeContent.trim();
    if (!t || !c) {
      Alert.alert('Missing fields', 'Title and content are required.');
      return;
    }
    setSaving(true);
    try {
      await createPcosResource({ title: t, content: c, type: contributeType });
      Alert.alert('Submitted', 'Your tip has been added. Thank you for contributing!');
      setContributeModalVisible(false);
      load(null, false);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to add tip');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header showBack showIcons={false} />
      <View style={styles.content}>
        {/* Fixed header */}
        <View style={styles.headerSection}>
          <Text style={styles.screenTitle}>PCOS / PCOD Support</Text>
          <Text style={styles.subtitle}>Reliable information and lifestyle tips</Text>
        </View>
        {/* Fixed category row */}
        <View style={styles.chipRowContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {TYPES.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.chip, typeFilter === item.key && styles.chipActive]}
                onPress={() => setTypeFilter(item.key)}
              >
                <Text style={[styles.chipText, typeFilter === item.key && styles.chipTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        {/* Fixed list container - content scrolls inside */}
        <View style={styles.listContainer}>
          {loading && resources.length === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#9C7BB8" />
            </View>
          ) : (
            <FlatList
              style={styles.resourcesList}
              data={resources}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ResourceCard item={item} onPress={openDetail} />}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#9C7BB8']} />}
              onEndReached={onEndReached}
              onEndReachedThreshold={0.3}
              ListEmptyComponent={<Text style={styles.empty}>No resources yet. Check back later.</Text>}
              ListFooterComponent={loadingMore ? <ActivityIndicator style={{ padding: 12 }} color="#9C7BB8" /> : null}
            />
          )}
        </View>
      </View>
      {String(userRole || '').toLowerCase() === 'doctor' && (
        <View style={styles.contributeFabWrap} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.contributeFab}
            onPress={openContribute}
            activeOpacity={0.8}
          >
            <Text style={styles.contributeFabText}>+ Add tip</Text>
          </TouchableOpacity>
        </View>
      )}
      <Modal visible={!!detailItem} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{detailItem?.title}</Text>
              <TouchableOpacity onPress={closeDetail} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={[styles.typeBadge, { backgroundColor: '#F3E8FF', alignSelf: 'flex-start', marginBottom: 12 }]}>
                <Text style={styles.typeBadgeText}>{detailItem?.type || 'lifestyle'}</Text>
              </View>
              <Text style={styles.modalBodyText}>{detailItem?.content}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={contributeModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setContributeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add PCOS tip</Text>
              <TouchableOpacity onPress={() => setContributeModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.contributeLabel}>Title</Text>
              <TextInput style={styles.contributeInput} placeholder="Title" placeholderTextColor="#999" value={contributeTitle} onChangeText={setContributeTitle} />
              <Text style={styles.contributeLabel}>Type</Text>
              <View style={styles.contributeChipRow}>
                {TYPES.filter(t => t.key).map((t) => (
                  <TouchableOpacity key={t.key} style={[styles.contributeChip, contributeType === t.key && styles.chipActive]} onPress={() => setContributeType(t.key)}>
                    <Text style={[styles.contributeChipText, contributeType === t.key && styles.chipTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.contributeLabel}>Content</Text>
              <TextInput style={[styles.contributeInput, styles.contributeTextArea]} placeholder="Tips, advice..." placeholderTextColor="#999" value={contributeContent} onChangeText={setContributeContent} multiline />
              <TouchableOpacity style={[styles.contributeSaveBtn, saving && styles.contributeSaveDisabled]} onPress={saveContribution} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.contributeSaveText}>Submit</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8FB' },
  content: { flex: 1, paddingHorizontal: 16 },
  headerSection: { marginTop: 8, marginBottom: 4 },
  screenTitle: { fontSize: 22, fontWeight: '700', color: '#2D2D2D' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
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
  listContainer: { flex: 1, minHeight: 200 },
  resourcesList: { flex: 1 },
  listContent: { paddingBottom: 24, flexGrow: 1 },
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
  badgeWrap: { marginBottom: 10 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start' },
  typeBadgeText: { fontSize: 12, color: '#6B21A8', fontWeight: '600' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginBottom: 6, lineHeight: 22 },
  cardExcerpt: { fontSize: 14, color: '#555', marginBottom: 8, lineHeight: 20 },
  cardDate: { fontSize: 12, color: '#888' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  empty: { textAlign: 'center', color: '#888', paddingVertical: 32 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: 380,
    maxHeight: '85%',
    padding: 20,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  modalClose: { padding: 8 },
  modalCloseText: { fontSize: 20, color: '#666' },
  modalBody: { flexGrow: 1, minHeight: 200 },
  modalBodyText: { fontSize: 15, color: '#333', lineHeight: 22 },
  contributeFabWrap: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  contributeFab: {
    backgroundColor: '#BE185D',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  contributeFabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  contributeLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  contributeInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 15, color: '#1F2937', marginBottom: 14 },
  contributeTextArea: { minHeight: 100, textAlignVertical: 'top' },
  contributeChipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14, gap: 8 },
  contributeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#F3F4F6', marginRight: 8, marginBottom: 4 },
  contributeChipText: { fontSize: 13, color: '#374151' },
  contributeSaveBtn: { backgroundColor: '#BE185D', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  contributeSaveDisabled: { opacity: 0.7 },
  contributeSaveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
