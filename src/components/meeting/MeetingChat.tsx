import { useState, useEffect } from "react";
import io from "socket.io-client";
import { Button } from "@/components/ui/button";

const socket = io("https://signal.scaletex.tech");

interface Message {
  sender: string;
  text: string;
  timestamp: string;
  recipient?: string; // Optional for private message
}

export default function MeetingChat({
  meetingId,
  username,
  onClose,
}: {
  meetingId: string;
  username: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [users, setUsers] = useState<string[]>([]);
  const [recipient, setRecipient] = useState<string>("Everyone");

  useEffect(() => {
    socket.emit("join-room", {
      roomId: meetingId,
      userName: username,
    });

    socket.on("receive-message", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("update-users", (userList: string[]) => {
      setUsers(userList.filter((u) => u !== username));
    });

    return () => {
      socket.off("receive-message");
      socket.off("update-users");
    };
  }, [meetingId, username]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const message: Message = {
      sender: username,
      text: input,
      timestamp: new Date().toLocaleTimeString(),
      recipient: recipient === "Everyone" ? undefined : recipient,
    };

    socket.emit("send-message", {
      roomId: meetingId,
      message,
    });

    setInput("");
  };

  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-video-controls/95 backdrop-blur-lg border-l border-video-border z-50 flex flex-col">
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
              {m.recipient && m.recipient !== "Everyone"
                ? ` ➝ ${m.recipient}`
                : ""}
            </p>
            <p>{m.text}</p>
            <p className="text-xs text-gray-400">{m.timestamp}</p>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 flex gap-2 border-t border-video-border bg-video-controls/95">
        <select
          className="text-sm px-2 rounded bg-video-bg/80 text-white border border-video-border"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        >
          <option value="Everyone">Everyone</option>
          {users.map((user) => (
            <option key={user} value={user}>{user}</option>
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
