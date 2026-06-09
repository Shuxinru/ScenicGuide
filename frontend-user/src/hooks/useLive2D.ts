import { useState, useRef, useCallback, useEffect } from "react";

// Map Chinese finals to approximate mouth openness for viseme simulation
const FINAL_MOUTH_MAP: Record<string, number> = {
  a: 0.85, ai: 0.8, an: 0.8, ang: 0.85, ao: 0.9,
  e: 0.5, ei: 0.5, en: 0.5, eng: 0.55, er: 0.45,
  i: 0.25, ia: 0.75, ie: 0.55, iu: 0.35, in: 0.3, ing: 0.3,
  o: 0.7, ou: 0.65, ong: 0.75,
  u: 0.2, ua: 0.75, uo: 0.7, ui: 0.3, un: 0.25, ue: 0.5,
};

function guessMouthFromChar(ch: string): number {
  // Try to match common finals by looking at the end of pinyin
  // This is approximate since we don't have actual pinyin
  const code = ch.charCodeAt(0);
  // For CJK characters, use a moderate default with variation
  if (code >= 0x4e00 && code <= 0x9fff) {
    // Use character code to deterministically vary mouth shape
    return 0.35 + (code % 7) * 0.09;
  }
  // Punctuation pauses
  if ("，。！？、；：".includes(ch)) return 0.15;
  return 0.4;
}

export function useLive2D() {
  const [mouthOpen, setMouthOpen] = useState(0);
  const [expression, setExpression] = useState<"neutral" | "happy" | "sorry" | "serious">("neutral");
  const targetRef = useRef(0);
  const animRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const decayRef = useRef(0);
  const emotionTimerRef = useRef<number | null>(null);

  const animate = useCallback(() => {
    // Decay target toward 0
    targetRef.current *= 0.88;

    setMouthOpen((prev) => {
      const target = targetRef.current;
      // Smooth lerp toward target
      const next = prev + (target - prev) * 0.35;
      // Snap to 0 when very small
      if (target < 0.01 && Math.abs(next) < 0.01) {
        if (!activeRef.current) {
          animRef.current = null;
          return 0;
        }
        return 0;
      }
      return Math.max(0, Math.min(1, next));
    });

    if (activeRef.current || targetRef.current > 0.005) {
      animRef.current = requestAnimationFrame(animate);
    } else {
      animRef.current = null;
      setMouthOpen(0);
    }
  }, []);

  const setMouthByChar = useCallback(
    (charIndex: number, text?: string) => {
      // Try to get the actual character for better mouth mapping
      let openness = 0.55;
      if (text && charIndex < text.length) {
        openness = guessMouthFromChar(text[charIndex]);
      } else {
        openness = 0.4 + Math.random() * 0.5;
      }
      targetRef.current = Math.max(targetRef.current, openness);

      if (!animRef.current) {
        animRef.current = requestAnimationFrame(animate);
      }
    },
    [animate]
  );

  const startSpeaking = useCallback(() => {
    activeRef.current = true;
    if (!animRef.current) {
      animRef.current = requestAnimationFrame(animate);
    }
  }, [animate]);

  const stopSpeaking = useCallback(() => {
    activeRef.current = false;
  }, []);

  const setEmotion = useCallback(
    (emotion: "neutral" | "happy" | "sorry" | "serious") => {
      setExpression(emotion);
      if (emotionTimerRef.current) clearTimeout(emotionTimerRef.current);
      emotionTimerRef.current = window.setTimeout(() => setExpression("neutral"), 4000);
    },
    []
  );

  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (emotionTimerRef.current) clearTimeout(emotionTimerRef.current);
    };
  }, []);

  return { mouthOpen, expression, setMouthByChar, startSpeaking, stopSpeaking, setEmotion };
}
