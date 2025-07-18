// components/TranscriptionPanel.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Transcript = {
  sender: string;
  text: string;
};

interface TranscriptionPanelProps {
  transcripts: Transcript[];
  onClose: () => void;
}

export default function TranscriptionPanel({ transcripts, onClose }: TranscriptionPanelProps) {
  return (
   <div className="fixed top-0 right-0 h-full w-80 bg-video-controls/95 backdrop-blur-lg border-l border-video-border z-50 flex flex-col">
  {/* Header */}
  <div className="p-3 font-bold border-b border-video-border text-white flex justify-between items-center">
    Live Transcription
    <button onClick={onClose} className="hover:text-red-400">✖</button>
  </div>

  {/* Transcription Messages */}
  <div className="flex-1 overflow-y-auto p-3 space-y-2 text-white">
    {transcripts.length === 0 ? (
      <div className="text-sm text-center text-gray-400">Waiting for transcription...</div>
    ) : (
      transcripts.map((t, i) => (
        <div key={i} className="mb-2">
          <p className="font-semibold">{t.sender}</p>
          <p>{t.text}</p>
        </div>
      ))
    )}
  </div>
</div>

  );
}
