import { useState, useCallback, useEffect, useRef } from "react";

interface Props {
  onSend: (text: string) => void;
  onStopGeneration?: () => void;
  disabled?: boolean;
  isThinking?: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  onMicToggle: () => void;
  voiceSupported: boolean;
  voiceError: string | null;
}

export default function ChatInput({
  onSend,
  onStopGeneration,
  disabled,
  isThinking,
  isListening,
  transcript,
  interimTranscript,
  onMicToggle,
  voiceSupported,
  voiceError,
}: Props) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"text" | "voice">("text");
  const wasListeningRef = useRef(false);

  // When voice stops naturally, capture transcript to text input
  useEffect(() => {
    if (wasListeningRef.current && !isListening && transcript && mode === "voice") {
      setText(transcript);
      setMode("text");
    }
    wasListeningRef.current = isListening;
  }, [isListening, transcript, mode]);

  const handleSubmit = useCallback(() => {
    const content = text.trim();
    if (!content || disabled) return;
    onSend(content);
    setText("");
  }, [text, onSend, disabled]);

  const displayText = mode === "voice"
    ? (interimTranscript || transcript || "正在聆听...")
    : text;

  return (
    <div className="chat-input-bar">
      <div className="input-row">
        {isThinking ? (
          <>
            <input
              className="chat-input"
              placeholder="思考中..."
              value=""
              readOnly
              disabled
            />
            <button
              className="send-btn stop-btn"
              onClick={onStopGeneration}
            >
              停止思考
            </button>
          </>
        ) : (
          <>
            <input
              className="chat-input"
              placeholder={mode === "text" ? "输入您的问题..." : "点击麦克风开始说话..."}
              value={mode === "text" ? text : displayText}
              onChange={(e) => mode === "text" && setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              disabled={disabled || mode === "voice"}
              readOnly={mode === "voice"}
            />
            {voiceSupported && (
              <button
                className={`mic-btn ${isListening ? "active" : ""}`}
                onClick={() => {
                  if (mode === "text") {
                    setMode("voice");
                    onMicToggle();
                  } else {
                    // Pause: keep transcript in text
                    if (transcript) setText(transcript);
                    setMode("text");
                    if (isListening) onMicToggle();
                  }
                }}
                title={mode === "voice" ? "暂停语音，保留文字" : "语音输入"}
              >
                {mode === "voice" ? "⏸" : "🎤"}
              </button>
            )}
            <button
              className="send-btn"
              onClick={handleSubmit}
              disabled={disabled || !text.trim()}
            >
              发送
            </button>
          </>
        )}
      </div>
      {voiceError && <div className="voice-error">{voiceError}</div>}
    </div>
  );
}
