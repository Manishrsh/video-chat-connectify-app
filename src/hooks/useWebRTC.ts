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


interface Message {
  sender: string;
  text: string;
  timestamp: string;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export default function useWebRTC(meetingId: string, userName: string) {
  const [peers, setPeers] = useState<Record<string, PeerData>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [localUserId, setLocalUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasUnread, setHasUnread] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Record<string, PeerConnection>>({});
  const isChatOpenRef = useRef(false); // ✅ track chat panel state
  const [transcripts, setTranscripts] = useState<{ sender: string; text: string }[]>([]);


  // === Media Initialization ===
  const initializeMedia = useCallback(async (): Promise<MediaStream> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const createPeerConnection = useCallback((userId: string, userName: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
    }

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setPeers(prev => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          stream: remoteStream
        }
      }));
      if (peersRef.current[userId]) {
        peersRef.current[userId].stream = remoteStream;
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', { candidate: event.candidate, to: userId });
      }
    };

    return pc;
  }, []);

  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit, from: string, fromName: string) => {
    const pc = createPeerConnection(from, fromName);
    peersRef.current[from] = { pc, name: fromName, isMuted: false, isVideoOff: false };

    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socketRef.current?.emit('answer', { answer, to: from });

    setPeers(prev => ({
      ...prev,
      [from]: {
        name: fromName,
        isMuted: false,
        isVideoOff: false
      }
    }));
  }, [createPeerConnection]);

  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit, from: string) => {
    const peer = peersRef.current[from];
    if (peer) await peer.pc.setRemoteDescription(answer);
  }, []);

  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidate, from: string) => {
    const peer = peersRef.current[from];
    if (peer) await peer.pc.addIceCandidate(candidate);
  }, []);

  const makeCall = useCallback(async (userId: string, userName: string) => {
    if (!localStreamRef.current) await initializeMedia();
    const pc = createPeerConnection(userId, userName);
    peersRef.current[userId] = { pc, name: userName, isMuted: false, isVideoOff: false };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current?.emit('offer', { offer, to: userId });

    setPeers(prev => ({
      ...prev,
      [userId]: {
        name: userName,
        isMuted: false,
        isVideoOff: false
      }
    }));
  }, [createPeerConnection, initializeMedia]);

  const toggleMute = useCallback((muted: boolean) => {
    localStreamRef.current?.getAudioTracks().forEach(track => track.enabled = !muted);
    socketRef.current?.emit('media-state', {
      isMuted: muted,
      isVideoOff: !localStreamRef.current?.getVideoTracks()[0]?.enabled,
      roomId: meetingId,
    });
  }, [meetingId]);

  const toggleVideo = useCallback((videoOff: boolean) => {
    localStreamRef.current?.getVideoTracks().forEach(track => track.enabled = !videoOff);
    socketRef.current?.emit('media-state', {
      isMuted: !localStreamRef.current?.getAudioTracks()[0]?.enabled,
      isVideoOff: videoOff,
      roomId: meetingId,
    });
  }, [meetingId]);

  const startScreenShare = useCallback(async () => {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    const videoTrack = screenStream.getVideoTracks()[0];

    Object.values(peersRef.current).forEach(({ pc }) => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) sender.replaceTrack(videoTrack);
    });

    if (localStreamRef.current) {
      const oldTrack = localStreamRef.current.getVideoTracks()[0];
      oldTrack?.stop();
      localStreamRef.current.removeTrack(oldTrack!);
      localStreamRef.current.addTrack(videoTrack);
      setLocalStream(localStreamRef.current);
    }

    videoTrack.onended = () => stopScreenShare();
  }, []);

  useEffect(() => {
  if (!localStream) return;

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("SpeechRecognition not supported in this browser.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  let isRecognizing = false;
  let restartTimeout: NodeJS.Timeout;

  const startRecognition = () => {
    if (!isRecognizing) {
      try {
        recognition.start();
        isRecognizing = true;
        console.log("🎙️ Speech recognition started");
      } catch (e) {
        console.warn("Recognition start failed:", e);
      }
    }
  };

  const stopRecognition = () => {
    if (isRecognizing) {
      recognition.stop();
      isRecognizing = false;
      console.log("🛑 Speech recognition stopped");
    }
  };

  recognition.onstart = () => {
    isRecognizing = true;
  };

  recognition.onend = () => {
    isRecognizing = false;
    console.log("🔁 Recognition ended. Restarting...");
    clearTimeout(restartTimeout);
    restartTimeout = setTimeout(startRecognition, 1000);
  };

  recognition.onaudiostart = () => console.log("🎧 Audio started");
  recognition.onsoundstart = () => console.log("🔊 Sound detected");
  recognition.onsoundend = () => console.log("🔇 Sound ended");
  recognition.onaudioend = () => console.log("📴 Audio ended");

  recognition.onresult = (event: any) => {
    const transcript = event.results[event.resultIndex][0].transcript.trim();
    console.log("📡 Speaking:", transcript);
    socketRef.current?.emit("newTranscript", {
      name: userName,
      text: transcript,
      roomId: meetingId,
    });
  };

  recognition.onerror = (event) => {
    console.error("❌ Speech recognition error:", event.error);
    isRecognizing = false;
    if (event.error === "no-speech" || event.error === "aborted") {
      clearTimeout(restartTimeout);
      restartTimeout = setTimeout(startRecognition, 1000);
    }
  };

  // Start once initially
  startRecognition();

  return () => {
    stopRecognition();
    clearTimeout(restartTimeout);
  };
}, [localStream]);



  const stopScreenShare = useCallback(async () => {
    const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    const cameraTrack = cameraStream.getVideoTracks()[0];

    Object.values(peersRef.current).forEach(({ pc }) => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) sender.replaceTrack(cameraTrack);
    });

    if (localStreamRef.current) {
      const oldTrack = localStreamRef.current.getVideoTracks()[0];
      oldTrack?.stop();
      localStreamRef.current.removeTrack(oldTrack!);
      localStreamRef.current.addTrack(cameraTrack);
      setLocalStream(localStreamRef.current);
    }
  }, []);

  const leaveMeeting = useCallback(() => {
    Object.values(peersRef.current).forEach(({ pc }) => pc.close());
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    socketRef.current?.emit('leave-room', { roomId: meetingId });
    socketRef.current?.disconnect();

    setPeers({});
    setLocalStream(null);
    setIsConnected(false);
    localStreamRef.current = null;
    peersRef.current = {};
  }, [meetingId]);

  // === WebSocket Setup ===
  useEffect(() => {
    if (!meetingId || !userName) return;

    const SIGNALING_SERVER = 'https://signal.scaletex.tech';
    const socket = io(SIGNALING_SERVER);
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setLocalUserId(socket.id);
      console.log('Connected to signaling server as:', userName);
      console.log("useWeb message:", socket.id);
      socket.emit('join-room', { roomId: meetingId, userName });
    });

    socket.on('disconnect', () => setIsConnected(false));

    socket.on('existing-users', async (users) => {
      if (!localStreamRef.current) await initializeMedia();
      users.forEach(({ userId, userName }: { userId: string; userName: string }) => {
        if (userId !== socket.id) makeCall(userId, userName);
      });
    });

    socket.on('user-joined', ({ userId, userName }: { userId: string; userName: string }) => {
      console.log('User joined:', userId, userName);
    });

    // ✅ NEW MESSAGE LOGIC
   socket.on("receive-message", (msg: Message) => {
  if (!isChatOpenRef.current) {
    setHasUnread(true); // show red dot
  }
  console.log("new mannsage usewebrtc" , msg);
  
  setMessages((prev) => [...prev, msg]); // store message in state
});


    socket.on('user-left', ({ userId }: { userId: string }) => {
      const peer = peersRef.current[userId];
      if (peer) {
        peer.pc.close();
        delete peersRef.current[userId];
        setPeers(prev => {
          const copy = { ...prev };
          delete copy[userId];
          return copy;
        });
      }
    });

    socket.on('offer', ({ offer, from, userName }) => handleOffer(offer, from, userName));
    socket.on('answer', ({ answer, from }) => handleAnswer(answer, from));
    socket.on('ice-candidate', ({ candidate, from }) => handleIceCandidate(candidate, from));

    socket.on('user-media-state', ({ userId, isMuted, isVideoOff }) => {
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

    socket.on("newTranscript", ({ sender, text }) => {
  console.log("Received new transcript:", sender, text);
  setTranscripts((prev) => [...prev, { sender, text }]);
});


    return () => {
      socket.disconnect();
    };
  }, [meetingId, userName, makeCall, handleOffer, handleAnswer, handleIceCandidate, initializeMedia]);

  return {
    peers,
    localStream,
    isConnected,
    initializeMedia,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    leaveMeeting,
    messages,
    setMessages,
    hasUnread,
    setHasUnread,
    isChatOpenRef, 
    socketRef,// ✅ expose to let UI toggle and reset unread
    transcripts
  };
}
