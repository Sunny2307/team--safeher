import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  getPcosResources,
  createPcosResource,
  updatePcosResource,
  deletePcosResource,
} from '../../api/api';

const TYPES = [
  { key: 'diet', label: 'Diet' },
  { key: 'exercise', label: 'Exercise' },
  { key: 'lifestyle', label: 'Lifestyle' },
  { key: 'medical', label: 'Medical' },
];

export default function AdminPCOSResourcesScreen() {
  const navigation = useNavigation();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('lifestyle');
  const [saving, setSaving] = useState(false);

  const fetchResources = useCallback(async () => {
    try {
      const res = await getPcosResources({ limit: 100 });
      setResources(res.data?.resources || []);
    } catch (err) {
      console.error('Fetch PCOS resources error:', err);
      Alert.alert('Error', 'Failed to load resources');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchResources();
  }, [fetchResources]));

  const openAdd = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setType('lifestyle');
    setModalVisible(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setTitle(item.title || '');
    setContent(item.content || '');
    setType(item.type || 'lifestyle');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setTitle('');
    setContent('');
  };

  const handleSave = async () => {
    const t = title.trim();
    const c = content.trim();
    if (!t || !c) {
      Alert.alert('Missing fields', 'Title and content are required.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updatePcosResource(editingId, { title: t, content: c, type });
        Alert.alert('Updated', 'Resource updated.');
      } else {
        await createPcosResource({ title: t, content: c, type });
        Alert.alert('Created', 'Resource added.');
      }
      closeModal();
      fetchResources();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Delete resource?',
      `"${item.title}" will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePcosResource(item.id);
              fetchResources();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.type || 'lifestyle'}</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
            <Text style={styles.delBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.cardExcerpt} numberOfLines={2}>
        {(item.content || '').replace(/\s+/g, ' ').trim()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PCOS Resources</Text>
        <View style={styles.backBtn} />
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
        <Text style={styles.addBtnText}>+ Add Resource</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#7C3AED" size="large" />
      ) : resources.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🌸</Text>
          <Text style={styles.emptyText}>No PCOS resources yet.</Text>
          <Text style={styles.emptyHint}>Tap "Add Resource" to add tips and guides.</Text>
        </View>
      ) : (
        <FlatList
          data={resources}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchResources(); }} colors={['#7C3AED']} />
          }
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit resource' : 'Add resource'}</Text>
              <TouchableOpacity onPress={closeModal}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Title"
                placeholderTextColor="#999"
                value={title}
                onChangeText={setTitle}
              />
              <Text style={styles.label}>Type</Text>
              <View style={styles.chipRow}>
                {TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.chip, type === t.key && styles.chipActive]}
                    onPress={() => setType(t.key)}
                  >
                    <Text style={[styles.chipText, type === t.key && styles.chipTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Content</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Full content (tips, advice...)"
                placeholderTextColor="#999"
                value={content}
                onChangeText={setContent}
                multiline
              />
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F5FF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#4B1C46',
  },
  backBtn: { minWidth: 60 },
  backBtnText: { color: '#fff', fontSize: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  addBtn: {
    backgroundColor: '#7C3AED',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { backgroundColor: '#EDE9FE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, color: '#7C3AED', fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 8 },
  editBtn: { backgroundColor: '#EDE9FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnText: { color: '#7C3AED', fontWeight: '600', fontSize: 13 },
  delBtn: { backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  delBtnText: { color: '#B91C1C', fontWeight: '600', fontSize: 13 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  cardExcerpt: { fontSize: 13, color: '#6B7280' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#374151' },
  emptyHint: { fontSize: 14, color: '#9CA3AF', marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  modalClose: { fontSize: 22, color: '#6B7280' },
  modalBody: { maxHeight: 400 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 14,
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14, gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    marginBottom: 4,
  },
  chipActive: { backgroundColor: '#7C3AED' },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  saveBtn: { backgroundColor: '#7C3AED', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
