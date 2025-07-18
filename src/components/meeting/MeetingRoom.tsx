import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import VideoStream from "./VideoStream";
import MeetingControls from "./MeetingControls";
import ParticipantsList from "./ParticipantsList";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Copy, Users, Video } from "lucide-react";
import useWebRTC from "@/hooks/useWebRTC";
import MeetingChat from "./MeetingChat"; 
import TranscriptionPanel from "./TranscriptionPanel";


interface Participant {
  id: string;
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

export default function MeetingRoom() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const { user } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Local media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
const recordedChunksRef = useRef<Blob[]>([]);
const [isRecording, setIsRecording] = useState(false);
const isChatOpenRef = useRef(false);
const [showChat, setShowChat] = useState(false);
const [showSubtitles, setShowSubtitles] = useState(true);
const [isHandRaised, setIsHandRaised] = useState(false);
const [focusedParticipant, setFocusedParticipant] = useState<Participant | null>(null);



  
  // UI state
  const [showParticipants, setShowParticipants] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  // WebRTC hook
  const { 
  peers, 
  initializeMedia, 
  toggleMute, 
  toggleVideo, 
  startScreenShare, 
  stopScreenShare,
  leaveMeeting,
  hasUnread,
  setHasUnread,
  messages,
  setMessages,
  socketRef,
  transcripts, 
  raisedHands ,
  setRaisedHands
} = useWebRTC(meetingId || '', user?.fullName || 'Anonymous');


  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Initialize media on mount
  useEffect(() => {
    const setupMedia = async () => {
      try {
        const stream = await initializeMedia();
        setLocalStream(stream);
      } catch (error) {
        console.error('Failed to get media:', error);
        toast({
          title: "Media Access Error",
          description: "Failed to access camera/microphone. Please check permissions.",
          variant: "destructive"
        });
      }
    };

    setupMedia();

    return () => {
      // Cleanup on unmount
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleToggleSubtitles = () => {
  setShowSubtitles(prev => !prev);
};

  const handleToggleChat = () => {
  const nextState = !showChat;
  setShowChat(nextState);
  isChatOpenRef.current = nextState;

  if (nextState) {
    setHasUnread(false); // Clear unread
  }
};



const handleToggleHandRaise = () => {
  const newStatus = !isHandRaised;
  setIsHandRaised(newStatus);
  console.log("🙌 User", socketRef.current?.id, newStatus ? "raised their hand" : "lowered their hand");
  
  socketRef.current?.emit("RAISE_HAND", {
    roomId: meetingId,
    userId: socketRef.current.id,
    name: user?.fullName || "Anonymous",
    raised: newStatus,
  });
};


  // Update participants from WebRTC peers
  useEffect(() => {
    
  const participantList: Participant[] = Object.entries(peers)
    .filter(([id]) => id !== 'local') // Adjust this if needed based on your local ID
    .map(([id, peer]) => ({
      id,
      name: peer?.name || 'Participant',
      stream: peer?.stream,
      isMuted: peer?.isMuted || false,
      isVideoOff: peer?.isVideoOff || false
    }));
  console.log(participantList);
  
  setParticipants(participantList);
}, [peers]);


  const handleToggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    toggleMute(newMutedState);
  };

  const handleStartRecording = () => {
  if (!localStream) {
    toast({ title: "No local stream found", variant: "destructive" });
    return;
  }

  const allStreams = new MediaStream();

  // ✅ Add **audio + video** tracks from local stream
  localStream.getAudioTracks().forEach(track => allStreams.addTrack(track));
  localStream.getVideoTracks().forEach(track => allStreams.addTrack(track));

  // ✅ Add **audio + video** tracks from each remote participant
  participants.forEach(p => {
    if (p.stream) {
      p.stream.getAudioTracks().forEach(track => allStreams.addTrack(track));
      p.stream.getVideoTracks().forEach(track => allStreams.addTrack(track));
    }
  });

  recordedChunksRef.current = [];

  try {
    const recorder = new MediaRecorder(allStreams, {
      mimeType: "video/webm;codecs=vp8,opus"
    });

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, {
        type: "video/webm"
      });

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `connectify-recording-${meetingId}.webm`;
      a.click();

      URL.revokeObjectURL(url);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    toast({ title: "Recording started" });
  } catch (error) {
    console.error("Recording failed to start:", error);
    toast({ title: "Failed to start recording", variant: "destructive" });
  }
};


const handleStopRecording = () => {
  mediaRecorderRef.current?.stop();
  setIsRecording(false);
  toast({ title: "Recording stopped" });
};


  const handleToggleVideo = () => {
    const newVideoState = !isVideoOff;
    setIsVideoOff(newVideoState);
    toggleVideo(newVideoState);
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
      setIsScreenSharing(false);
    } else {
      try {
        await startScreenShare();
        setIsScreenSharing(true);
      } catch (error) {
        console.error('Failed to start screen share:', error);
        toast({
          title: "Screen Share Error",
          description: "Failed to start screen sharing.",
          variant: "destructive"
        });
      }
    }
  };

