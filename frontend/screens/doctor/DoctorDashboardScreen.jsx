import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
    ScrollView, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServerURL } from '../../utils/serverConfig';
import axios from 'axios';

const DoctorDashboardScreen = () => {
    const navigation = useNavigation();
    const [profile, setProfile] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    const getHeaders = async () => {
        const token = await AsyncStorage.getItem('jwtToken');
        const baseURL = await getServerURL();
        return { token, baseURL };
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { token, baseURL } = await getHeaders();
            const headers = { Authorization: `Bearer ${token}` };

            const [profileResp, apptResp] = await Promise.all([
                axios.get(`${baseURL}/doctor/profile`, { headers }),
                axios.get(`${baseURL}/doctor/appointments`, { headers }),
            ]);

            setProfile(profileResp.data.doctor);
            setAppointments(apptResp.data.appointments || []);
        } catch (err) {
            console.error('Doctor dashboard fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

    const handleLogout = async () => {
        await AsyncStorage.multiRemove(['jwtToken', 'userRole']);
        navigation.reset({ index: 0, routes: [{ name: 'SignUpLogin' }] });
    };

    const today = new Date().toDateString();
    const todayAppts = appointments.filter(a => {
        const d = a.scheduledAt ? new Date(a.scheduledAt).toDateString() : '';
        return d === today && a.status !== 'cancelled';
    });
    const upcoming = appointments.filter(a => {
        const d = a.scheduledAt ? new Date(a.scheduledAt) : null;
        return d && d > new Date() && a.status !== 'cancelled';
    });

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator style={{ flex: 1 }} color="#7C3AED" size="large" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#4B1C46" />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Good {getTimeGreeting()},</Text>
                    <Text style={styles.doctorName}>{profile?.name || 'Doctor'}</Text>
                    <Text style={styles.spec}>{profile?.specialization}</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                {/* Stats */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: '#F5F3FF' }]}>
                        <Text style={styles.statNum}>{todayAppts.length}</Text>
                        <Text style={styles.statLabel}>Today</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#ECFDF5' }]}>
                        <Text style={styles.statNum}>{upcoming.length}</Text>
                        <Text style={styles.statLabel}>Upcoming</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
                        <Text style={styles.statNum}>{profile?.rating?.toFixed(1) || '—'}</Text>
                        <Text style={styles.statLabel}>Rating</Text>
                    </View>
                </View>

                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.actionsGrid}>
                    <TouchableOpacity
                        style={[styles.actionCard, { backgroundColor: '#7C3AED' }]}
                        onPress={() => navigation.navigate('DoctorAppointments')}
                    >
                        <Text style={styles.actionIcon}>📅</Text>
                        <Text style={styles.actionText}>Appointments</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionCard, { backgroundColor: '#10B981' }]}
                        onPress={() => navigation.navigate('AvailabilityEditor', { profile })}
                    >
                        <Text style={styles.actionIcon}>🕐</Text>
                        <Text style={styles.actionText}>Availability</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.actionsGrid}>
                    <TouchableOpacity
                        style={[styles.actionCard, { backgroundColor: '#9C7BB8' }]}
                        onPress={() => navigation.navigate('ForumHome')}
                    >
                        <Text style={styles.actionIcon}>💬</Text>
                        <Text style={styles.actionText}>Anonymous Forum</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionCard, { backgroundColor: '#BE185D' }]}
                        onPress={() => navigation.navigate('PCOSSupport')}
                    >
                        <Text style={styles.actionIcon}>🌸</Text>
                        <Text style={styles.actionText}>PCOS Support</Text>
                    </TouchableOpacity>
                </View>

                {/* Today's Schedule */}
                <Text style={styles.sectionTitle}>Today's Schedule</Text>
                {todayAppts.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyText}>No appointments today 🎉</Text>
                    </View>
                ) : (
                    todayAppts.map(appt => (
                        <View key={appt.id} style={styles.apptCard}>
                            <View style={styles.apptTime}>
                                <Text style={styles.apptTimeText}>
                                    {appt.scheduledAt ? new Date(appt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                </Text>
                            </View>
                            <View style={styles.apptInfo}>
                                <Text style={styles.apptPatient}>Patient: {appt.userId}</Text>
                                <Text style={styles.apptStatus}>{appt.status}</Text>
                            </View>
                            {appt.status === 'accepted' && (
                                <View style={styles.actionButtons}>
                                    <TouchableOpacity
                                        style={styles.joinBtn}
                                        onPress={() => navigation.navigate('VideoConsultation', {
                                            meetingRoomId: appt.meetingRoomId,
                                            chatId: appt.chatId,
                                            doctorId: appt.doctorId,
                                            userId: appt.userId,
                                            role: 'doctor',
                                        })}
                                    >
                                        <Text style={styles.joinBtnText}>Join Call</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.chatBtn}
                                        onPress={() => navigation.navigate('ChatScreen', {
                                            chatId: appt.chatId,
                                            partnerId: appt.userId,
                                            partnerName: appt.patientName || `Patient ${appt.userId}`,
                                            meetingRoomId: appt.meetingRoomId,
                                        })}
                                    >
                                        <Text style={styles.chatBtnText}>Chat</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

function getTimeGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    return 'Evening';
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9F5FF' },
    header: {
        backgroundColor: '#4B1C46', padding: 20,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    },
    greeting: { color: '#DDD6FE', fontSize: 13 },
    doctorName: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 2 },
    spec: { color: '#C4B5FD', fontSize: 12, marginTop: 2 },
    logoutBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    logoutText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    content: { padding: 16, paddingBottom: 40 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
    statCard: { flex: 1, marginHorizontal: 4, borderRadius: 12, padding: 14, alignItems: 'center' },
    statNum: { fontSize: 26, fontWeight: 'bold', color: '#1F2937' },
    statLabel: { fontSize: 11, color: '#6B7280', marginTop: 4 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginTop: 8, marginBottom: 10 },
    actionsGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    actionCard: {
        flex: 1, borderRadius: 14, padding: 16,
        alignItems: 'center', justifyContent: 'center',
    },
    actionIcon: { fontSize: 28, marginBottom: 6 },
    actionText: { color: '#fff', fontWeight: '600', fontSize: 13, textAlign: 'center' },
    emptyCard: {
        backgroundColor: '#fff', borderRadius: 12, padding: 20,
        alignItems: 'center', elevation: 1,
    },
    emptyText: { color: '#6B7280', fontSize: 14 },
    apptCard: {
        backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
        flexDirection: 'row', alignItems: 'center', elevation: 1,
    },
    apptTime: {
        backgroundColor: '#EDE9FE', borderRadius: 8, padding: 8,
        marginRight: 12, alignItems: 'center', minWidth: 60,
    },
    apptTimeText: { fontSize: 12, fontWeight: '600', color: '#7C3AED' },
    apptInfo: { flex: 1 },
    apptPatient: { fontSize: 14, fontWeight: '500', color: '#1F2937' },
    apptStatus: { fontSize: 12, color: '#6B7280', marginTop: 2, textTransform: 'capitalize' },
    actionButtons: { flexDirection: 'row', gap: 8 },
    joinBtn: { backgroundColor: '#7C3AED', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    joinBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
    chatBtn: { backgroundColor: '#0EA5E9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    chatBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
});

export default DoctorDashboardScreen;
