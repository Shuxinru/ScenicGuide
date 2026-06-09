import { useRef, useEffect, useCallback } from "react";
import Live2DCanvas from "./Live2DCanvas";

interface Props {
  isSpeaking: boolean;
  isThinking: boolean;
  isListening: boolean;
  mouthOpen: number;
  expression: string;
  clothingUrl: string | null;
}

export default function DigitalHumanPanel({
  isSpeaking,
  isThinking,
  isListening,
  mouthOpen,
  expression,
  clothingUrl,
}: Props) {
  let statusText = "";
  if (isListening) statusText = "正在聆听...";
  else if (isThinking) statusText = "思考中...";
  else if (isSpeaking) statusText = "讲解中...";
  else statusText = "您好！有什么可以帮您的？";

  return (
    <div className="digital-human-panel">
      <div className="live2d-container">
        <Live2DCanvas
          isSpeaking={isSpeaking}
          isThinking={isThinking}
          isListening={isListening}
          mouthOpen={mouthOpen}
          expression={expression}
          clothingUrl={clothingUrl}
        />
      </div>
      <div className={`status-indicator ${isSpeaking ? "speaking" : ""} ${isThinking ? "thinking" : ""} ${isListening ? "listening" : ""}`}>
        <span className="status-dot" />
        <span className="status-text">{statusText}</span>
      </div>
    </div>
  );
}
