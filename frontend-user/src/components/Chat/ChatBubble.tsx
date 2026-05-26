import type { Message } from "../../types/chat";

interface Props {
  message: Message;
  isSpeaking: boolean;
  playState: "idle" | "playing" | "paused";
  isActive: boolean;
  onPlay: (messageId: string, content: string) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export default function ChatBubble({
  message,
  isSpeaking,
  playState,
  isActive,
  onPlay,
  onPause,
  onResume,
  onStop,
}: Props) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  return (
    <div className={`chat-bubble ${isUser ? "user" : "assistant"}`}>
      <div className="bubble-content">{message.content}</div>

      {message.sources && message.sources.length > 0 && (
        <div className="bubble-sources">
          参考来源：
          {message.sources.map((s, i) => (
            <span key={i} className="source-tag">{s.document_title}</span>
          ))}
        </div>
      )}

      {isAssistant && (
        <div className="bubble-actions">
          {isActive ? (
            <>
              {playState === "playing" ? (
                <button className="action-btn" onClick={onPause} title="暂停">
                  ⏸
                </button>
              ) : (
                <button className="action-btn" onClick={onResume} title="继续">
                  ▶
                </button>
              )}
              <button className="action-btn" onClick={onStop} title="停止">
                ⏹
              </button>
            </>
          ) : (
            <button
              className="action-btn"
              onClick={() => onPlay(message.id, message.content)}
              disabled={isSpeaking}
              title="播放语音"
            >
              🔊
            </button>
          )}
        </div>
      )}
    </div>
  );
}
