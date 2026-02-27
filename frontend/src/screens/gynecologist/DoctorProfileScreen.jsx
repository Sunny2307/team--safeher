import React, { useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    StatusBar, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

const HEADER_BG = '#6D28D9'; // Match DoctorListScreen

const StarRating = ({ rating }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {[1, 2, 3, 4, 5].map(i => (
            <Text key={i} style={{ color: i <= Math.round(rating) ? '#F59E0B' : '#E2E8F0', fontSize: 16 }}>★</Text>
        ))}
        <Text style={{ color: '#475569', marginLeft: 6, fontSize: 14, fontWeight: '700' }}>{rating.toFixed(1)}</Text>
    </View>
);

const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
        <View style={styles.iconBox}>
            <Text style={styles.infoIcon}>{icon}</Text>
        </View>
        <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    </View>
);

export default function DoctorProfileScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const { doctor } = route.params;
    const [selectedSlot, setSelectedSlot] = useState(null);

    const groupedSlots = (doctor.availabilitySlots || []).reduce((acc, slot) => {
        (acc[slot.day] = acc[slot.day] || []).push(slot.time);
        return acc;
    }, {});

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

            {/* Premium Light Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
                        <Icon name="chevron-back" size={26} color="#0F172A" style={{ marginLeft: -2 }} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <View style={styles.headerSpacer} />
                </View>
            </View>

            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>

                {/* Profile Card Overlay */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarWrapper}>
                        <View style={styles.avatarLarge}>
                            <Text style={styles.avatarTextLarge}>
                                {doctor.name.split(' ').slice(1).map(w => w[0]).join('').substring(0, 2)}
                            </Text>
                        </View>
                        {doctor.verified && (
                            <View style={styles.verifiedBadgeLarge}>
                                <Text style={{ fontSize: 14, color: '#fff', fontWeight: 'bold' }}>✓</Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.doctorName}>{doctor.name}</Text>
                    <Text style={styles.specialization}>{doctor.specialization}</Text>

                    <View style={styles.ratingWrapper}>
                        <StarRating rating={doctor.rating} />
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>Experience</Text>
                            <Text style={styles.statValue}>{doctor.experienceYears}+ Yrs</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>Patients</Text>
                            <Text style={styles.statValue}>1k+</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>Fee</Text>
                            <Text style={styles.statValue}>₹{doctor.consultationFee}</Text>
                        </View>
                    </View>
                </View>

                {/* About Section */}
                {doctor.about && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>About Doctor</Text>
                        <Text style={styles.aboutText}>{doctor.about}</Text>
                    </View>
                )}

                {/* Info Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Information</Text>
                    <View style={styles.infoWrapper}>
                        <InfoRow icon="🏥" label="Hospital / Clinic" value={doctor.hospital} />
                        <View style={styles.infoDivider} />
                        <InfoRow icon="🌐" label="Spoken Languages" value={(doctor.languages || []).join(', ')} />
                        <View style={styles.infoDivider} />
                        <InfoRow icon="🩺" label="Specialty Focus" value={doctor.specialization} />
                    </View>
                </View>

                {/* Availability Slots */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Available Slots</Text>
                    {Object.entries(groupedSlots).map(([day, times]) => (
                        <View key={day} style={styles.dayGroup}>
                            <Text style={styles.dayLabel}>{day}</Text>
                            <View style={styles.timesRow}>
                                {times.map(time => {
                                    const isSelected = selectedSlot?.day === day && selectedSlot?.time === time;
                                    return (
                                        <TouchableOpacity
                                            key={`${day}-${time}`}
                                            style={[styles.timeChip, isSelected && styles.timeChipSelected]}
                                            onPress={() => setSelectedSlot({ day, time })}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.timeChipText, isSelected && styles.timeChipTextSelected]}>
                                                {time}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    ))}
                    {selectedSlot && (
                        <View style={styles.selectedSlotBanner}>
                            <View style={styles.selectedIconBox}>
                                <Text style={styles.selectedIcon}>✓</Text>
                            </View>
                            <View>
                                <Text style={styles.selectedSlotTitle}>Slot Selected</Text>
                                <Text style={styles.selectedSlotText}>{selectedSlot.day} at {selectedSlot.time}</Text>
                            </View>
                        </View>
                    )}
                </View>

            </ScrollView>

            {/* Action Buttons */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
                <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Total Fee</Text>
                    <Text style={styles.priceValue}>₹{doctor.consultationFee}</Text>
                </View>
                <TouchableOpacity
                    style={styles.bookBtn}
                    activeOpacity={0.9}
                    onPress={() => {
                        if (!selectedSlot) {
                            Alert.alert('Select a Slot', 'Please choose an available time slot before booking.');
                            return;
                        }
                        navigation.navigate('AppointmentBooking', { doctor, selectedSlot });
                    }}
                >
                    <Text style={styles.bookBtnText}>Book Now</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: {
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    headerTop: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    backBtn: {
        width: 44, height: 44,
        backgroundColor: '#fff',
        borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
        elevation: 5, shadowColor: '#1E293B', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
        borderWidth: 1, borderColor: '#F1F5F9',
    },
    headerTitle: { color: '#0F172A', fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },
    headerSpacer: { width: 44 },

    scrollContent: { paddingHorizontal: 20 },

    profileCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        marginTop: 20,
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#1E293B', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
        borderWidth: 1, borderColor: '#F1F5F9',
        marginBottom: 20,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 16,
    },
    avatarLarge: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: '#F3E8FF',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 4, borderColor: '#fff',
        elevation: 6, shadowColor: '#6D28D9', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }
    },
    avatarTextLarge: { fontSize: 36, fontWeight: '800', color: '#6D28D9' },
    verifiedBadgeLarge: {
        position: 'absolute', bottom: 4, right: 4,
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center',
        borderWidth: 3, borderColor: '#fff',
    },
    doctorName: { color: '#0F172A', fontSize: 24, fontWeight: '800' },
    specialization: { color: '#6D28D9', fontSize: 15, fontWeight: '600', marginTop: 4 },
    ratingWrapper: { marginTop: 8 },

    statsRow: {
        flexDirection: 'row', marginTop: 20,
        backgroundColor: '#F8FAFC', borderRadius: 16,
        paddingVertical: 16, paddingHorizontal: 20, width: '100%',
        borderWidth: 1, borderColor: '#F1F5F9'
    },
    statBox: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, backgroundColor: '#E2E8F0' },
    statValue: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
    statLabel: { color: '#64748B', fontSize: 12, marginTop: 4, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

    section: {
        backgroundColor: '#fff', borderRadius: 24, padding: 24, marginBottom: 20,
        elevation: 4, shadowColor: '#1E293B', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
        borderWidth: 1, borderColor: '#F8FAFC',
    },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
    aboutText: { fontSize: 15, color: '#475569', lineHeight: 24, fontWeight: '500' },

    infoWrapper: { gap: 16 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    iconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
    infoIcon: { fontSize: 22 },
    infoContent: { flex: 1 },
    infoLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    infoValue: { fontSize: 15, color: '#1E293B', fontWeight: '600' },
    infoDivider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 60 },

    dayGroup: { marginBottom: 16 },
    dayLabel: { fontSize: 14, fontWeight: '700', color: '#6D28D9', marginBottom: 10, letterSpacing: 0.5 },
    timesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    timeChip: {
        paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: 12, backgroundColor: '#F8FAFC',
        borderWidth: 1, borderColor: '#E2E8F0',
    },
    timeChipSelected: { backgroundColor: '#6D28D9', borderColor: '#6D28D9', elevation: 4, shadowColor: '#6D28D9', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
    timeChipText: { fontSize: 14, color: '#475569', fontWeight: '600' },
    timeChipTextSelected: { color: '#fff' },

    selectedSlotBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#ECFDF5', borderRadius: 16, padding: 16, marginTop: 8,
        borderWidth: 1, borderColor: '#D1FAE5',
    },
    selectedIconBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
    selectedIcon: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    selectedSlotTitle: { fontSize: 12, color: '#059669', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    selectedSlotText: { color: '#065F46', fontSize: 15, fontWeight: '800', marginTop: 2 },

    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 24, paddingTop: 16,
        borderTopWidth: 1, borderTopColor: '#F1F5F9',
        elevation: 24, shadowColor: '#1E293B', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: -8 }
    },
    priceContainer: { flex: 1 },
    priceLabel: { fontSize: 12, color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    priceValue: { fontSize: 22, color: '#0F172A', fontWeight: '800', marginTop: 2 },
    bookBtn: {
        backgroundColor: HEADER_BG, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 32,
        alignItems: 'center', justifyContent: 'center',
        elevation: 6, shadowColor: HEADER_BG, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }
    },
    bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
});
