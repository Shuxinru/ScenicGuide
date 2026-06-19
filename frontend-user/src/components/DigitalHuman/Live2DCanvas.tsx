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
    const headR = 102 * unit;
    const headX = cx + idleSway;
    const headY = headCy + breath + speakBob;

    // ── Body measurements ────────────────────────────────────
    const shoulderY = headY + headR + 5 * unit + breath + speakBob;
    const torsoH = 108 * unit;
    const hipY = shoulderY + torsoH;
    const shoulderHW = 55 * unit;
    const waistHW = 38 * unit;
    const hipHW = 52 * unit;
    // Neck measurements
    const neckTopY = headY + headR * 0.78;
    const neckTopHW = 17 * unit;
    const neckBotHW = 22 * unit;

    // ── Neck + Torso (unified skin shape, drawn before face) ──
    const bodyGrad = ctx.createLinearGradient(headX, neckTopY, headX, hipY);
    bodyGrad.addColorStop(0, "#fff5ee");
    bodyGrad.addColorStop(0.15, "#ffe8d6");
    bodyGrad.addColorStop(0.5, "#fadcc8");
    bodyGrad.addColorStop(1, "#f0c8a8");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    // Neck left top
    ctx.moveTo(headX - neckTopHW, neckTopY);
    // Neck left side down
    ctx.quadraticCurveTo(headX - neckTopHW - 2 * unit, neckTopY + (shoulderY - neckTopY) * 0.5, headX - neckBotHW, shoulderY);
    // Rounded shoulder slope out to shoulder point
    ctx.quadraticCurveTo(headX - shoulderHW * 0.65, shoulderY + 5 * unit, headX - shoulderHW, shoulderY + 10 * unit);
    // Side: shoulder → bust → waist → hip
    ctx.quadraticCurveTo(headX - shoulderHW - 3 * unit, shoulderY + torsoH * 0.18, headX - shoulderHW + 5 * unit, shoulderY + torsoH * 0.26);
    ctx.quadraticCurveTo(headX - waistHW, shoulderY + torsoH * 0.4, headX - waistHW, shoulderY + torsoH * 0.5);
    ctx.quadraticCurveTo(headX - hipHW, shoulderY + torsoH * 0.7, headX - hipHW, hipY);
    // Bottom
    ctx.lineTo(headX + hipHW, hipY);
    // Mirror right side up
    ctx.quadraticCurveTo(headX + hipHW, shoulderY + torsoH * 0.7, headX + waistHW, shoulderY + torsoH * 0.5);
    ctx.quadraticCurveTo(headX + waistHW, shoulderY + torsoH * 0.4, headX + shoulderHW - 5 * unit, shoulderY + torsoH * 0.26);
    ctx.quadraticCurveTo(headX + shoulderHW + 3 * unit, shoulderY + torsoH * 0.18, headX + shoulderHW, shoulderY + 10 * unit);
    // Rounded shoulder slope in to neck
    ctx.quadraticCurveTo(headX + shoulderHW * 0.65, shoulderY + 5 * unit, headX + neckBotHW, shoulderY);
    // Neck right side up
    ctx.quadraticCurveTo(headX + neckTopHW + 2 * unit, neckTopY + (shoulderY - neckTopY) * 0.5, headX + neckTopHW, neckTopY);
    ctx.closePath();
    ctx.fill();

    // Subtle collarbone lines
    ctx.strokeStyle = "rgba(210,160,130,0.25)";
    ctx.lineWidth = 1.5 * unit;
    ctx.beginPath();
    ctx.moveTo(headX - neckBotHW, shoulderY + 2 * unit);
    ctx.quadraticCurveTo(headX - neckBotHW * 0.6, shoulderY + 8 * unit, headX, shoulderY + 4 * unit);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(headX + neckBotHW, shoulderY + 2 * unit);
    ctx.quadraticCurveTo(headX + neckBotHW * 0.6, shoulderY + 8 * unit, headX, shoulderY + 4 * unit);
    ctx.stroke();

    // Face (narrower with slightly pointed chin)
    const skinGrad = ctx.createRadialGradient(headX - 8 * unit, headY - 15 * unit, headR * 0.25, headX, headY, headR);
    skinGrad.addColorStop(0, "#fff5ee");
    skinGrad.addColorStop(0.6, "#ffe8d6");
    skinGrad.addColorStop(1, "#f0c8a8");
    ctx.fillStyle = skinGrad;
    ctx.beginPath();
    ctx.ellipse(headX, headY, headR * 0.92, headR * 0.96, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Hair ─────────────────────────────────────────────────
    ctx.fillStyle = "#3a2f28";
    // Main hair
    ctx.beginPath();
    ctx.arc(headX, headY - 4 * unit, headR + 6 * unit, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    // Hair sides
    ctx.beginPath();
    ctx.ellipse(headX - headR + 13 * unit, headY + 18 * unit, 26 * unit, 64 * unit, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(headX + headR - 13 * unit, headY + 18 * unit, 26 * unit, 64 * unit, -0.1, 0, Math.PI * 2);
    ctx.fill();
    // Bangs (raised slightly above eyes)
    ctx.beginPath();
    ctx.arc(headX, headY - headR + 5 * unit, headR + 4 * unit, Math.PI * 0.85, Math.PI * 0.15, true);
    ctx.fill();
    // Hair highlight
    ctx.fillStyle = "#4a3f38";
    ctx.beginPath();
    ctx.arc(headX, headY - 46 * unit, 46 * unit, Math.PI * 1.1, Math.PI * 1.9);
    ctx.fill();
    // Side hair strands (front)
    ctx.fillStyle = "#3a2f28";
    ctx.beginPath();
    ctx.ellipse(headX - headR - 4 * unit, headY + 8 * unit, 10 * unit, 50 * unit, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(headX + headR + 4 * unit, headY + 8 * unit, 10 * unit, 50 * unit, -0.2, 0, Math.PI * 2);
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
    const eyeY = headY + 36 * unit;
    const eyeSpacing = 28 * unit;
    const eyeW = 22 * unit;
    const eyeH = 26 * unit;

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

    if (expression === "happy" || expression === "thankful") {
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
    } else if (expression === "surprised") {
      browAngleL = -0.35;
      browAngleR = 0.35;
      browYOff = -12 * unit;
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

    if (expression === "happy" || expression === "thankful") {
      if (openAmt < 2) {
        // Smile
        ctx.beginPath();
        ctx.arc(headX, mouthY - 2 * unit, 10 * unit, 0.2, Math.PI - 0.2);
        ctx.stroke();
      } else {
        // Open smile
        ctx.beginPath();
        ctx.ellipse(headX, mouthY, 9 * unit, openAmt, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (expression === "surprised") {
      // Round "O" mouth
      ctx.beginPath();
      ctx.ellipse(headX, mouthY + 2 * unit, 7 * unit, openAmt + 8 * unit, 0, 0, Math.PI * 2);
      ctx.fill();
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

    // ── 1. Legs (skin — attached at hips) ────────────────────
    const legLen = 40 * unit;
    const legW = 24 * unit;
    const legGap = 6 * unit;

    // Left leg
    ctx.fillStyle = "#ffe8d6";
    ctx.beginPath();
    ctx.roundRect(headX - legGap / 2 - legW, hipY - 3 * unit, legW, legLen + 3 * unit, 10 * unit);
    ctx.fill();
    // Right leg
    ctx.fillStyle = "#ffe8d6";
    ctx.beginPath();
    ctx.roundRect(headX + legGap / 2, hipY - 3 * unit, legW, legLen + 3 * unit, 10 * unit);
    ctx.fill();

    // ── 2. Arms (animated — gesture during speech) ───────────
    const armLen = 55 * unit;
    const armW = 22 * unit;
    const armTop = shoulderY + 6 * unit;
    const armLX = headX - shoulderHW;
    const armRX = headX + shoulderHW;

    // Calculate arm angles based on state
    let leftArmAngle = 0;
    let rightArmAngle = 0;

    if (isSpeaking) {
      // Right arm raised for explanation, gentle wave
      rightArmAngle = -0.38 + Math.sin(now / 320) * 0.12;
      leftArmAngle = Math.sin(now / 650) * 0.07;
    } else if (isThinking) {
      rightArmAngle = Math.sin(now / 2000) * 0.04;
      leftArmAngle = Math.sin(now / 2200) * 0.04;
    } else {
      // Idle gentle sway
      rightArmAngle = Math.sin(now / 2400) * 0.05;
      leftArmAngle = Math.sin(now / 2200 + 0.5) * 0.05;
    }

    // Left arm
    ctx.save();
    ctx.translate(armLX, armTop);
    ctx.rotate(leftArmAngle);
    ctx.fillStyle = "#ffe8d6";
    ctx.beginPath();
    ctx.roundRect(-armW * 0.4, 0, armW, armLen, 11 * unit);
    ctx.fill();
    // Left hand
    ctx.beginPath();
    ctx.arc(0, armLen, 13 * unit, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Right arm
    ctx.save();
    ctx.translate(armRX, armTop);
    ctx.rotate(rightArmAngle);
    ctx.fillStyle = "#ffe8d6";
    ctx.beginPath();
    ctx.roundRect(-armW * 0.6, 0, armW, armLen, 11 * unit);
    ctx.fill();
    // Right hand
    ctx.beginPath();
    ctx.arc(0, armLen, 13 * unit, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── 3. Clothing / Dress (follows body silhouette) ──────
    const dressTop = shoulderY + 2 * unit;
    const dressBottom = hipY + 28 * unit;
    const dressH = dressBottom - dressTop;
    const dressWaistY = dressTop + dressH * 0.38;
    const dWaistHW = waistHW + 4 * unit;
    const clothingImg = clothingImgRef.current;
    const hasClothing = clothingImg && clothingImg.complete && clothingImg.naturalWidth > 0;

    // Body outline path (matches torso exactly, rounded shoulders, +2*unit margin)
    const bodyClipPath = () => {
      ctx.beginPath();
      // Start at rounded shoulder point (left)
      ctx.moveTo(headX - shoulderHW + 2 * unit, shoulderY + 10 * unit);
      // Down left side following body contour
      ctx.quadraticCurveTo(headX - shoulderHW - 4 * unit, shoulderY + torsoH * 0.18, headX - shoulderHW + 2 * unit, shoulderY + torsoH * 0.26);
      ctx.quadraticCurveTo(headX - waistHW - 2 * unit, shoulderY + torsoH * 0.4, headX - waistHW - 2 * unit, shoulderY + torsoH * 0.5);
      ctx.quadraticCurveTo(headX - hipHW - 3 * unit, shoulderY + torsoH * 0.7, headX - hipHW - 3 * unit, hipY + 2 * unit);
      // Bottom across
      ctx.lineTo(headX + hipHW + 3 * unit, hipY + 2 * unit);
      // Up right side
      ctx.quadraticCurveTo(headX + hipHW + 3 * unit, shoulderY + torsoH * 0.7, headX + waistHW + 2 * unit, shoulderY + torsoH * 0.5);
      ctx.quadraticCurveTo(headX + waistHW + 2 * unit, shoulderY + torsoH * 0.4, headX + shoulderHW - 2 * unit, shoulderY + torsoH * 0.26);
      ctx.quadraticCurveTo(headX + shoulderHW + 4 * unit, shoulderY + torsoH * 0.18, headX + shoulderHW - 2 * unit, shoulderY + 10 * unit);
      ctx.closePath();
    };

    if (hasClothing) {
      // ── Clothing: torso only (short-sleeve style, arms & legs exposed) ──
      ctx.save();
      bodyClipPath();
      ctx.clip();

      const imgW = clothingImg.naturalWidth;
      const imgH = clothingImg.naturalHeight;
      const imgRatio = imgW / imgH;
      const torsoBoxW = (hipHW + 3) * 2;
      const torsoBoxH = hipY - shoulderY + 20 * unit;
      const torsoBoxY = shoulderY - 6 * unit;
      const boxRatio = torsoBoxW / torsoBoxH;

      let dw: number, dh: number, dx: number, dy: number;
      if (imgRatio > boxRatio) {
        dh = torsoBoxH; dw = torsoBoxH * imgRatio;
        dx = headX - dw / 2; dy = torsoBoxY;
      } else {
        dw = torsoBoxW; dh = torsoBoxW / imgRatio;
        dx = headX - dw / 2; dy = torsoBoxY + (torsoBoxH - dh) / 2;
      }

      ctx.drawImage(clothingImg, dx, dy, dw, dh);

      // Body contour shading
      const shadeGrad = ctx.createLinearGradient(headX, shoulderY, headX, hipY);
      shadeGrad.addColorStop(0, "rgba(0,0,0,0.12)");
      shadeGrad.addColorStop(0.2, "rgba(0,0,0,0.03)");
      shadeGrad.addColorStop(0.38, "rgba(255,255,255,0.04)");
      shadeGrad.addColorStop(0.55, "rgba(0,0,0,0.02)");
      shadeGrad.addColorStop(0.75, "rgba(255,255,255,0.05)");
      shadeGrad.addColorStop(1, "rgba(0,0,0,0.14)");
      ctx.fillStyle = shadeGrad;
      ctx.fillRect(headX - torsoBoxW, shoulderY - 6 * unit, torsoBoxW * 2, torsoBoxH + 8 * unit);
      ctx.restore();
    } else {
      // Default dress gradient (no clothing uploaded)
      const dHipHW_d = hipHW + 6 * unit;
      const dHemHW = hipHW + 8 * unit;
      const dShoulderHW = shoulderHW - 4 * unit;

      const dressGrad = ctx.createLinearGradient(headX, dressTop, headX, dressBottom);
      dressGrad.addColorStop(0, "#e8d5f5");
      dressGrad.addColorStop(0.3, "#dcc8ee");
      dressGrad.addColorStop(0.5, "#cfb5e6");
      dressGrad.addColorStop(1, "#b8a0d0");
      ctx.fillStyle = dressGrad;
      ctx.beginPath();
      ctx.moveTo(headX - dShoulderHW, dressTop);
      ctx.quadraticCurveTo(headX - dShoulderHW - 3 * unit, dressTop + dressH * 0.18, headX - dWaistHW, dressWaistY);
      ctx.quadraticCurveTo(headX - dWaistHW - 6 * unit, dressTop + dressH * 0.48, headX - dHipHW_d, dressTop + dressH * 0.58);
      ctx.quadraticCurveTo(headX - dHipHW_d - 3 * unit, dressTop + dressH * 0.78, headX - dHemHW, dressBottom);
      ctx.lineTo(headX + dHemHW, dressBottom);
      ctx.quadraticCurveTo(headX + dHipHW_d + 3 * unit, dressTop + dressH * 0.78, headX + dHipHW_d, dressTop + dressH * 0.58);
      ctx.quadraticCurveTo(headX + dWaistHW + 6 * unit, dressTop + dressH * 0.48, headX + dWaistHW, dressWaistY);
      ctx.quadraticCurveTo(headX + dShoulderHW + 3 * unit, dressTop + dressH * 0.18, headX + dShoulderHW, dressTop);
      ctx.closePath();
      ctx.fill();

      // Side contour shadows for 3D waist effect
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.beginPath();
      ctx.ellipse(headX - dWaistHW + 8 * unit, dressWaistY, 16 * unit, dressH * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(headX + dWaistHW - 8 * unit, dressWaistY, 16 * unit, dressH * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Dress collar (V-neck ruffle) ────────────────────────
    ctx.fillStyle = hasClothing ? "rgba(240,232,248,0.55)" : "#f0e8f8";
    ctx.beginPath();
    ctx.moveTo(headX - 28 * unit, dressTop);
    ctx.quadraticCurveTo(headX - 12 * unit, dressTop + 18 * unit, headX, dressTop + 12 * unit);
    ctx.quadraticCurveTo(headX + 12 * unit, dressTop + 18 * unit, headX + 28 * unit, dressTop);
    ctx.quadraticCurveTo(headX, dressTop + 5 * unit, headX - 28 * unit, dressTop);
    ctx.fill();

    // Dress center detail line
    ctx.strokeStyle = "#c0a8d8";
    ctx.lineWidth = 1.5 * unit;
    ctx.beginPath();
    ctx.moveTo(headX, dressTop + 12 * unit);
    ctx.lineTo(headX, dressTop + dressH * 0.65);
    ctx.stroke();

    // Waist sash/belt (at natural waist line)
    ctx.fillStyle = "#f5e6d0";
    ctx.beginPath();
    ctx.roundRect(headX - dWaistHW, dressWaistY - 2 * unit, dWaistHW * 2, 10 * unit, 3 * unit);
    ctx.fill();

    // Sash bow
    ctx.fillStyle = "#f5e6d0";
    ctx.beginPath();
    ctx.ellipse(headX - dWaistHW - 6 * unit, dressWaistY + 2 * unit, 16 * unit, 10 * unit, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(headX + dWaistHW + 6 * unit, dressWaistY + 2 * unit, 16 * unit, 10 * unit, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headX, dressWaistY + 5 * unit, 7 * unit, 0, Math.PI * 2);
    ctx.fill();

    // ── Shoulder puff sleeves ────────────────────────────────
    ctx.fillStyle = hasClothing ? "rgba(220,200,230,0.45)" : "#e0cee8";
    // Left puff
    ctx.beginPath();
    ctx.ellipse(armLX, armTop + 4 * unit, armW * 0.75, armW * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Right puff
    ctx.beginPath();
    ctx.ellipse(armRX, armTop + 4 * unit, armW * 0.75, armW * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Shoes ────────────────────────────────────────────────
    const shoeY = hipY + legLen - 3 * unit;

    // Left shoe
    ctx.fillStyle = "#e89090";
    ctx.beginPath();
    ctx.roundRect(headX - legGap / 2 - legW - 5 * unit, shoeY, legW + 10 * unit, 16 * unit, 8 * unit);
    ctx.fill();
    // Left shoe bow
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(headX - legGap / 2 - legW / 2, shoeY + 8 * unit, 7 * unit, 5 * unit, 0, 0, Math.PI * 2);
    ctx.fill();

    // Right shoe
    ctx.fillStyle = "#e89090";
    ctx.beginPath();
    ctx.roundRect(headX + legGap / 2 - 5 * unit, shoeY, legW + 10 * unit, 16 * unit, 8 * unit);
    ctx.fill();
    // Right shoe bow
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(headX + legGap / 2 + legW / 2, shoeY + 8 * unit, 7 * unit, 5 * unit, 0, 0, Math.PI * 2);
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
