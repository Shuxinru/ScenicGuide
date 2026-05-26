import { useState, useRef, useCallback, useEffect } from "react";

interface UseSpeechSynthesisReturn {
  isSpeaking: boolean;
  speak: (text: string, onBoundary?: (charIndex: number) => void) => void;
  stop: () => void;
  supported: boolean;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const stop = useCallback(() => {
    if (supported) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string, onBoundary?: (charIndex: number) => void) => {
      if (!supported) return;

      window.speechSynthesis.cancel();

      // Clean text: remove markdown, emojis
      const cleanText = text
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/###\s/g, "")
        .replace(/---/g, "")
        .replace(/[😊😄😂🤔😒😢👍🎉🏔️🌊🌸🏯📸🍜]/g, "");

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "zh-CN";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1;

      // Try to select a Chinese voice
      const voices = window.speechSynthesis.getVoices();
      const zhVoice = voices.find(
        (v) => v.lang.startsWith("zh-CN") || v.lang.startsWith("zh-TW") || v.lang.startsWith("zh")
      );
      if (zhVoice) utterance.voice = zhVoice;

      if (onBoundary) {
        utterance.onboundary = (event) => {
          if (event.charIndex !== undefined) {
            onBoundary(event.charIndex);
          }
        };
      }

      utterance.onend = () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
      };

      utteranceRef.current = utterance;
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [supported]
  );

  useEffect(() => {
    return () => {
      if (supported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [supported]);

  return { isSpeaking, speak, stop, supported };
}
