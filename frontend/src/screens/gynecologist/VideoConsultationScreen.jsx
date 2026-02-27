/**
 * VideoConsultationScreen — Room-Join Model
 *
 * FLOW:
 *   1. Both patient AND doctor tap "Join Video Call" from their respective screens.
 *   2. Both arrive here with the same meetingRoomId.
 *   3. Both emit join-meeting-room to the server.
 *   4. The server tells the first joiner to wait ("waiting-for-peer").
 *   5. When the second person joins, the server sends "peer-joined":
 *        - initiator:true  → first joiner creates WebRTC offer
 *        - initiator:false → second joiner waits for offer
 *   6. WebRTC handshake completes → live video call starts.
 *
 * Requires: react-native-webrtc installed + native build.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
    StatusBar, Alert, Platform, Animated, Easing, Modal,
    TextInput, FlatList, KeyboardAvoidingView, Keyboard
} from 'react-native';
import InCallManager from 'react-native-incall-manager';
import { useNavigation, useRoute } from '@react-navigation/native';
import webrtcService from '../../services/webrtcService';
import liveLocationService from '../../services/liveLocationService';
import chatService from '../../services/chatService';

import AsyncStorage from '@react-native-async-storage/async-storage';

let RTCView;
let webrtcAvailable = false;
try {
    const webrtc = require('react-native-webrtc');
    RTCView = webrtc.RTCView;
    webrtcAvailable = true;
} catch {
    webrtcAvailable = false;
}

function pad(n) { return String(n).padStart(2, '0'); }

// ── Pulsing ring animation ────────────────────────────────────────────────────
function PulseRing() {
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(0.6)).current;

    useEffect(() => {
        Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(scale, { toValue: 1.5, duration: 1000, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
                    Animated.timing(scale, { toValue: 1, duration: 1000, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
                ]),
                Animated.sequence([
                    Animated.timing(opacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
                    Animated.timing(opacity, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
                ]),
            ])
        ).start();
    }, []);

    return (
        <Animated.View style={[styles.pulseRing, { transform: [{ scale }], opacity }]} />
    );
}

export default function VideoConsultationScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { meetingRoomId, chatId, doctorId, doctorName, role = 'user' } = route.params || {};

    // States
    // idle → joining → waiting → connecting → active → ended | peer_left | error
    const [phase, setPhase] = useState('idle');
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [elapsed, setElapsed] = useState(0);
    const timerRef = useRef(null);
    const peerName = role === 'doctor' ? 'Patient' : (doctorName || 'Doctor');

    // Chat states
    const [isChatVisible, setIsChatVisible] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [myUserId, setMyUserId] = useState(null);
    const flatListRef = useRef(null);

    // ── Timer ─────────────────────────────────────────────────────────────────
    const startTimer = useCallback(() => {
        timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }, []);
    const stopTimer = useCallback(() => {
        clearInterval(timerRef.current);
    }, []);

    // ── Join room on mount ────────────────────────────────────────────────────
    useEffect(() => {
        if (!webrtcAvailable) { setPhase('error'); return; }
        if (!meetingRoomId) { setPhase('error'); return; }

        const socket = liveLocationService.socket;
        if (!socket?.connected) {
            Alert.alert('Not Connected', 'Cannot join call: no server connection.');
            navigation.goBack();
            return;
        }

        webrtcService.setSocket(socket);

        // Start audio session (auto-routes to speaker for video)
        InCallManager.start({ media: 'video' });
        InCallManager.setForceSpeakerphoneOn(true);

        // Register callbacks BEFORE joining so we don't miss events
        webrtcService.onWaiting(() => {
            setPhase('waiting');
        });

        webrtcService.onPeerJoined(async ({ initiator }) => {
            setPhase('connecting');
            try {
                // Both sides: get camera first (if not yet)
                if (!webrtcService.localStream) {
                    const stream = await webrtcService.getLocalStream(true);
                    setLocalStream(stream);
                }
                if (initiator) {
                    // First joiner → create offer for the peer that just arrived
                    await webrtcService._initPeerConnection();
                    await webrtcService._createAndSendOffer();
                }
                // Non-initiator: already handled in webrtcService via 'webrtc-offer' event
            } catch (err) {
                console.error('peer-joined error:', err);
                Alert.alert('Call Error', err.message);
                setPhase('error');
            }
        });

        webrtcService.onRemoteStream(stream => {
            setRemoteStream(stream);
            setPhase('active');
            startTimer();
        });

        webrtcService.onPeerLeft(() => {
            stopTimer();
            setPhase('peer_left');
        });

        webrtcService.onCallEnded(() => {
            stopTimer();
            setPhase('ended');
        });

        // Get local stream and join room
        (async () => {
            try {
                setPhase('joining');
                const stream = await webrtcService.getLocalStream(true);
                setLocalStream(stream);
                webrtcService.joinRoom(meetingRoomId);
                // phase will be set by waiting-for-peer / peer-joined callbacks
            } catch (err) {
                console.error('Failed to get camera:', err);
                Alert.alert('Camera Error', err.message);
                setPhase('error');
            }
        })();

        // ── Chat Initialization ──────────────────────────────────────────────
        const initChat = async () => {
            let fetchedUserId = null;
            // Get myUserId from token
            try {
                const token = await AsyncStorage.getItem('jwtToken');
                if (token) {
                    // Simple JWT decode
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    // If atob is not available, we might need a polyfill or another way. 
                    // But assuming it works as in ChatScreen.
                    setMyUserId(payload.phoneNumber);
                    fetchedUserId = payload.phoneNumber;
                }
            } catch (error) {
                console.warn('Failed to decode token for userId:', error);
            }

            if (chatId) {
                // Ensure socket connection for chat service if not already connected
                if (!chatService.socket?.connected) {
                    await chatService.connect();
                }

                chatService.joinChat(chatId);

                // Fetch history
                try {
                    const history = await chatService.getChatHistory(chatId);
                    // Ensure history is array and sort by createdAt
                    if (Array.isArray(history)) {
                        setMessages(history.reverse()); // Reverse because FlatList inverted
                    }
                } catch (error) {
                    console.error('Failed to fetch chat history:', error);
                }

                // Listen for new messages
                const handleNewMessage = (msg) => {
                    if (msg.chatId === chatId) {
                        setMessages(prev => {
                            // 1. If message with same real ID already exists, ignore
                            if (prev.some(m => m.id === msg.id)) return prev;

                            // 2. If it is my message, try to find matching temp msg
                            // We use fetchedUserId which is captured in the closure
                            const isMe = fetchedUserId && msg.senderId === fetchedUserId;
                            if (isMe) {
                                const tempIndex = prev.findIndex(m =>
                                    m.id && m.id.toString().startsWith('temp_') && m.text === msg.text
                                );
                                if (tempIndex !== -1) {
                                    const newMsgs = [...prev];
                                    newMsgs[tempIndex] = msg;
                                    return newMsgs;
                                }
                            }

                            // 3. Otherwise append
                            return [msg, ...prev];
                        });
                    }
                };

                // Check again before attaching
                if (!mountedInEffect) return;
                chatService.onMessage(handleNewMessage);

                return () => {
                    chatService.offMessage(handleNewMessage);
                };
            }
        };

        // We need a ref or variable to guard against nested async mount
        let mountedInEffect = true;
        const chatCleanupPromise = initChat();

        return () => {
            mountedInEffect = false;
            webrtcService.removeListeners();
            webrtcService.leaveRoom();
            stopTimer();
            InCallManager.stop();
            // Cleanup chat listener
            chatCleanupPromise.then(cleanup => cleanup && cleanup());
        };
    }, []);

    const handleEndCall = () => {
        webrtcService.endCall();
        stopTimer();
        setPhase('ended');
        setTimeout(() => navigation.goBack(), 1800);
    };

    const handleToggleMute = () => setIsMuted(webrtcService.toggleMute());
    const handleToggleCamera = () => setIsCameraOff(webrtcService.toggleCamera());

    // ── Chat Functions ────────────────────────────────────────────────────────
    const handleSendMessage = () => {
        if (!inputText.trim() || !chatId) return;

        const text = inputText.trim();
        const receiverId = role === 'doctor' ? route.params.userId : doctorId;

        // Optimistic update
        const tempMsg = {
            id: `temp_${Date.now()}`,
            chatId, senderId: myUserId, receiverId,
            text, seen: false,
            createdAt: new Date().toISOString(),
        };
        setMessages(prev => [tempMsg, ...prev]);

        chatService.sendMessage({ chatId, receiverId, text });
        setInputText('');
    };

    const elapsedStr = `${pad(Math.floor(elapsed / 60))}:${pad(elapsed % 60)}`;

    // ── react-native-webrtc not installed ─────────────────────────────────────
    if (phase === 'error' || !webrtcAvailable) {
        return (
            <SafeAreaView style={[styles.container, styles.center]}>
                <Text style={styles.bigEmoji}>📹</Text>
                <Text style={styles.errorTitle}>Video Calls Not Available</Text>
                <Text style={styles.errorBody}>
                    Install <Text style={styles.code}>react-native-webrtc</Text> and rebuild the app:
                    {'\n\n'}cd frontend{'\n'}npm install react-native-webrtc{'\n'}npx react-native run-android
                </Text>
                <TouchableOpacity style={styles.endCallBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.endCallText}>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // ── Call ended ────────────────────────────────────────────────────────────
    if (phase === 'ended' || phase === 'peer_left') {
        return (
            <SafeAreaView style={[styles.container, styles.center]}>
                <Text style={styles.bigEmoji}>{phase === 'peer_left' ? '👋' : '📵'}</Text>
                <Text style={styles.errorTitle}>
                    {phase === 'peer_left' ? `${peerName} has left the call` : 'Call Ended'}
                </Text>
                <Text style={styles.subText}>Duration: {elapsedStr}</Text>
                <TouchableOpacity
                    style={[styles.endCallBtn, { marginTop: 24 }]}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.endCallText}>Close</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // ── Active call ────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#1E1B4B" />

            {/* Remote video (full screen) */}
            {remoteStream && RTCView ? (
                <RTCView
                    streamURL={remoteStream.toURL()}
                    style={StyleSheet.absoluteFill}
                    objectFit="cover"
                />
            ) : (
                // Waiting / connecting overlay
                <View style={[StyleSheet.absoluteFill, styles.center]}>
                    <View style={styles.avatarWrapper}>
                        <PulseRing />
                        <View style={styles.avatarCircle}>
                            <Text style={styles.avatarText}>
                                {peerName.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.peerName}>{peerName}</Text>
                    <Text style={styles.phaseText}>
                        {phase === 'joining' && '📡  Joining room…'}
                        {phase === 'waiting' && '⏳  Waiting for the other person to join…'}
                        {phase === 'connecting' && '🔗  Connecting…'}
                    </Text>

                    {/* Helpful instruction for both sides */}
                    {phase === 'waiting' && (
                        <View style={styles.instructionBox}>
                            <Text style={styles.instructionText}>
                                {role === 'doctor'
                                    ? '📋  Ask your patient to open My Appointments → Join Video Call'
                                    : '📋  Ask your doctor to open their Dashboard → Join Call'}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* Top bar */}
            {!isChatVisible && (
                <View style={styles.topBar}>
                    <Text style={styles.topBarName}>{peerName}</Text>
                    {phase === 'active' && (
                        <View style={styles.timerBadge}>
                            <View style={styles.liveIndicator} />
                            <Text style={styles.timerText}>{elapsedStr}</Text>
                        </View>
                    )}
                    {(phase === 'joining' || phase === 'waiting' || phase === 'connecting') && (
                        <View style={[styles.timerBadge, { backgroundColor: 'rgba(245,158,11,0.7)' }]}>
                            <Text style={styles.timerText}>
                                {phase === 'waiting' ? 'WAITING' : 'CONNECTING'}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* Local video PiP */}
            {!isChatVisible && localStream && RTCView && (
                <View style={styles.localVideoContainer}>
                    <RTCView
                        streamURL={localStream.toURL()}
                        style={styles.localVideo}
                        objectFit="cover"
                        zOrder={1}
                    />
                    {isCameraOff && (
                        <View style={styles.cameraOffOverlay}>
                            <Text style={{ fontSize: 24 }}>📷</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Controls */}
            {!isChatVisible && (
                <View style={styles.controlsBar}>
                    <ControlButton
                        icon={isMuted ? '🔇' : '🎤'}
                        label={isMuted ? 'Unmute' : 'Mute'}
                        onPress={handleToggleMute}
                        disabled={phase !== 'active'}
                    />
                    <ControlButton
                        icon="💬"
                        label="Chat"
                        onPress={() => setIsChatVisible(true)}
                        disabled={phase !== 'active' && phase !== 'waiting' && phase !== 'connecting'}
                    />
                    <TouchableOpacity style={styles.endCallBtn} onPress={handleEndCall}>
                        <Text style={{ fontSize: 28 }}>📵</Text>
                    </TouchableOpacity>
                    <ControlButton
                        icon={isCameraOff ? '📷' : '📹'}
                        label={isCameraOff ? 'Cam On' : 'Cam Off'}
                        onPress={handleToggleCamera}
                        disabled={!localStream}
                    />
                </View>
            )}

            {/* Chat Modal/Overlay */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isChatVisible}
                onRequestClose={() => setIsChatVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.chatModalContainer}
                >
                    <View style={styles.chatContent}>
                        {/* Chat Header */}
                        <View style={styles.chatHeader}>
                            <Text style={styles.chatTitle}>Chat with {peerName}</Text>
                            <TouchableOpacity onPress={() => setIsChatVisible(false)} style={styles.closeChatBtn}>
                                <Text style={styles.closeChatText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Messages List */}
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={(item, index) => item.id || index.toString()}
                            inverted
                            renderItem={({ item }) => {
                                const isMyMessage = item.senderId === myUserId;

                                return (
                                    <View style={[
                                        styles.messageBubble,
                                        isMyMessage ? styles.myMessage : styles.peerMessage
                                    ]}>
                                        <Text style={[
                                            styles.messageText,
                                            isMyMessage ? styles.myMessageText : styles.peerMessageText
                                        ]}>
                                            {item.text}
                                        </Text>
                                    </View>
                                );
                            }}
                            style={styles.messagesList}
                            contentContainerStyle={{ paddingVertical: 10 }}
                        />

                        {/* Input Area */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.inputField}
                                value={inputText}
                                onChangeText={setInputText}
                                placeholder="Type a message..."
                                placeholderTextColor="#999"
                            />
                            <TouchableOpacity onPress={handleSendMessage} style={styles.sendBtn}>
                                <Text style={styles.sendBtnText}>➤</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

        </SafeAreaView>
    );
}

const ControlButton = ({ icon, label, onPress, disabled }) => (
    <TouchableOpacity style={styles.controlBtn} onPress={onPress} disabled={disabled}>
        <View style={[styles.controlBtnCircle, disabled && styles.controlBtnDisabled]}>
            <Text style={{ fontSize: 24 }}>{icon}</Text>
        </View>
        <Text style={styles.controlBtnLabel}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1E1B4B' },
    center: { alignItems: 'center', justifyContent: 'center', padding: 32 },

    // Error / ended
    bigEmoji: { fontSize: 64, marginBottom: 16 },
    errorTitle: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
    errorBody: { color: '#DDD6FE', fontSize: 13, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
    code: { fontWeight: '700', color: '#A5F3FC' },
    subText: { color: '#A78BFA', fontSize: 15, marginTop: 8 },

    // Waiting overlay
    avatarWrapper: { alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    pulseRing: {
        position: 'absolute', width: 130, height: 130, borderRadius: 65,
        borderWidth: 2.5, borderColor: '#7C3AED',
    },
    avatarCircle: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: '#4C1D95', alignItems: 'center', justifyContent: 'center',
        borderWidth: 3, borderColor: '#7C3AED',
    },
    avatarText: { fontSize: 40, fontWeight: '700', color: '#DDD6FE' },
    peerName: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 10 },
    phaseText: { color: '#A78BFA', fontSize: 15, textAlign: 'center', marginBottom: 20 },
    instructionBox: {
        backgroundColor: 'rgba(124,58,237,0.25)', borderRadius: 12,
        padding: 16, marginHorizontal: 20, borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
    },
    instructionText: { color: '#DDD6FE', fontSize: 13, textAlign: 'center', lineHeight: 20 },

    // Top bar
    topBar: {
        position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30,
        left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20,
        zIndex: 10,
    },
    topBarName: {
        color: '#fff', fontSize: 17, fontWeight: '700',
        textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4,
    },
    timerBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 16,
        paddingHorizontal: 12, paddingVertical: 5,
    },
    liveIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
    timerText: { color: '#fff', fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },

    // Local PiP
    localVideoContainer: {
        position: 'absolute', top: Platform.OS === 'ios' ? 100 : 80, right: 16,
        width: 100, height: 140, borderRadius: 12,
        overflow: 'hidden', borderWidth: 2, borderColor: '#7C3AED', elevation: 6,
        zIndex: 10,
    },
    localVideo: { width: 100, height: 140 },
    cameraOffOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#1E1B4B', alignItems: 'center', justifyContent: 'center',
    },

    // Controls
    controlsBar: {
        position: 'absolute', bottom: 40, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20,
        zIndex: 10,
    },
    controlBtn: { alignItems: 'center', gap: 6 },
    controlBtnCircle: {
        width: 58, height: 58, borderRadius: 29,
        backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
    },
    controlBtnDisabled: { opacity: 0.4 },
    controlBtnLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
    endCallBtn: {
        width: 70, height: 70, borderRadius: 35,
        backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center',
        elevation: 6,
    },
    endCallText: { color: '#fff', fontSize: 15, fontWeight: '700' },

    // Chat Styles
    chatModalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    chatContent: {
        height: '70%',
        backgroundColor: 'rgba(30, 27, 75, 0.95)',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#7C3AED',
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    chatTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeChatBtn: {
        padding: 5,
    },
    closeChatText: {
        color: '#fff',
        fontSize: 20,
    },
    messagesList: {
        flex: 1,
    },
    messageBubble: {
        padding: 10,
        borderRadius: 12,
        marginBottom: 8,
        maxWidth: '80%',
    },
    myMessage: {
        backgroundColor: '#7C3AED',
        alignSelf: 'flex-end',
        borderBottomRightRadius: 2,
    },
    peerMessage: {
        backgroundColor: '#4C1D95',
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 2,
    },
    messageText: {
        color: '#fff',
        fontSize: 15,
    },
    myMessageText: {
        color: '#fff',
    },
    peerMessageText: {
        color: '#DDD6FE',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    inputField: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        color: '#fff',
        marginRight: 10,
    },
    sendBtn: {
        backgroundColor: '#7C3AED',
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendBtnText: {
        color: '#fff',
        fontSize: 18,
    },
});

