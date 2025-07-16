import { useState, useEffect, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';

interface PeerData {
  name: string;
  stream?: MediaStream;
  isMuted: boolean;
  isVideoOff: boolean;
}

interface UseWebRTCReturn {
  peers: Record<string, PeerData>;
  localStream: MediaStream | null;
  initializeMedia: () => Promise<MediaStream>;
  toggleMute: (muted: boolean) => void;
  toggleVideo: (videoOff: boolean) => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  leaveMeeting: () => void;
}

// This would normally connect to your Socket.IO signaling server
// For now, we'll create a basic implementation that handles local media
export default function useWebRTC(meetingId: string, userName: string): UseWebRTCReturn {
  const [peers, setPeers] = useState<Record<string, PeerData>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

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

  // Toggle microphone
  const toggleMute = useCallback((muted: boolean) => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !muted;
      });
    }
  }, []);

  // Toggle camera
  const toggleVideo = useCallback((videoOff: boolean) => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !videoOff;
      });
    }
  }, []);

  // Start screen sharing
  const startScreenShare = useCallback(async (): Promise<void> => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      // Replace video track with screen share
      if (localStreamRef.current) {
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = localStreamRef.current.getVideoTracks()[0];
        
        // Stop the original video track
        if (sender) {
          sender.stop();
          localStreamRef.current.removeTrack(sender);
        }
        
        // Add screen share track
        localStreamRef.current.addTrack(videoTrack);
        setLocalStream(localStreamRef.current);

        // Handle screen share ending
        videoTrack.onended = async () => {
          stopScreenShare();
        };
      }
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
        audio: false // Don't replace audio
      });

      if (localStreamRef.current) {
        // Remove screen share track
        const videoTracks = localStreamRef.current.getVideoTracks();
        videoTracks.forEach(track => {
          track.stop();
          localStreamRef.current?.removeTrack(track);
        });

        // Add camera track back
        const cameraTrack = cameraStream.getVideoTracks()[0];
        localStreamRef.current.addTrack(cameraTrack);
        setLocalStream(localStreamRef.current);
      }
    } catch (error) {
      console.error('Failed to stop screen share:', error);
    }
  }, []);

  // Leave meeting
  const leaveMeeting = useCallback(() => {
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Clear state
    setPeers({});
    setLocalStream(null);
    localStreamRef.current = null;
  }, []);

  // Initialize socket connection when meeting starts
  useEffect(() => {
    if (meetingId && userName) {
      // This would connect to your actual Socket.IO server
      // const socket = io('YOUR_SIGNALING_SERVER_URL');
      // socketRef.current = socket;

      // For demo purposes, we'll just log the connection
      console.log(`Attempting to join meeting: ${meetingId} as ${userName}`);
      
      // In a real implementation, you would:
      // 1. Connect to signaling server
      // 2. Join the meeting room
      // 3. Handle peer connection signaling
      // 4. Exchange media streams with other participants
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [meetingId, userName]);

  return {
    peers,
    localStream,
    initializeMedia,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    leaveMeeting
  };
}