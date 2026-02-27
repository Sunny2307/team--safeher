import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import cycleService from '../../services/cycleService';

const CycleLogScreen = ({ navigation }) => {
    const [selectedStartDate, setSelectedStartDate] = useState('');
    const [selectedEndDate, setSelectedEndDate] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const onDayPress = (day) => {
        if (!selectedStartDate) {
            setSelectedStartDate(day.dateString);
        } else if (!selectedEndDate) {
            if (day.dateString < selectedStartDate) {
                setSelectedEndDate(selectedStartDate);
                setSelectedStartDate(day.dateString);
            } else {
                setSelectedEndDate(day.dateString);
            }
        } else {
            // Reset if both selected
            setSelectedStartDate(day.dateString);
            setSelectedEndDate('');
        }
    };

    const getMarkedDates = () => {
        const marks = {};
        if (selectedStartDate) {
            marks[selectedStartDate] = { startingDay: true, color: '#E91E63', textColor: 'white' };
        }
        if (selectedEndDate) {
            marks[selectedEndDate] = { endingDay: true, color: '#E91E63', textColor: 'white' };
        }
        if (selectedStartDate && selectedEndDate) {
            let start = new Date(selectedStartDate);
            let end = new Date(selectedEndDate);
            // Fill in between
            let curr = new Date(start);
            curr.setDate(curr.getDate() + 1);
            while (curr < end) {
                marks[curr.toISOString().split('T')[0]] = { color: '#E91E63', textColor: 'white' };
                curr.setDate(curr.getDate() + 1);
            }
        }
        return marks;
    };

    const handleSave = async () => {
        if (!selectedStartDate) {
            Alert.alert('Error', 'Please select at least a start date.');
            return;
        }

        setLoading(true);
        try {
            await cycleService.addCycle(selectedStartDate, selectedEndDate, notes);
            Alert.alert('Success', 'Cycle saved successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            const msg = typeof error === 'string' ? error : (error?.error || error?.message || 'Failed to save cycle');
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
                <Text style={styles.header}>Log Period</Text>

                <View style={styles.calendarContainer}>
                    <Calendar
                        onDayPress={onDayPress}
                        markingType={'period'}
                        markedDates={getMarkedDates()}
                        theme={{
                            todayTextColor: '#E91E63',
                            arrowColor: '#E91E63',
                            selectedDayBackgroundColor: '#E91E63',
                            textDayFontSize: 15,
                            textMonthFontSize: 16,
                        }}
                        style={styles.calendar}
                    />
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.dateRow}>
                        <Text style={styles.label}>Start</Text>
                        <Text style={styles.dateValue}>{selectedStartDate || 'Tap calendar'}</Text>
                    </View>
                    <View style={styles.dateRow}>
                        <Text style={styles.label}>End</Text>
                        <Text style={styles.dateValue}>{selectedEndDate || 'Optional'}</Text>
                    </View>

                    <Text style={styles.label}>Notes</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Add notes (optional)..."
                        placeholderTextColor="#9E9E9E"
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                    />

                    <TouchableOpacity
                        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save Period</Text>
                        )}
                    </TouchableOpacity>
                </View>
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
        color: '#AD1457',
        marginBottom: 16,
        marginTop: 8,
        textAlign: 'center',
    },
    calendarContainer: {
        marginBottom: 20,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#E91E63',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        backgroundColor: '#fff',
    },
    calendar: {
        borderRadius: 16,
    },
    formContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#E91E63',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
    },
    dateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        color: '#6D4C7A',
        fontWeight: '600',
    },
    dateValue: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
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
        marginTop: 4,
    },
    saveButton: {
        backgroundColor: '#E91E63',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 24,
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

export default CycleLogScreen;
