import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View, Text, FlatList, TextInput, TouchableOpacity,
    StyleSheet, SafeAreaView, StatusBar, KeyboardAvoidingView,
    Platform, ActivityIndicator, Image, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import chatService from '../../services/chatService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PURPLE = '#7C3AED';

const MessageBubble = ({ message, myUserId, onSeen }) => {
    const isMe = message.senderId === myUserId;
    const time = message.createdAt
        ? new Date(message.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : '';

    useEffect(() => {
        if (!isMe && !message.seen) {
            onSeen?.(message.id);
        }
    }, []);

    return (
        <View style={[styles.bubbleWrapper, isMe ? styles.bubbleWrapperRight : styles.bubbleWrapperLeft]}>
            <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                {message.attachmentUrl ? (
                    <Image
                        source={{ uri: message.attachmentUrl }}
                        style={styles.attachmentImage}
                        resizeMode="cover"
                    />
                ) : null}
                {message.text ? (
                    <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
                        {message.text}
                    </Text>
                ) : null}
                <View style={styles.bubbleMeta}>
                    <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>{time}</Text>
                    {isMe && message.seen && <Text style={styles.seenTick}> ✓✓</Text>}
                </View>
            </View>
        </View>
    );
};

export default function ChatScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { chatId, doctorId, doctorName, partnerId, partnerName, meetingRoomId } = route.params;

    const targetId = partnerId || doctorId;
    const targetName = partnerName || doctorName || 'Chat';

    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [myUserId, setMyUserId] = useState(null);
    const flatListRef = useRef(null);
    const typingTimerRef = useRef(null);

    // Load user ID
    useEffect(() => {
        AsyncStorage.getItem('jwtToken').then(token => {
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    setMyUserId(payload.phoneNumber);
                } catch { /* ignore */ }
            }
        });
    }, []);

    // Connect and load history
    useEffect(() => {
        let mounted = true;
        let cleanupListeners = null;

        const setup = async () => {
            try {
                await chatService.connect();
                chatService.joinChat(chatId);

                // Load history
                const { messages: history } = await chatService.getChatHistory(chatId);
                if (mounted) setMessages(history || []);

                // Listen for new messages
                const handleNewMessage = (msg) => {
                    if (msg.chatId === chatId) {
                        setMessages(prev => {
                            // 1. If message with same real ID already exists, ignore
                            if (prev.some(m => m.id === msg.id)) {
                                return prev;
                            }

                            // 2. If it is my message, try to find a matching temp message to replace
                            // We check senderId against myUserId OR the current senderId if it looks like a confirm
                            if (myUserId && msg.senderId === myUserId) {
                                const tempIndex = prev.findIndex(m =>
                                    m.id && m.id.toString().startsWith('temp_') && m.text === msg.text
                                );
                                if (tempIndex !== -1) {
                                    const newMsgs = [...prev];
                                    newMsgs[tempIndex] = msg;
                                    return newMsgs;
                                }
                            }

                            // 3. Last safety: if somehow a duplicate real message exists, don't append
                            // (Step 1 already handles this, but being extra safe)
                            return [...prev, msg];
                        });
                        flatListRef.current?.scrollToEnd({ animated: true });
                    }
                };

                // CRITICAL: Check mounted before adding listeners
                if (!mounted) return;

                chatService.onMessage(handleNewMessage);

                // Listen for typing
                const handleTyping = ({ senderId, isTyping: typing }) => {
                    if (senderId !== myUserId) setIsTyping(typing);
                };
                chatService.onTyping(handleTyping);

                // Save handlers for cleanup
                cleanupListeners = () => {
                    chatService.offMessage(handleNewMessage);
                    chatService.offTyping(handleTyping);
                };

            } catch (err) {
                console.error('Chat setup error:', err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        setup();

        return () => {
            mounted = false;
            if (cleanupListeners) cleanupListeners();
        };
    }, [chatId, myUserId]);

    const handleSend = useCallback(() => {
        const text = inputText.trim();
        if (!text) return;
        setInputText('');

        // Optimistic update
        const tempMsg = {
            id: `temp_${Date.now()}`,
            chatId, senderId: myUserId, receiverId: targetId,
            text, seen: false,
            createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempMsg]);
        flatListRef.current?.scrollToEnd({ animated: true });

        chatService.sendMessage({ chatId, receiverId: targetId, text });
        chatService.sendTyping(chatId, false);
    }, [inputText, chatId, targetId, myUserId]);

    const handleTyping = (text) => {
        setInputText(text);
        chatService.sendTyping(chatId, true);
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => chatService.sendTyping(chatId, false), 2000);
    };

    const handleSeen = (messageId) => {
        chatService.markSeen(chatId, messageId);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#6B21A8" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <View style={styles.headerAvatar}>
                    <Text style={styles.headerAvatarText}>
                        {targetName.split(' ').slice(1).map(w => w[0]).join('').substring(0, 2)}
                    </Text>
                </View>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>{targetName}</Text>
                    <Text style={styles.headerOnline}>
                        {isTyping ? '✍️ Typing…' : '🟢 Online'}
                    </Text>
                </View>
                {meetingRoomId && (
                    <TouchableOpacity
                        style={styles.videoCallBtn}
                        onPress={() => navigation.navigate('VideoConsultation', {
                            meetingRoomId, doctorId: targetId, doctorName: targetName,
                        })}
                    >
                        <Text style={styles.videoCallIcon}>📹</Text>
                    </TouchableOpacity>
                )}
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={PURPLE} />
                        <Text style={styles.loadingText}>Loading messages…</Text>
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.messagesList}
                        showsVerticalScrollIndicator={false}
                        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
                        ListEmptyComponent={
                            <View style={styles.emptyChat}>
                                <Text style={styles.emptyChatEmoji}>💬</Text>
                                <Text style={styles.emptyChatText}>No messages yet</Text>
                                <Text style={styles.emptyChatSub}>Start the conversation with your doctor</Text>
                            </View>
                        }
                        renderItem={({ item }) => (
                            <MessageBubble message={item} myUserId={myUserId} onSeen={handleSeen} />
                        )}
                    />
                )}

                {/* Input Bar */}
                <View style={styles.inputBar}>
                    <TextInput
                        style={styles.input}
                        placeholder="Type a message…"
                        placeholderTextColor="#94A3B8"
                        value={inputText}
                        onChangeText={handleTyping}
                        multiline
                        maxLength={1000}
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
                        onPress={handleSend}
                        disabled={!inputText.trim()}
                    >
                        <Text style={styles.sendIcon}>➤</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F4FF' },
    header: {
        backgroundColor: '#6B21A8',
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14, paddingVertical: 12, gap: 10,
    },
    backBtn: { padding: 4 },
    backIcon: { color: '#fff', fontSize: 24 },
    headerAvatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center',
    },
    headerAvatarText: { fontSize: 15, fontWeight: '700', color: '#7C3AED' },
    headerInfo: { flex: 1 },
    headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
    headerOnline: { color: '#DDD6FE', fontSize: 12, marginTop: 2 },
    videoCallBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
    },
    videoCallIcon: { fontSize: 20 },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { color: '#7C3AED', marginTop: 12, fontSize: 14 },
    messagesList: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 },
    bubbleWrapper: { marginBottom: 10 },
    bubbleWrapperRight: { alignItems: 'flex-end' },
    bubbleWrapperLeft: { alignItems: 'flex-start' },
    bubble: { maxWidth: '78%', borderRadius: 16, padding: 12 },
    bubbleMe: {
        backgroundColor: '#7C3AED',
        borderBottomRightRadius: 4,
    },
    bubbleThem: {
        backgroundColor: '#fff',
        borderBottomLeftRadius: 4,
        elevation: 1,
        shadowColor: '#7C3AED', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    },
    bubbleText: { fontSize: 15, lineHeight: 22 },
    bubbleTextMe: { color: '#fff' },
    bubbleTextThem: { color: '#1E293B' },
    bubbleMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    bubbleTime: { fontSize: 11 },
    bubbleTimeMe: { color: 'rgba(255,255,255,0.7)' },
    bubbleTimeThem: { color: '#94A3B8' },
    seenTick: { fontSize: 11, color: '#A5F3FC' },
    attachmentImage: { width: 200, height: 150, borderRadius: 10, marginBottom: 6 },
    emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyChatEmoji: { fontSize: 56, marginBottom: 12 },
    emptyChatText: { fontSize: 18, fontWeight: '600', color: '#334155' },
    emptyChatSub: { fontSize: 14, color: '#94A3B8', marginTop: 6, textAlign: 'center' },
    inputBar: {
        flexDirection: 'row', alignItems: 'flex-end',
        backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10,
        borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 10,
    },
    input: {
        flex: 1, backgroundColor: '#F3E8FF', borderRadius: 22,
        paddingHorizontal: 16, paddingVertical: 10,
        color: '#1E293B', fontSize: 15, maxHeight: 120,
    },
    sendBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center',
    },
    sendBtnDisabled: { backgroundColor: '#C4B5FD' },
    sendIcon: { color: '#fff', fontSize: 18, marginLeft: 2 },
});
