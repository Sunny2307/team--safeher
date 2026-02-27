import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    TextInput, ActivityIndicator, Platform,
    StatusBar, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getDoctors } from '../../services/doctorService';

const SPECIALIZATIONS = ['All', 'Gynecologist', 'Reproductive', 'Oncologist', 'Maternal', 'Adolescent'];

const StarRating = ({ rating }) => {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {[1, 2, 3, 4, 5].map(i => (
                <Text key={i} style={{ color: i <= full ? '#F59E0B' : (i === full + 1 && half ? '#F59E0B' : '#E2E8F0'), fontSize: 14 }}>
                    {i <= full ? '★' : (i === full + 1 && half ? '⯨' : '★')}
                </Text>
            ))}
            <Text style={{ color: '#475569', fontSize: 12, marginLeft: 4, fontWeight: '700' }}>{rating.toFixed(1)}</Text>
        </View>
    );
};

const DoctorCard = ({ doctor, onPress }) => (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
        <View style={styles.cardTop}>
            <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                    {doctor.name.split(' ').slice(1).map(w => w[0]).join('').substring(0, 2)}
                </Text>
                {doctor.verified && (
                    <View style={styles.verifiedBadge}>
                        <Text style={{ fontSize: 10, color: '#FFF', fontWeight: 'bold' }}>✓</Text>
                    </View>
                )}
            </View>
            <View style={styles.cardInfo}>
                <Text style={styles.doctorName}>{doctor.name}</Text>
                <Text style={styles.specialization}>{doctor.specialization}</Text>
                <Text style={styles.hospital} numberOfLines={1}>🏥 {doctor.hospital}</Text>
            </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardBottom}>
            <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Experience</Text>
                <Text style={styles.metaValue}>{doctor.experienceYears} Years</Text>
            </View>
            <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Rating</Text>
                <StarRating rating={doctor.rating} />
            </View>
            <View style={styles.metaColRight}>
                <Text style={styles.metaLabel}>Consultation</Text>
                <Text style={styles.fee}>₹{doctor.consultationFee}</Text>
            </View>
        </View>

        <View style={styles.languagesRow}>
            <View style={styles.langWrapper}>
                {doctor.languages?.slice(0, 3).map(lang => (
                    <View key={lang} style={styles.langChip}>
                        <Text style={styles.langText}>{lang}</Text>
                    </View>
                ))}
            </View>
            <View style={styles.availableBadge}>
                <View style={styles.availableDot} />
                <Text style={styles.availableText}>Available Today</Text>
            </View>
        </View>
    </TouchableOpacity>
);

const HEADER_BG = '#6D28D9'; // Richer modern purple

