import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    SafeAreaView, ScrollView, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServerURL } from '../../utils/serverConfig';
import axios from 'axios';

const SPECIALIZATIONS = [
    'Gynecologist & Obstetrician',
    'Reproductive Endocrinologist',
    'Gynecologic Oncologist',
    'Maternal-Fetal Medicine',
    'Adolescent Gynecologist',
    'Sexual Health Specialist',
    'Urogynecologist',
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIMES = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];

const AddDoctorScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { doctor: existingDoctor, editMode } = route.params || {};

    const [form, setForm] = useState({
        phoneNumber: existingDoctor?.userId || '',
        name: existingDoctor?.name || '',
        specialization: existingDoctor?.specialization || SPECIALIZATIONS[0],
        hospital: existingDoctor?.hospital || '',
        experienceYears: existingDoctor?.experienceYears?.toString() || '',
        consultationFee: existingDoctor?.consultationFee?.toString() || '',
        about: existingDoctor?.about || '',
        languages: existingDoctor?.languages?.join(', ') || '',
    });
    const [selectedSlots, setSelectedSlots] = useState(existingDoctor?.availabilitySlots || []);
    const [loading, setLoading] = useState(false);
    const [showSpecPicker, setShowSpecPicker] = useState(false);

    const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    const toggleSlot = (day, time) => {
        const exists = selectedSlots.some(s => s.day === day && s.time === time);
        if (exists) {
            setSelectedSlots(prev => prev.filter(s => !(s.day === day && s.time === time)));
        } else {
            setSelectedSlots(prev => [...prev, { day, time }]);
        }
    };

    const handleSubmit = async () => {
        if (!form.name || !form.phoneNumber || !form.specialization) {
            Alert.alert('Required', 'Name, phone number, and specialization are required.');
            return;
        }

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('jwtToken');
            const baseURL = await getServerURL();
            const headers = { Authorization: `Bearer ${token}` };
            const payload = {
                ...form,
                experienceYears: Number(form.experienceYears) || 0,
                consultationFee: Number(form.consultationFee) || 0,
                languages: form.languages.split(',').map(l => l.trim()).filter(Boolean),
                availabilitySlots: selectedSlots,
            };

            if (editMode && existingDoctor?.id) {
                await axios.put(`${baseURL}/admin/doctors/${existingDoctor.id}`, payload, { headers });
                Alert.alert('Success', 'Doctor updated successfully.');
            } else {
                await axios.post(`${baseURL}/admin/doctors`, payload, { headers });
                Alert.alert('Success', `Doctor added. User ${form.phoneNumber} can now log in as a doctor.`);
            }
            navigation.goBack();
        } catch (err) {
            const msg = err.response?.data?.error || 'Something went wrong';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    const isSlotSelected = (day, time) => selectedSlots.some(s => s.day === day && s.time === time);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#4B1C46" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{editMode ? 'Edit Doctor' : 'Add Doctor'}</Text>
                <View style={{ width: 70 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>Doctor Details</Text>

                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                    style={[styles.input, editMode && styles.inputDisabled]}
                    value={form.phoneNumber}
                    onChangeText={v => updateForm('phoneNumber', v)}
                    keyboardType="phone-pad"
                    maxLength={10}
                    placeholder="10-digit phone number"
                    placeholderTextColor="#9CA3AF"
                    editable={!editMode}
                />

                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                    style={styles.input}
                    value={form.name}
                    onChangeText={v => updateForm('name', v)}
                    placeholder="Dr. Full Name"
                    placeholderTextColor="#9CA3AF"
                />

                <Text style={styles.label}>Specialization *</Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowSpecPicker(!showSpecPicker)}>
                    <Text style={styles.specText}>{form.specialization}</Text>
                </TouchableOpacity>
                {showSpecPicker && (
                    <View style={styles.specPicker}>
                        {SPECIALIZATIONS.map(s => (
                            <TouchableOpacity
                                key={s}
                                style={[styles.specOption, form.specialization === s && styles.specOptionSelected]}
                                onPress={() => { updateForm('specialization', s); setShowSpecPicker(false); }}
                            >
                                <Text style={[styles.specOptionText, form.specialization === s && { color: '#fff' }]}>{s}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <Text style={styles.label}>Hospital / Clinic</Text>
                <TextInput
                    style={styles.input}
                    value={form.hospital}
                    onChangeText={v => updateForm('hospital', v)}
                    placeholder="Hospital name, city"
                    placeholderTextColor="#9CA3AF"
                />

                <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.label}>Experience (years)</Text>
                        <TextInput
                            style={styles.input}
                            value={form.experienceYears}
                            onChangeText={v => updateForm('experienceYears', v)}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Fee (₹)</Text>
                        <TextInput
                            style={styles.input}
                            value={form.consultationFee}
                            onChangeText={v => updateForm('consultationFee', v)}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>
                </View>

                <Text style={styles.label}>Languages (comma separated)</Text>
                <TextInput
                    style={styles.input}
                    value={form.languages}
                    onChangeText={v => updateForm('languages', v)}
                    placeholder="English, Hindi, Marathi"
                    placeholderTextColor="#9CA3AF"
                />

                <Text style={styles.label}>About</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={form.about}
                    onChangeText={v => updateForm('about', v)}
                    placeholder="Brief professional bio..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                />

                <Text style={styles.sectionTitle}>Availability Slots</Text>
                <Text style={styles.slotHint}>Tap slots to toggle availability</Text>
                {DAYS.map(day => (
                    <View key={day} style={styles.dayRow}>
                        <Text style={styles.dayLabel}>{day.slice(0, 3)}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {TIMES.map(time => (
                                <TouchableOpacity
                                    key={time}
                                    style={[styles.slot, isSlotSelected(day, time) && styles.slotSelected]}
                                    onPress={() => toggleSlot(day, time)}
                                >
                                    <Text style={[styles.slotText, isSlotSelected(day, time) && styles.slotTextSelected]}>
                                        {time}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                ))}
                <Text style={styles.slotCount}>{selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''} selected</Text>

                <TouchableOpacity
                    style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : (
                        <Text style={styles.submitBtnText}>{editMode ? 'Save Changes' : 'Add Doctor'}</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9F5FF' },
    header: {
        backgroundColor: '#4B1C46', padding: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    backBtn: { width: 70 },
    backText: { color: '#DDD6FE', fontSize: 15 },
    content: { padding: 16, paddingBottom: 40 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#4B1C46', marginTop: 16, marginBottom: 8 },
    label: { fontSize: 13, color: '#374151', marginBottom: 4, marginTop: 8 },
    input: {
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
        borderRadius: 10, padding: 12, fontSize: 15, color: '#111',
    },
    inputDisabled: { backgroundColor: '#F3F4F6', color: '#9CA3AF' },
    textArea: { height: 90, textAlignVertical: 'top' },
    row: { flexDirection: 'row' },
    specText: { fontSize: 15, color: '#111', paddingVertical: 2 },
    specPicker: {
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
        borderRadius: 10, marginTop: 4, overflow: 'hidden',
    },
    specOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    specOptionSelected: { backgroundColor: '#7C3AED' },
    specOptionText: { fontSize: 14, color: '#111' },
    slotHint: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
    dayRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    dayLabel: { width: 36, fontSize: 12, fontWeight: '600', color: '#6B7280' },
    slot: {
        backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10,
        paddingVertical: 6, marginRight: 6,
    },
    slotSelected: { backgroundColor: '#7C3AED' },
    slotText: { fontSize: 12, color: '#374151' },
    slotTextSelected: { color: '#fff' },
    slotCount: { fontSize: 13, color: '#6B7280', marginTop: 4, marginBottom: 16 },
    submitBtn: {
        backgroundColor: '#7C3AED', borderRadius: 14, padding: 16,
        alignItems: 'center', marginTop: 8,
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default AddDoctorScreen;
