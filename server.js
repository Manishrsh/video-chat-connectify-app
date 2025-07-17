// Socket.IO Signaling Server for Video Conferencing
// Save this as server.js in a separate directory and run with: node server.js
// You'll need to install: npm install express socket.io cors

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Enable CORS for all origins (in production, specify your frontend domain)
const io = socketIo(server, {
  cors: {
    origin: [
      "https://meet.scaletex.tech",      // ✅ your Vercel frontend
      "https://video-chat-connectify-app-3anw.vercel.app", // ✅ Vercel preview (optional)
      "http://localhost:5173"                              // ✅ local dev
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});


app.use(cors());
app.use(express.json());

// Store room information
const rooms = new Map();
const users = new Map();

// Socket connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a meeting room
  socket.on('join-room', ({ roomId, userName }) => {
    console.log(`${userName} (${socket.id}) joining room: ${roomId}`);
    
    // Store user info
    users.set(socket.id, { userName, roomId });
    
    // Join the socket room
    socket.join(roomId);
    
    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    
    const room = rooms.get(roomId);
    room.add(socket.id);
    
    // Notify existing users in the room
    socket.to(roomId).emit('user-joined', {
      userId: socket.id,
      userName: userName
    });
    
    // Send list of existing users to the new user
    const existingUsers = Array.from(room)
      .filter(id => id !== socket.id)
      .map(id => ({
        userId: id,
        userName: users.get(id)?.userName
      }));
    
    socket.emit('existing-users', existingUsers);
    
    console.log(`Room ${roomId} now has ${room.size} users`);
  });

  // WebRTC signaling: offer
  socket.on('offer', ({ offer, to }) => {
    console.log(`Sending offer from ${socket.id} to ${to}`);
    socket.to(to).emit('offer', {
      offer,
      from: socket.id,
      userName: users.get(socket.id)?.userName
    });
  });

  // WebRTC signaling: answer
  socket.on('answer', ({ answer, to }) => {
    console.log(`Sending answer from ${socket.id} to ${to}`);
    socket.to(to).emit('answer', {
      answer,
      from: socket.id
    });
  });

  // WebRTC signaling: ICE candidates
  socket.on('ice-candidate', ({ candidate, to }) => {
    socket.to(to).emit('ice-candidate', {
      candidate,
      from: socket.id
    });
  });

  // Media state updates
  socket.on('media-state', ({ isMuted, isVideoOff, roomId }) => {
    socket.to(roomId).emit('user-media-state', {
      userId: socket.id,
      isMuted,
      isVideoOff
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const user = users.get(socket.id);
    if (user) {
      const { roomId } = user;
      const room = rooms.get(roomId);
      
      if (room) {
        room.delete(socket.id);
        
        // Notify other users in the room
        socket.to(roomId).emit('user-left', {
          userId: socket.id
        });
        
        // Clean up empty rooms
        if (room.size === 0) {
          rooms.delete(roomId);
          console.log(`Room ${roomId} deleted (empty)`);
        } else {
          console.log(`Room ${roomId} now has ${room.size} users`);
        }
      }
      
      users.delete(socket.id);
    }
  });

  // Explicit leave room
  socket.on('leave-room', ({ roomId }) => {
    console.log(`User ${socket.id} leaving room: ${roomId}`);
    socket.leave(roomId);
    
    const room = rooms.get(roomId);
    if (room) {
      room.delete(socket.id);
      socket.to(roomId).emit('user-left', {
        userId: socket.id
      });
    }
  });
});

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    rooms: rooms.size,
    users: users.size 
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
  console.log('WebRTC signaling server is ready for video conferencing!');
});

module.exports = app;