export default function DoctorListScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const [doctors, setDoctors] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');

    const loadDoctors = useCallback(async () => {
        try {
            const data = await getDoctors();
            setDoctors(data);
            setFiltered(data);
        } catch (err) {
            console.error('Error loading doctors:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadDoctors(); }, []);

    useEffect(() => {
        let result = doctors;
        if (activeFilter !== 'All') {
            result = result.filter(d =>
                d.specialization.toLowerCase().includes(activeFilter.toLowerCase())
            );
        }
        if (search.trim()) {
            result = result.filter(d =>
                d.name.toLowerCase().includes(search.toLowerCase()) ||
                d.hospital.toLowerCase().includes(search.toLowerCase())
            );
        }
        setFiltered(result);
    }, [search, activeFilter, doctors]);

    const onRefresh = () => {
        setRefreshing(true);
        loadDoctors();
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={HEADER_BG} />

            {/* Header with curved bottom */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
                        <Icon name="chevron-back" size={26} color="#fff" style={{ marginLeft: -2 }} />
                    </TouchableOpacity>
                    <View style={styles.headerTextWrap}>
                        <Text style={styles.headerTitle} numberOfLines={1}>Find Your Specialist</Text>
                        <Text style={styles.headerSub} numberOfLines={1}>Expert care, just for you</Text>
                    </View>
                </View>
            </View>

            {/* Floating Search Bar */}
            <View style={styles.searchWrapper}>
                <View style={styles.searchContainer}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name or hospital..."
                        placeholderTextColor="#94A3B8"
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
                            <Text style={styles.clearIcon}>×</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Filter chips */}
            <View style={styles.filterRow}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                    data={SPECIALIZATIONS}
                    keyExtractor={item => item}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.filterChip, activeFilter === item && styles.filterChipActive]}
                            onPress={() => setActiveFilter(item)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.filterChipText, activeFilter === item && styles.filterChipTextActive]}>
                                {item}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Doctor list */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#6D28D9" />
                    <Text style={styles.loadingText}>Finding best doctors…</Text>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id}
                    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6D28D9" />}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={styles.emptyEmoji}>👩‍⚕️</Text>
                            <Text style={styles.emptyText}>No doctors found</Text>
                            <Text style={styles.emptySubText}>Try adjusting your filters or search</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <DoctorCard
                            doctor={item}
                            onPress={() => navigation.navigate('DoctorProfile', { doctor: item })}
                        />
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' }, // Softer modern bg
    header: {
        backgroundColor: HEADER_BG,
        paddingHorizontal: 20,
        paddingBottom: 36, // extra padding for floating search
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    headerTextWrap: { flex: 1, minWidth: 0 },
    backBtn: {
        width: 44, height: 44,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 22,
        alignItems: 'center', justifyContent: 'center'
    },
    headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },
    headerSub: { color: '#EDE9FE', fontSize: 13, marginTop: 4, fontWeight: '500' },

    searchWrapper: {
        paddingHorizontal: 20,
        marginTop: -26, // Float over header
        zIndex: 10,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 14,
        elevation: 8,
        shadowColor: '#1E293B',
        shadowOpacity: 0.1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
    },
    searchIcon: { fontSize: 18, marginRight: 10 },
    searchInput: { flex: 1, color: '#1E293B', fontSize: 16, minWidth: 0, fontWeight: '500' },
    clearBtn: {
        backgroundColor: '#F1F5F9',
        width: 24, height: 24,
        borderRadius: 12,
        alignItems: 'center', justifyContent: 'center'
    },
    clearIcon: { color: '#64748B', fontSize: 16, fontWeight: '700', marginTop: -2 },

    filterRow: { marginTop: 16, marginBottom: 8 },
    filterChip: {
        paddingHorizontal: 20, paddingVertical: 10,
        borderRadius: 24, backgroundColor: '#fff',
        marginRight: 10,
        elevation: 2, shadowColor: '#94A3B8', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }
    },
    filterChipActive: { backgroundColor: '#6D28D9' },
    filterChipText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
    filterChipTextActive: { color: '#fff' },

    listContent: {
        paddingHorizontal: 20,
        paddingTop: 12,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        marginBottom: 20,
        padding: 20,
        elevation: 6,
        shadowColor: '#1E293B',
        shadowOpacity: 0.06,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    cardTop: { flexDirection: 'row', gap: 16 },
    avatarContainer: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: '#F3E8FF',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#EDE9FE',
    },
    avatarText: { fontSize: 22, fontWeight: '800', color: '#6D28D9' },
    verifiedBadge: {
        position: 'absolute', bottom: -2, right: -2,
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#fff',
    },
    cardInfo: { flex: 1, minWidth: 0, justifyContent: 'center' },
    doctorName: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
    specialization: { fontSize: 14, color: '#6D28D9', fontWeight: '600', marginTop: 4 },
    hospital: { fontSize: 13, color: '#64748B', marginTop: 4, fontWeight: '500' },

    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },

    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    metaCol: { alignItems: 'flex-start' },
    metaColRight: { alignItems: 'flex-end' },
    metaLabel: { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
    metaValue: { fontSize: 14, color: '#1E293B', fontWeight: '700' },
    fee: { fontSize: 15, fontWeight: '800', color: '#059669' },

    languagesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
    langWrapper: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    langChip: {
        paddingHorizontal: 10, paddingVertical: 4,
        backgroundColor: '#F8FAFC', borderRadius: 8,
        borderWidth: 1, borderColor: '#E2E8F0'
    },
    langText: { fontSize: 11, color: '#475569', fontWeight: '600' },

    availableBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
    availableDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
    availableText: { fontSize: 11, color: '#059669', fontWeight: '700' },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
    loadingText: { color: '#6D28D9', marginTop: 16, fontSize: 15, fontWeight: '600' },
    emptyEmoji: { fontSize: 56, marginBottom: 16 },
    emptyText: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
    emptySubText: { fontSize: 15, color: '#64748B', marginTop: 8, fontWeight: '500' },
});
