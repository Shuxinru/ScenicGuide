import { useState, useRef, useCallback, useEffect } from "react";

type PlayState = "idle" | "playing" | "paused";

interface UseSpeechSynthesisReturn {
  isSpeaking: boolean;
  playState: PlayState;
  activeMessageId: string | null;
  speak: (text: string, messageId: string, onBoundary?: (charIndex: number) => void, preferredVoice?: string, rate?: number, pitch?: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  supported: boolean;
}

const FEMALE_KEYWORDS = [
  "huihui", "yaoyao", "tingting", "sinji", "meijia",
  "female", "女", "xia", "han", "chen", "rui", "mo", "xuan",
];

function getChineseFemaleVoices(): SpeechSynthesisVoice[] {
  const all = window.speechSynthesis.getVoices();
  const zhVoices = all.filter(
    (v) => v.lang.startsWith("zh-CN") || v.lang.startsWith("zh-TW") || v.lang.startsWith("zh")
  );
  // Separate into female and non-female
  const female = zhVoices.filter((v) =>
    FEMALE_KEYWORDS.some((kw) => v.name.toLowerCase().includes(kw))
  );
  // If we found female voices, return them; otherwise return all zh voices
  return female.length > 0 ? female : zhVoices;
}

function selectVoice(preferredVoice: string | undefined, femaleVoices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (femaleVoices.length === 0) return null;

  // Parse slot index from profile name like "voice-0", "voice-1", "voice-2"
  let slotIndex = 0;
  if (preferredVoice) {
    const match = preferredVoice.match(/voice-(\d+)/);
    if (match) {
      slotIndex = parseInt(match[1], 10);
    }
  }

  // Wrap around if more slots than available voices
  const index = slotIndex % femaleVoices.length;
  return femaleVoices[index];
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [playState, setPlayState] = useState<PlayState>("idle");
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  // Cache available Chinese female voices
  const femaleVoicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!supported) return;
    const loadVoices = () => {
      femaleVoicesRef.current = getChineseFemaleVoices();
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [supported]);

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
    (text: string, messageId: string, onBoundary?: (charIndex: number) => void, preferredVoice?: string, rate?: number, pitch?: number) => {
      if (!supported) return;

      // Cancel any current speech
      window.speechSynthesis.cancel();

      // Clean text: remove markdown, parentheses content, emojis
      const cleanText = text
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/###\s/g, "")
        .replace(/---/g, "")
        .replace(/[（(][^）)]*[）)]/g, "")
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2300}-\u{23FF}\u{2B50}\u{2764}\u{200D}\u{1F000}-\u{1F02F}]/gu, "");

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "zh-CN";
      utterance.rate = rate ?? 1.0;
      utterance.pitch = pitch ?? 1.0;
      utterance.volume = 1;

      // Select a distinct voice based on the profile slot
      const voice = selectVoice(preferredVoice, femaleVoicesRef.current);
      if (voice) utterance.voice = voice;

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
