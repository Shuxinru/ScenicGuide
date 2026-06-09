import { useEffect, useRef, useCallback } from "react";

interface Props {
  isSpeaking: boolean;
  isThinking: boolean;
  isListening: boolean;
  mouthOpen: number;
  expression: string;
  clothingUrl: string | null;
}

export default function Live2DCanvas({
  isSpeaking,
  isThinking,
  isListening,
  mouthOpen,
  expression,
  clothingUrl,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blinkRef = useRef<number>(Date.now());
  const nextBlinkRef = useRef<number>(Date.now() + 2000 + Math.random() * 3000);
  const isBlinkingRef = useRef(false);
  const clothingImgRef = useRef<HTMLImageElement | null>(null);

  // Load clothing image when URL changes
  useEffect(() => {
    if (!clothingUrl) {
      clothingImgRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { clothingImgRef.current = img; };
    img.onerror = () => { clothingImgRef.current = null; };
    img.src = clothingUrl;
    return () => { clothingImgRef.current = null; };
  }, [clothingUrl]);

  const drawAvatar = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const now = Date.now();
    const unit = h / 720; // scale unit

    ctx.clearRect(0, 0, w, h);

    // ── Background glow ──────────────────────────────────────
    const cx = w / 2;
    const headCy = h * 0.30;

    const glowGrad = ctx.createRadialGradient(cx, headCy, 40 * unit, cx, headCy, 280 * unit);
    glowGrad.addColorStop(0, "rgba(180, 210, 255, 0.35)");
    glowGrad.addColorStop(0.5, "rgba(140, 180, 240, 0.12)");
    glowGrad.addColorStop(1, "rgba(74, 144, 217, 0)");
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, headCy, 280 * unit, 0, Math.PI * 2);
    ctx.fill();

    // ── Idle breathing animation ─────────────────────────────
    const breath = Math.sin(now / 2000) * 3 * unit;
    const idleSway = Math.sin(now / 3000) * 2 * unit;

    // ── Blink animation ──────────────────────────────────────
    let blinkAmount = 0;
    if (isBlinkingRef.current) {
      const elapsed = now - blinkRef.current;
      if (elapsed < 80) {
        blinkAmount = elapsed / 80; // closing
      } else if (elapsed < 120) {
        blinkAmount = 1; // closed
      } else if (elapsed < 200) {
        blinkAmount = 1 - (elapsed - 120) / 80; // opening
      } else {
        isBlinkingRef.current = false;
        nextBlinkRef.current = now + 2000 + Math.random() * 4000;
      }
    } else if (now > nextBlinkRef.current && !isSpeaking && !isThinking) {
      isBlinkingRef.current = true;
      blinkRef.current = now;
    }

    // ── Speaking bob ─────────────────────────────────────────
    const speakBob = isSpeaking ? Math.sin(now / 120) * 2 * unit : 0;

    // ── Head ─────────────────────────────────────────────────
    const headR = 110 * unit;
    const headX = cx + idleSway;
    const headY = headCy + breath + speakBob;

    // Neck shadow
    ctx.fillStyle = "#f5c5a3";
    ctx.beginPath();
    ctx.roundRect(headX - 22 * unit, headY + headR - 8 * unit, 44 * unit, 18 * unit, 6 * unit);
    ctx.fill();

    // Face (round, slightly oval for cute look)
    const skinGrad = ctx.createRadialGradient(headX - 10 * unit, headY - 15 * unit, headR * 0.3, headX, headY, headR);
    skinGrad.addColorStop(0, "#fff5ee");
    skinGrad.addColorStop(0.6, "#ffe8d6");
    skinGrad.addColorStop(1, "#f0c8a8");
    ctx.fillStyle = skinGrad;
    ctx.beginPath();
    ctx.ellipse(headX, headY, headR, headR * 1.02, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Hair ─────────────────────────────────────────────────
    ctx.fillStyle = "#3a2f28";
    // Main hair
    ctx.beginPath();
    ctx.arc(headX, headY - 4 * unit, headR + 6 * unit, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    // Hair sides
    ctx.beginPath();
    ctx.ellipse(headX - headR + 15 * unit, headY + 20 * unit, 30 * unit, 70 * unit, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(headX + headR - 15 * unit, headY + 20 * unit, 30 * unit, 70 * unit, -0.1, 0, Math.PI * 2);
    ctx.fill();
    // Bangs
    ctx.beginPath();
    ctx.arc(headX, headY - headR + 10 * unit, headR + 4 * unit, Math.PI * 0.85, Math.PI * 0.15, true);
    ctx.fill();
    // Hair highlight
    ctx.fillStyle = "#4a3f38";
    ctx.beginPath();
    ctx.arc(headX, headY - 50 * unit, 50 * unit, Math.PI * 1.1, Math.PI * 1.9);
    ctx.fill();
    // Side hair strands (front)
    ctx.fillStyle = "#3a2f28";
    ctx.beginPath();
    ctx.ellipse(headX - headR - 5 * unit, headY + 8 * unit, 12 * unit, 55 * unit, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(headX + headR + 5 * unit, headY + 8 * unit, 12 * unit, 55 * unit, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // ── Hair accessory (small flower clip) ───────────────────
    const flowerX = headX + headR * 0.55;
    const flowerY = headY - headR * 0.35;
    ctx.fillStyle = "#ff9999";
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(flowerX + Math.cos(angle) * 8 * unit, flowerY + Math.sin(angle) * 8 * unit, 6 * unit, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ffdd57";
    ctx.beginPath();
    ctx.arc(flowerX, flowerY, 5 * unit, 0, Math.PI * 2);
    ctx.fill();

    // ── Eyes ─────────────────────────────────────────────────
    const eyeY = headY + 10 * unit;
    const eyeSpacing = 32 * unit;
    const eyeW = 24 * unit;
    const eyeH = 28 * unit;

    // Blink scale
    const eyeScaleY = 1 - blinkAmount * 0.95;

    // Left eye white
    ctx.save();
    ctx.translate(headX - eyeSpacing, eyeY);
    ctx.scale(1, eyeScaleY);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(0, 0, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();
    // Iris
    const irisGradL = ctx.createRadialGradient(2 * unit, -2 * unit, 2 * unit, 0, 0, eyeW);
    irisGradL.addColorStop(0, "#6b4c3b");
    irisGradL.addColorStop(0.7, "#4a3028");
    irisGradL.addColorStop(1, "#2a1810");
    ctx.fillStyle = irisGradL;
    ctx.beginPath();
    ctx.arc(2 * unit, 0, eyeW * 0.7, 0, Math.PI * 2);
    ctx.fill();
    // Pupil
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(2 * unit, 0, eyeW * 0.35, 0, Math.PI * 2);
    ctx.fill();
    // Highlights
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-5 * unit, -6 * unit, 6 * unit, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(7 * unit, 5 * unit, 3 * unit, 0, Math.PI * 2);
    ctx.fill();
    // Upper lash line
    ctx.strokeStyle = "#2a1810";
    ctx.lineWidth = 2.5 * unit;
    ctx.beginPath();
    ctx.arc(0, -2 * unit, eyeW * 0.95, Math.PI * 0.13, Math.PI * 0.87);
    ctx.stroke();
    ctx.restore();

    // Right eye white
    ctx.save();
    ctx.translate(headX + eyeSpacing, eyeY);
    ctx.scale(1, eyeScaleY);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(0, 0, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();
    // Iris
    const irisGradR = ctx.createRadialGradient(2 * unit, -2 * unit, 2 * unit, 0, 0, eyeW);
    irisGradR.addColorStop(0, "#6b4c3b");
    irisGradR.addColorStop(0.7, "#4a3028");
    irisGradR.addColorStop(1, "#2a1810");
    ctx.fillStyle = irisGradR;
    ctx.beginPath();
    ctx.arc(2 * unit, 0, eyeW * 0.7, 0, Math.PI * 2);
    ctx.fill();
    // Pupil
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(2 * unit, 0, eyeW * 0.35, 0, Math.PI * 2);
    ctx.fill();
    // Highlights
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-5 * unit, -6 * unit, 6 * unit, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(7 * unit, 5 * unit, 3 * unit, 0, Math.PI * 2);
    ctx.fill();
    // Upper lash line
    ctx.strokeStyle = "#2a1810";
    ctx.lineWidth = 2.5 * unit;
    ctx.beginPath();
    ctx.arc(0, -2 * unit, eyeW * 0.95, Math.PI * 0.13, Math.PI * 0.87);
    ctx.stroke();
    ctx.restore();

    // ── Eyebrows ─────────────────────────────────────────────
    const browY = eyeY - eyeH - 8 * unit;
    ctx.strokeStyle = "#4a3028";
    ctx.lineWidth = 3 * unit;
    ctx.lineCap = "round";

    // Vary eyebrows by expression
    let browAngleL = -0.05;
    let browAngleR = 0.05;
    let browYOff = 0;

    if (expression === "happy") {
      browAngleL = -0.25;
      browAngleR = 0.25;
      browYOff = -4 * unit;
    } else if (expression === "sorry") {
      browAngleL = 0.2;
      browAngleR = -0.2;
      browYOff = 6 * unit;
    } else if (expression === "serious") {
      browAngleL = 0.05;
      browAngleR = -0.05;
      browYOff = -6 * unit;
    }

    // Left brow
    ctx.beginPath();
    ctx.moveTo(headX - eyeSpacing - 18 * unit, browY + browYOff);
    ctx.quadraticCurveTo(
      headX - eyeSpacing, browY + browYOff - 8 * unit + browAngleL * 30,
      headX - eyeSpacing + 18 * unit, browY + browYOff
    );
    ctx.stroke();
    // Right brow
    ctx.beginPath();
    ctx.moveTo(headX + eyeSpacing - 18 * unit, browY + browYOff);
    ctx.quadraticCurveTo(
      headX + eyeSpacing, browY + browYOff - 8 * unit + browAngleR * 30,
      headX + eyeSpacing + 18 * unit, browY + browYOff
    );
    ctx.stroke();

    // ── Blush ─────────────────────────────────────────────────
    ctx.fillStyle = "rgba(255, 150, 150, 0.35)";
    ctx.beginPath();
    ctx.ellipse(headX - eyeSpacing - 5 * unit, eyeY + 22 * unit, 14 * unit, 8 * unit, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(headX + eyeSpacing + 5 * unit, eyeY + 22 * unit, 14 * unit, 8 * unit, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Nose ──────────────────────────────────────────────────
    ctx.fillStyle = "#e8b896";
    ctx.beginPath();
    ctx.arc(headX, eyeY + 15 * unit, 4 * unit, 0, Math.PI * 2);
    ctx.fill();

    // ── Mouth ─────────────────────────────────────────────────
    const mouthY = eyeY + 32 * unit;
    const openAmt = mouthOpen * 14 * unit;
    ctx.strokeStyle = "#c45a4a";
    ctx.fillStyle = "#c45a4a";
    ctx.lineWidth = 2.5 * unit;
    ctx.lineCap = "round";

    if (expression === "happy" && openAmt < 2) {
      // Smile
      ctx.beginPath();
      ctx.arc(headX, mouthY - 2 * unit, 10 * unit, 0.2, Math.PI - 0.2);
      ctx.stroke();
    } else if (expression === "sorry" && openAmt < 2) {
      // Wavy mouth
      ctx.beginPath();
      ctx.arc(headX, mouthY + 6 * unit, 8 * unit, Math.PI + 0.3, -0.3);
      ctx.stroke();
    } else if (openAmt < 2) {
      // Neutral slight smile
      ctx.beginPath();
      ctx.arc(headX, mouthY, 9 * unit, 0.15, Math.PI - 0.15);
      ctx.stroke();
    } else {
      // Open mouth (speaking)
      ctx.beginPath();
      ctx.ellipse(headX, mouthY + openAmt * 0.4, 9 * unit + openAmt * 0.3, openAmt * 0.6 + 3 * unit, 0, 0, Math.PI * 2);
      ctx.fill();
      // Tongue hint
      if (openAmt > 6 * unit) {
        ctx.fillStyle = "#e89090";
        ctx.beginPath();
        ctx.ellipse(headX, mouthY + openAmt * 0.6, 6 * unit, openAmt * 0.25, 0, 0, Math.PI);
        ctx.fill();
      }
    }

    // ── Body ──────────────────────────────────────────────────
    const bodyTop = headY + headR + 5 * unit + breath + speakBob;
    const bodyH = 90 * unit;
    const bodyW = 70 * unit;

    // Body gradient
    const bodyGrad = ctx.createLinearGradient(headX, bodyTop, headX, bodyTop + bodyH);
    bodyGrad.addColorStop(0, "#e8d5f5");
    bodyGrad.addColorStop(0.5, "#dcc8ee");
    bodyGrad.addColorStop(1, "#cfb5e6");
    ctx.fillStyle = bodyGrad;

    // Body shape (rounded trapezoid for cute dress silhouette)
    ctx.beginPath();
    ctx.moveTo(headX - bodyW * 0.55, bodyTop);
    ctx.quadraticCurveTo(headX - bodyW * 0.6, bodyTop + bodyH * 0.5, headX - bodyW * 0.75, bodyTop + bodyH);
    ctx.lineTo(headX + bodyW * 0.75, bodyTop + bodyH);
    ctx.quadraticCurveTo(headX + bodyW * 0.6, bodyTop + bodyH * 0.5, headX + bodyW * 0.55, bodyTop);
    ctx.closePath();
    ctx.fill();

    // ── Clothing image overlay ─────────────────────────────────
    const clothingImg = clothingImgRef.current;
    if (clothingImg && clothingImg.complete && clothingImg.naturalWidth > 0) {
      ctx.save();
      // Clip to body shape
      ctx.beginPath();
      ctx.moveTo(headX - bodyW * 0.55, bodyTop);
      ctx.quadraticCurveTo(headX - bodyW * 0.6, bodyTop + bodyH * 0.5, headX - bodyW * 0.75, bodyTop + bodyH);
      ctx.lineTo(headX + bodyW * 0.75, bodyTop + bodyH);
      ctx.quadraticCurveTo(headX + bodyW * 0.6, bodyTop + bodyH * 0.5, headX + bodyW * 0.55, bodyTop);
      ctx.closePath();
      ctx.clip();

      // Draw clothing image fitted to body bounds
      const clothW = bodyW * 1.6;
      const clothH = bodyH * 1.15;
      const clothX = headX - clothW / 2;
      const clothY = bodyTop - 5 * unit;
      ctx.drawImage(clothingImg, clothX, clothY, clothW, clothH);
      ctx.restore();
    }

    // Dress collar (V-neck with ruffle)
    ctx.fillStyle = "#f0e8f8";
    ctx.beginPath();
    ctx.moveTo(headX - 25 * unit, bodyTop);
    ctx.quadraticCurveTo(headX - 10 * unit, bodyTop + 18 * unit, headX, bodyTop + 12 * unit);
    ctx.quadraticCurveTo(headX + 10 * unit, bodyTop + 18 * unit, headX + 25 * unit, bodyTop);
    ctx.quadraticCurveTo(headX, bodyTop + 5 * unit, headX - 25 * unit, bodyTop);
    ctx.fill();

    // Dress detail line
    ctx.strokeStyle = "#c0a8d8";
    ctx.lineWidth = 1.5 * unit;
    ctx.beginPath();
    ctx.moveTo(headX, bodyTop + 12 * unit);
    ctx.lineTo(headX, bodyTop + bodyH * 0.7);
    ctx.stroke();

    // Waist sash/belt
    ctx.fillStyle = "#f5e6d0";
    ctx.beginPath();
    ctx.roundRect(headX - 45 * unit, bodyTop + bodyH * 0.45, 90 * unit, 10 * unit, 3 * unit);
    ctx.fill();

    // Sash bow
    ctx.fillStyle = "#f5e6d0";
    ctx.beginPath();
    ctx.ellipse(headX - 30 * unit, bodyTop + bodyH * 0.45 + 2 * unit, 16 * unit, 10 * unit, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(headX + 30 * unit, bodyTop + bodyH * 0.45 + 2 * unit, 16 * unit, 10 * unit, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headX, bodyTop + bodyH * 0.45 + 5 * unit, 7 * unit, 0, Math.PI * 2);
    ctx.fill();

    // ── Arms ──────────────────────────────────────────────────
    const armTop = bodyTop + 15 * unit;
    const armLen = 55 * unit;

    // Left arm
    ctx.fillStyle = "#ffe8d6";
    ctx.beginPath();
    ctx.roundRect(headX - bodyW * 0.55 - 10 * unit, armTop, 22 * unit, armLen, 11 * unit);
    ctx.fill();
    // Left hand
    ctx.beginPath();
    ctx.arc(headX - bodyW * 0.55, armTop + armLen, 13 * unit, 0, Math.PI * 2);
    ctx.fill();

    // Right arm
    ctx.beginPath();
    ctx.roundRect(headX + bodyW * 0.55 - 12 * unit, armTop, 22 * unit, armLen, 11 * unit);
    ctx.fill();
    // Right hand
    ctx.beginPath();
    ctx.arc(headX + bodyW * 0.55, armTop + armLen, 13 * unit, 0, Math.PI * 2);
    ctx.fill();

    // ── Legs ──────────────────────────────────────────────────
    const legTop = bodyTop + bodyH;
    const legLen = 35 * unit;

    // Left leg
    ctx.fillStyle = "#ffe8d6";
    ctx.beginPath();
    ctx.roundRect(headX - 25 * unit, legTop, 24 * unit, legLen, 10 * unit);
    ctx.fill();
    // Left shoe
    ctx.fillStyle = "#e89090";
    ctx.beginPath();
    ctx.roundRect(headX - 30 * unit, legTop + legLen - 3 * unit, 34 * unit, 16 * unit, 8 * unit);
    ctx.fill();
    // Shoe bow
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(headX - 13 * unit, legTop + legLen + 2 * unit, 7 * unit, 5 * unit, 0, 0, Math.PI * 2);
    ctx.fill();

    // Right leg
    ctx.fillStyle = "#ffe8d6";
    ctx.beginPath();
    ctx.roundRect(headX + 1 * unit, legTop, 24 * unit, legLen, 10 * unit);
    ctx.fill();
    // Right shoe
    ctx.fillStyle = "#e89090";
    ctx.beginPath();
    ctx.roundRect(headX - 4 * unit, legTop + legLen - 3 * unit, 34 * unit, 16 * unit, 8 * unit);
    ctx.fill();
    // Shoe bow
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(headX + 13 * unit, legTop + legLen + 2 * unit, 7 * unit, 5 * unit, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Status indicators ─────────────────────────────────────
    // Listening ring
    if (isListening) {
      const pulse = Math.sin(now / 400) * 0.3 + 0.7;
      ctx.strokeStyle = `rgba(100, 180, 255, ${pulse})`;
      ctx.lineWidth = 4 * unit;
      ctx.setLineDash([8 * unit, 4 * unit]);
      ctx.lineDashOffset = now / 50;
      ctx.beginPath();
      ctx.arc(headX, headY, headR + 20 * unit, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
    }

    // Speaking indicator (subtle sound wave)
    if (isSpeaking) {
      for (let i = 0; i < 3; i++) {
        const wavePhase = now / 300 + i * 1.2;
        const waveR = headR + 30 * unit + Math.sin(wavePhase) * 12 * unit + i * 18 * unit;
        const waveAlpha = 0.12 - i * 0.03;
        ctx.strokeStyle = `rgba(180, 200, 255, ${waveAlpha})`;
        ctx.lineWidth = 2 * unit;
        ctx.beginPath();
        ctx.arc(headX, headY, waveR, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Thinking indicator (dots near head)
    if (isThinking) {
      const dotY = headY - headR - 30 * unit;
      for (let i = 0; i < 3; i++) {
        const dotPhase = now / 600 + i * 1.5;
        const dotAlpha = 0.3 + Math.sin(dotPhase) * 0.3;
        const dotSize = 6 * unit + Math.sin(dotPhase) * 2 * unit;
        ctx.fillStyle = `rgba(255, 200, 100, ${dotAlpha})`;
        ctx.beginPath();
        ctx.arc(headX + (i - 1) * 22 * unit, dotY - Math.sin(dotPhase) * 10 * unit, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
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

  // Set canvas size
  useEffect(() => {
    const resize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        canvasRef.current.width = rect.width * 2;
        canvasRef.current.height = rect.height * 2;
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
