import { useEffect, useRef, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";

interface VideoStreamProps {
  stream?: MediaStream;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  username?: string;
  className?: string;
  showRaisedHand?: boolean; 
}

const VideoStream = forwardRef<HTMLVideoElement, VideoStreamProps>(
  ({ stream, isLocal = false, isMuted = false, isVideoOff = false, username, className ,showRaisedHand  }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
      const video = videoRef.current;
      if (video && stream) {
        video.srcObject = stream;
        video.play().catch(console.error);
      }
    }, [stream]);

    return (
      <div className={cn(
        "relative rounded-lg  bg-video-bg border border-video-border",
        className
      )}>
        <video
          ref={videoRef}
          className={cn(
            "w-full h-full object-cover",
            isLocal && "scale-x-[-1]", // Mirror local video
            isVideoOff && "hidden"
          )}
          autoPlay
          playsInline
          muted={isLocal} // Always mute local video to prevent feedback
        />
        
        {/* Placeholder when video is off */}
        {isVideoOff && (
          <div className="absolute inset-0 bg-video-bg flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-2">
                <VideoOff className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{username || "User"}</p>
            </div>
          </div>
        )}

        {/* Username overlay */}
        <div className="absolute bottom-2 left-2 bg-video-controls/80 backdrop-blur-sm rounded px-2 py-1 text-xs text-white flex items-center space-x-1">
          <span>{username || (isLocal ? "You" : "Participant")}</span>
          {isMuted ? (
            <MicOff className="h-3 w-3 text-destructive" />
          ) : (
            <Mic className="h-3 w-3 text-success" />
          )}
        </div>

        {/* Local indicator */}
        {isLocal && (
          <div className="absolute top-2 right-2 bg-primary/80 backdrop-blur-sm rounded px-2 py-1 text-xs text-white">
            You
          </div>
        )}
        {/* Raise Hand Badge */}
{showRaisedHand && (
  <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded shadow">
    ✋ Raised Hand
  </div>
)}

      </div>
    );
  }
);

VideoStream.displayName = "VideoStream";

export default VideoStream;
