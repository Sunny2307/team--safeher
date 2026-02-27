import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import cycleService from '../../services/cycleService';

const CycleInsightsScreen = () => {
    const [loading, setLoading] = useState(true);
    const [predictions, setPredictions] = useState(null);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        fetchInsights();
    }, []);

    const fetchInsights = async () => {
        try {
            const predParams = await cycleService.getPredictions();
            const histParams = await cycleService.getCycleHistory();
            setPredictions(predParams);
            setHistory(histParams);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color="#E91E63" />
                    <Text style={styles.loadingText}>Loading insights…</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.header}>Cycle Insights</Text>

                {predictions ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Predictions</Text>

                        <View style={styles.row}>
                            <Text style={styles.label}>Average Cycle Length</Text>
                            <Text style={styles.value}>{predictions.averageCycleLength} days</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.row}>
                            <Text style={styles.label}>Next Period</Text>
                            <Text style={styles.value}>{new Date(predictions.nextPeriodDate).toDateString()}</Text>
                        </View>

                        <View style={styles.row}>
                            <Text style={styles.label}>Ovulation</Text>
                            <Text style={styles.value}>{new Date(predictions.ovulationDate).toDateString()}</Text>
                        </View>

                        <View style={styles.divider} />

                        <Text style={styles.subHeader}>Fertile Window</Text>
                        <Text style={styles.valueCenter}>
                            {new Date(predictions.fertileWindow.start).toLocaleDateString()} – {new Date(predictions.fertileWindow.end).toLocaleDateString()}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.card}>
                        <Text style={styles.infoText}>Log more cycles to see predictions.</Text>
                    </View>
                )}

                <Text style={styles.sectionHeader}>Cycle History</Text>
                {history.length === 0 ? (
                    <View style={styles.emptyHistory}>
                        <Text style={styles.emptyHistoryText}>No history yet. Log your first period in My Cycle.</Text>
                    </View>
                ) : (
                    history.map((cycle, index) => (
                        <View key={cycle.id || index} style={styles.historyCard}>
                            <View style={styles.historyRow}>
                                <Text style={styles.historyDate}>
                                    {new Date(cycle.startDate).toLocaleDateString()}
                                </Text>
                                <Text style={styles.historyDuration}>
                                    {cycle.cycleLength ? `${cycle.cycleLength} days` : 'Ongoing'}
                                </Text>
                            </View>
                            {cycle.endDate && (
                                <Text style={styles.historySub}>Ended: {new Date(cycle.endDate).toLocaleDateString()}</Text>
                            )}
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF8FA',
    },
    loadingWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 15,
        color: '#6D4C7A',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    },
    header: {
        fontSize: 26,
        fontWeight: '700',
        marginBottom: 20,
        color: '#AD1457',
    },
    card: {
        backgroundColor: '#FFF0F5',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#FCE4EC',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#AD1457',
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    label: {
        fontSize: 15,
        color: '#6D4C7A',
        flex: 1,
    },
    value: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    valueCenter: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2E7D32',
        textAlign: 'center',
        marginTop: 10,
    },
    divider: {
        height: 1,
        backgroundColor: '#F8BBD9',
        marginVertical: 12,
    },
    subHeader: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6D4C7A',
        marginTop: 4,
    },
    infoText: {
        textAlign: 'center',
        color: '#6D4C7A',
        fontStyle: 'italic',
        fontSize: 15,
    },
    sectionHeader: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 14,
        marginTop: 8,
        color: '#AD1457',
    },
    emptyHistory: {
        padding: 20,
        backgroundColor: '#FCE4EC',
        borderRadius: 12,
    },
    emptyHistoryText: {
        textAlign: 'center',
        color: '#6D4C7A',
        fontSize: 14,
    },
    historyCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 14,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#E91E63',
        elevation: 1,
        shadowColor: '#E91E63',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    historyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    historyDate: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    historyDuration: {
        color: '#E91E63',
        fontWeight: '600',
        fontSize: 14,
    },
    historySub: {
        color: '#757575',
        fontSize: 13,
    },
});

export default CycleInsightsScreen;
