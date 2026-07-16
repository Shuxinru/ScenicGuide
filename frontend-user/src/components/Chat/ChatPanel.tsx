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
  onStopGeneration: () => void;
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
  activeRouteId: string | null;
  onMapRouteSelect: (routeId: string) => void;
  onSpotNameClick?: (spotId: string) => void;
}

export default function ChatPanel({
  messages,
  isThinking,
  conversationId,
  onSend,
  onStopGeneration,
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
  activeRouteId,
  onMapRouteSelect,
  onSpotNameClick,
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
        <span className="header-title">景区导览AI数字人</span>
        <div className="header-actions">
          <button className="header-btn" onClick={() => setHistoryOpen(true)} title="历史对话">
            ☰
          </button>
          <button
            className={`header-btn feedback-btn ${hasRated ? "rated" : ""}`}
            onClick={() => setFeedbackOpen(true)}
            title={hasRated ? "查看/修改评价" : "评价反馈"}
          >
            {hasRated ? "★" : "☆"}
          </button>
        </div>
      </div>

      <div className={`messages-list ${messages.length === 0 ? "messages-empty" : ""}`}>
        {messages.length === 0 ? (
          <div className="welcome-section">
            <h2>您好！</h2>
            <p>我是景区导览AI数字人，有什么可以帮您的？</p>
            <InterestSelector selected={interests} onChange={onInterestsChange} />
            <QuickQuestions onSelect={onSend} />
          </div>
        ) : (
          messages.map((msg) => (
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
              onSpotNameClick={onSpotNameClick}
            />
          ))
        )}
        {isThinking && (
          <div className="thinking-bubble">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Interest bar — always visible for personalized recommendations */}
      <div className="interest-bar">
        <InterestSelector selected={interests} onChange={onInterestsChange} />
      </div>

      {/* Quick action buttons */}
      <div className="quick-actions">
        <button className="quick-action-btn" onClick={() => onSend("👍 太棒了！")} title="点赞">
          👍 <span className="quick-action-label">赞</span>
        </button>
        <button className="quick-action-btn" onClick={() => onSend("😊")} title="开心">
          😊 <span className="quick-action-label">开心</span>
        </button>
        <button className="quick-action-btn" onClick={() => onSend("🙏 谢谢！")} title="感谢">
          🙏 <span className="quick-action-label">感谢</span>
        </button>
        <button className="quick-action-btn" onClick={() => onSend("👏👏👏")} title="鼓掌">
          👏 <span className="quick-action-label">鼓掌</span>
        </button>
        <button className="quick-action-btn" onClick={() => onSend("😲 真的吗？")} title="惊讶">
          😲 <span className="quick-action-label">惊讶</span>
        </button>
      </div>

      <ChatInput
        onSend={onSend}
        onStopGeneration={onStopGeneration}
        isThinking={isThinking}
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
