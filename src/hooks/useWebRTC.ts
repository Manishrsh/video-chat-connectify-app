import { useState, useEffect, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';

interface PeerConnection {
  pc: RTCPeerConnection;
  stream?: MediaStream;
  name: string;
  isMuted: boolean;
  isVideoOff: boolean;
}

interface PeerData {
  name: string;
  stream?: MediaStream;
  isMuted: boolean;
  isVideoOff: boolean;
}

// ICE servers for NAT traversal (you may want to use your own TURN servers)
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export default function useWebRTC(meetingId: string, userName: string) {
  const [peers, setPeers] = useState<Record<string, PeerData>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Record<string, PeerConnection>>({});

  // Initialize media devices
  const initializeMedia = useCallback(async (): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Failed to get user media:', error);
      throw error;
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((userId: string, userName: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local stream tracks
    console.log('Creating peer connection for:', userId);
    console.log(localStreamRef.current ? 'Local stream available' : 'No local stream');
    
    
    if (localStreamRef.current) {
      console.log('Adding local stream tracks to peer connection:', userId);
      localStreamRef.current.getTracks().forEach(track => {
        console.log('🎥 Adding track:', track.kind);
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('✅ Received remote stream from:', userId, event.streams);
      const remoteStream = event.streams[0];
      
      setPeers(prev => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          stream: remoteStream
        }
      }));

      // Update peer connection reference
      if (peersRef.current[userId]) {
        peersRef.current[userId].stream = remoteStream;
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          candidate: event.candidate,
          to: userId
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${userId}:`, pc.connectionState);
    };

    return pc;
  }, []);

  // Handle incoming call (offer)
  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit, from: string, fromName: string) => {
    console.log('Handling offer from:', from);
    
    const pc = createPeerConnection(from, fromName);
    peersRef.current[from] = {
      pc,
      name: fromName,
      isMuted: false,
      isVideoOff: false
    };

    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (socketRef.current) {
      socketRef.current.emit('answer', {
        answer,
        to: from
      });
    }

    setPeers(prev => ({
      ...prev,
      [from]: {
        name: fromName,
        isMuted: false,
        isVideoOff: false
      }
    }));
  }, [createPeerConnection]);

  // Handle answer
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit, from: string) => {
    console.log('Handling answer from:', from);
    const peer = peersRef.current[from];
    if (peer) {
      await peer.pc.setRemoteDescription(answer);
    }
  }, []);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidate, from: string) => {
    const peer = peersRef.current[from];
    if (peer) {
      await peer.pc.addIceCandidate(candidate);
    }
  }, []);

  // Make call (create offer)
  const makeCall = useCallback(async (userId: string, userName: string) => {
    if (!localStreamRef.current) {
    console.warn("localStreamRef is null, forcing media init...");
    await initializeMedia(); // failsafe
  }

  const pc = createPeerConnection(userId, userName); // now addTrack works
    peersRef.current[userId] = {
      pc,
      name: userName,
      isMuted: false,
      isVideoOff: false
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (socketRef.current) {
      socketRef.current.emit('offer', {
        offer,
        to: userId
      });
    }

    setPeers(prev => ({
      ...prev,
      [userId]: {
        name: userName,
        isMuted: false,
        isVideoOff: false
      }
    }));
  }, [createPeerConnection]);

  // Toggle microphone
  const toggleMute = useCallback((muted: boolean) => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !muted;
      });

      // Notify other participants
      if (socketRef.current) {
        socketRef.current.emit('media-state', {
          isMuted: muted,
          isVideoOff: !localStreamRef.current.getVideoTracks()[0]?.enabled,
          roomId: meetingId
        });
      }
    }
  }, [meetingId]);

  // Toggle camera
  const toggleVideo = useCallback((videoOff: boolean) => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !videoOff;
      });

      // Notify other participants
      if (socketRef.current) {
        socketRef.current.emit('media-state', {
          isMuted: !localStreamRef.current.getAudioTracks()[0]?.enabled,
          isVideoOff: videoOff,
          roomId: meetingId
        });
      }
    }
  }, [meetingId]);

  // Start screen sharing
  const startScreenShare = useCallback(async (): Promise<void> => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      const videoTrack = screenStream.getVideoTracks()[0];

      // Replace video track in all peer connections
      Object.values(peersRef.current).forEach(({ pc }) => {
        const sender = pc.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      // Replace in local stream
      if (localStreamRef.current) {
        const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldVideoTrack) {
          localStreamRef.current.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();
        }
        localStreamRef.current.addTrack(videoTrack);
        setLocalStream(localStreamRef.current);
      }

      // Handle screen share ending
      videoTrack.onended = () => {
        stopScreenShare();
      };
    } catch (error) {
      console.error('Failed to start screen share:', error);
      throw error;
    }
  }, []);

  // Stop screen sharing
  const stopScreenShare = useCallback(async () => {
    try {
      // Get camera back
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      const videoTrack = cameraStream.getVideoTracks()[0];

      // Replace video track in all peer connections
      Object.values(peersRef.current).forEach(({ pc }) => {
        const sender = pc.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      // Replace in local stream
      if (localStreamRef.current) {
        const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldVideoTrack) {
          localStreamRef.current.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();
        }
        localStreamRef.current.addTrack(videoTrack);
        setLocalStream(localStreamRef.current);
      }
    } catch (error) {
      console.error('Failed to stop screen share:', error);
    }
  }, []);

  // Leave meeting
  const leaveMeeting = useCallback(() => {
    // Close all peer connections
    Object.values(peersRef.current).forEach(({ pc }) => {
      pc.close();
    });

    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Leave room
    if (socketRef.current) {
      socketRef.current.emit('leave-room', { roomId: meetingId });
      socketRef.current.disconnect();
    }

    // Clear state
    setPeers({});
    setLocalStream(null);
    setIsConnected(false);
    localStreamRef.current = null;
    peersRef.current = {};
  }, [meetingId]);

  // Initialize socket connection
  useEffect(() => {
    if (meetingId && userName) {
      // Replace with your actual signaling server URL
      // For local development: 'http://localhost:3001'
      // For production: 'https://your-signaling-server.com'
      const SIGNALING_SERVER = 'https://signal.scaletex.tech';
      
      const socket = io(SIGNALING_SERVER);
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Connected to signaling server');
        setIsConnected(true);
        
        // Join the meeting room
        socket.emit('join-room', { roomId: meetingId, userName });
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from signaling server');
        setIsConnected(false);
      });

      // Handle existing users
      socket.on('existing-users', async (users) => {
  // ✅ Ensure local media is ready
  if (!localStreamRef.current) {
    console.warn("Waiting for media to be ready before making calls...");
    await initializeMedia();
  }

  users.forEach(({ userId, userName }) => {
    makeCall(userId, userName); // will now addTrack correctly
  });
});


      // Handle new user joined
      socket.on('user-joined', ({ userId, userName }: { userId: string; userName: string }) => {
        console.log('User joined:', userId, userName);
        // The new user will call us, so we just wait for their offer
      });

      // Handle user left
      socket.on('user-left', ({ userId }: { userId: string }) => {
        console.log('User left:', userId);
        const peer = peersRef.current[userId];
        if (peer) {
          peer.pc.close();
          delete peersRef.current[userId];
          setPeers(prev => {
            const newPeers = { ...prev };
            delete newPeers[userId];
            return newPeers;
          });
        }
      });

      // WebRTC signaling handlers
      socket.on('offer', ({ offer, from, userName }: { offer: RTCSessionDescriptionInit; from: string; userName: string }) => {
        handleOffer(offer, from, userName);
      });

      socket.on('answer', ({ answer, from }: { answer: RTCSessionDescriptionInit; from: string }) => {
        handleAnswer(answer, from);
      });

      socket.on('ice-candidate', ({ candidate, from }: { candidate: RTCIceCandidate; from: string }) => {
        handleIceCandidate(candidate, from);
      });

      // Media state updates
      socket.on('user-media-state', ({ userId, isMuted, isVideoOff }: { userId: string; isMuted: boolean; isVideoOff: boolean }) => {
        setPeers(prev => ({
          ...prev,
          [userId]: {
            ...prev[userId],
            isMuted,
            isVideoOff
          }
        }));

        if (peersRef.current[userId]) {
          peersRef.current[userId].isMuted = isMuted;
          peersRef.current[userId].isVideoOff = isVideoOff;
        }
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [meetingId, userName, makeCall, handleOffer, handleAnswer, handleIceCandidate]);

  return {
    peers,
    localStream,
    isConnected,
    initializeMedia,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    leaveMeeting
  };
}
