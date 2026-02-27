require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cron = require('node-cron');
const axios = require('axios');
const authRoutes = require('./routes/authRoutes');
const loginRoutes = require('./routes/loginRoutes');
const userRoutes = require('./routes/userRoutes');
const cycleRoutes = require('./routes/cycleRoutes');
const symptomRoutes = require('./routes/symptomRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const chatRoutes = require('./routes/chatRoutes');
const adminRoutes = require('./routes/adminRoutes');
const doctorProfileRoutes = require('./routes/doctorProfileRoutes');
const forumRoutes = require('./routes/forumRoutes');
const forumAdminRoutes = require('./routes/forumAdminRoutes');
const pcosRoutes = require('./routes/pcosRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const configRoutes = require('./routes/configRoutes');
const multer = require('multer');
const { uploadVideo } = require('./uploadService');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { db, admin } = require('./firebase');
const pushNotificationService = require('./pushNotificationService');

// Environment Configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const isDevelopment = NODE_ENV === 'development';
const isProduction = NODE_ENV === 'production';

// Log environment mode
console.log(`🚀 Starting server in ${NODE_ENV.toUpperCase()} mode`);

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const upload = multer({ dest: 'uploads/' });

// ========================================
// MIDDLEWARE
// ========================================

// Security middleware (Production)
if (isProduction) {
  app.use(helmet());
  console.log('✅ Security headers enabled (helmet)');
}

// Compression middleware (Production)
if (isProduction) {
  app.use(compression());
  console.log('✅ Response compression enabled');
}

// HTTP request logging (Development only)
if (isDevelopment) {
  app.use(morgan('dev'));
  console.log('✅ HTTP logging enabled (dev)');
}

// CORS
app.use(cors());

// JSON parser
app.use(express.json());

// Health check endpoint (IMPORTANT for Render uptime monitoring)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime()
  });
});

// Video Upload Route
app.post('/upload-video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No video file provided'
      });
    }

    const filePath = req.file.path;
    const fileName = `recording_${Date.now()}.mp4`;

    console.log(`Starting upload for file: ${fileName}, size: ${req.file.size} bytes`);

    const result = await uploadVideo(filePath, fileName);

    // Clean up temporary file
    try {
      fs.unlinkSync(filePath);
      console.log('Temporary file cleaned up');
    } catch (cleanupError) {
      console.warn('Failed to clean up temporary file:', cleanupError.message);
    }

    console.log('Upload successful:', result.url);
    res.json({
      success: true,
      videoUrl: result.url,
      provider: result.provider,
      fileSize: req.file.size
    });
  } catch (error) {
    console.error('Upload error:', error);

    // Clean up temporary file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to clean up temporary file after error:', cleanupError.message);
      }
    }

    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.use('/auth', authRoutes.router);
app.use('/api', loginRoutes);
app.use('/user', userRoutes.router);
app.use('/api/cycle', cycleRoutes);
app.use('/api/symptoms', symptomRoutes);
app.use('/doctors', doctorRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/chat', chatRoutes);
app.use('/admin', adminRoutes);
app.use('/doctor', doctorProfileRoutes);
app.use('/forum', forumRoutes);
app.use('/forum/admin', forumAdminRoutes);
app.use('/pcos', pcosRoutes);
app.use('/emergency', emergencyRoutes);
app.use('/config', configRoutes);

// Middleware to verify JWT token for API routes
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.phoneNumber;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// GET active live location sessions for the authenticated user
app.get('/api/live-location/active-sessions', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const activeSessions = [];
    const currentTime = Date.now();

    // Iterate through all active sessions
    for (const [sessionId, session] of activeLocationSessions.entries()) {
      // Skip expired sessions
      const sessionEndTime = session.startTime + session.duration;
      if (currentTime >= sessionEndTime || !session.isActive) {
        continue;
      }

      // Check if user is the sharer or a recipient
      const isSharer = session.sharerId === userId;
      const isRecipient = session.friendPhoneNumbers.includes(userId);

      if (isSharer || isRecipient) {
        const remainingTime = sessionEndTime - currentTime;

        activeSessions.push({
          sessionId,
          sharerId: session.sharerId,
          friendPhoneNumbers: session.friendPhoneNumbers,
          startTime: session.startTime,
          duration: session.duration,
          remainingTime,
          isSharer,
          isRecipient
        });
      }
    }

    res.json({
      success: true,
      sessions: activeSessions
    });
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active sessions'
    });
  }
});

// Store active location sharing sessions
const activeLocationSessions = new Map();

// Store device tokens for push notifications
const deviceTokens = new Map();

