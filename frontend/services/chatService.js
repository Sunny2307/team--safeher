import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServerURL } from '../utils/serverConfig';
import api from '../api/api';

/**
 * Chat Service
 * Manages real-time chat over Socket.IO and message persistence in Firestore
 * (via the backend REST endpoints).
 */

class ChatService {
    constructor() {
        this.socket = null;
        this.messageListeners = [];
        this.typingListeners = [];
        this.seenListeners = [];
        this.currentChatId = null;
    }

    // ─── Connection ─────────────────────────────────────────────────────────────
    async connect() {
        if (this.socket?.connected) return;

        const [serverUrl, token] = await Promise.all([
            getServerURL(),
            AsyncStorage.getItem('jwtToken'),
        ]);

        this.socket = io(serverUrl, {
            auth: { token },
            transports: ['websocket'],
        });

        this.socket.on('connect', () => {
            console.log('💬 Chat socket connected');
            // Re-join current chat if any
            if (this.currentChatId) {
                this.socket.emit('join-chat', { chatId: this.currentChatId });
            }
        });

        this.socket.on('receive-message', (message) => {
            this.messageListeners.forEach(cb => cb(message));
        });

        this.socket.on('typing', (data) => {
            this.typingListeners.forEach(cb => cb(data));
        });

        this.socket.on('seen', (data) => {
            this.seenListeners.forEach(cb => cb(data));
        });

        this.socket.on('disconnect', () => {
            console.log('💬 Chat socket disconnected');
        });
    }

    // ─── Chat Room ───────────────────────────────────────────────────────────────
    joinChat(chatId) {
        this.currentChatId = chatId;
        if (this.socket?.connected) {
            this.socket.emit('join-chat', { chatId });
        }
    }

    // ─── Send Message ─────────────────────────────────────────────────────────────
    sendMessage({ chatId, receiverId, text, attachmentUrl }) {
        if (!this.socket?.connected) {
            console.warn('Chat socket not connected');
            return;
        }
        this.socket.emit('send-message', { chatId, receiverId, text, attachmentUrl });
    }

    // ─── Typing Indicator ─────────────────────────────────────────────────────────
    sendTyping(chatId, isTyping) {
        this.socket?.emit('typing', { chatId, isTyping });
    }

    // ─── Mark Seen ────────────────────────────────────────────────────────────────
    markSeen(chatId, messageId) {
        this.socket?.emit('seen', { chatId, messageId });
    }

    // ─── REST: History ────────────────────────────────────────────────────────────
    getChatHistory(chatId, before = null) {
        const url = before
            ? `/chat/history/${chatId}?before=${encodeURIComponent(before)}`
            : `/chat/history/${chatId}`;
        return api.get(url).then(res => res.data);
    }

    // ─── REST: Upload Attachment ──────────────────────────────────────────────────
    async uploadAttachment(fileUri, fileName, mimeType) {
        const formData = new FormData();
        formData.append('file', { uri: fileUri, name: fileName, type: mimeType });
        const response = await api.post('/chat/attachment', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000,
        });
        return response.data;
    }

    // ─── Listeners ────────────────────────────────────────────────────────────────
    onMessage(cb) { this.messageListeners.push(cb); }
    onTyping(cb) { this.typingListeners.push(cb); }
    onSeen(cb) { this.seenListeners.push(cb); }

    offMessage(cb) { this.messageListeners = this.messageListeners.filter(l => l !== cb); }
    offTyping(cb) { this.typingListeners = this.typingListeners.filter(l => l !== cb); }

    // ─── Disconnect ───────────────────────────────────────────────────────────────
    disconnect() {
        this.socket?.disconnect();
        this.socket = null;
        this.messageListeners = [];
        this.typingListeners = [];
        this.seenListeners = [];
        this.currentChatId = null;
    }
}

export default new ChatService();
