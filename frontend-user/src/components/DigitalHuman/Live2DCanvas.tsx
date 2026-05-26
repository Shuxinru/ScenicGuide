import { useEffect, useRef, useCallback } from "react";

interface Props {
  isSpeaking: boolean;
  isThinking: boolean;
  isListening: boolean;
  mouthOpen: number;
  expression: string;
}

export default function Live2DCanvas({
  isSpeaking,
  isThinking,
  isListening,
  mouthOpen,
  expression,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawAvatar = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const headY = h * 0.35;

    // Glow effect
    const glowGrad = ctx.createRadialGradient(cx, headY, 30, cx, headY, 150);
    glowGrad.addColorStop(0, "rgba(74, 144, 217, 0.25)");
    glowGrad.addColorStop(1, "rgba(74, 144, 217, 0)");
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, headY, 150, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = "#4A90D9";
    ctx.beginPath();
    ctx.ellipse(cx, headY + 150, 80, 110, 0, 0, Math.PI * 2);
    ctx.fill();

    // Neck shadow
    ctx.fillStyle = "#3a7bc8";
    ctx.beginPath();
    ctx.ellipse(cx, headY + 45, 30, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    const headBob = isSpeaking ? Math.sin(Date.now() / 150) * 2 : 0;
    const actualHeadY = headY + headBob;

    ctx.fillStyle = "#FFD93D";
    ctx.beginPath();
    ctx.arc(cx, actualHeadY, 60, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(cx, actualHeadY - 10, 62, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - 62, actualHeadY - 20, 124, 30);

    // Eyes
    const eyeY = actualHeadY - 5;
    const eyeSize = isThinking ? 8 : 6;

    // Left eye
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(cx - 20, eyeY, 10, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(cx - 20 + (isThinking ? 2 : 0), eyeY + (isThinking ? -2 : 0), eyeSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx - 18, eyeY - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Right eye
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(cx + 20, eyeY, 10, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(cx + 20 + (isThinking ? 2 : 0), eyeY + (isThinking ? -2 : 0), eyeSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx + 22, eyeY - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Blush
    ctx.fillStyle = "rgba(255, 150, 150, 0.3)";
    ctx.beginPath();
    ctx.ellipse(cx - 35, eyeY + 15, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 35, eyeY + 15, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrows (expression based)
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2.5;
    const browY = eyeY - 18;
    ctx.beginPath();
    if (expression === "happy") {
      ctx.arc(cx - 20, browY + 3, 12, Math.PI + 0.3, Math.PI * 2 - 0.3);
      ctx.moveTo(cx + 8, browY - 3);
      ctx.arc(cx + 20, browY + 3, 12, Math.PI + 0.3, Math.PI * 2 - 0.3);
    } else if (expression === "sorry") {
      ctx.arc(cx - 20, browY - 3, 12, Math.PI, Math.PI * 2 + 0.3, true);
      ctx.moveTo(cx + 8, browY + 3);
      ctx.arc(cx + 20, browY - 3, 12, Math.PI, Math.PI * 2 + 0.3, true);
    } else {
      ctx.arc(cx - 20, browY, 12, Math.PI + 0.2, Math.PI * 2 - 0.2);
      ctx.moveTo(cx + 8, browY);
      ctx.arc(cx + 20, browY, 12, Math.PI + 0.2, Math.PI * 2 - 0.2);
    }
    ctx.stroke();

    // Nose
    ctx.fillStyle = "#E8B730";
    ctx.beginPath();
    ctx.arc(cx, eyeY + 17, 3, 0, Math.PI * 2);
    ctx.fill();

    // Mouth (based on mouthOpen parameter)
    const mouthY = eyeY + 30;
    const openAmount = mouthOpen * 12;

    ctx.fillStyle = "#333";
    ctx.beginPath();
    if (openAmount < 2) {
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 2;
      ctx.arc(cx, mouthY, 8, 0.1, Math.PI - 0.1);
      ctx.stroke();
    } else {
      ctx.ellipse(cx, mouthY + openAmount / 2, 8 + openAmount * 0.4, openAmount + 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Listening indicator
    if (isListening) {
      ctx.strokeStyle = "#1677ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, actualHeadY, 68, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [isSpeaking, isThinking, isListening, mouthOpen, expression]);

  useEffect(() => {
    let animId: number;
    const loop = () => {
      drawAvatar();
      animId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animId);
  }, [drawAvatar]);

  // Set canvas size on mount
  useEffect(() => {
    const resize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = canvasRef.current.offsetWidth * 2;
        canvasRef.current.height = canvasRef.current.offsetHeight * 2;
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
