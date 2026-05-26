import { useState, useRef, useCallback, useEffect } from "react";

const VISEME_PATTERNS: Record<string, number> = {
  a: 0.8, ai: 0.8, an: 0.8, ang: 0.8, ao: 0.8,
  e: 0.5, ei: 0.5, en: 0.5, eng: 0.5, er: 0.5,
  i: 0.3, ia: 0.6, ie: 0.4, iu: 0.3, in: 0.3, ing: 0.3,
  o: 0.7, ou: 0.7, ong: 0.7,
  u: 0.2, ua: 0.5, uo: 0.6, ui: 0.3, un: 0.3,
};

const EXPRESSIONS = ["neutral", "happy", "sorry", "serious"] as const;

export function useLive2D() {
  const [mouthOpen, setMouthOpen] = useState(0);
  const [expression, setExpression] = useState<"neutral" | "happy" | "sorry" | "serious">("neutral");
  const mouthIntervalRef = useRef<number | null>(null);

  const setMouthByChar = useCallback((_charIndex: number) => {
    // Simplified: randomly alternate mouth openness for viseme simulation
    const openness = 0.2 + Math.random() * 0.6;
    setMouthOpen(openness);

    if (mouthIntervalRef.current) {
      clearTimeout(mouthIntervalRef.current);
    }
    mouthIntervalRef.current = window.setTimeout(() => {
      setMouthOpen(0);
    }, 120);
  }, []);

  const startSpeaking = useCallback(() => {
    const pulse = () => {
      setMouthOpen((prev) => {
        if (prev > 0.1) return 0.05 + Math.random() * 0.15;
        return 0.4 + Math.random() * 0.5;
      });
      mouthIntervalRef.current = window.setTimeout(pulse, 100 + Math.random() * 150);
    };
    pulse();
  }, []);

  const stopSpeaking = useCallback(() => {
    if (mouthIntervalRef.current) {
      clearTimeout(mouthIntervalRef.current);
      mouthIntervalRef.current = null;
    }
    setMouthOpen(0);
  }, []);

  const setEmotion = useCallback((emotion: "neutral" | "happy" | "sorry" | "serious") => {
    setExpression(emotion);
    setTimeout(() => setExpression("neutral"), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (mouthIntervalRef.current) clearTimeout(mouthIntervalRef.current);
    };
  }, []);

  return { mouthOpen, expression, setMouthByChar, startSpeaking, stopSpeaking, setEmotion };
}
