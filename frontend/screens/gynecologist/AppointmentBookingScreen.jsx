import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    StatusBar, Alert, ActivityIndicator, TextInput, Platform, Modal
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Calendar } from 'react-native-calendars';
import { bookAppointment } from '../../services/appointmentService';

const HEADER_BG = '#6D28D9'; // Updated primary color

const DAYS_OFFSET = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
    Thursday: 4, Friday: 5, Saturday: 6,
};

function getNextOccurrence(dayName, timeStr) {
    const now = new Date();
    const todayDay = now.getDay();
    const targetDay = DAYS_OFFSET[dayName] ?? 1;
    let daysUntil = (targetDay - todayDay + 7) % 7;
    if (daysUntil === 0) daysUntil = 7;

    const [time, meridiem] = timeStr.split(' ');
    let [hour, min] = time.split(':').map(Number);
    if (meridiem === 'PM' && hour !== 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;

    const date = new Date(now);
    date.setDate(now.getDate() + daysUntil);
    date.setHours(hour, min, 0, 0);
    return date;
}

// Parse a user-typed "DD/MM/YYYY HH:MM" or "DD-MM-YYYY HH:MM" string
function parseCustomDateTime(dateStr, timeStr) {
    try {
        const dateParts = dateStr.replace(/-/g, '/').split('/');
        if (dateParts.length !== 3) return null;
        const [day, month, year] = dateParts.map(Number);
        if (!day || !month || !year) return null;

        const timeParts = timeStr.replace(/\s+/g, '').toUpperCase();
        let hour, min;
        const twelveHr = timeParts.match(/^(\d{1,2}):(\d{2})(AM|PM)$/);
        const twentyFour = timeParts.match(/^(\d{1,2}):(\d{2})$/);
        if (twelveHr) {
            hour = Number(twelveHr[1]);
            min = Number(twelveHr[2]);
            if (twelveHr[3] === 'PM' && hour !== 12) hour += 12;
            if (twelveHr[3] === 'AM' && hour === 12) hour = 0;
        } else if (twentyFour) {
            hour = Number(twentyFour[1]);
            min = Number(twentyFour[2]);
        } else {
            return null;
        }

        const d = new Date(year, month - 1, day, hour, min, 0, 0);
        if (isNaN(d.getTime())) return null;
        return d;
    } catch {
        return null;
    }
}

export default function AppointmentBookingScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const { doctor, selectedSlot } = route.params;

    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [appointment, setAppointment] = useState(null);

    // custom slot
    const [useCustom, setUseCustom] = useState(false);
    const [customDate, setCustomDate] = useState('');
    const [customTime, setCustomTime] = useState('');
    const [showCalendar, setShowCalendar] = useState(false);

    const slotDate = selectedSlot ? getNextOccurrence(selectedSlot.day, selectedSlot.time) : null;
    const customParsed = useCustom ? parseCustomDateTime(customDate, customTime) : null;
    const appointmentDate = useCustom ? customParsed : slotDate;

    const dateStr = appointmentDate
        ? appointmentDate.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })
        : '—';
    const timeStr = appointmentDate
        ? appointmentDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : '—';

    const handleConfirm = async () => {
        if (useCustom) {
            if (!customDate || !customTime) {
                Alert.alert('Required', 'Please enter both date and time for your custom slot.');
                return;
            }
            if (!customParsed) {
                Alert.alert('Invalid Format', 'Date should be DD/MM/YYYY and time HH:MM or HH:MM AM/PM.');
                return;
            }
            if (customParsed <= new Date()) {
                Alert.alert('Invalid Date', 'Please select a future date and time.');
                return;
            }
        } else if (!slotDate) {
            Alert.alert('No Slot', 'No appointment slot selected.');
            return;
        }

        Alert.alert(
            'Confirm Details',
            `Book session with ${doctor.name} on ${dateStr} at ${timeStr}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm & Book',
                    onPress: async () => {
                        if (loading) return;
                        setLoading(true);
                        try {
                            const result = await bookAppointment({
                                doctorId: doctor.id,
                                scheduledAt: appointmentDate.toISOString(),
                                notes: notes.trim(),
                            });
                            const appt = result?.appointment ?? result?.data?.appointment ?? result?.data ?? null;

                            if (!appt) throw new Error('Response missing appointment payload');

                            setAppointment(appt);
                            setConfirmed(true);
                        } catch (err) {
                            console.error('Booking error:', err);
                            Alert.alert('Booking Failed', err.response?.data?.error || 'Please try again.');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    if (confirmed && appointment) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={HEADER_BG} />
                <View style={[styles.successHeader, { paddingTop: insets.top + 20, paddingBottom: 40 }]}>
                    <Text style={styles.successHeaderTitle}>Booking Successful</Text>
                </View>
                <View style={[styles.successContainer, { paddingBottom: insets.bottom + 24 }]}>
                    <View style={styles.successIconWrapper}>
                        <Text style={styles.successEmoji}>🎉</Text>
                    </View>
                    <Text style={styles.successTitle}>Confirmed!</Text>
                    <Text style={styles.successSub}>Your consultation has been booked successfully.</Text>

                    <View style={styles.confirmCard}>
                        <ConfirmRow icon="👩‍⚕️" label="Specialist" value={doctor.name} />
                        <View style={styles.confirmDivider} />
                        <ConfirmRow icon="📅" label="Date" value={dateStr} />
                        <View style={styles.confirmDivider} />
                        <ConfirmRow icon="🕐" label="Time" value={timeStr} />
                        {useCustom && (
                            <View style={styles.customNoteSuccess}>
                                <Text style={styles.customNoteTextSuccess}>⏳ Awaiting doctor's final confirmation for custom slot</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.successActions}>
                        <TouchableOpacity
                            style={styles.myApptBtn}
                            onPress={() => navigation.dispatch(CommonActions.reset({
                                index: 1, routes: [{ name: 'HomeScreen' }, { name: 'MyAppointments' }],
                            }))}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.myApptBtnText}>View My Appointments</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.chatBtn}
                            onPress={() => navigation.navigate('ChatScreen', {
                                chatId: appointment.chatId, doctorId: doctor.id,
                                doctorName: doctor.name, meetingRoomId: appointment.meetingRoomId,
                            })}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.chatBtnText}>Message Doctor</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.doneBtn}
                            onPress={() => navigation.dispatch(CommonActions.reset({
                                index: 0, routes: [{ name: 'HomeScreen' }],
                            }))}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.doneBtnText}>Back to Home</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
            <View style={[styles.header, { paddingTop: insets.top + 12, paddingBottom: 12 }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
                        <Icon name="chevron-back" size={26} color="#0F172A" style={{ marginLeft: -2 }} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Checkout</Text>
                    <View style={styles.headerSpacer} />
                </View>
            </View>

            <KeyboardAwareScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 }]}
                enableOnAndroid={true}
                extraScrollHeight={Platform.OS === 'ios' ? 120 : 120}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >

                <View style={styles.doctorBanner}>
                    <View style={styles.bannerAvatar}>
                        <Text style={styles.bannerAvatarText}>
                            {doctor.name.split(' ').slice(1).map(w => w[0]).join('').substring(0, 2)}
                        </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.bannerName}>{doctor.name}</Text>
                        <Text style={styles.bannerSpec}>{doctor.specialization}</Text>
                    </View>
                </View>

                <View style={styles.slotToggleRow}>
                    <TouchableOpacity
                        style={[styles.slotToggleBtn, !useCustom && styles.slotToggleBtnActive]}
                        onPress={() => setUseCustom(false)}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.slotToggleText, !useCustom && styles.slotToggleTextActive]}>
                            Doctor's Slot
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.slotToggleBtn, useCustom && styles.slotToggleBtnActive]}
                        onPress={() => setUseCustom(true)}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.slotToggleText, useCustom && styles.slotToggleTextActive]}>
                            Custom Timings
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Session Details</Text>

                    {!useCustom ? (
                        <View style={styles.detailsBox}>
                            <ConfirmRow icon="📅" label="Date" value={dateStr} />
                            <View style={styles.confirmDivider} />
                            <ConfirmRow icon="🕐" label="Time" value={timeStr} />
                        </View>
                    ) : (
                        <View style={styles.customBox}>
                            <Text style={styles.customLabel}>Preferred Date</Text>
                            <TouchableOpacity onPress={() => setShowCalendar(true)} activeOpacity={0.7}>
                                <TextInput
                                    style={[styles.customInput, { color: '#0F172A' }]}
                                    placeholder="Tap to select date"
                                    placeholderTextColor="#94A3B8"
                                    value={customDate}
                                    editable={false}
                                />
                            </TouchableOpacity>

                            <Modal visible={showCalendar} transparent animationType="fade">
                                <View style={styles.modalOverlay}>
                                    <View style={styles.calendarContainer}>
                                        <Calendar
                                            minDate={new Date().toISOString().split('T')[0]}
                                            onDayPress={(day) => {
                                                const [year, month, d] = day.dateString.split('-');
                                                setCustomDate(`${d}/${month}/${year}`);
                                                setShowCalendar(false);
                                            }}
                                            theme={{ selectedDayBackgroundColor: HEADER_BG, todayTextColor: HEADER_BG, arrowColor: HEADER_BG }}
                                        />
                                        <TouchableOpacity style={styles.closeCalendarBtn} onPress={() => setShowCalendar(false)}>
                                            <Text style={styles.closeCalendarText}>Cancel</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </Modal>

                            <Text style={[styles.customLabel, { marginTop: 16 }]}>Preferred Time</Text>
                            <TextInput
                                style={styles.customInput}
                                placeholder="eg. 3:30 PM"
                                placeholderTextColor="#94A3B8"
                                value={customTime}
                                onChangeText={setCustomTime}
                            />

                            {customParsed ? (
                                <View style={styles.previewRow}>
                                    <View style={styles.previewDotSuccess} />
                                    <Text style={styles.previewText}>
                                        {customParsed.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} at {customParsed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            ) : (customDate || customTime) ? (
                                <View style={[styles.previewRow, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                                    <View style={[styles.previewDotSuccess, { backgroundColor: '#EF4444' }]} />
                                    <Text style={[styles.previewText, { color: '#B91C1C' }]}>
                                        Ensure Format: DD/MM/YYYY & HH:MM AM/PM
                                    </Text>
                                </View>
                            ) : null}

                            <View style={styles.customNote}>
                                <Text style={styles.customNoteText}>
                                    Custom slots must be confirmed by the doctor. If unavailable, they'll suggest an alternative.
                                </Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.feeBox}>
                        <View style={styles.feeRow}>
                            <Text style={styles.feeLabel}>Video Consultation Fee</Text>
                            <Text style={styles.feeValue}>₹{doctor.consultationFee}</Text>
                        </View>
                        <View style={styles.feeRow}>
                            <Text style={styles.feeLabel}>Platform Fee</Text>
                            <Text style={styles.feeValueFree}>Free</Text>
                        </View>
                        <View style={styles.feeDivider} />
                        <View style={[styles.feeRow, { marginTop: 12 }]}>
                            <Text style={styles.feeTotalLabel}>Total Payable</Text>
                            <Text style={styles.feeTotalValue}>₹{doctor.consultationFee}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Additional Notes</Text>
                    <TextInput
                        style={styles.notesInput}
                        placeholder="Describe your symptoms or reason for visit (optional)..."
                        placeholderTextColor="#94A3B8"
                        multiline
                        numberOfLines={4}
                        value={notes}
                        onChangeText={setNotes}
                    />
                </View>

                <View style={styles.policyNote}>
                    <Text style={styles.policyText}>
                        <Text style={{ fontWeight: 'bold' }}>Privacy Protected:</Text> Your health information is end-to-end encrypted and shared only with your approved specialist.
                    </Text>
                </View>

            </KeyboardAwareScrollView>

            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity
                    style={[styles.confirmBtn, loading && styles.confirmBtnDisabled]}
                    onPress={handleConfirm}
                    disabled={loading}
                    activeOpacity={0.9}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.confirmBtnText}>Confirm Booking  •  ₹{doctor.consultationFee}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const ConfirmRow = ({ icon, label, value }) => (
    <View style={styles.confirmRow}>
        <View style={styles.confirmIconBox}><Text style={styles.confirmIcon}>{icon}</Text></View>
        <Text style={styles.confirmLabel}>{label}</Text>
        <Text style={styles.confirmValue}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: {
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 20,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerSpacer: { width: 44 },
    backBtn: {
        width: 44, height: 44,
        backgroundColor: '#fff',
        borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
        elevation: 5, shadowColor: '#1E293B', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
        borderWidth: 1, borderColor: '#F1F5F9',
    },
    headerTitle: { color: '#0F172A', fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },
    scrollContent: { paddingHorizontal: 20 },

    doctorBanner: {
        backgroundColor: '#fff', borderRadius: 24, padding: 20,
        flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 24, marginBottom: 24,
        elevation: 6, shadowColor: '#1E293B', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
        borderWidth: 1, borderColor: '#F1F5F9',
    },
    bannerAvatar: {
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#EDE9FE'
    },
    bannerAvatarText: { fontSize: 22, fontWeight: '800', color: HEADER_BG },
    bannerName: { color: '#0F172A', fontSize: 20, fontWeight: '800' },
    bannerSpec: { color: '#6D28D9', fontSize: 13, marginTop: 4, fontWeight: '600' },

    slotToggleRow: {
        flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 16,
        padding: 6, marginBottom: 20,
    },
    slotToggleBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    slotToggleBtnActive: { backgroundColor: '#fff', elevation: 2, shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
    slotToggleText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
    slotToggleTextActive: { color: HEADER_BG },

    section: {
        backgroundColor: '#fff', borderRadius: 24, padding: 24, marginBottom: 20,
        elevation: 4, shadowColor: '#1E293B', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
        borderWidth: 1, borderColor: '#F8FAFC',
    },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 16 },

    detailsBox: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F1F5F9' },
    customBox: {},

    customLabel: { fontSize: 12, color: '#64748B', marginBottom: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    customInput: {
        backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0',
        padding: 16, color: '#0F172A', fontSize: 16, fontWeight: '500'
    },
    previewRow: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5',
        borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#D1FAE5'
    },
    previewDotSuccess: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 10 },
    previewText: { fontSize: 14, color: '#065F46', fontWeight: '600' },
    customNote: { marginTop: 16, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 12, borderLeftWidth: 3, borderLeftColor: '#6D28D9' },
    customNoteText: { fontSize: 13, color: '#475569', lineHeight: 20, fontWeight: '500' },

    confirmRow: { flexDirection: 'row', alignItems: 'center' },
    confirmDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 12, marginLeft: 44 },
    confirmIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: '#F1F5F9' },
    confirmIcon: { fontSize: 16 },
    confirmLabel: { fontSize: 13, color: '#64748B', width: 80, fontWeight: '600' },
    confirmValue: { fontSize: 15, color: '#0F172A', fontWeight: '800', flex: 1 },

    feeBox: { marginTop: 24, backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F1F5F9' },
    feeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    feeLabel: { fontSize: 14, color: '#64748B', fontWeight: '500' },
    feeValue: { fontSize: 14, color: '#0F172A', fontWeight: '700' },
    feeValueFree: { fontSize: 14, color: '#10B981', fontWeight: '700' },
    feeDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 8 },
    feeTotalLabel: { fontSize: 16, color: '#0F172A', fontWeight: '800' },
    feeTotalValue: { fontSize: 18, color: '#6D28D9', fontWeight: '800' },

    notesInput: {
        backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9',
        padding: 16, color: '#0F172A', fontSize: 15, textAlignVertical: 'top', minHeight: 120, fontWeight: '500'
    },
    policyNote: {
        backgroundColor: 'transparent', paddingHorizontal: 8, marginBottom: 14,
    },
    policyText: { fontSize: 12, color: '#64748B', lineHeight: 18, textAlign: 'center' },

    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 24, paddingTop: 16,
        borderTopWidth: 1, borderTopColor: '#F1F5F9', elevation: 20, shadowColor: '#1E293B', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: -10 }
    },
    confirmBtn: { backgroundColor: HEADER_BG, borderRadius: 20, paddingVertical: 18, alignItems: 'center', shadowColor: HEADER_BG, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8, shadowOffset: { width: 0, height: 6 } },
    confirmBtnDisabled: { backgroundColor: '#C4B5FD', shadowOpacity: 0, elevation: 0 },
    confirmBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },

    // Success State
    successHeader: { backgroundColor: HEADER_BG, alignItems: 'center', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    successHeaderTitle: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
    successContainer: { flex: 1, alignItems: 'center', padding: 24 },
    successIconWrapper: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: -50, elevation: 12, shadowColor: '#1E293B', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
    successEmoji: { fontSize: 50 },
    successTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A', marginTop: 16, letterSpacing: -0.5 },
    successSub: { fontSize: 15, color: '#64748B', marginTop: 8, textAlign: 'center', fontWeight: '500' },
    confirmCard: {
        backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%',
        marginTop: 32, elevation: 6, shadowColor: '#1E293B', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
        borderWidth: 1, borderColor: '#F1F5F9',
    },
    customNoteSuccess: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, marginTop: 16, borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
    customNoteTextSuccess: { fontSize: 13, color: '#92400E', fontWeight: '600' },
    successActions: { width: '100%', marginTop: 32, gap: 16 },
    myApptBtn: { backgroundColor: HEADER_BG, borderRadius: 16, paddingVertical: 16, alignItems: 'center', elevation: 4, shadowColor: HEADER_BG, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
    myApptBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    chatBtn: { backgroundColor: '#F8FAFC', borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
    chatBtnText: { color: '#0F172A', fontSize: 16, fontWeight: '700' },
    doneBtn: { paddingVertical: 12, alignItems: 'center' },
    doneBtnText: { color: '#64748B', fontSize: 15, fontWeight: '700' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    calendarContainer: { backgroundColor: '#fff', borderRadius: 24, width: '100%', paddingBottom: 16, overflow: 'hidden' },
    closeCalendarBtn: { alignItems: 'center', marginTop: 10, padding: 12 },
    closeCalendarText: { color: '#64748B', fontSize: 16, fontWeight: '700' }
});
