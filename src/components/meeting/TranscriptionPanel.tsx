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
    <div className="fixed right-4 top-20 bottom-4 w-80 z-40 bg-muted text-muted-foreground rounded-xl shadow-lg border border-border overflow-hidden flex flex-col">
      <CardHeader className="bg-muted px-4 py-3 border-b border-border flex justify-between items-center">
        <CardTitle className="text-base">Live Transcription</CardTitle>
        <button onClick={onClose} className="text-xs underline">Close</button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {transcripts.length === 0 ? (
          <div className="text-sm text-center text-muted-foreground">Waiting for transcription...</div>
        ) : (
          transcripts.map((t, i) => (
            <div key={i} className="text-sm">
              <span className="font-semibold text-primary">{t.sender}</span>: {t.text}
            </div>
          ))
        )}
      </CardContent>
    </div>
  );
}