// WebSocket authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.phoneNumber;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected`);

  // Join user to their personal room
  socket.join(socket.userId);

  // Handle device token registration for push notifications
  socket.on('register-device-token', (data) => {
    try {
      const { deviceToken } = data;
      deviceTokens.set(socket.userId, deviceToken);

      // Persist to Firestore
      db.collection('users').doc(socket.userId).set({
        deviceToken,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(err => console.error('Error saving device token to DB:', err.message));

      console.log(`✅ Device token registered for user ${socket.userId}`);
      console.log(`📱 Token: ${deviceToken.substring(0, 20)}...`);
      console.log(`📊 Total registered devices: ${deviceTokens.size}`);
    } catch (error) {
      console.error('❌ Error registering device token:', error);
    }
  });

  // Handle starting live location sharing
  socket.on('start-live-location', async (data) => {
    try {
      const { friendPhoneNumbers, duration = 3600000 } = data; // Support multiple friends
      const sessionId = `${socket.userId}_${Date.now()}`;

      // Ensure friendPhoneNumbers is an array
      const recipients = Array.isArray(friendPhoneNumbers) ? friendPhoneNumbers : [friendPhoneNumbers];

      // Store session info
      activeLocationSessions.set(sessionId, {
        sharerId: socket.userId,
        friendPhoneNumbers: recipients,
        startTime: Date.now(),
        duration,
        isActive: true
      });

      // Join the session room
      socket.join(`session_${sessionId}`);

      // Notify all friends via socket and push notifications
      const friendTokens = [];
      recipients.forEach(friendPhoneNumber => {
        // Send socket notification
        socket.to(friendPhoneNumber).emit('live-location-started', {
          sessionId,
          sharerId: socket.userId,
          sharerName: socket.userId, // You can get actual name from database if needed
          duration
        });

        // Get device token for push notification
        const friendToken = deviceTokens.get(friendPhoneNumber);
        if (friendToken) {
          friendTokens.push(friendToken);
        }
      });

      // Send push notifications to all friends
      console.log(`\n🔔 Attempting to send notifications...`);
      console.log(`👥 Recipients: ${recipients.join(', ')}`);
      console.log(`📱 Found ${friendTokens.length} device tokens`);

      if (friendTokens.length > 0) {
        try {
          const sharerName = socket.userId;
          console.log(`📤 Sending notifications from ${sharerName}...`);

          await pushNotificationService.sendLiveLocationRequestToMultiple(
            friendTokens,
            sharerName,
            sessionId,
            socket.userId
          );
          console.log(`✅ Push notifications sent to ${friendTokens.length} friends\n`);
        } catch (error) {
          console.error('❌ Error sending push notifications:', error);
        }
      } else {
        console.log(`⚠️  No device tokens found for recipients!`);
        console.log(`💡 Make sure all recipients have opened the app and connected.\n`);
      }

      socket.emit('live-location-session-created', {
        sessionId,
        recipients: recipients.length
      });

      // Auto-expire session after duration
      setTimeout(() => {
        if (activeLocationSessions.has(sessionId)) {
          activeLocationSessions.delete(sessionId);
          io.to(`session_${sessionId}`).emit('live-location-ended', { sessionId });
        }
      }, duration);

    } catch (error) {
      console.error('Error starting live location:', error);
      socket.emit('error', { message: 'Failed to start live location sharing' });
    }
  });

  // Handle location updates
  socket.on('location-update', (data) => {
    try {
      const { sessionId, latitude, longitude, timestamp } = data;
      const session = activeLocationSessions.get(sessionId);

      if (session && session.isActive) {
        // Broadcast location update to all participants in the session
        io.to(`session_${sessionId}`).emit('location-updated', {
          sessionId,
          latitude,
          longitude,
          timestamp,
          sharerId: socket.userId
        });
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  });

  // Handle stopping live location
  socket.on('stop-live-location', (data) => {
    try {
      const { sessionId } = data;
      const session = activeLocationSessions.get(sessionId);

      if (session && session.sharerId === socket.userId) {
        activeLocationSessions.delete(sessionId);
        io.to(`session_${sessionId}`).emit('live-location-ended', { sessionId });
      }
    } catch (error) {
      console.error('Error stopping live location:', error);
    }
  });

  // Handle joining a live location session
  socket.on('join-live-location', (data) => {
    try {
      const { sessionId } = data;
      const session = activeLocationSessions.get(sessionId);

      if (session && session.isActive) {
        socket.join(`session_${sessionId}`);
        socket.emit('joined-live-location', { sessionId });
      } else {
        socket.emit('error', { message: 'Live location session not found or expired' });
      }
    } catch (error) {
      console.error('Error joining live location:', error);
    }
  });

  socket.on('disconnect', () => {
    if (isDevelopment) {
      console.log(`User ${socket.userId} disconnected`);
    }

    // Clean up any active sessions for this user
    for (const [sessionId, session] of activeLocationSessions.entries()) {
      if (session.sharerId === socket.userId) {
        activeLocationSessions.delete(sessionId);
        io.to(`session_${sessionId}`).emit('live-location-ended', { sessionId });
      }
    }
  });

  // ─── CHAT EVENTS ──────────────────────────────────────────────────────────────

  socket.on('join-chat', ({ chatId }) => {
    socket.join(`chat_${chatId}`);
    console.log(`User ${socket.userId} joined chat room: chat_${chatId}`);
  });

  socket.on('send-message', async (data) => {
    try {
      const { chatId, receiverId, text, attachmentUrl } = data;
      if (!chatId || (!text && !attachmentUrl)) return;

      const msgRef = db.collection('messages').doc();
      const messageData = {
        chatId,
        senderId: socket.userId,
        receiverId: receiverId || null,
        text: text || '',
        attachmentUrl: attachmentUrl || null,
        seen: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await msgRef.set(messageData);

      const outgoing = {
        id: msgRef.id,
        ...messageData,
        createdAt: new Date().toISOString(),
      };

      io.to(`chat_${chatId}`).emit('receive-message', outgoing);

      // FCM push to offline receiver
      if (receiverId) {
        const getReceiverToken = async () => {
          let token = deviceTokens.get(receiverId);
          if (!token) {
            try {
              const doc = await db.collection('users').doc(receiverId).get();
              token = doc.data()?.deviceToken;
            } catch { /* ignore */ }
          }
          return token;
        };
        const rToken = await getReceiverToken();
        if (rToken) {
          pushNotificationService.sendNotificationToDevice(
            rToken,
            '💬 New Message',
            text ? text.substring(0, 100) : '📎 Attachment',
            { type: 'chat-message', chatId, senderId: socket.userId }
          ).catch(e => console.warn('FCM chat push failed:', e.message));
        }
      }
    } catch (err) {
      console.error('Error handling send-message:', err);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('typing', ({ chatId, isTyping }) => {
    socket.to(`chat_${chatId}`).emit('typing', { senderId: socket.userId, isTyping });
  });

  socket.on('seen', async ({ chatId, messageId }) => {
    try {
      if (messageId) {
        await db.collection('messages').doc(messageId).update({ seen: true });
      }
      socket.to(`chat_${chatId}`).emit('seen', { messageId, seenBy: socket.userId });
    } catch (err) {
      console.error('Error marking message seen:', err);
    }
  });

  // ─── VIDEO CALL: Room-join model ─────────────────────────────────────────────
  //
  // Both user and doctor navigate to VideoConsultationScreen with the same
  // meetingRoomId.  They each emit 'join-meeting-room'.  The server tracks who
  // is in the room; when a second peer arrives it notifies both sides so the
  // CALLER (first joiner) creates the WebRTC offer automatically.
  //
  socket.on('join-meeting-room', ({ meetingRoomId }) => {
    const roomKey = `room_${meetingRoomId}`;
    socket.join(roomKey);

    // Tell the new joiner who else is already in the room
    const room = io.sockets.adapter.rooms.get(roomKey);
    const othersInRoom = room ? [...room].filter(sid => sid !== socket.id) : [];

    console.log(`📹 ${socket.userId} joined meeting room ${meetingRoomId} (peers: ${othersInRoom.length})`);

    if (othersInRoom.length > 0) {
      // Notify the new joiner that a peer is waiting → new joiner creates offer
      socket.emit('peer-joined', { initiator: false });
      // Notify the existing peer(s) that someone arrived → they wait for offer
      socket.to(roomKey).emit('peer-joined', { initiator: true });
    } else {
      // First in room — wait for someone else
      socket.emit('waiting-for-peer', {});
    }
  });

  socket.on('leave-meeting-room', ({ meetingRoomId }) => {
    const roomKey = `room_${meetingRoomId}`;
    socket.leave(roomKey);
    socket.to(roomKey).emit('peer-left', { userId: socket.userId });
    console.log(`📹 ${socket.userId} left meeting room ${meetingRoomId}`);
  });

  // ─── WebRTC signaling (room-broadcast, no toUserId needed) ────────────────────
  socket.on('webrtc-offer', ({ meetingRoomId, offer }) => {
    socket.to(`room_${meetingRoomId}`).emit('webrtc-offer', {
      fromUserId: socket.userId, offer,
    });
  });

  socket.on('webrtc-answer', ({ meetingRoomId, answer }) => {
    socket.to(`room_${meetingRoomId}`).emit('webrtc-answer', {
      fromUserId: socket.userId, answer,
    });
  });

  socket.on('webrtc-ice-candidate', ({ meetingRoomId, candidate }) => {
    socket.to(`room_${meetingRoomId}`).emit('webrtc-ice-candidate', {
      fromUserId: socket.userId, candidate,
    });
  });

  socket.on('end-call', ({ meetingRoomId }) => {
    socket.to(`room_${meetingRoomId}`).emit('call-ended', { fromUserId: socket.userId });
    socket.leave(`room_${meetingRoomId}`);
    console.log(`📞 Call ended by ${socket.userId} (room: ${meetingRoomId})`);
  });

  // ─── Legacy userId-based call events (kept for backward compat) ───────────────
  socket.on('call-user', async ({ toUserId, meetingRoomId: rid, fromName, chatId, doctorId }) => {
    io.to(toUserId).emit('incoming-call', {
      fromUserId: socket.userId,
      fromName: fromName || socket.userId,
      meetingRoomId: rid,
      chatId,
      doctorId,
    });
    console.log(`📞 Call (legacy) initiated: ${socket.userId} → ${toUserId}`);
  });

  socket.on('call-accepted', ({ meetingRoomId: rid }) => {
    socket.to(`room_${rid}`).emit('call-accepted', { fromUserId: socket.userId });
  });

  socket.on('call-rejected', ({ toUserId }) => {
    io.to(toUserId).emit('call-rejected', { fromUserId: socket.userId });
  });

});

// ========================================
// ERROR HANDLING MIDDLEWARE
// ========================================

// 404 Handler - Must be after all routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  // Log error (detailed in dev, minimal in prod)
  if (isDevelopment) {
    console.error('❌ Error occurred:', err);
  } else {
    console.error('❌ Error:', err.message);
  }

  // Send error response
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(isDevelopment && { stack: err.stack }) // Stack trace only in development
  });
});

// ========================================
// SERVER STARTUP
// ========================================

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Listen on all interfaces

// ─── Seed admin account ─────────────────────────────────────────────────────
async function seedAdminAccount() {
  try {
    const adminPhone = '9999999999';
    const userRef = db.collection('users').doc(adminPhone);
    await userRef.set({
      phoneNumber: adminPhone,
      pin: '1234',
      role: 'admin',
      name: 'SafeHer Admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true }); // merge: true — won't overwrite other fields if doc exists
    console.log('✅ Admin account ready (9999999999)');
  } catch (err) {
    console.error('❌ Failed to seed admin account:', err.message);
  }
}

// Initialize Cron Jobs
const notificationScheduler = require('./services/notificationScheduler');
notificationScheduler.init();
const appointmentReminderService = require('./services/appointmentReminderService');
appointmentReminderService.init();

// Seed admin account on startup
seedAdminAccount();

server.listen(PORT, HOST, () => {
  console.log('='.repeat(50));
  console.log(`✅ Server running on http://${HOST}:${PORT}`);
  console.log(`📡 Environment: ${NODE_ENV}`);
  console.log(`🔌 WebSocket: Enabled`);
  console.log(`📍 Live Location: Enabled`);
  console.log(`🔔 Push Notifications: Enabled`);
  console.log(`🏥 Health Check: http://${HOST}:${PORT}/health`);

  if (isDevelopment) {
    console.log(`🌐 Local: http://localhost:${PORT}`);
    // Try to show network IP
    try {
      const os = require('os');
      const networkInterfaces = os.networkInterfaces();
      for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
          if (iface.family === 'IPv4' && !iface.internal) {
            console.log(`🌐 Network: http://${iface.address}:${PORT}`);
          }
        }
      }
    } catch (e) {
      // Ignore error
    }
  }

  console.log('='.repeat(50));

  // ========================================
  // SELF-PING KEEP-ALIVE (Production Only)
  // ========================================

  if (isProduction) {
    // Get the public URL from environment variable
    const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;

    if (RENDER_EXTERNAL_URL) {
      console.log('⏰ Self-ping keep-alive: ENABLED');
      console.log(`🔔 Pinging ${RENDER_EXTERNAL_URL}/health every 14 minutes`);

      // Ping every 14 minutes (just before Render's 15-minute sleep timer)
      cron.schedule('*/14 * * * *', async () => {
        try {
          const response = await axios.get(`${RENDER_EXTERNAL_URL}/health`, {
            timeout: 10000
          });
          console.log(`✅ Self-ping successful - Status: ${response.data.status}`);
        } catch (error) {
          console.error(`⚠️  Self-ping failed: ${error.message}`);
        }
      });
    } else {
      console.log('⚠️  RENDER_EXTERNAL_URL not set - Self-ping disabled');
      console.log('💡 Add RENDER_EXTERNAL_URL to your Render environment variables');
    }
  } else {
    console.log('ℹ️  Self-ping keep-alive: DISABLED (development mode)');
  }

  console.log('='.repeat(50));
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
