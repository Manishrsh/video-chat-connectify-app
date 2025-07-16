# Video Conferencing Signaling Server

This is the Socket.IO signaling server for the video conferencing app. It handles WebRTC signaling between participants.

## Setup Instructions

1. **Create a new directory for the server:**
   ```bash
   mkdir video-conference-server
   cd video-conference-server
   ```

2. **Copy the server files:**
   - Copy `server.js` to this directory
   - Copy `package-server.json` and rename it to `package.json`

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start the server:**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

The server will run on `http://localhost:3001` by default.

## Frontend Configuration

To connect your frontend to this signaling server, update the `useWebRTC.ts` hook in your React app:

```typescript
// In src/hooks/useWebRTC.ts, uncomment and modify this line:
const socket = io('http://localhost:3001');
```

## Features

- **Room Management**: Users can join/leave meeting rooms
- **WebRTC Signaling**: Handles offer/answer/ICE candidate exchange
- **Media State Sync**: Tracks mute/video state across participants
- **Auto Cleanup**: Removes empty rooms automatically

## API Endpoints

- `GET /health` - Server health check with room/user statistics

## Production Deployment

For production:

1. **Set proper CORS origins** in `server.js`
2. **Use environment variables** for configuration
3. **Deploy to a cloud service** (Heroku, Railway, DigitalOcean, etc.)
4. **Update frontend** to use your production server URL

Example production CORS config:
```javascript
const io = socketIo(server, {
  cors: {
    origin: ["https://yourdomain.com"],
    methods: ["GET", "POST"]
  }
});
```