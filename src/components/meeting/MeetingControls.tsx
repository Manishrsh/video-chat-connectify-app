import { Button } from "@/components/ui/button";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  ScreenShare,
  MessageSquare,
  Users,
  Monitor,
  Subtitles 
} from "lucide-react"; // Subtitles icon
import { cn } from "@/lib/utils";

type MeetingControlsProps = {
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeaveMeeting: () => void;
  onToggleParticipants: () => void;
  participantCount: number;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onToggleChat: () => void;
  hasUnread: boolean;

  // 👇 New props
  onToggleSubtitles: () => void;
  subtitlesVisible: boolean;
};

export default function MeetingControls({
  isMuted,
  isVideoOff,
  isScreenSharing,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onLeaveMeeting,
  onToggleParticipants,
  isRecording,
  onStartRecording,
  onStopRecording,
  onToggleChat,
  hasUnread,
  onToggleSubtitles,
  subtitlesVisible,
  participantCount = 1,
}: MeetingControlsProps) {
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-screen-md px-2">
      <div className="bg-video-controls/90 backdrop-blur-lg border border-video-border rounded-2xl px-4 py-3 shadow-large">
        <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-4">

          {/* Mic */}
          <Button
            variant={isMuted ? "video-danger" : "video-active"}
            size="icon-lg"
            onClick={onToggleMute}
            className="rounded-full relative"
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>

          {/* Camera */}
          <Button
            variant={isVideoOff ? "video-danger" : "video-active"}
            size="icon-lg"
            onClick={onToggleVideo}
            className="rounded-full"
          >
            {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
          </Button>

          {/* Screen Share */}
          <Button
            variant={isScreenSharing ? "video-active" : "video"}
            size="icon-lg"
            onClick={onToggleScreenShare}
            className="rounded-full"
          >
            {isScreenSharing ? <Monitor className="h-6 w-6" /> : <ScreenShare className="h-6 w-6" />}
          </Button>

          {/* Chat */}
          <Button
            variant="video"
            size="icon-lg"
            onClick={onToggleChat}
            className="rounded-full relative"
          >
            <MessageSquare className="h-6 w-6" />
            {hasUnread && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
            )}
          </Button>

          {/* Participants */}
          <Button
            variant="video"
            size="icon-lg"
            onClick={onToggleParticipants}
            className="rounded-full relative"
          >
            <Users className="h-6 w-6" />
            {participantCount > 1 && (
              <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {participantCount > 9 ? "9+" : participantCount}
              </span>
            )}
          </Button>

          {/* 👇 Subtitles Toggle */}
          <Button
            variant={subtitlesVisible ? "video-active" : "video"}
            size="icon-lg"
            onClick={onToggleSubtitles}
            className="rounded-full"
          >
            <Subtitles  className="h-6 w-6" />
          </Button>

          {/* Recording */}
          <Button
            variant="video"
            size="sm"
            onClick={isRecording ? onStopRecording : onStartRecording}
            className="min-w-[120px] text-sm"
          >
            {isRecording ? "Stop Recording" : "Start Recording"}
          </Button>

          {/* Leave Meeting */}
          <Button
            variant="video-danger"
            size="icon-lg"
            onClick={onLeaveMeeting}
            className="rounded-full"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>

        </div>
      </div>
    </div>
  );
}
