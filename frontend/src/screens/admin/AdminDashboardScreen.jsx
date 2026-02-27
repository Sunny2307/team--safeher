import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
    FlatList, ActivityIndicator, ScrollView, Switch, Alert, StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServerURL } from '../../utils/serverConfig';
import axios from 'axios';
import { useFeatures } from '../../context/FeatureContext';
import { updateAppFeatures } from '../../api/api';

const AdminDashboardScreen = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, active: 0, verified: 0 });
    const { features, updateFeatureState } = useFeatures();

    const toggleFeature = async (featureKey) => {
        try {
            const newFeatures = { ...features, [featureKey]: !features[featureKey] };
            updateFeatureState(newFeatures); // Optimistic UI update
            await updateAppFeatures(newFeatures);
        } catch (error) {
            Alert.alert('Error', 'Failed to update feature');
            // Revert on error
            updateFeatureState(features);
        }
    };

    const getAuthHeaders = async () => {
        const token = await AsyncStorage.getItem('jwtToken');
        const baseURL = await getServerURL();
        return { token, baseURL };
    };

    const fetchDoctors = useCallback(async () => {
        setLoading(true);
        try {
            const { token, baseURL } = await getAuthHeaders();
            const resp = await axios.get(`${baseURL}/admin/doctors`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const list = resp.data.doctors || [];
            setDoctors(list);
            setStats({
                total: list.length,
                active: list.filter(d => d.active).length,
                verified: list.filter(d => d.verified).length,
            });
        } catch (err) {
            console.error('Fetch admin doctors error:', err);
            Alert.alert('Error', 'Failed to load doctors');
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { fetchDoctors(); }, [fetchDoctors]));

    const toggleActive = async (doctorId) => {
        try {
            const { token, baseURL } = await getAuthHeaders();
            await axios.put(`${baseURL}/admin/doctors/${doctorId}/toggle`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            fetchDoctors();
        } catch { Alert.alert('Error', 'Failed to toggle status'); }
    };

    const toggleVerify = async (doctorId) => {
        try {
            const { token, baseURL } = await getAuthHeaders();
            await axios.put(`${baseURL}/admin/doctors/${doctorId}/verify`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            fetchDoctors();
        } catch { Alert.alert('Error', 'Failed to toggle verification'); }
    };

    const handleLogout = async () => {
        await AsyncStorage.multiRemove(['jwtToken', 'userRole']);
        navigation.reset({ index: 0, routes: [{ name: 'SignUpLogin' }] });
    };

    const renderDoctor = ({ item }) => (
        <View style={styles.doctorCard}>
            <View style={styles.doctorCardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.doctorName}>{item.name}</Text>
                    <Text style={styles.doctorSpec}>{item.specialization}</Text>
                    <Text style={styles.doctorHospital}>{item.hospital}</Text>
                </View>
                <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => navigation.navigate('AddDoctor', { doctor: item, editMode: true })}
                >
                    <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.toggleRow}>
                <View style={styles.toggleItem}>
                    <Text style={styles.toggleLabel}>Active</Text>
                    <Switch
                        value={item.active}
                        onValueChange={() => toggleActive(item.id)}
                        trackColor={{ true: '#7C3AED', false: '#ccc' }}
                        thumbColor="#fff"
                    />
                </View>
                <View style={styles.toggleItem}>
                    <Text style={styles.toggleLabel}>Verified</Text>
                    <Switch
                        value={item.verified}
                        onValueChange={() => toggleVerify(item.id)}
                        trackColor={{ true: '#10B981', false: '#ccc' }}
                        thumbColor="#fff"
                    />
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#4B1C46" />

            {/* Fixed Header */}
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <View>
                    <Text style={styles.headerTitle}>Admin Dashboard</Text>
                    <Text style={styles.headerSubtitle}>SafeHer Console</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Stats */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: '#EDE9FE' }]}>
                        <Text style={styles.statNum}>{stats.total}</Text>
                        <Text style={styles.statLabel}>Total</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
                        <Text style={styles.statNum}>{stats.active}</Text>
                        <Text style={styles.statLabel}>Active</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
                        <Text style={styles.statNum}>{stats.verified}</Text>
                        <Text style={styles.statLabel}>Verified</Text>
                    </View>
                </View>

                {/* Add Doctor */}
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => navigation.navigate('AddDoctor', { editMode: false })}
                >
                    <Text style={styles.addBtnText}>+ Add New Doctor</Text>
                </TouchableOpacity>

                {/* Feature Management */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>App Features</Text>
                    <View style={styles.featureList}>
                        {Object.keys(features || {}).map((key) => (
                            <View key={key} style={styles.featureItem}>
                                <Text style={styles.featureName}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</Text>
                                <Switch
                                    value={features[key]}
                                    onValueChange={() => toggleFeature(key)}
                                    trackColor={{ true: '#10B981', false: '#ccc' }}
                                    thumbColor="#fff"
                                />
                            </View>
                        ))}
                    </View>
                </View>

                {/* Community & Health admin */}
                <View style={styles.adminLinksRow}>
                    <TouchableOpacity
                        style={styles.adminLinkCard}
                        onPress={() => navigation.navigate('AdminPCOSResources')}
                    >
                        <Text style={styles.adminLinkIcon}>🌸</Text>
                        <Text style={styles.adminLinkLabel}>PCOS Resources</Text>
                        <Text style={styles.adminLinkHint}>Add / edit tips & guides</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.adminLinkCard}
                        onPress={() => navigation.navigate('ForumAdmin')}
                    >
                        <Text style={styles.adminLinkIcon}>🛡️</Text>
                        <Text style={styles.adminLinkLabel}>Forum moderation</Text>
                        <Text style={styles.adminLinkHint}>Review reported posts</Text>
                    </TouchableOpacity>
                </View>

                {/* Doctor List */}
                {loading ? (
                    <ActivityIndicator style={{ marginTop: 40, marginBottom: 40 }} color="#7C3AED" size="large" />
                ) : doctors.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>🏥</Text>
                        <Text style={styles.emptyText}>No doctors onboarded yet.</Text>
                        <Text style={styles.emptyHint}>Tap "Add New Doctor" to get started.</Text>
                    </View>
                ) : (
                    <View style={styles.doctorListSection}>
                        <Text style={styles.doctorListTitle}>Doctors</Text>
                        {doctors.map((item) => (
                            <View key={item.id}>{renderDoctor({ item })}</View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9F5FF' },
    header: {
        backgroundColor: '#4B1C46',
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    headerSubtitle: { fontSize: 13, color: '#DDD6FE', marginTop: 2 },
    logoutBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    logoutText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 16 },
    statCard: {
        flex: 1, marginHorizontal: 4, borderRadius: 12,
        padding: 14, alignItems: 'center',
    },
    statNum: { fontSize: 28, fontWeight: 'bold', color: '#1F2937' },
    statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
    addBtn: {
        backgroundColor: '#7C3AED', marginBottom: 8,
        borderRadius: 12, padding: 14, alignItems: 'center',
    },
    addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    adminLinksRow: { flexDirection: 'row', marginBottom: 12, gap: 10 },
    adminLinkCard: {
        flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14,
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08, shadowRadius: 4,
    },
    adminLinkIcon: { fontSize: 24, marginBottom: 6 },
    adminLinkLabel: { fontSize: 14, fontWeight: 'bold', color: '#1F2937' },
    adminLinkHint: { fontSize: 11, color: '#6B7280', marginTop: 2 },
    doctorListSection: { marginTop: 8 },
    doctorListTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
    sectionContainer: { marginTop: 16, marginBottom: 8 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
    featureList: { backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
    featureItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    featureName: { fontSize: 14, color: '#374151', fontWeight: '500' },
    doctorCard: {
        backgroundColor: '#fff', borderRadius: 14, padding: 16,
        marginBottom: 12, elevation: 2, shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
    },
    doctorCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    doctorName: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
    doctorSpec: { fontSize: 13, color: '#7C3AED', marginTop: 2 },
    doctorHospital: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    editBtn: {
        backgroundColor: '#EDE9FE', borderRadius: 8,
        paddingHorizontal: 12, paddingVertical: 6,
    },
    editBtnText: { color: '#7C3AED', fontWeight: '600', fontSize: 13 },
    toggleRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
    toggleItem: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
    toggleLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 40, marginBottom: 40 },
    emptyIcon: { fontSize: 56, marginBottom: 16 },
    emptyText: { fontSize: 18, fontWeight: '600', color: '#374151' },
    emptyHint: { fontSize: 14, color: '#9CA3AF', marginTop: 6 },
});

export default AdminDashboardScreen;
