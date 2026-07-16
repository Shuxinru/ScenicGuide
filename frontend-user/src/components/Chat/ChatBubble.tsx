import { useMemo } from "react";
import type { Message } from "../../types/chat";
import lingshanSpots from "../../data/lingshanSpots";

interface Props {
  message: Message;
  isSpeaking: boolean;
  playState: "idle" | "playing" | "paused";
  isActive: boolean;
  onPlay: (messageId: string, content: string) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSpotNameClick?: (spotId: string) => void;
}

// Build a regex that matches any spot name (sorted by length desc to match longest first)
const spotNames = lingshanSpots
  .map((s) => s.name)
  .sort((a, b) => b.length - a.length);
const SPOT_NAME_REGEX = new RegExp(
  `(${spotNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
  "g"
);

function renderContent(content: string, onSpotClick?: (spotId: string) => void) {
  if (!onSpotClick) return content;

  const parts = content.split(SPOT_NAME_REGEX);
  return parts.map((part, i) => {
    const spot = lingshanSpots.find((s) => s.name === part);
    if (spot) {
      return (
        <span
          key={i}
          className="spot-name-link"
          onClick={() => onSpotClick(spot.id)}
          title={`在地图上查看 ${spot.name}`}
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
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
  onSpotNameClick,
}: Props) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  const renderedContent = useMemo(
    () => renderContent(message.content, onSpotNameClick),
    [message.content, onSpotNameClick]
  );

  return (
    <div className={`chat-bubble ${isUser ? "user" : "assistant"}`}>
      <div className="bubble-content">{renderedContent}</div>

      {message.sources && message.sources.length > 0 && (() => {
        const seen = new Set<string>();
        const unique = message.sources.filter((s) => {
          if (seen.has(s.document_title)) return false;
          seen.add(s.document_title);
          return true;
        });
        return (
          <div className="bubble-sources">
            参考来源：
            {unique.map((s, i) => (
              <span key={i} className="source-tag">{s.document_title}</span>
            ))}
          </div>
        );
      })()}

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
