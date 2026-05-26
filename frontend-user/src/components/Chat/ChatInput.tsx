import { useState, useCallback, useEffect } from "react";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  onMicToggle: () => void;
  voiceSupported: boolean;
  voiceError: string | null;
}

export default function ChatInput({
  onSend,
  disabled,
  isListening,
  transcript,
  interimTranscript,
  onMicToggle,
  voiceSupported,
  voiceError,
}: Props) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"text" | "voice">("text");

  const handleSubmit = useCallback(() => {
    const content = mode === "voice" ? transcript : text;
    if (!content.trim() || disabled) return;
    onSend(content.trim());
    setText("");
  }, [mode, text, transcript, onSend, disabled]);

  // Auto-send when voice transcript is final
  useEffect(() => {
    if (mode === "voice" && transcript && !isListening) {
      onSend(transcript.trim());
    }
  }, [transcript, isListening, mode, onSend]);

  const displayText = mode === "voice"
    ? (interimTranscript || transcript || "正在聆听...")
    : text;

  return (
    <div className="chat-input-bar">
      <div className="input-row">
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
                setMode("text");
                if (isListening) onMicToggle();
              }
            }}
            title={mode === "voice" ? "切换到文字输入" : "切换到语音输入"}
          >
            {mode === "voice" ? "⌨️" : "🎤"}
          </button>
        )}
        <button
          className="send-btn"
          onClick={handleSubmit}
          disabled={disabled || (!text.trim() && !transcript.trim())}
        >
          发送
        </button>
      </div>
      {voiceError && <div className="voice-error">{voiceError}</div>}
    </div>
  );
}
