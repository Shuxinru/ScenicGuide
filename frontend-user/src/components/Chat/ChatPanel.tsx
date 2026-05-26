import { useRef, useEffect, useState, useCallback } from "react";
import type { Message } from "../../types/chat";
import ChatBubble from "./ChatBubble";
import ChatInput from "./ChatInput";
import QuickQuestions from "./QuickQuestions";
import InterestSelector from "./InterestSelector";
import FeedbackModal from "./FeedbackModal";
import HistoryDrawer from "./HistoryDrawer";

interface PlaybackControls {
  isSpeaking: boolean;
  playState: "idle" | "playing" | "paused";
  activeMessageId: string | null;
  onPlay: (messageId: string, content: string) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

interface Props {
  messages: Message[];
  isThinking: boolean;
  conversationId: string | null;
  onSend: (text: string) => void;
  onNewChat: () => void;
  onLoadConversation: (convId: string) => void;
  interests: string[];
  onInterestsChange: (interests: string[]) => void;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  onMicToggle: () => void;
  voiceSupported: boolean;
  voiceError: string | null;
  playback: PlaybackControls;
}

export default function ChatPanel({
  messages,
  isThinking,
  conversationId,
  onSend,
  onNewChat,
  onLoadConversation,
  interests,
  onInterestsChange,
  isListening,
  transcript,
  interimTranscript,
  onMicToggle,
  voiceSupported,
  voiceError,
  playback,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [ratedIds, setRatedIds] = useState<Set<string>>(new Set());

  const hasRated = conversationId ? ratedIds.has(conversationId) : false;

  const handleFeedbackDone = useCallback((convId: string) => {
    setRatedIds((prev) => new Set(prev).add(convId));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  return (
    <div className="chat-panel">
      {/* Header Bar */}
      <div className="chat-header">
        <button className="header-btn" onClick={onNewChat} title="新建对话">
          ＋
        </button>
        <span className="header-title">AI 导览助手</span>
        <div className="header-actions">
          <button className="header-btn" onClick={() => setHistoryOpen(true)} title="历史对话">
            ☰
          </button>
          <button
            className={`header-btn feedback-btn ${hasRated ? "rated" : ""}`}
            onClick={() => setFeedbackOpen(true)}
            title={hasRated ? "已评价" : "评价反馈"}
            disabled={hasRated}
          >
            {hasRated ? "★" : "☆"}
          </button>
        </div>
      </div>

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
          <ChatBubble
            key={msg.id}
            message={msg}
            isSpeaking={playback.isSpeaking}
            playState={playback.playState}
            isActive={playback.activeMessageId === msg.id}
            onPlay={playback.onPlay}
            onPause={playback.onPause}
            onResume={playback.onResume}
            onStop={playback.onStop}
          />
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

      <FeedbackModal
        open={feedbackOpen}
        conversationId={conversationId}
        onClose={() => setFeedbackOpen(false)}
        onDone={handleFeedbackDone}
      />

      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelect={onLoadConversation}
      />
    </div>
  );
}
