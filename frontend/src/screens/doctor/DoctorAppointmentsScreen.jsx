import React, { useState, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
    FlatList, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { getServerURL } from '../../utils/serverConfig';
import axios from 'axios';

const TABS = ['Upcoming', 'Past', 'Cancelled'];

const DoctorAppointmentsScreen = () => {
    const navigation = useNavigation();
    const [tab, setTab] = useState('Upcoming');
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    const getHeaders = async () => {
        const token = await AsyncStorage.getItem('jwtToken');
        const baseURL = await getServerURL();
        return { token, baseURL };
    };

    const fetchAppointments = useCallback(async () => {
        setLoading(true);
        try {
            const { token, baseURL } = await getHeaders();
            const resp = await axios.get(`${baseURL}/doctor/appointments`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setAppointments(resp.data.appointments || []);
        } catch (err) {
            console.error('Fetch doctor appointments error:', err);
            Alert.alert('Error', 'Failed to load appointments');
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { fetchAppointments(); }, [fetchAppointments]));

    const now = new Date();
    const filtered = appointments.filter(a => {
        const d = a.scheduledAt ? new Date(a.scheduledAt) : null;
        if (tab === 'Upcoming') return d && d >= now && a.status !== 'cancelled' && a.status !== 'completed';
        if (tab === 'Past') return (a.status === 'completed') || (d && d < now && a.status !== 'cancelled');
        if (tab === 'Cancelled') return a.status === 'cancelled';
        return true;
    });

    const doAction = async (apptId, action) => {
        setActionLoading(apptId + action);
        try {
            const { token, baseURL } = await getHeaders();
            await axios.put(`${baseURL}/doctor/appointments/${apptId}/${action}`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            fetchAppointments();
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Action failed');
        } finally {
            setActionLoading(null);
        }
    };

    const renderItem = ({ item }) => {
        const scheduledDate = item.scheduledAt ? new Date(item.scheduledAt) : null;
        const isUpcoming = scheduledDate && scheduledDate >= now;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.patientLabel}>Patient</Text>
                        <Text style={styles.patientId}>{item.userId}</Text>
                    </View>
                    <View style={[styles.statusBadge, styles[`status_${item.status}`] || styles.status_pending]}>
                        <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                </View>

                {item.notes ? <Text style={styles.notes}>📝 {item.notes}</Text> : null}

                <Text style={styles.dateText}>
                    📅 {scheduledDate ? scheduledDate.toLocaleDateString() : '—'}{' '}
                    at {scheduledDate ? scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                </Text>

                {/* Actions */}
                {(item.status === 'pending' || item.status === 'scheduled') && (
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                            onPress={() => doAction(item.id, 'accept')}
                            disabled={!!actionLoading}
                        >
                            {actionLoading === item.id + 'accept'
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={styles.actionBtnText}>Accept</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
                            onPress={() => doAction(item.id, 'cancel')}
                            disabled={!!actionLoading}
                        >
                            {actionLoading === item.id + 'cancel'
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={styles.actionBtnText}>Cancel</Text>}
                        </TouchableOpacity>
                    </View>
                )}
                {item.status === 'accepted' && (
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#7C3AED', flex: 1 }]}
                            onPress={() => navigation.navigate('VideoConsultation', {
                                meetingRoomId: item.meetingRoomId,
                                chatId: item.chatId,
                                doctorId: item.doctorId,
                                userId: item.userId,
                                role: 'doctor',
                            })}
                        >
                            <Text style={styles.actionBtnText}>📹 Join Call</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#6B7280' }]}
                            onPress={() => navigation.navigate('ChatScreen', { chatId: item.chatId, doctorId: item.doctorId })}
                        >
                            <Text style={styles.actionBtnText}>💬 Chat</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                            onPress={() => doAction(item.id, 'complete')}
                            disabled={!!actionLoading}
                        >
                            {actionLoading === item.id + 'complete'
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={styles.actionBtnText}>✓ Done</Text>}
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
                    <Icon name="chevron-back" size={26} color="#0F172A" style={{ marginLeft: -2 }} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Appointments</Text>
                <TouchableOpacity onPress={fetchAppointments} style={styles.refreshBtn} activeOpacity={0.8}>
                    <Icon name="refresh" size={22} color="#0F172A" />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                {TABS.map(t => (
                    <TouchableOpacity
                        key={t}
                        style={[styles.tab, tab === t && styles.tabActive]}
                        onPress={() => setTab(t)}
                    >
                        <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <ActivityIndicator style={{ flex: 1 }} color="#7C3AED" size="large" />
            ) : filtered.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyText}>No {tab.toLowerCase()} appointments</Text>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: {
        backgroundColor: '#F8FAFC', paddingHorizontal: 20, paddingBottom: 16, paddingTop: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    headerTitle: { color: '#0F172A', fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },
    backBtn: {
        width: 44, height: 44,
        backgroundColor: '#fff',
        borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
        elevation: 5, shadowColor: '#1E293B', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
        borderWidth: 1, borderColor: '#F1F5F9',
    },
    refreshBtn: {
        width: 44, height: 44,
        backgroundColor: '#fff',
        borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
        elevation: 5, shadowColor: '#1E293B', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
        borderWidth: 1, borderColor: '#F1F5F9',
    },
    tabs: {
        flexDirection: 'row', backgroundColor: '#fff', elevation: 4,
        shadowColor: '#1E293B', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    },
    tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: '#6D28D9' },
    tabText: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },
    tabTextActive: { color: '#6D28D9', fontWeight: '800' },
    card: {
        backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16,
        elevation: 6, shadowColor: '#1E293B', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
        borderWidth: 1, borderColor: '#F1F5F9',
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    patientLabel: { fontSize: 12, color: '#64748B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    patientId: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 2 },
    statusBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    status_pending: { backgroundColor: '#FEF3C7' },
    status_accepted: { backgroundColor: '#D1FAE5' },
    status_completed: { backgroundColor: '#DBEAFE' },
    status_cancelled: { backgroundColor: '#FEE2E2' },
    statusText: { fontSize: 12, fontWeight: '800', color: '#374151', textTransform: 'capitalize' },
    notes: { fontSize: 13, color: '#64748B', marginBottom: 10, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
    dateText: { fontSize: 14, color: '#475569', fontWeight: '600' },
    actionsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
    actionBtn: {
        flex: 1, borderRadius: 14, paddingVertical: 14,
        alignItems: 'center', justifyContent: 'center',
    },
    actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyText: { color: '#64748B', fontSize: 16, fontWeight: '600' },
});

export default DoctorAppointmentsScreen;
