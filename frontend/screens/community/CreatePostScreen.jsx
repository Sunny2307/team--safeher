import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Header from '../../components/Header';
import { createForumPost } from '../../api/api';
import customAlertService from '../../services/customAlertService';

const CATEGORIES = [
  { key: 'PCOS', label: 'PCOS' },
  { key: 'periods', label: 'Periods' },
  { key: 'fertility', label: 'Fertility' },
  { key: 'mental_health', label: 'Mental Health' },
  { key: 'safety', label: 'Safety' },
  { key: 'other', label: 'Other' },
];

export default function CreatePostScreen() {
  const navigation = useNavigation();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('other');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const t = title.trim();
    const c = content.trim();
    if (!t) {
      customAlertService.showError('Missing title', 'Please enter a title.');
      return;
    }
    if (!c) {
      customAlertService.showError('Missing content', 'Please write your post.');
      return;
    }
    setSubmitting(true);
    try {
      await createForumPost({ title: t, content: c, category });
      customAlertService.showSuccess('Posted', 'Your post is live. You stay anonymous.');
      navigation.goBack();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to create post';
      customAlertService.showError('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <Header showBack showIcons={false} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create post</Text>
        <Text style={styles.reminder}>You'll appear as an anonymous name. Be kind and respectful.</Text>
        <TextInput
          style={styles.inputTitle}
          placeholder="Title"
          placeholderTextColor="#999"
          value={title}
          onChangeText={setTitle}
          maxLength={200}
        />
        <TextInput
          style={styles.inputContent}
          placeholder="Share your thoughts or question..."
          placeholderTextColor="#999"
          value={content}
          onChangeText={setContent}
          multiline
          maxLength={5000}
        />
        <Text style={styles.label}>Category</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.chip, category === item.key && styles.chipActive]}
              onPress={() => setCategory(item.key)}
            >
              <Text style={[styles.chipText, category === item.key && styles.chipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.submit, submitting && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Post</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8FB' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '700', color: '#2D2D2D', marginBottom: 4 },
  reminder: { fontSize: 12, color: '#666', marginBottom: 16 },
  inputTitle: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  inputContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1a1a1a',
    minHeight: 140,
    textAlignVertical: 'top',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24, gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { backgroundColor: '#9C7BB8', borderColor: '#9C7BB8' },
  chipText: { fontSize: 13, color: '#555' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  submit: {
    backgroundColor: '#9C7BB8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
