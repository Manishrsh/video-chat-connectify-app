// src/hooks/useRecorder.ts
import { useRef, useState } from "react";

export const useRecorder = ({
  localStream,
  remoteStreams = [],
  meetingId = "connectify",
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const startRecording = () => {
    if (!localStream) return;

    recordedChunksRef.current = [];
    const combinedStream = new MediaStream();

    // Add local stream tracks
    localStream.getTracks().forEach((track) => combinedStream.addTrack(track));

    // Add remote tracks (optional)
    remoteStreams.forEach((stream) => {
      stream.getTracks().forEach((track) =>
        combinedStream.addTrack(track)
      );
    });

    const recorder = new MediaRecorder(combinedStream, {
      mimeType: "video/webm; codecs=vp8,opus",
    });

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, {
        type: "video/webm",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meeting-${meetingId}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return { isRecording, startRecording, stopRecording };
};
