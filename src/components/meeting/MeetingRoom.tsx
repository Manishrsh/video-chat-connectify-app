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

interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  isMuted: boolean;
  isVideoOff: boolean;
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
    leaveMeeting 
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

  // Update participants from WebRTC peers
  useEffect(() => {
    const participantList: Participant[] = Object.entries(peers).map(([id, peer]) => ({
      id,
      name: peer?.name || 'Participant',
      stream: peer?.stream,
      isMuted: peer?.isMuted || false,
      isVideoOff: peer?.isVideoOff || false
    }));
    setParticipants(participantList);
  }, [peers]);

  const handleToggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    toggleMute(newMutedState);
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
          {participants.length === 0 ? (
            // Solo view - large local video
            <div className="flex justify-center">
              <div className="w-full max-w-4xl aspect-video">
                <VideoStream
                  ref={localVideoRef}
                  stream={localStream || undefined}
                  isLocal={true}
                  isMuted={isMuted}
                  isVideoOff={isVideoOff}
                  username={user?.fullName || 'You'}
                  className="w-full h-full"
                />
              </div>
            </div>
          ) : (
            // Grid view for multiple participants
            <div className={`grid gap-4 ${
              participants.length === 1 
                ? 'grid-cols-1 lg:grid-cols-2' 
                : participants.length <= 4
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}>
              {/* Local video */}
              <VideoStream
                ref={localVideoRef}
                stream={localStream || undefined}
                isLocal={true}
                isMuted={isMuted}
                isVideoOff={isVideoOff}
                username={user?.fullName || 'You'}
                className="aspect-video"
              />
              
              {/* Remote participants */}
              {participants.map((participant) => (
                <VideoStream
                  key={participant.id}
                  stream={participant.stream}
                  isMuted={participant.isMuted}
                  isVideoOff={participant.isVideoOff}
                  username={participant.name}
                  className="aspect-video"
                />
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
    </div>
  );
}