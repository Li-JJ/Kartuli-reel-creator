import type {
  GeorgianLesson,
  HostPairId,
  PropIconKey,
  ReelSettings,
  ReelTheme,
  WordMeaning,
} from "../types/reel";
import type { ActivePlaybackFrame } from "./timeline";

// Base design coordinates: 1080 x 1920 (9:16 Reels / Shorts / TikTok)
export const CANVAS_W = 1080;
export const CANVAS_H = 1920;

function easeOutCubic(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - x, 3);
}

function easeOutBack(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = text.split("\n");
  const lines: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(" ");
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function drawPaperTexture(ctx: CanvasRenderingContext2D, theme: ReelTheme) {
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Subtle organic paper grain dots (deterministic, zero flicker)
  ctx.save();
  ctx.fillStyle =
    theme.id === "midnight-qvevri"
      ? "rgba(255, 255, 255, 0.025)"
      : "rgba(30, 35, 24, 0.03)";
  for (let i = 0; i < 160; i++) {
    const px = ((i * 7919) % 1060) + 10;
    const py = ((i * 6271) % 1900) + 10;
    const r = (i % 3) + 1;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTopProgressBar(
  ctx: CanvasRenderingContext2D,
  frame: ActivePlaybackFrame,
  theme: ReelTheme
) {
  const padX = 72;
  const barY = 56;
  const gap = 12;
  const totalWidth = CANVAS_W - padX * 2;
  const segW = (totalWidth - gap * 5) / 6;

  for (let i = 0; i < 6; i++) {
    const x = padX + i * (segW + gap);
    ctx.fillStyle =
      theme.id === "midnight-qvevri"
        ? "rgba(255,255,255,0.14)"
        : "rgba(24, 66, 49, 0.14)";
    drawRoundedRect(ctx, x, barY, segW, 7, 4);
    ctx.fill();

    let fillRatio = 0;
    if (i < frame.sceneIndex) fillRatio = 1;
    else if (i === frame.sceneIndex) fillRatio = frame.sceneProgress;

    if (fillRatio > 0) {
      ctx.fillStyle = theme.wordAccent;
      drawRoundedRect(ctx, x, barY, Math.max(8, segW * fillRatio), 7, 4);
      ctx.fill();
    }
  }
}

/**
 * Draws the custom flat-vector thick-outline prop illustration for each meaning.
 */
function drawPropIllustration(
  ctx: CanvasRenderingContext2D,
  icon: PropIconKey,
  cx: number,
  cy: number,
  scale: number,
  theme: ReelTheme
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const strokeColor = theme.outline;
  ctx.lineWidth = 8;
  ctx.strokeStyle = strokeColor;

  switch (icon) {
    case "valley": {
      // Sun + twin mountains + green valley river
      ctx.fillStyle = "#F4C95D";
      ctx.beginPath();
      ctx.arc(48, -46, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#9FB8AD";
      ctx.beginPath();
      ctx.moveTo(-105, 58);
      ctx.lineTo(-42, -45);
      ctx.lineTo(18, 58);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#7D9B8C";
      ctx.beginPath();
      ctx.moveTo(-20, 58);
      ctx.lineTo(52, -26);
      ctx.lineTo(108, 58);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#C5D8A4";
      drawRoundedRect(ctx, -110, 42, 220, 32, 16);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "shovel": {
      ctx.rotate(-0.45);
      // Handle grip
      ctx.fillStyle = "#C5895A";
      drawRoundedRect(ctx, -10, -85, 20, 115, 8);
      ctx.fill();
      ctx.stroke();
      // D-handle top
      ctx.fillStyle = "#6E5A4F";
      drawRoundedRect(ctx, -28, -105, 56, 24, 10);
      ctx.fill();
      ctx.stroke();
      // Spade blade
      ctx.fillStyle = "#B7C1C7";
      ctx.beginPath();
      ctx.moveTo(-42, 26);
      ctx.lineTo(42, 26);
      ctx.lineTo(36, 86);
      ctx.quadraticCurveTo(0, 115, -36, 86);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "cocktail": {
      // Coupe/cocktail glass + garnish
      ctx.fillStyle = "#E8845B";
      ctx.beginPath();
      ctx.moveTo(-66, -48);
      ctx.lineTo(66, -48);
      ctx.lineTo(10, 20);
      ctx.lineTo(-10, 20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Stem & base
      ctx.beginPath();
      ctx.moveTo(0, 20);
      ctx.lineTo(0, 78);
      ctx.moveTo(-42, 78);
      ctx.lineTo(42, 78);
      ctx.stroke();
      // Citrus slice
      ctx.fillStyle = "#F4C95D";
      ctx.beginPath();
      ctx.arc(54, -52, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "eye": {
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.moveTo(-98, 0);
      ctx.quadraticCurveTo(0, -68, 98, 0);
      ctx.quadraticCurveTo(0, 68, -98, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#5B8E7D";
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(-11, -11, 7, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "wheel": {
      ctx.fillStyle = "#4B5054";
      ctx.beginPath();
      ctx.arc(0, 0, 82, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#DCE1E3";
      ctx.beginPath();
      ctx.arc(0, 0, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      for (let i = 0; i < 5; i++) {
        const ang = (i * Math.PI * 2) / 5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang) * 42, Math.sin(ang) * 42);
        ctx.stroke();
      }
      ctx.fillStyle = theme.wordAccent;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "gem": {
      ctx.fillStyle = "#D16666";
      ctx.beginPath();
      ctx.moveTo(-48, -56);
      ctx.lineTo(48, -56);
      ctx.lineTo(88, -12);
      ctx.lineTo(0, 78);
      ctx.lineTo(-88, -12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-88, -12);
      ctx.lineTo(88, -12);
      ctx.moveTo(-48, -56);
      ctx.lineTo(-24, -12);
      ctx.lineTo(0, 78);
      ctx.lineTo(24, -12);
      ctx.lineTo(48, -56);
      ctx.stroke();
      break;
    }
    case "door": {
      ctx.fillStyle = "#C5895A";
      drawRoundedRect(ctx, -56, -86, 112, 172, 14);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#A97144";
      drawRoundedRect(ctx, -36, -64, 72, 54, 6);
      ctx.fill();
      ctx.stroke();
      drawRoundedRect(ctx, -36, 10, 72, 54, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#F4C95D";
      ctx.beginPath();
      ctx.arc(34, 4, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "goal": {
      // Goal frame + ball
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      drawRoundedRect(ctx, -92, -62, 184, 114, 10);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 4;
      for (let gx = -60; gx <= 60; gx += 30) {
        ctx.beginPath();
        ctx.moveTo(gx, -62);
        ctx.lineTo(gx, 52);
        ctx.stroke();
      }
      ctx.lineWidth = 8;
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(-18, 42, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.arc(-18, 42, 11, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "book": {
      ctx.fillStyle = "#5B8E7D";
      drawRoundedRect(ctx, -74, -68, 148, 136, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#FAF7EE";
      drawRoundedRect(ctx, -58, -52, 56, 104, 4);
      ctx.fill();
      ctx.stroke();
      drawRoundedRect(ctx, 2, -52, 56, 104, 4);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "calendar": {
      ctx.fillStyle = "#FAF7EE";
      drawRoundedRect(ctx, -76, -62, 152, 136, 16);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = theme.wordAccent;
      drawRoundedRect(ctx, -76, -62, 152, 42, 14);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = strokeColor;
      ctx.font = '800 54px "Bricolage Grotesque", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("01", 0, 26);
      break;
    }
    case "back": {
      // Stylized torso/spine curve with lightning ache mark
      ctx.fillStyle = "#E7C5A8";
      drawRoundedRect(ctx, -44, -76, 88, 152, 34);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = theme.wordAccent;
      ctx.beginPath();
      ctx.moveTo(46, -24);
      ctx.lineTo(76, -38);
      ctx.moveTo(52, 4);
      ctx.lineTo(86, 4);
      ctx.moveTo(46, 32);
      ctx.lineTo(76, 46);
      ctx.stroke();
      break;
    }
    case "cake": {
      ctx.fillStyle = "#F3D3B3";
      drawRoundedRect(ctx, -72, -14, 144, 78, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#E8845B";
      drawRoundedRect(ctx, -72, -14, 144, 26, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#FAF7EE";
      drawRoundedRect(ctx, -10, -56, 20, 42, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#F4C95D";
      ctx.beginPath();
      ctx.arc(0, -72, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "hand": {
      ctx.fillStyle = "#F0C5A3";
      drawRoundedRect(ctx, -42, -14, 84, 88, 28);
      ctx.fill();
      ctx.stroke();
      for (let fx = -34; fx <= 34; fx += 22) {
        drawRoundedRect(ctx, fx - 9, -68, 18, 62, 9);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case "cards": {
      ctx.save();
      ctx.rotate(-0.18);
      ctx.fillStyle = "#FFFFFF";
      drawRoundedRect(ctx, -56, -72, 92, 132, 12);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.translate(22, 8);
      ctx.rotate(0.14);
      ctx.fillStyle = "#FAF7EE";
      drawRoundedRect(ctx, -46, -68, 92, 132, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = theme.wordAccent;
      ctx.beginPath();
      ctx.arc(0, -4, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "wild":
    case "clue":
    default: {
      // Magnifying glass / insight spark
      ctx.fillStyle = "#D7E4D3";
      ctx.beginPath();
      ctx.arc(-14, -14, 54, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(26, 26);
      ctx.lineTo(74, 74);
      ctx.stroke();
      ctx.lineWidth = 8;
      ctx.fillStyle = theme.wordAccent;
      ctx.beginPath();
      ctx.arc(-14, -14, 16, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

/**
 * Draws the two deadpan podcast hosts at the bottom of the 9:16 reel,
 * mirroring the iconic layout of the reference Instagram reel.
 */
function drawPodcastHosts(
  ctx: CanvasRenderingContext2D,
  hostPair: HostPairId,
  frame: ActivePlaybackFrame,
  theme: ReelTheme
) {
  const isHostASpeaking = frame.activeSpeaker === "hostA";
  const isHostBSpeaking = frame.activeSpeaker === "hostB";

  const beatBob = frame.beatPulse * 6;
  const bounceA = (isHostASpeaking ? Math.sin(frame.time * 14) * 7 : 0) + beatBob;
  const bounceB = (isHostBSpeaking ? Math.sin(frame.time * 14 + 1.2) * 7 : 0) + beatBob;
  const blink = (Math.floor(frame.time * 1.1) % 5 === 0) && ((frame.time * 1.1) % 1 < 0.14);

  const outline = theme.outline;
  const headBaseY = CANVAS_H - 185;

  // --- HOST A (Left) ---
  ctx.save();
  ctx.translate(310, headBaseY + bounceA);

  // Headphone headband behind
  ctx.strokeStyle = "#3E3B36";
  ctx.lineWidth = 24;
  ctx.beginPath();
  ctx.arc(0, -28, 172, Math.PI * 1.04, Math.PI * 1.96);
  ctx.stroke();

  if (hostPair === "khinkali-qvevri") {
    // KHINKALI CHARACTER (Pleated Georgian dumpling!)
    // Top knot pleat
    ctx.fillStyle = "#EFE4CC";
    ctx.strokeStyle = outline;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(-36, -152);
    ctx.quadraticCurveTo(-22, -214, 0, -206);
    ctx.quadraticCurveTo(22, -214, 36, -152);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Main plump dumpling body
    ctx.fillStyle = "#F5ECD8";
    ctx.beginPath();
    ctx.moveTo(-175, 195);
    ctx.bezierCurveTo(-185, 25, -145, -145, 0, -156);
    ctx.bezierCurveTo(145, -145, 185, 25, 175, 195);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Subtle pleats radiating from top
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(40, 35, 28, 0.25)";
    for (const px of [-54, -22, 22, 54]) {
      ctx.beginPath();
      ctx.moveTo(px * 0.35, -150);
      ctx.quadraticCurveTo(px * 0.85, -110, px * 1.15, -72);
      ctx.stroke();
    }
  } else {
    // HIGHLAND SHEEP CHARACTER (Chiboni / Tusheti sheep)
    ctx.fillStyle = "#EAE7DC";
    ctx.strokeStyle = outline;
    ctx.lineWidth = 10;
    // Horns
    ctx.fillStyle = "#D4B483";
    ctx.beginPath();
    ctx.arc(-115, -125, 42, Math.PI * 0.3, Math.PI * 1.55);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(115, -125, 42, Math.PI * 1.45, Math.PI * 0.7);
    ctx.fill();
    ctx.stroke();
    // Fluffy fleece head
    ctx.fillStyle = "#F2EFE7";
    ctx.beginPath();
    ctx.arc(0, 10, 165, Math.PI, Math.PI * 2);
    ctx.lineTo(165, 195);
    ctx.lineTo(-165, 195);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Over-ear headphone cups (Left Host)
  ctx.fillStyle = "#5B564E";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 10;
  drawRoundedRect(ctx, -206, -68, 54, 126, 26);
  ctx.fill();
  ctx.stroke();
  drawRoundedRect(ctx, 152, -68, 54, 126, 26);
  ctx.fill();
  ctx.stroke();

  // Blush cheeks
  ctx.fillStyle = "rgba(229, 134, 107, 0.55)";
  ctx.beginPath();
  ctx.ellipse(-86, 24, 24, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(86, 24, 24, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Deadpan half-lidded eyes looking right toward co-host
  const eyeY = -20;
  for (const ex of [-54, 54]) {
    if (blink) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(ex - 26, eyeY);
      ctx.lineTo(ex + 26, eyeY);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#FFFFFF";
      ctx.strokeStyle = outline;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, 32, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pupil (side-eye right)
      ctx.fillStyle = outline;
      ctx.beginPath();
      ctx.arc(ex + 10, eyeY + 2, 11, 0, Math.PI * 2);
      ctx.fill();

      // Deadpan flat eyelid
      ctx.fillStyle = hostPair === "khinkali-qvevri" ? "#F5ECD8" : "#F2EFE7";
      ctx.beginPath();
      ctx.rect(ex - 34, eyeY - 26, 68, 18);
      ctx.fill();
      ctx.strokeStyle = outline;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(ex - 30, eyeY - 8);
      ctx.lineTo(ex + 30, eyeY - 8);
      ctx.stroke();
    }
    // Eyebrow
    ctx.strokeStyle = outline;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(ex - 20, eyeY - 38);
    ctx.quadraticCurveTo(ex, eyeY - 46, ex + 20, eyeY - 38);
    ctx.stroke();
  }

  // Mouth (flat deadpan when silent, open oval when speaking)
  ctx.strokeStyle = outline;
  ctx.lineWidth = 8;
  if (isHostASpeaking && frame.mouthOpenAmount > 0.25) {
    const mh = 10 + frame.mouthOpenAmount * 18;
    ctx.fillStyle = "#6E2D24";
    ctx.beginPath();
    ctx.ellipse(0, 48, 22, mh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-22, 48);
    ctx.lineTo(22, 48);
    ctx.stroke();
  }

  // Podcast microphone (Left Host)
  ctx.save();
  ctx.translate(-86, 125);
  ctx.rotate(0.45);
  ctx.fillStyle = "#5A544C";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 8;
  drawRoundedRect(ctx, -24, -44, 48, 72, 22);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-10, -24);
  ctx.lineTo(-10, -6);
  ctx.moveTo(0, -24);
  ctx.lineTo(0, -6);
  ctx.moveTo(10, -24);
  ctx.lineTo(10, -6);
  ctx.stroke();
  ctx.fillStyle = "#2E2B27";
  drawRoundedRect(ctx, -8, 28, 16, 85, 6);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.restore(); // End Host A

  // --- HOST B (Right) ---
  ctx.save();
  ctx.translate(765, headBaseY + bounceB);

  // Headphone headband
  ctx.strokeStyle = "#3E3B36";
  ctx.lineWidth = 24;
  ctx.beginPath();
  ctx.arc(0, -34, 172, Math.PI * 1.04, Math.PI * 1.96);
  ctx.stroke();

  if (hostPair === "khinkali-qvevri") {
    // QVEVRI CHARACTER (Terracotta Georgian wine amphora!)
    ctx.fillStyle = "#D49E7A";
    ctx.strokeStyle = outline;
    ctx.lineWidth = 10;
    // Amphora rim/crown
    drawRoundedRect(ctx, -78, -190, 156, 40, 18);
    ctx.fill();
    ctx.stroke();

    // Rounded clay belly body
    ctx.fillStyle = "#C98D68";
    ctx.beginPath();
    ctx.moveTo(-165, 195);
    ctx.bezierCurveTo(-185, 10, -140, -155, 0, -155);
    ctx.bezierCurveTo(140, -155, 185, 10, 165, 195);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Subtle pottery contour band
    ctx.strokeStyle = "rgba(40, 28, 20, 0.22)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-152, 118);
    ctx.quadraticCurveTo(0, 134, 152, 118);
    ctx.stroke();
  } else {
    // SVANETI STONE TOWER CHARACTER (Koshki!)
    ctx.fillStyle = "#B8B5AD";
    ctx.strokeStyle = outline;
    ctx.lineWidth = 10;
    // Battlement top
    ctx.beginPath();
    ctx.moveTo(-132, -162);
    ctx.lineTo(-132, -196);
    ctx.lineTo(-76, -196);
    ctx.lineTo(-76, -168);
    ctx.lineTo(-26, -168);
    ctx.lineTo(-26, -196);
    ctx.lineTo(26, -196);
    ctx.lineTo(26, -168);
    ctx.lineTo(76, -168);
    ctx.lineTo(76, -196);
    ctx.lineTo(132, -196);
    ctx.lineTo(132, -162);
    ctx.lineTo(160, 195);
    ctx.lineTo(-160, 195);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Over-ear headphone cups (Right Host)
  ctx.fillStyle = "#5B564E";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 10;
  drawRoundedRect(ctx, -204, -74, 54, 126, 26);
  ctx.fill();
  ctx.stroke();
  drawRoundedRect(ctx, 150, -74, 54, 126, 26);
  ctx.fill();
  ctx.stroke();

  // Blush cheeks
  ctx.fillStyle = "rgba(229, 134, 107, 0.52)";
  ctx.beginPath();
  ctx.ellipse(-84, 24, 24, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(84, 24, 24, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Deadpan half-lidded eyes looking left toward co-host
  const eyeYB = -22;
  for (const ex of [-54, 54]) {
    if (blink) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(ex - 26, eyeYB);
      ctx.lineTo(ex + 26, eyeYB);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#FFFFFF";
      ctx.strokeStyle = outline;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.ellipse(ex, eyeYB, 32, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pupil (side-eye left)
      ctx.fillStyle = outline;
      ctx.beginPath();
      ctx.arc(ex - 10, eyeYB + 2, 11, 0, Math.PI * 2);
      ctx.fill();

      // Flat eyelid
      ctx.fillStyle = hostPair === "khinkali-qvevri" ? "#C98D68" : "#B8B5AD";
      ctx.beginPath();
      ctx.rect(ex - 34, eyeYB - 26, 68, 18);
      ctx.fill();
      ctx.strokeStyle = outline;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(ex - 30, eyeYB - 8);
      ctx.lineTo(ex + 30, eyeYB - 8);
      ctx.stroke();
    }
  }

  // Round nose (charming nod to Dol Hareubang!)
  ctx.fillStyle = hostPair === "khinkali-qvevri" ? "#D9A483" : "#C9C6BE";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, 10, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Mouth
  ctx.strokeStyle = outline;
  ctx.lineWidth = 8;
  if (isHostBSpeaking && frame.mouthOpenAmount > 0.25) {
    const mh = 10 + frame.mouthOpenAmount * 18;
    ctx.fillStyle = "#6E2D24";
    ctx.beginPath();
    ctx.ellipse(0, 62, 20, mh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-20, 62);
    ctx.lineTo(20, 62);
    ctx.stroke();
  }

  // Podcast microphone (Right Host)
  ctx.save();
  ctx.translate(82, 125);
  ctx.rotate(-0.42);
  ctx.fillStyle = "#5A544C";
  ctx.strokeStyle = outline;
  ctx.lineWidth = 8;
  drawRoundedRect(ctx, -24, -44, 48, 72, 22);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-10, -24);
  ctx.lineTo(-10, -6);
  ctx.moveTo(0, -24);
  ctx.lineTo(0, -6);
  ctx.moveTo(10, -24);
  ctx.lineTo(10, -6);
  ctx.stroke();
  ctx.fillStyle = "#2E2B27";
  drawRoundedRect(ctx, -8, 28, 16, 85, 6);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.restore(); // End Host B
}

function drawSubtitles(
  ctx: CanvasRenderingContext2D,
  frame: ActivePlaybackFrame,
  settings: ReelSettings,
  theme: ReelTheme
) {
  if (!settings.showSubtitles) return;

  // Word-by-word synced lyrics mode (when playing the music track)
  if (frame.syncedLyricCue) {
    const cue = frame.syncedLyricCue;
    ctx.save();
    ctx.font = '700 32px "Plus Jakarta Sans", "Noto Sans Georgian", sans-serif';

    // Wrap SyncedLyricWord objects into lines up to 840px wide
    const spaceW = ctx.measureText(" ").width;
    const maxW = 840;
    const rows: Array<typeof cue.words> = [];
    let currentRow: typeof cue.words = [];
    let currentW = 0;

    for (const w of cue.words) {
      const ww = ctx.measureText(w.text).width;
      const needed = currentRow.length > 0 ? ww + spaceW : ww;
      if (currentW + needed > maxW && currentRow.length > 0) {
        rows.push(currentRow);
        currentRow = [w];
        currentW = ww;
      } else {
        currentRow.push(w);
        currentW += needed;
      }
    }
    if (currentRow.length > 0) rows.push(currentRow);

    const lineH = 44;
    const boxH = rows.length * lineH + 44;
    const boxY = CANVAS_H - 495 - boxH;

    ctx.fillStyle =
      theme.id === "midnight-qvevri"
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(255, 255, 255, 0.9)";
    ctx.strokeStyle =
      theme.id === "midnight-qvevri"
        ? "rgba(255, 255, 255, 0.16)"
        : "rgba(24, 66, 49, 0.14)";
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, 84, boxY, CANVAS_W - 168, boxH, 24);
    ctx.fill();
    ctx.stroke();

    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    rows.forEach((rowWords, rIdx) => {
      const rowWidths = rowWords.map((rw) => ctx.measureText(rw.text).width);
      const totalRowW =
        rowWidths.reduce((a, b) => a + b, 0) +
        spaceW * Math.max(0, rowWords.length - 1);
      let cursorX = CANVAS_W / 2 - totalRowW / 2;
      const y = boxY + 24 + rIdx * lineH;

      rowWords.forEach((rw, wIdx) => {
        const isCurrent = frame.time >= rw.start && frame.time <= rw.end;
        const isSung = frame.time >= rw.start;

        if (isCurrent) {
          ctx.save();
          ctx.fillStyle = theme.highlightFill;
          drawRoundedRect(ctx, cursorX - 6, y - 4, rowWidths[wIdx] + 12, 38, 8);
          ctx.fill();
          ctx.restore();
        }

        ctx.globalAlpha = isSung ? 1 : 0.42;
        ctx.fillStyle = rw.accent || isCurrent ? theme.wordAccent : theme.bodyText;
        ctx.fillText(rw.text, cursorX, y);
        cursorX += rowWidths[wIdx] + spaceW;
      });
    });

    ctx.restore();
    return;
  }

  if (!frame.activeLine) return;
  const line = frame.activeLine;
  const speakerLabel =
    settings.hostPair === "khinkali-qvevri"
      ? line.speaker === "hostA"
        ? "Khinkali"
        : "Qvevri"
      : line.speaker === "hostA"
        ? "Sheep"
        : "Tower";

  ctx.save();
  ctx.font = '700 32px "Plus Jakarta Sans", sans-serif';
  const wrapped = wrapLines(ctx, line.text, 840);
  const lineH = 42;
  const boxH = wrapped.length * lineH + 56;
  const boxY = CANVAS_H - 495 - boxH;

  ctx.fillStyle =
    theme.id === "midnight-qvevri"
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(255, 255, 255, 0.86)";
  ctx.strokeStyle =
    theme.id === "midnight-qvevri"
      ? "rgba(255, 255, 255, 0.14)"
      : "rgba(24, 66, 49, 0.12)";
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, 84, boxY, CANVAS_W - 168, boxH, 24);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = theme.wordAccent;
  ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(speakerLabel.toUpperCase(), CANVAS_W / 2, boxY + 18);

  ctx.fillStyle = theme.bodyText;
  ctx.font = '600 31px "Plus Jakarta Sans", sans-serif';
  wrapped.forEach((txt, idx) => {
    ctx.fillText(txt, CANVAS_W / 2, boxY + 52 + idx * lineH);
  });
  ctx.restore();
}

function drawMeaningScene(
  ctx: CanvasRenderingContext2D,
  lesson: GeorgianLesson,
  meaning: WordMeaning,
  meaningNum: number,
  frame: ActivePlaybackFrame,
  settings: ReelSettings,
  theme: ReelTheme
) {
  const enter = easeOutCubic(Math.min(1, frame.sceneProgress * 4.5));
  const pop = easeOutBack(Math.min(1, frame.sceneProgress * 3.8));
  const slideY = (1 - enter) * 44;

  // Compact top bar showing word reminder
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = theme.headerText;
  ctx.font = '800 42px "Bricolage Grotesque", sans-serif';
  ctx.fillText(lesson.seriesTitle, CANVAS_W / 2, 148);

  ctx.fillStyle = theme.wordAccent;
  ctx.font = '900 108px "Noto Sans Georgian", sans-serif';
  ctx.fillText(lesson.word, CANVAS_W / 2, 260);
  ctx.restore();

  // Illustration badge card
  ctx.save();
  ctx.globalAlpha = enter;
  ctx.translate(0, slideY);

  const cardX = 112;
  const cardY = 365;
  const cardW = CANVAS_W - 224;
  const cardH = 685;

  ctx.fillStyle = theme.surface;
  ctx.strokeStyle =
    theme.id === "midnight-qvevri"
      ? "rgba(255,255,255,0.12)"
      : "rgba(24,66,49,0.12)";
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 40);
  ctx.fill();
  ctx.stroke();

  // Unboxed clean editorial kicker: "01 · Valley / Lowland"
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = theme.mutedText;
  ctx.font = '700 32px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`0${meaningNum}  ·  ${meaning.meaningLabel}`, CANVAS_W / 2, cardY + 62);

  // Prop illustration
  drawPropIllustration(ctx, meaning.icon, CANVAS_W / 2, cardY + 225, 1.35 * pop, theme);

  // Georgian sentence with verb highlighted
  const sentence = meaning.georgianSentence.trim();
  const verb = meaning.clueVerb.trim();
  ctx.font = '800 58px "Noto Sans Georgian", sans-serif';

  const verbIdx = verb ? sentence.indexOf(verb) : -1;
  if (verbIdx !== -1 && settings.showVerbBadge) {
    const before = sentence.slice(0, verbIdx);
    const after = sentence.slice(verbIdx + verb.length);
    const wBefore = ctx.measureText(before).width;
    const wVerb = ctx.measureText(verb).width;
    const wAfter = ctx.measureText(after).width;
    const totalW = wBefore + wVerb + wAfter;

    let cursorX = CANVAS_W / 2 - totalW / 2;
    const textY = cardY + 425;

    ctx.textAlign = "left";
    ctx.fillStyle = theme.bodyText;
    if (before) {
      ctx.fillText(before, cursorX, textY);
      cursorX += wBefore;
    }

    // Highlight box behind clue verb
    const verbHighlightProgress = easeOutCubic(
      Math.max(0, Math.min(1, (frame.sceneProgress - 0.18) * 3.5))
    );
    ctx.save();
    ctx.fillStyle = theme.highlightFill;
    drawRoundedRect(
      ctx,
      cursorX - 14,
      textY - 40,
      (wVerb + 28) * Math.max(0.15, verbHighlightProgress),
      80,
      16
    );
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = theme.wordAccent;
    ctx.fillText(verb, cursorX, textY);
    cursorX += wVerb;

    if (after) {
      ctx.fillStyle = theme.bodyText;
      ctx.fillText(after, cursorX, textY);
    }
  } else {
    ctx.textAlign = "center";
    ctx.fillStyle = theme.bodyText;
    ctx.fillText(sentence, CANVAS_W / 2, cardY + 425);
  }

  // Phonetic transliteration
  if (settings.showPhonetics && meaning.transliteration) {
    ctx.textAlign = "center";
    ctx.fillStyle = theme.mutedText;
    ctx.font = '600 34px "JetBrains Mono", monospace';
    ctx.fillText(meaning.transliteration, CANVAS_W / 2, cardY + 505);
  }

  // English translation + Verb clue breakdown
  ctx.textAlign = "center";
  ctx.fillStyle = theme.bodyText;
  ctx.font = '700 38px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(meaning.englishTranslation, CANVAS_W / 2, cardY + 575);

  if (settings.showVerbBadge && meaning.clueVerb && meaning.clueVerbMeaning) {
    ctx.fillStyle = theme.wordAccent;
    ctx.font = '700 30px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      `Verb clue: ${meaning.clueVerb} = "${meaning.clueVerbMeaning}"`,
      CANVAS_W / 2,
      cardY + 632
    );
  }

  ctx.restore();
}

export function renderReelFrame(
  ctx: CanvasRenderingContext2D,
  lesson: GeorgianLesson,
  frame: ActivePlaybackFrame,
  settings: ReelSettings,
  theme: ReelTheme
) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  drawPaperTexture(ctx, theme);
  drawTopProgressBar(ctx, frame, theme);

  // Scene-specific central typography & visuals
  if (frame.sceneIndex === 0) {
    // SCENE 0: Exact Hook / Cover recreation!
    const titlePop = easeOutCubic(Math.min(1, frame.sceneProgress * 4.5 + 0.35));
    const wordScale = easeOutBack(Math.min(1, frame.sceneProgress * 3.5 + 0.35));

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Top Series Title: "GEORGIAN IS EASY"
    ctx.fillStyle = theme.headerText;
    ctx.font = '800 72px "Bricolage Grotesque", sans-serif';
    ctx.fillText(lesson.seriesTitle, CANVAS_W / 2, 235);

    // Giant Focal Georgian Word
    ctx.save();
    ctx.translate(CANVAS_W / 2, 515);
    ctx.scale(wordScale, wordScale);
    ctx.fillStyle = theme.wordAccent;
    // Dynamically adjust font size if word is longer
    const wordFontSize = lesson.word.length > 5 ? 190 : 250;
    ctx.font = `900 ${wordFontSize}px "Noto Sans Georgian", sans-serif`;
    ctx.fillText(lesson.word, 0, 0);
    ctx.restore();

    // Optional phonetic pronunciation
    if (settings.showPhonetics && lesson.transliteration) {
      ctx.fillStyle = theme.mutedText;
      ctx.font = '600 40px "JetBrains Mono", monospace';
      ctx.fillText(`(${lesson.transliteration})`, CANVAS_W / 2, 680);
    }

    // Hook English Lines ("A valley? A shovel?\nA cocktail bar, too.")
    ctx.globalAlpha = titlePop;
    ctx.fillStyle = theme.bodyText;
    ctx.font = '800 68px "Bricolage Grotesque", sans-serif';
    const hookLines = wrapLines(ctx, lesson.hookEnglish, 880);
    const startY = settings.showPhonetics ? 785 : 755;
    hookLines.forEach((line, idx) => {
      ctx.fillText(line, CANVAS_W / 2, startY + idx * 88);
    });
    ctx.restore();
  } else if (frame.sceneIndex === 1) {
    // SCENE 1: Clue Setup ("The verb gives you a clue.")
    const enter = easeOutCubic(Math.min(1, frame.sceneProgress * 4));
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = theme.headerText;
    ctx.font = '800 46px "Bricolage Grotesque", sans-serif';
    ctx.fillText(lesson.seriesTitle, CANVAS_W / 2, 165);

    ctx.fillStyle = theme.wordAccent;
    ctx.font = '900 175px "Noto Sans Georgian", sans-serif';
    ctx.fillText(lesson.word, CANVAS_W / 2, 340);

    // 3 mystery badges
    const icons: PropIconKey[] = lesson.meanings.map((m) => m.icon);
    icons.forEach((ic, idx) => {
      const bx = CANVAS_W / 2 + (idx - 1) * 260;
      const by = 560;
      const itemPop = easeOutBack(
        Math.max(0, Math.min(1, (frame.sceneProgress - idx * 0.14) * 3.5))
      );
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(itemPop, itemPop);
      ctx.fillStyle = theme.surface;
      ctx.strokeStyle = theme.outline;
      ctx.lineWidth = 4;
      drawRoundedRect(ctx, -105, -105, 210, 210, 36);
      ctx.fill();
      ctx.stroke();
      drawPropIllustration(ctx, ic, 0, 0, 0.72, theme);
      ctx.restore();
    });

    ctx.globalAlpha = enter;
    ctx.fillStyle = theme.bodyText;
    ctx.font = '700 50px "Bricolage Grotesque", sans-serif';
    const lines = wrapLines(ctx, lesson.clueSetupLine, 840);
    lines.forEach((l, i) => {
      ctx.fillText(l, CANVAS_W / 2, 790 + i * 68);
    });
    ctx.restore();
  } else if (frame.sceneIndex >= 2 && frame.sceneIndex <= 4) {
    // SCENES 2, 3, 4: Meanings 1, 2, 3
    const mIndex = frame.sceneIndex - 2;
    const meaning = lesson.meanings[mIndex];
    drawMeaningScene(ctx, lesson, meaning, mIndex + 1, frame, settings, theme);
  } else {
    // SCENE 5: Recap Summary
    const enter = easeOutCubic(Math.min(1, frame.sceneProgress * 4));
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = theme.headerText;
    ctx.font = '800 44px "Bricolage Grotesque", sans-serif';
    ctx.fillText(lesson.seriesTitle, CANVAS_W / 2, 148);

    ctx.fillStyle = theme.wordAccent;
    ctx.font = '900 124px "Noto Sans Georgian", sans-serif';
    ctx.fillText(lesson.word, CANVAS_W / 2, 268);

    lesson.meanings.forEach((m, idx) => {
      const rowEnter = easeOutCubic(
        Math.max(0, Math.min(1, (frame.sceneProgress - idx * 0.1) * 4))
      );
      const isHighlighted = frame.highlightedRecapRow === idx;
      const ry = 385 + idx * 176;
      ctx.save();
      ctx.globalAlpha = rowEnter;
      if (isHighlighted) {
        ctx.translate(CANVAS_W / 2, ry + 74);
        ctx.scale(1.03, 1.03);
        ctx.translate(-CANVAS_W / 2, -(ry + 74));
      }
      ctx.fillStyle = isHighlighted ? theme.highlightFill : theme.surface;
      ctx.strokeStyle = isHighlighted
        ? theme.wordAccent
        : theme.id === "midnight-qvevri"
          ? "rgba(255,255,255,0.12)"
          : "rgba(24,66,49,0.12)";
      ctx.lineWidth = isHighlighted ? 6 : 4;
      drawRoundedRect(ctx, 96, ry, CANVAS_W - 192, 148, 28);
      ctx.fill();
      ctx.stroke();

      drawPropIllustration(ctx, m.icon, 200, ry + 74, isHighlighted ? 0.5 : 0.45, theme);

      ctx.textAlign = "left";
      ctx.fillStyle = isHighlighted ? theme.wordAccent : theme.bodyText;
      ctx.font = '800 42px "Noto Sans Georgian", sans-serif';
      ctx.fillText(m.georgianSentence, 300, ry + 54);

      ctx.fillStyle = theme.mutedText;
      ctx.font = '600 30px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`${m.meaningLabel}  ·  ${m.clueVerbMeaning}`, 300, ry + 104);
      ctx.restore();
    });

    ctx.globalAlpha = enter;
    ctx.fillStyle = theme.headerText;
    ctx.font = '800 54px "Bricolage Grotesque", sans-serif';
    ctx.fillText(lesson.recapLine, CANVAS_W / 2, 995);
    ctx.restore();
  }

  // Always draw subtitles + deadpan hosts at bottom
  drawSubtitles(ctx, frame, settings, theme);
  drawPodcastHosts(ctx, settings.hostPair, frame, theme);
}
