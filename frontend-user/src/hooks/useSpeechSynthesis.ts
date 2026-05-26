import { useState, useRef, useCallback, useEffect } from "react";

type PlayState = "idle" | "playing" | "paused";

interface UseSpeechSynthesisReturn {
  isSpeaking: boolean;
  playState: PlayState;
  activeMessageId: string | null;
  speak: (text: string, messageId: string, onBoundary?: (charIndex: number) => void) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  supported: boolean;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [playState, setPlayState] = useState<PlayState>("idle");
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const stop = useCallback(() => {
    if (supported) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setPlayState("idle");
    setActiveMessageId(null);
    utteranceRef.current = null;
  }, [supported]);

  const speak = useCallback(
    (text: string, messageId: string, onBoundary?: (charIndex: number) => void) => {
      if (!supported) return;

      // Cancel any current speech
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
        setPlayState("idle");
        setActiveMessageId(null);
        utteranceRef.current = null;
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setPlayState("idle");
        setActiveMessageId(null);
        utteranceRef.current = null;
      };

      utteranceRef.current = utterance;
      setIsSpeaking(true);
      setPlayState("playing");
      setActiveMessageId(messageId);
      window.speechSynthesis.speak(utterance);
    },
    [supported]
  );

  const pause = useCallback(() => {
    if (supported && playState === "playing") {
      window.speechSynthesis.pause();
      setPlayState("paused");
    }
  }, [supported, playState]);

  const resume = useCallback(() => {
    if (supported && playState === "paused") {
      window.speechSynthesis.resume();
      setPlayState("playing");
    }
  }, [supported, playState]);

  useEffect(() => {
    return () => {
      if (supported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [supported]);

  return { isSpeaking, playState, activeMessageId, speak, pause, resume, stop, supported };
}
