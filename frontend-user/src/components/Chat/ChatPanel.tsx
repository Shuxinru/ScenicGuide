import { useRef, useEffect } from "react";
import type { Message } from "../../types/chat";
import ChatBubble from "./ChatBubble";
import ChatInput from "./ChatInput";
import QuickQuestions from "./QuickQuestions";
import InterestSelector from "./InterestSelector";

interface Props {
  messages: Message[];
  isThinking: boolean;
  onSend: (text: string) => void;
  interests: string[];
  onInterestsChange: (interests: string[]) => void;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  onMicToggle: () => void;
  voiceSupported: boolean;
  voiceError: string | null;
}

export default function ChatPanel({
  messages,
  isThinking,
  onSend,
  interests,
  onInterestsChange,
  isListening,
  transcript,
  interimTranscript,
  onMicToggle,
  voiceSupported,
  voiceError,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  return (
    <div className="chat-panel">
      {messages.length === 0 && (
        <div className="welcome-section">
          <h2>您好！</h2>
          <p>我是景区AI导览助手，有什么可以帮您的？</p>
          <InterestSelector selected={interests} onChange={onInterestsChange} />
          <QuickQuestions onSelect={onSend} />
        </div>
      )}
      <div className="messages-list">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        {isThinking && (
          <div className="thinking-bubble">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <ChatInput
        onSend={onSend}
        disabled={isThinking}
        isListening={isListening}
        transcript={transcript}
        interimTranscript={interimTranscript}
        onMicToggle={onMicToggle}
        voiceSupported={voiceSupported}
        voiceError={voiceError}
      />
    </div>
  );
}
