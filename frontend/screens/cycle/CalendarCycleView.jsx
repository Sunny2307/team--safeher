import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import cycleService from '../../services/cycleService';

const CalendarCycleView = ({ navigation }) => {
    const [markedDates, setMarkedDates] = useState({});
    const [prediction, setPrediction] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            // Fetch History
            const cycles = await cycleService.getCycleHistory();
            // Fetch Predictions
            const pred = await cycleService.getPredictions();
            setPrediction(pred);

            // Process Marked Dates
            const marks = {};

            // 1. Mark Historical Cycles (Red)
            cycles.forEach(cycle => {
                let start = new Date(cycle.startDate);
                let end = cycle.endDate ? new Date(cycle.endDate) : new Date(cycle.startDate); // Determine end or just mark start

                // Loop from start to end
                let curr = new Date(start);
                while (curr <= end) {
                    const dateStr = curr.toISOString().split('T')[0];
                    marks[dateStr] = { color: '#FF6B6B', textColor: 'white', startingDay: dateStr === cycle.startDate, endingDay: dateStr === (cycle.endDate || cycle.startDate) };
                    curr.setDate(curr.getDate() + 1);
                }
            });

            // 2. Mark Prediction (Light Red)
            if (pred && pred.nextPeriodDate) {
                marks[pred.nextPeriodDate] = { color: '#FFCDD2', textColor: 'black', startingDay: true, marked: true };
            }

            // 3. Mark Fertile Window (Green)
            if (pred && pred.fertileWindow) {
                let fStart = new Date(pred.fertileWindow.start);
                let fEnd = new Date(pred.fertileWindow.end);
                let curr = new Date(fStart);
                while (curr <= fEnd) {
                    const dateStr = curr.toISOString().split('T')[0];
                    if (!marks[dateStr]) { // Don't overwrite if overlap (unlikely in normal cycle but possible)
                        marks[dateStr] = { color: '#C8E6C9', textColor: 'black' };
                    }
                    curr.setDate(curr.getDate() + 1);
                }
            }

            // 4. Mark Ovulation (Dark Green Circle)
            if (pred && pred.ovulationDate) {
                const ovDate = pred.ovulationDate;
                if (marks[ovDate]) {
                    marks[ovDate] = { ...marks[ovDate], selected: true, selectedColor: '#4CAF50' };
                } else {
                    marks[ovDate] = { selected: true, selectedColor: '#4CAF50' };
                }
            }

            setMarkedDates(marks);

        } catch (error) {
            console.error('Error fetching cycle data:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const navigateToLog = () => {
        navigation.navigate('CycleLog');
    };

    const navigateToSymptoms = () => {
        navigation.navigate('SymptomTracker');
    };

    const navigateToInsights = () => {
        navigation.navigate('CycleInsights');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E91E63" />
                }
            >
                <View style={styles.headerContainer}>
                    <Text style={styles.header}>My Cycle</Text>
                    {prediction && (
                        <Text style={styles.subHeader}>
                            Next Period: {new Date(prediction.nextPeriodDate).toLocaleDateString()}
                        </Text>
                    )}
                </View>

                <View style={styles.calendarContainer}>
                    <Calendar
                        markingType={'period'}
                        markedDates={markedDates}
                        theme={{
                            todayTextColor: '#E91E63',
                            arrowColor: '#E91E63',
                            textDayFontSize: 15,
                            textMonthFontSize: 16,
                        }}
                        style={styles.calendar}
                    />
                    <View style={styles.legend}>
                        <View style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: '#E91E63' }]} />
                            <Text style={styles.legendText}>Period</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: '#C8E6C9' }]} />
                            <Text style={styles.legendText}>Fertile</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: '#4CAF50' }]} />
                            <Text style={styles.legendText}>Ovulation</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.actionsContainer}>
                    <TouchableOpacity style={styles.actionButton} onPress={navigateToLog} activeOpacity={0.85}>
                        <Text style={styles.actionButtonText}>Log Period</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={navigateToSymptoms} activeOpacity={0.85}>
                        <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Track Symptoms</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.actionButton, styles.outlineButton]} onPress={navigateToInsights} activeOpacity={0.85}>
                        <Text style={[styles.actionButtonText, styles.outlineButtonText]}>View Insights</Text>
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
        paddingHorizontal: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    },
    headerContainer: {
        paddingVertical: 20,
        paddingHorizontal: 16,
        backgroundColor: '#FFF0F5',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        marginBottom: 16,
        alignItems: 'center',
        marginHorizontal: -16,
    },
    header: {
        fontSize: 26,
        fontWeight: '700',
        color: '#AD1457',
    },
    subHeader: {
        fontSize: 14,
        color: '#6D4C7A',
        marginTop: 6,
    },
    calendarContainer: {
        marginBottom: 8,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#fff',
        elevation: 2,
        shadowColor: '#E91E63',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
    },
    calendar: {
        borderRadius: 16,
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginTop: 12,
        marginBottom: 4,
        gap: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 6,
    },
    legendText: {
        color: '#5C4D5A',
        fontSize: 13,
        fontWeight: '500',
    },
    actionsContainer: {
        paddingTop: 8,
        paddingBottom: 8,
    },
    actionButton: {
        backgroundColor: '#E91E63',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 14,
        alignItems: 'center',
        marginBottom: 12,
        elevation: 3,
        shadowColor: '#AD1457',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        backgroundColor: '#FCE4EC',
    },
    secondaryButtonText: {
        color: '#AD1457',
    },
    outlineButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#E91E63',
    },
    outlineButtonText: {
        color: '#E91E63',
    },
});

export default CalendarCycleView;
