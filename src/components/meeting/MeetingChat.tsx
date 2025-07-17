import { useState, useEffect } from "react";
import io from "socket.io-client";
import { Button } from "@/components/ui/button";

interface Message {
  sender: string;
  text: string;
  timestamp: string;
  recipient?: string;
}

interface Participant {
  id: string;
  name: string;
}

export default function MeetingChat({
  messages,
  setMessages,
  meetingId,
  username,
  onClose,
  participants, // 👈 New
  socketRef, // 👈 socket reference passed from parent
}: {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  meetingId: string;
  username: string;
  onClose: () => void;
  participants: Participant[]; // 👈 Pass from MeetingRoom
  socketRef: React.MutableRefObject<any>; // 👈 socket reference passed from parent
}) {
  const [input, setInput] = useState("");
  const [recipient, setRecipient] = useState<string>("Everyone");

  const sendMessage = () => {
    if (!input.trim()) return;
    console.log(username, input, recipient);
    const message: Message = {
      sender: username,
      text: input,
      timestamp: new Date().toLocaleTimeString(),
      recipient: recipient === "Everyone" ? undefined : recipient,
    };

    // Emit to socket
   socketRef.current.emit("send-message", {
  roomId: meetingId,
  message,
});


    setInput("");
  };

 

  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-video-controls/95 backdrop-blur-lg border-l border-video-border z-50 flex flex-col">
      {/* Header */}
      <div className="p-3 font-bold border-b border-video-border text-white flex justify-between items-center">
        Chat
        <button onClick={onClose} className="hover:text-red-400">✖</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-white">
        {messages.map((m, i) => (
          <div key={i} className="mb-2">
            <p className="font-semibold">
              {m.sender}
              {m.recipient && m.recipient !== "Everyone" ? ` ➝ ${m.recipient}` : ""}
            </p>
            <p>{m.text}</p>
            <p className="text-xs text-gray-400">{m.timestamp}</p>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-3 flex gap-2 border-t border-video-border bg-video-controls/95">
        <select
          className="text-sm px-2 rounded bg-video-bg/80 text-white border border-video-border"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        >
          <option value="Everyone">Everyone</option>
          {participants
            .map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
        </select>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="flex-1 px-3 py-2 rounded bg-video-bg/80 text-white border border-video-border focus:outline-none"
          placeholder={`Message ${recipient}...`}
        />
        <Button onClick={sendMessage}>Send</Button>
      </div>
    </div>
  );
}