  const handleLeaveMeeting = () => {
    leaveMeeting();
    navigate('/');
  };

  const copyMeetingId = () => {
    navigator.clipboard.writeText(meetingId || '');
    toast({
      title: "Meeting ID Copied",
      description: "Meeting ID has been copied to clipboard.",
    });
  };

  const totalParticipants = participants.length + 1; // +1 for local user

  return (
    <div className="min-h-screen bg-video-bg text-white">
      {/* Meeting Header */}
      <div className="bg-video-controls/80 backdrop-blur-sm border-b border-video-border p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold">Meeting Room</h1>
            <Button
              variant="video"
              size="sm"
              onClick={copyMeetingId}
              className="text-xs"
            >
              <Copy className="h-3 w-3 mr-1" />
              {meetingId?.slice(0, 8)}...
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{totalParticipants}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      
        <div className="p-4 pb-24">
  <div className="container mx-auto">
    {focusedParticipant ? (
      // Full screen single participant
      <div className="flex flex-col items-center">
        <div className="w-full max-w-5xl aspect-video mb-4">
          <VideoStream
            stream={focusedParticipant.stream}
            isMuted={focusedParticipant.isMuted}
            isVideoOff={focusedParticipant.isVideoOff}
            username={focusedParticipant.name}
            showRaisedHand={raisedHands[focusedParticipant.id]}
            className="w-full h-full"
          />
        </div>
        <Button variant="outline" onClick={() => setFocusedParticipant(null)}>
          Exit Fullscreen View
        </Button>
      </div>
    ) : (
      // Grid view
      <div className={`grid gap-4 ${
        participants.length === 1 
          ? 'grid-cols-1 lg:grid-cols-2' 
          : participants.length <= 4
          ? 'grid-cols-1 md:grid-cols-2'
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      }`}>
        {/* Local video */}
        <div onClick={() => setFocusedParticipant({
          id: 'local',
          name: user?.fullName || 'You',
          stream: localStream || undefined,
          isMuted,
          isVideoOff
        })}>
          <VideoStream
            ref={localVideoRef}
            stream={localStream || undefined}
            isLocal={true}
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            username={user?.fullName || 'You'}
            className="aspect-video cursor-pointer hover:ring-2 hover:ring-primary"
          />
        </div>

        {/* Remote videos */}
        {participants.map((participant) => (
          <div key={participant.id} onClick={() => setFocusedParticipant(participant)}>
            <VideoStream
              stream={participant.stream}
              isMuted={participant.isMuted}
              isVideoOff={participant.isVideoOff}
              username={participant.name}
              showRaisedHand={raisedHands[participant.id]}
              className="aspect-video cursor-pointer hover:ring-2 hover:ring-primary"
            />
          </div>
        ))}
      </div>
    )}
  </div>


      </div>

      {/* Meeting Controls */}
     <MeetingControls
  isMuted={isMuted}
  isVideoOff={isVideoOff}
  isScreenSharing={isScreenSharing}
  onToggleMute={handleToggleMute}
  onToggleVideo={handleToggleVideo}
  onToggleScreenShare={handleToggleScreenShare}
  onLeaveMeeting={handleLeaveMeeting}
  onToggleParticipants={() => setShowParticipants(!showParticipants)}
  participantCount={totalParticipants}
  isRecording={isRecording}
  onStartRecording={handleStartRecording}
  onStopRecording={handleStopRecording}
  onToggleChat={handleToggleChat}
  hasUnread={hasUnread}
  // 👇 Add these
  subtitlesVisible={showSubtitles}
  onToggleSubtitles={handleToggleSubtitles}
  onToggleHandRaise={handleToggleHandRaise}
  isHandRaised={isHandRaised}
/>



      {/* Participants Panel */}
      {showParticipants && (
        <ParticipantsList
          participants={[
            {
              id: 'local',
              name: user?.fullName || 'You',
              isMuted,
              isVideoOff,
              isLocal: true
            },
            ...participants
          ]}
          onClose={() => setShowParticipants(false)}
        />
      )}

     {/* Live Subtitles Panel */}
{showSubtitles && (
  <TranscriptionPanel
    transcripts={transcripts}
    onClose={() => setShowSubtitles(false)}
  />

)}



      {showChat && (
  <MeetingChat
    meetingId={meetingId || ''}
    username={user?.fullName || 'You'}
    onClose={() => setShowChat(false)}
    messages={messages}
    setMessages={setMessages}
    participants={[
      { id: 'local', name: user?.fullName || 'You' },
      ...participants.map(p => ({ id: p.id, name: p.name }))

    ]} // 👈 Now passed
    socketRef={socketRef} // 👈 Pass socket reference
  />
)}


    </div>
  );
}