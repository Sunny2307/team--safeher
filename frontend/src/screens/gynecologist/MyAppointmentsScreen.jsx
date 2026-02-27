import React, { useState, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    FlatList, ActivityIndicator, Alert, StatusBar, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppointments, cancelAppointment } from '../../api/api';
import liveLocationService from '../../services/liveLocationService';

const TABS = ['Upcoming', 'Past', 'Cancelled'];

const STATUS_COLORS = {
    scheduled: { bg: '#FEF3C7', text: '#92400E' },
    pending: { bg: '#FEF3C7', text: '#92400E' },
    accepted: { bg: '#D1FAE5', text: '#065F46' },
    completed: { bg: '#DBEAFE', text: '#1E40AF' },
    cancelled: { bg: '#FEE2E2', text: '#991B1B' },
};

export default function MyAppointmentsScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('Upcoming');
    const [cancellingId, setCancellingId] = useState(null);

    const fetchAppointments = useCallback(async () => {
        setLoading(true);
        try {
            const resp = await getAppointments();
            setAppointments(resp.data?.appointments || []);
        } catch (err) {
            console.error('Fetch appointments error:', err);
            Alert.alert('Error', 'Could not load appointments. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { fetchAppointments(); }, [fetchAppointments]));

    const now = new Date();

    const filtered = appointments.filter(a => {
        const d = a.scheduledAt ? new Date(a.scheduledAt) : null;
        if (tab === 'Upcoming') return d && d >= now && a.status !== 'cancelled' && a.status !== 'completed';
        if (tab === 'Past') return a.status === 'completed' || (d && d < now && a.status !== 'cancelled');
        if (tab === 'Cancelled') return a.status === 'cancelled';
        return true;
    }).sort((a, b) => {
        const da = a.scheduledAt ? new Date(a.scheduledAt) : 0;
        const db2 = b.scheduledAt ? new Date(b.scheduledAt) : 0;
        return tab === 'Past' ? db2 - da : da - db2;
    });
    // ── Emit call-user socket → doctor popup, then navigate to waiting room ──
    const handleJoinCall = useCallback(async (item) => {
        const socket = liveLocationService.socket;
        if (!socket?.connected) {
            Alert.alert('Not Connected', 'Server connection lost. Please reopen the app.');
            return;
        }

        let fromName = 'Patient';
        try {
            const profile = await AsyncStorage.getItem('userProfile');
            if (profile) {
                const parsed = JSON.parse(profile);
                fromName = parsed.name || parsed.fullName || 'Patient';
            }
        } catch { /* use default */ }

        // Notify doctor via socket — IncomingCallOverlay will show on their screen
        socket.emit('call-user', {
            toUserId: item.doctorId,
            meetingRoomId: item.meetingRoomId,
            fromName,
            chatId: item.chatId,
            doctorId: item.doctorId,
        });

        // Patient goes straight to the waiting room
        navigation.navigate('VideoConsultation', {
            meetingRoomId: item.meetingRoomId,
            chatId: item.chatId,
            doctorId: item.doctorId,
            doctorName: item.doctorName,
            role: 'user',
        });
    }, [navigation]);

    const handleCancel = (appt) => {
        Alert.alert(
            'Cancel Appointment',
            `Are you sure you want to cancel your appointment with ${appt.doctorName || 'this doctor'}?`,
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        setCancellingId(appt.id);
                        try {
                            await cancelAppointment(appt.id);
                            fetchAppointments();
                        } catch {
                            Alert.alert('Error', 'Could not cancel appointment. Try again.');
                        } finally {
                            setCancellingId(null);
                        }
                    },
                },
            ]
        );
    };

    const renderItem = ({ item }) => {
        const scheduledDate = item.scheduledAt ? new Date(item.scheduledAt) : null;
        const colors = STATUS_COLORS[item.status] || STATUS_COLORS.scheduled;
        const isUpcoming = scheduledDate && scheduledDate >= now && item.status !== 'cancelled' && item.status !== 'completed';
        const isAccepted = item.status === 'accepted';
        const isScheduled = item.status === 'scheduled' || item.status === 'pending';

        return (
            <View style={styles.card}>
                {/* Top row */}
                <View style={styles.cardTop}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>
                            {item.doctorName
                                ? item.doctorName.split(' ').slice(1).map(w => w[0]).join('').substring(0, 2)
                                : '🩺'}
                        </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.doctorName}>{item.doctorName || 'Doctor'}</Text>
                        <Text style={styles.specialization}>{item.specialization || 'Consultation'}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                        <Text style={[styles.statusText, { color: colors.text }]}>
                            {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
                        </Text>
                    </View>
                </View>

                {/* Date/Time */}
                <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoIcon}>📅</Text>
                        <Text style={styles.infoText}>
                            {scheduledDate ? scheduledDate.toLocaleDateString('en-IN', {
                                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                            }) : '—'}
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.infoIcon}>🕐</Text>
                        <Text style={styles.infoText}>
                            {scheduledDate ? scheduledDate.toLocaleTimeString('en-IN', {
                                hour: '2-digit', minute: '2-digit',
                            }) : '—'}
                        </Text>
                    </View>
                </View>

                {item.notes ? (
                    <View style={styles.notesRow}>
                        <Text style={styles.notesText}>📝 {item.notes}</Text>
                    </View>
                ) : null}

                {/* Action buttons — accepted: Video Call + Chat */}
                {isAccepted && (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.videoBtn]}
                            onPress={() => handleJoinCall(item)}
                        >
                            <Text style={styles.actionBtnText}>📹  Join Video Call</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.chatBtn]}
                            onPress={() => navigation.navigate('ChatScreen', {
                                chatId: item.chatId,
                                doctorId: item.doctorId,
                                doctorName: item.doctorName,
                                meetingRoomId: item.meetingRoomId,
                            })}
                        >
                            <Text style={styles.actionBtnText}>💬  Chat</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Action buttons — scheduled/pending: Chat + Cancel */}
                {isScheduled && isUpcoming && (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.chatBtn]}
                            onPress={() => navigation.navigate('ChatScreen', {
                                chatId: item.chatId,
                                doctorId: item.doctorId,
                                doctorName: item.doctorName,
                                meetingRoomId: item.meetingRoomId,
                            })}
                        >
                            <Text style={styles.actionBtnText}>💬  Message Doctor</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.cancelBtn]}
                            onPress={() => handleCancel(item)}
                            disabled={cancellingId === item.id}
                        >
                            {cancellingId === item.id
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={styles.actionBtnText}>✕  Cancel</Text>}
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
            {/* Premium Light Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
                    <Icon name="chevron-back" size={26} color="#0F172A" style={{ marginLeft: -2 }} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Appointments</Text>
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
                    <Text style={styles.emptyIcon}>📋</Text>
                    <Text style={styles.emptyTitle}>No {tab.toLowerCase()} appointments</Text>
                    <Text style={styles.emptyHint}>
                        {tab === 'Upcoming' ? 'Book a consultation from Find a Doctor.' : 'Your history will appear here.'}
                    </Text>
                    {tab === 'Upcoming' && (
                        <TouchableOpacity
                            style={styles.bookBtn}
                            onPress={() => navigation.navigate('DoctorList')}
                        >
                            <Text style={styles.bookBtnText}>Find a Doctor →</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: {
        backgroundColor: '#F8FAFC', flexDirection: 'row',
        alignItems: 'center', paddingHorizontal: 20,
        paddingBottom: 16,
        justifyContent: 'space-between',
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
    tab: {
        flex: 1, paddingVertical: 14, alignItems: 'center',
        borderBottomWidth: 3, borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: '#6D28D9' },
    tabText: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },
    tabTextActive: { color: '#6D28D9', fontWeight: '800' },
    list: {
        padding: 20,
    },
    card: {
        backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16,
        elevation: 6, shadowColor: '#1E293B', shadowOpacity: 0.08,
        shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
        overflow: 'hidden',
        borderWidth: 1, borderColor: '#F1F5F9',
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 14 },
    avatarCircle: {
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#EDE9FE',
    },
    avatarText: { fontSize: 18, fontWeight: '800', color: '#6D28D9' },
    doctorName: { fontSize: 18, fontWeight: '800', color: '#0F172A', flex: 1 },
    specialization: { fontSize: 13, color: '#6D28D9', marginTop: 2, fontWeight: '600' },
    statusBadge: { borderRadius: 22, paddingHorizontal: 12, paddingVertical: 6 },
    statusText: { fontSize: 12, fontWeight: '800' },
    infoRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
    infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    infoIcon: { fontSize: 15 },
    infoText: { fontSize: 14, color: '#475569', fontWeight: '600' },
    notesRow: {
        backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12,
        marginTop: 6, marginBottom: 6, borderWidth: 1, borderColor: '#F1F5F9',
    },
    notesText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
    actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
    actionBtn: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    videoBtn: { backgroundColor: '#6D28D9' },
    chatBtn: { backgroundColor: '#0EA5E9' },
    cancelBtn: { backgroundColor: '#DC2626' },
    actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyIcon: { fontSize: 64, marginBottom: 20 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
    emptyHint: { fontSize: 15, color: '#64748B', textAlign: 'center', marginBottom: 28, fontWeight: '500' },
    bookBtn: {
        backgroundColor: '#6D28D9', borderRadius: 16,
        paddingHorizontal: 32, paddingVertical: 16,
        elevation: 6, shadowColor: '#6D28D9', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    },
    bookBtnText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
});
