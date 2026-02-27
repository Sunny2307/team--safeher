/**
 * WebRTCService — Room-Join Model
 *
 * Both the patient and doctor open VideoConsultationScreen with the same
 * meetingRoomId. On mount, both emit 'join-meeting-room'.
 * The server notifies who should create the offer (initiator: true) vs who
 * should wait for it (initiator: false).
 *
 * All signaling events include meetingRoomId so the backend can
 * room-broadcast without needing toUserId.
 *
 * Requires: react-native-webrtc  (npm install react-native-webrtc + rebuild)
 */

let RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices;

try {
    const webrtc = require('react-native-webrtc');
    RTCPeerConnection = webrtc.RTCPeerConnection;
    RTCSessionDescription = webrtc.RTCSessionDescription;
    RTCIceCandidate = webrtc.RTCIceCandidate;
    mediaDevices = webrtc.mediaDevices;
} catch {
    console.warn('⚠️  react-native-webrtc not installed. Video calls will not work until you install it and rebuild the app.');
}

const STUN_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
    ],
};

class WebRTCService {
    constructor() {
        this.peerConnection = null;
        this.localStream = null;
        this.socket = null;
        this.meetingRoomId = null;

        // Callback buckets
        this._onRemoteStream = null;
        this._onPeerJoined = null;    // { initiator: bool }
        this._onPeerLeft = null;
        this._onCallEnded = null;
        this._onWaiting = null;
    }

    // ─── Attach socket ─────────────────────────────────────────────────────────
    setSocket(socket) {
        this.socket = socket;
    }

    // ─── Join the shared meeting room ──────────────────────────────────────────
    joinRoom(meetingRoomId) {
        if (!this.socket) throw new Error('Socket not attached');
        this.meetingRoomId = meetingRoomId;
        this._bindSocketEvents();
        this.socket.emit('join-meeting-room', { meetingRoomId });
    }

    leaveRoom() {
        if (this.socket && this.meetingRoomId) {
            this.socket.emit('leave-meeting-room', { meetingRoomId: this.meetingRoomId });
        }
        this._cleanup();
    }

    // ─── Socket events ─────────────────────────────────────────────────────────
    _bindSocketEvents() {
        if (!this.socket) return;
        this._removeSocketListeners();

        // Server tells us: are we the initiator (create offer) or receiver?
        this.socket.on('peer-joined', async ({ initiator }) => {
            this._onPeerJoined?.({ initiator });
            if (initiator) {
                // We were already waiting — peer just joined. Create offer.
                await this._createAndSendOffer();
            }
            // Non-initiator waits for 'webrtc-offer'
        });

        this.socket.on('waiting-for-peer', () => {
            this._onWaiting?.();
        });

        this.socket.on('peer-left', () => {
            this._onPeerLeft?.();
        });

        this.socket.on('webrtc-offer', async ({ offer }) => {
            try {
                if (!this.peerConnection) await this._initPeerConnection();
                await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await this.peerConnection.createAnswer();
                await this.peerConnection.setLocalDescription(answer);
                this.socket.emit('webrtc-answer', {
                    meetingRoomId: this.meetingRoomId,
                    answer,
                });
            } catch (err) {
                console.error('webrtc-offer error:', err);
            }
        });

        this.socket.on('webrtc-answer', async ({ answer }) => {
            try {
                await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(answer));
            } catch (err) {
                console.error('webrtc-answer error:', err);
            }
        });

        this.socket.on('webrtc-ice-candidate', async ({ candidate }) => {
            try {
                if (candidate && this.peerConnection) {
                    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                }
            } catch (err) {
                console.error('ice-candidate error:', err);
            }
        });

        this.socket.on('call-ended', () => {
            this._onCallEnded?.();
            this._cleanup();
        });
    }

    _removeSocketListeners() {
        ['peer-joined', 'waiting-for-peer', 'peer-left',
            'webrtc-offer', 'webrtc-answer', 'webrtc-ice-candidate', 'call-ended']
            .forEach(ev => this.socket?.off(ev));
    }

    // ─── Get local camera/mic ──────────────────────────────────────────────────
    async getLocalStream(videoEnabled = true) {
        if (!mediaDevices) throw new Error('react-native-webrtc not available. Install it and rebuild the app.');
        const stream = await mediaDevices.getUserMedia({
            audio: true,
            video: videoEnabled ? { facingMode: 'user' } : false,
        });
        this.localStream = stream;
        return stream;
    }

    // ─── RTCPeerConnection ─────────────────────────────────────────────────────
    async _initPeerConnection() {
        if (!RTCPeerConnection) throw new Error('react-native-webrtc not available');

        this.peerConnection = new RTCPeerConnection(STUN_SERVERS);

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
        }

        this.peerConnection.ontrack = (event) => {
            this._onRemoteStream?.(event.streams[0]);
        };

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.meetingRoomId) {
                this.socket.emit('webrtc-ice-candidate', {
                    meetingRoomId: this.meetingRoomId,
                    candidate: event.candidate,
                });
            }
        };
    }

    // ─── Create & send offer ───────────────────────────────────────────────────
    async _createAndSendOffer() {
        try {
            if (!this.peerConnection) await this._initPeerConnection();
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            this.socket.emit('webrtc-offer', {
                meetingRoomId: this.meetingRoomId,
                offer,
            });
        } catch (err) {
            console.error('Error creating offer:', err);
        }
    }

    // ─── Controls ─────────────────────────────────────────────────────────────
    endCall() {
        if (this.socket && this.meetingRoomId) {
            this.socket.emit('end-call', { meetingRoomId: this.meetingRoomId });
        }
        this._cleanup();
    }

    toggleMute() {
        const at = this.localStream?.getAudioTracks()[0];
        if (at) { at.enabled = !at.enabled; return !at.enabled; }
        return false;
    }

    toggleCamera() {
        const vt = this.localStream?.getVideoTracks()[0];
        if (vt) { vt.enabled = !vt.enabled; return !vt.enabled; }
        return false;
    }

    // ─── Cleanup ───────────────────────────────────────────────────────────────
    _cleanup() {
        this._removeSocketListeners();
        this.localStream?.getTracks().forEach(t => t.stop());
        this.peerConnection?.close();
        this.localStream = null;
        this.peerConnection = null;
        this.meetingRoomId = null;
    }

    // ─── Callbacks ─────────────────────────────────────────────────────────────
    onRemoteStream(cb) { this._onRemoteStream = cb; }
    onPeerJoined(cb) { this._onPeerJoined = cb; }
    onPeerLeft(cb) { this._onPeerLeft = cb; }
    onCallEnded(cb) { this._onCallEnded = cb; }
    onWaiting(cb) { this._onWaiting = cb; }

    removeListeners() {
        this._onRemoteStream = null;
        this._onPeerJoined = null;
        this._onPeerLeft = null;
        this._onCallEnded = null;
        this._onWaiting = null;
    }
}

export default new WebRTCService();
