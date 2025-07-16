import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Mic, MicOff, Video, VideoOff } from "lucide-react";

interface Participant {
  id: string;
  name: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isLocal?: boolean;
}

interface ParticipantsListProps {
  participants: Participant[];
  onClose: () => void;
}

export default function ParticipantsList({ participants, onClose }: ParticipantsListProps) {
  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-video-controls/95 backdrop-blur-lg border-l border-video-border z-40 animate-fade-in">
      <Card className="h-full rounded-none border-0 bg-transparent text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">
            Participants ({participants.length})
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-video-border"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-2">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center justify-between p-3 rounded-lg bg-video-bg/50 hover:bg-video-bg/70 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm font-medium">
                  {participant.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">
                    {participant.name}
                    {participant.isLocal && " (You)"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-1">
                {participant.isMuted ? (
                  <MicOff className="h-4 w-4 text-destructive" />
                ) : (
                  <Mic className="h-4 w-4 text-success" />
                )}
                
                {participant.isVideoOff ? (
                  <VideoOff className="h-4 w-4 text-destructive" />
                ) : (
                  <Video className="h-4 w-4 text-success" />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}