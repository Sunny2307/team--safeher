import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import symptomService from '../../services/symptomService';

const SYMPTOMS_LIST = ['Cramps', 'Headache', 'Acne', 'Fatigue', 'Bloating', 'Cravings', 'Backache', 'Nausea'];
const MOODS = ['Happy', 'Sad', 'Irritable', 'Anxious', 'Energetic', 'Calm'];
const FLOWS = ['None', 'Spotting', 'Light', 'Medium', 'Heavy'];

const SymptomTrackerScreen = ({ navigation }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedSymptoms, setSelectedSymptoms] = useState([]);
    const [selectedMood, setSelectedMood] = useState('');
    const [selectedFlow, setSelectedFlow] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const toggleSymptom = (symptom) => {
        if (selectedSymptoms.includes(symptom)) {
            setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
        } else {
            setSelectedSymptoms([...selectedSymptoms, symptom]);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await symptomService.addSymptom({
                date: selectedDate,
                symptoms: selectedSymptoms,
                mood: selectedMood,
                flow: selectedFlow,
                notes
            });
            Alert.alert('Success', 'Symptoms logged successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            const msg = typeof error === 'string' ? error : (error?.error || error?.message || 'Failed to save symptoms');
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.header}>Track Symptoms</Text>
                <Text style={styles.date}>{selectedDate}</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Flow</Text>
                    <View style={styles.chipContainer}>
                        {FLOWS.map(flow => (
                            <TouchableOpacity
                                key={flow}
                                style={[styles.chip, selectedFlow === flow && styles.selectedChip]}
                                onPress={() => setSelectedFlow(flow)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.chipText, selectedFlow === flow && styles.selectedChipText]}>{flow}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Mood</Text>
                    <View style={styles.chipContainer}>
                        {MOODS.map(mood => (
                            <TouchableOpacity
                                key={mood}
                                style={[styles.chip, selectedMood === mood && styles.selectedChip]}
                                onPress={() => setSelectedMood(mood)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.chipText, selectedMood === mood && styles.selectedChipText]}>{mood}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Physical Symptoms</Text>
                    <View style={styles.chipContainer}>
                        {SYMPTOMS_LIST.map(symptom => (
                            <TouchableOpacity
                                key={symptom}
                                style={[styles.chip, selectedSymptoms.includes(symptom) && styles.selectedChip]}
                                onPress={() => toggleSymptom(symptom)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.chipText, selectedSymptoms.includes(symptom) && styles.selectedChipText]}>{symptom}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notes</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="How are you feeling?"
                        placeholderTextColor="#9E9E9E"
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                    />
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Entry</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF8FA',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    },
    header: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 6,
        color: '#AD1457',
    },
    date: {
        fontSize: 15,
        color: '#6D4C7A',
        marginBottom: 20,
    },
    section: {
        marginBottom: 22,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 12,
        color: '#5C4D5A',
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#FCE4EC',
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    selectedChip: {
        backgroundColor: '#E91E63',
        borderColor: '#E91E63',
    },
    chipText: {
        color: '#5C4D5A',
        fontSize: 14,
        fontWeight: '500',
    },
    selectedChipText: {
        color: '#fff',
        fontWeight: '600',
    },
    input: {
        borderWidth: 1.5,
        borderColor: '#F8BBD9',
        borderRadius: 12,
        padding: 14,
        minHeight: 96,
        textAlignVertical: 'top',
        fontSize: 15,
        color: '#333',
        backgroundColor: '#fff',
    },
    saveButton: {
        backgroundColor: '#E91E63',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#AD1457',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
});

export default SymptomTrackerScreen;
