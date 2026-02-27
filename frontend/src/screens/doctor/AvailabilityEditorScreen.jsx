import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
    ScrollView, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServerURL } from '../../utils/serverConfig';
import axios from 'axios';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIMES = [
    '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
];

const AvailabilityEditorScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { profile } = route.params || {};

    const [slots, setSlots] = useState(profile?.availabilitySlots || []);
    const [saving, setSaving] = useState(false);

    const isSelected = (day, time) => slots.some(s => s.day === day && s.time === time);

    const toggle = (day, time) => {
        if (isSelected(day, time)) {
            setSlots(prev => prev.filter(s => !(s.day === day && s.time === time)));
        } else {
            setSlots(prev => [...prev, { day, time }]);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = await AsyncStorage.getItem('jwtToken');
            const baseURL = await getServerURL();
            await axios.put(
                `${baseURL}/doctor/availability`,
                { availabilitySlots: slots },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            Alert.alert('Saved', 'Your availability has been updated.');
            navigation.goBack();
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to save availability');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#4B1C46" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Availability</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving}>
                    {saving
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={styles.saveText}>Save</Text>}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.hint}>Tap a time slot to toggle your availability for that day.</Text>
                <Text style={styles.count}>{slots.length} slot{slots.length !== 1 ? 's' : ''} selected</Text>

                {DAYS.map(day => (
                    <View key={day} style={styles.dayBlock}>
                        <Text style={styles.dayLabel}>{day}</Text>
                        <View style={styles.slotsGrid}>
                            {TIMES.map(time => {
                                const selected = isSelected(day, time);
                                return (
                                    <TouchableOpacity
                                        key={time}
                                        style={[styles.slot, selected && styles.slotSelected]}
                                        onPress={() => toggle(day, time)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.slotText, selected && styles.slotTextSelected]}>
                                            {time}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                ))}
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
    backText: { color: '#DDD6FE', fontSize: 15 },
    saveText: { color: '#A78BFA', fontSize: 16, fontWeight: '700' },
    content: { padding: 16, paddingBottom: 40 },
    hint: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
    count: { fontSize: 13, fontWeight: '600', color: '#7C3AED', marginBottom: 16 },
    dayBlock: { marginBottom: 16 },
    dayLabel: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
    slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    slot: {
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
        borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
    },
    slotSelected: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
    slotText: { fontSize: 12, color: '#374151' },
    slotTextSelected: { color: '#fff', fontWeight: '600' },
});

export default AvailabilityEditorScreen;
