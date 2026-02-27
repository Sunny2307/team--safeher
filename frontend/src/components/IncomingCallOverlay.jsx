/**
 * IncomingCallOverlay
 *
 * Mounts inside NavigationContainer so it has access to useNavigation().
 * Listens for 'incoming-call' socket events and shows a fullscreen
 * animated popup over whatever screen the doctor is on.
 *
 * Accept  → navigate to VideoConsultation (doctor side)
 * Decline → emit call-rejected back to caller
 */

import React, { useEffect, useState, useRef } from 'react';
import {
    Modal, View, Text, TouchableOpacity, StyleSheet,
    Animated, Easing, Platform, Vibration,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import liveLocationService from '../services/liveLocationService';

export default function IncomingCallOverlay() {
    const navigation = useNavigation();
    const [callData, setCallData] = useState(null); // { fromUserId, fromName, meetingRoomId, doctorId, chatId }
    const slideAnim = useRef(new Animated.Value(-300)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // ── Animate in / out ────────────────────────────────────────────────────────
    const slideIn = () => {
        Animated.spring(slideAnim, {
            toValue: 0, useNativeDriver: true,
            tension: 50, friction: 8,
        }).start();
        // pulse ring
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
            ])
        ).start();
    };

    const slideOut = (cb) => {
        Animated.timing(slideAnim, {
            toValue: -400, duration: 300, useNativeDriver: true,
        }).start(() => { cb?.(); });
    };

    // ── Socket listener ─────────────────────────────────────────────────────────
    useEffect(() => {
        const attachListener = () => {
            const socket = liveLocationService.socket;
            if (!socket) return false;

            socket.off('incoming-call'); // remove any stale listener

            socket.on('incoming-call', (data) => {
                console.log('📞 Incoming call:', data);
                setCallData(data);
                Vibration.vibrate([0, 400, 200, 400, 200, 400]);
                slideIn();
            });

            socket.on('call-rejected', () => {
                // The caller got rejected — dismiss overlay if it's still up
                slideOut(() => setCallData(null));
            });

            return true;
        };

        // Socket may not be connected yet — poll briefly
        if (!attachListener()) {
            const interval = setInterval(() => {
                if (attachListener()) clearInterval(interval);
            }, 1000);
            return () => clearInterval(interval);
        }

        return () => {
            const socket = liveLocationService.socket;
            socket?.off('incoming-call');
            socket?.off('call-rejected');
        };
    }, []);

    // ── Accept ──────────────────────────────────────────────────────────────────
    const handleAccept = () => {
        if (!callData) return;
        const socket = liveLocationService.socket;
        // Acknowledge to the server so caller knows it's accepted
        socket?.emit('call-accepted-signal', { meetingRoomId: callData.meetingRoomId });

        slideOut(() => {
            setCallData(null);
            navigation.navigate('VideoConsultation', {
                meetingRoomId: callData.meetingRoomId,
                chatId: callData.chatId,
                doctorId: callData.doctorId,
                doctorName: callData.fromName,
                role: 'doctor',
            });
        });
    };

    // ── Decline ─────────────────────────────────────────────────────────────────
    const handleDecline = () => {
        if (!callData) return;
        const socket = liveLocationService.socket;
        socket?.emit('call-rejected', {
            toUserId: callData.fromUserId,
            meetingRoomId: callData.meetingRoomId,
        });
        slideOut(() => {
            setCallData(null);
            Vibration.cancel();
        });
    };

    if (!callData) return null;

    const initials = (callData.fromName || 'Patient')
        .split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

    return (
        <Modal transparent animationType="none" visible statusBarTranslucent>
            {/* Dimmed backdrop */}
            <View style={styles.backdrop}>
                <Animated.View style={[styles.card, { transform: [{ translateY: slideAnim }] }]}>
                    {/* Header */}
                    <View style={styles.callBadge}>
                        <View style={styles.callBadgeDot} />
                        <Text style={styles.callBadgeText}>Incoming Video Call</Text>
                    </View>

                    {/* Avatar */}
                    <Animated.View style={[styles.avatarRing, { transform: [{ scale: pulseAnim }] }]}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{initials}</Text>
                        </View>
                    </Animated.View>

                    <Text style={styles.callerName}>{callData.fromName || 'Patient'}</Text>
                    <Text style={styles.callerSub}>wants to start the video consultation</Text>

                    {/* Buttons */}
                    <View style={styles.btnRow}>
                        <TouchableOpacity style={styles.declineBtn} onPress={handleDecline}>
                            <Text style={styles.declineIcon}>📵</Text>
                            <Text style={styles.btnLabel}>Decline</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
                            <Text style={styles.acceptIcon}>📹</Text>
                            <Text style={styles.btnLabel}>Accept</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    card: {
        width: '88%',
        backgroundColor: '#1E1B4B',
        borderRadius: 24,
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 24,
        elevation: 20,
        shadowColor: '#7C3AED',
        shadowOpacity: 0.5,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        borderWidth: 1,
        borderColor: 'rgba(167,139,250,0.3)',
    },
    callBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(124,58,237,0.3)',
        borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5,
        marginBottom: 24,
    },
    callBadgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
    callBadgeText: { color: '#A5F3FC', fontSize: 13, fontWeight: '600' },

    avatarRing: {
        width: 110, height: 110, borderRadius: 55,
        borderWidth: 2.5, borderColor: '#7C3AED',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
        backgroundColor: 'rgba(124,58,237,0.15)',
    },
    avatar: {
        width: 90, height: 90, borderRadius: 45,
        backgroundColor: '#4C1D95',
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 36, fontWeight: '800', color: '#DDD6FE' },

    callerName: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 6 },
    callerSub: { color: '#A78BFA', fontSize: 14, marginBottom: 32, textAlign: 'center' },

    btnRow: { flexDirection: 'row', gap: 20, width: '100%', justifyContent: 'center' },

    declineBtn: {
        width: 90, height: 90, borderRadius: 45,
        backgroundColor: '#DC2626',
        alignItems: 'center', justifyContent: 'center',
        elevation: 6,
    },
    acceptBtn: {
        width: 90, height: 90, borderRadius: 45,
        backgroundColor: '#059669',
        alignItems: 'center', justifyContent: 'center',
        elevation: 6,
    },
    declineIcon: { fontSize: 32 },
    acceptIcon: { fontSize: 32 },
    btnLabel: { color: '#fff', fontSize: 11, fontWeight: '600', marginTop: 4 },
});
