export type PosterRatio = "4:5" | "1:1" | "9:16";
export type PosterTemplate = "viral" | "editorial" | "bold" | "minimal";

export interface PosterData {
  brandName: string;
  logoMark: string;
  watermark: string;
  tagline: string;
  headline: string;
  subline: string;
  badge: string;
  cta: string;
  price: string;
  comparePrice: string;
  offer: string;
  productName: string;
  highlights?: string[];
  hotline?: string;
  trustLine?: string;
  colors: { primary: string; accent: string; surface: string; ink: string };
  template: PosterTemplate;
  ratio: PosterRatio;
}

export function posterSize(ratio: PosterRatio): { width: number; height: number } {
  if (ratio === "1:1") return { width: 1080, height: 1080 };
  if (ratio === "9:16") return { width: 1080, height: 1920 };
  return { width: 1080, height: 1350 };
}

export function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.slice(0, maxLines);
}

export function layoutFor(ratio: PosterRatio): {
  pad: number;
  headlineSize: number;
  sublineSize: number;
  badgeSize: number;
  ctaSize: number;
  logoSize: number;
  artHeight: number;
} {
  if (ratio === "9:16") {
    return { pad: 76, headlineSize: 96, sublineSize: 40, badgeSize: 30, ctaSize: 42, logoSize: 76, artHeight: 700 };
  }
  if (ratio === "1:1") {
    return { pad: 68, headlineSize: 84, sublineSize: 34, badgeSize: 27, ctaSize: 36, logoSize: 68, artHeight: 330 };
  }
  return { pad: 72, headlineSize: 92, sublineSize: 36, badgeSize: 28, ctaSize: 38, logoSize: 72, artHeight: 430 };
}

function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fitLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  options: { maxWidth: number; maxLines: number; size: number; minSize: number; weight: number; family: string },
): { lines: string[]; size: number; lineHeight: number } {
  let size = options.size;
  for (; size >= options.minSize; size -= 2) {
    ctx.font = `${options.weight} ${size}px ${options.family}`;
    const charBudget = Math.max(6, Math.floor(options.maxWidth / (size * 0.52)));
    const lines = wrapLines(text, charBudget, options.maxLines);
    const widest = Math.max(...lines.map((line) => ctx.measureText(line).width), 0);
    if (widest <= options.maxWidth && lines.length <= options.maxLines) {
      return { lines, size, lineHeight: size * 1.34 };
    }
  }
  ctx.font = `${options.weight} ${options.minSize}px ${options.family}`;
  const charBudget = Math.max(6, Math.floor(options.maxWidth / (options.minSize * 0.52)));
  const lines = wrapLines(text, charBudget, options.maxLines);
  return { lines, size: options.minSize, lineHeight: options.minSize * 1.34 };
}

function drawArt(
  ctx: CanvasRenderingContext2D,
  area: { x: number; y: number; width: number; height: number },
  colors: PosterData["colors"],
  template: PosterTemplate,
  productImage?: HTMLImageElement | null,
): void {
  const { x, y, width, height } = area;
  ctx.save();
  // প্রোডাক্টের আসল ছবি থাকলে সেটাই হিরো — নাহলে ব্র্যান্ড-আর্ট
  if (productImage && productImage.naturalWidth > 0) {
    roundedRect(ctx, x, y, width, height, template === "minimal" ? 24 : 56);
    ctx.save();
    roundedRect(ctx, x, y, width, height, template === "minimal" ? 24 : 56);
    ctx.clip();
    ctx.fillStyle = colors.surface;
    ctx.fillRect(x, y, width, height);
    drawCover(ctx, productImage, { x: x + 8, y: y + 8, width: width - 16, height: height - 16 });
    // নিচে হালকা গ্রেডিয়েন্ট — টেক্সট রিডেবিলিটির জন্য নয়, ব্র্যান্ড ফিল
    const edge = ctx.createLinearGradient(x, y + height * 0.6, x, y + height);
    edge.addColorStop(0, withAlpha(colors.primary, 0));
    edge.addColorStop(1, withAlpha(colors.primary, 0.35));
    ctx.fillStyle = edge;
    ctx.fillRect(x, y + height * 0.6, width, height * 0.4);
    ctx.restore();
    ctx.strokeStyle = withAlpha(colors.accent, 0.5);
    ctx.lineWidth = 3;
    roundedRect(ctx, x, y, width, height, template === "minimal" ? 24 : 56);
    ctx.stroke();
    ctx.restore();
    return;
  }
  ctx.save();
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, withAlpha(colors.accent, 0.92));
  gradient.addColorStop(0.55, withAlpha(colors.primary, 0.88));
  gradient.addColorStop(1, withAlpha(colors.ink, 0.96));
  roundedRect(ctx, x, y, width, height, template === "minimal" ? 24 : 56);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.save();
  roundedRect(ctx, x, y, width, height, template === "minimal" ? 24 : 56);
  ctx.clip();

  const blobs = [
    { cx: x + width * 0.22, cy: y + height * 0.28, r: width * 0.3, alpha: 0.22 },
    { cx: x + width * 0.78, cy: y + height * 0.32, r: width * 0.24, alpha: 0.18 },
    { cx: x + width * 0.58, cy: y + height * 0.86, r: width * 0.42, alpha: 0.16 },
  ];
  for (const blob of blobs) {
    const radial = ctx.createRadialGradient(blob.cx, blob.cy, 0, blob.cx, blob.cy, blob.r);
    radial.addColorStop(0, `rgba(255,255,255,${blob.alpha})`);
    radial.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = radial;
    ctx.beginPath();
    ctx.arc(blob.cx, blob.cy, blob.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  for (let index = 1; index <= 3; index++) {
    ctx.beginPath();
    ctx.arc(x + width * 0.5, y + height * 0.55, (width * 0.14 * index) / 1.4 + 40, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1.5;
  const step = width / 6;
  for (let lineX = x + step; lineX < x + width; lineX += step) {
    ctx.beginPath();
    ctx.moveTo(lineX, y);
    ctx.lineTo(lineX, y + height);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

export async function ensurePosterFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load('640 80px "Anek Bangla"'),
      document.fonts.load('400 36px "Anek Bangla"'),
      document.fonts.load('700 40px "Inter"'),
      document.fonts.load('600 40px "Inter"'),
    ]);
    await document.fonts.ready;
  } catch {
    /* font loading is best-effort */
  }
}

export function loadImageElement(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(null);
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  area: { x: number; y: number; width: number; height: number },
): void {
  const { x, y, width, height } = area;
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const areaRatio = width / height;
  let drawWidth: number;
  let drawHeight: number;
  if (imageRatio > areaRatio) {
    drawHeight = height;
    drawWidth = height * imageRatio;
  } else {
    drawWidth = width;
    drawHeight = width / imageRatio;
  }
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawContain(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  area: { x: number; y: number; width: number; height: number },
): void {
  const { x, y, width, height } = area;
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const areaRatio = width / height;
  let drawWidth: number;
  let drawHeight: number;
  if (imageRatio > areaRatio) {
    drawWidth = width;
    drawHeight = width / imageRatio;
  } else {
    drawHeight = height;
    drawWidth = height * imageRatio;
  }
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawViralPoster(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: PosterData,
  productImage?: HTMLImageElement | null,
): void {
  const family = '"Anek Bangla", "Inter", system-ui, sans-serif';
  const numeric = '"Inter", "Anek Bangla", system-ui, sans-serif';
  const { colors } = data;
  const pad = data.ratio === "1:1" ? 56 : 64;
  const contentWidth = width - pad * 2;
  const isStory = data.ratio === "9:16";
  const isSquare = data.ratio === "1:1";

  // 1. Rich high-contrast editorial background
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, colors.ink);
  bg.addColorStop(0.52, colors.primary);
  bg.addColorStop(1, "#14110E");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Subtle ambient accent glow behind product card
  const spot = ctx.createRadialGradient(width * 0.5, height * 0.44, 40, width * 0.5, height * 0.44, width * 0.62);
  spot.addColorStop(0, withAlpha(colors.accent, 0.32));
  spot.addColorStop(1, withAlpha(colors.accent, 0));
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, width, height);

  let cursorY = pad;

  // 2. Top Brand Bar + Discount Badge
  const logoSize = isSquare ? 58 : 66;
  roundedRect(ctx, pad, cursorY, logoSize, logoSize, 16);
  ctx.fillStyle = colors.accent;
  ctx.fill();
  ctx.fillStyle = "#FFFDF8";
  ctx.textAlign = "center";
  ctx.font = `700 ${Math.round(logoSize * 0.42)}px ${family}`;
  ctx.fillText(data.logoMark || data.brandName.slice(0, 2), pad + logoSize / 2, cursorY + logoSize * 0.65);

  ctx.textAlign = "left";
  ctx.fillStyle = "#FFFDF8";
  ctx.font = `680 ${isSquare ? 28 : 32}px ${family}`;
  ctx.fillText(data.brandName, pad + logoSize + 18, cursorY + logoSize * 0.45);
  ctx.fillStyle = "rgba(255,253,248,0.68)";
  ctx.font = `400 ${isSquare ? 20 : 22}px ${family}`;
  ctx.fillText(data.tagline.slice(0, 38), pad + logoSize + 18, cursorY + logoSize * 0.82);

  if (data.badge) {
    const badgeText = `🔥 ${data.badge}`;
    ctx.font = `700 ${isSquare ? 26 : 28}px ${family}`;
    const bw = Math.min(contentWidth * 0.42, ctx.measureText(badgeText).width + 44);
    const bh = isSquare ? 52 : 58;
    const bx = width - pad - bw;
    const by = cursorY + (logoSize - bh) / 2;
    roundedRect(ctx, bx, by, bw, bh, bh / 2);
    ctx.fillStyle = colors.accent;
    ctx.fill();
    ctx.fillStyle = "#FFFDF8";
    ctx.textAlign = "center";
    ctx.fillText(badgeText, bx + bw / 2, by + bh * 0.67);
  }

  cursorY += logoSize + (isSquare ? 26 : 36);

  // 3. Viral Hook Headline (high-impact white display type)
  const headline = fitLines(ctx, data.headline, {
    maxWidth: contentWidth,
    maxLines: 2,
    size: isStory ? 84 : isSquare ? 66 : 74,
    minSize: isSquare ? 44 : 50,
    weight: 700,
    family,
  });
  ctx.textAlign = "left";
  ctx.fillStyle = "#FFFDF8";
  headline.lines.forEach((line, i) => {
    ctx.font = `700 ${headline.size}px ${family}`;
    ctx.fillText(line, pad, cursorY + headline.size * 0.88 + i * headline.lineHeight);
  });
  cursorY += headline.lines.length * headline.lineHeight + 10;

  // Subline
  if (data.subline) {
    const subline = fitLines(ctx, data.subline, {
      maxWidth: contentWidth,
      maxLines: 2,
      size: isStory ? 34 : isSquare ? 28 : 30,
      minSize: 22,
      weight: 400,
      family,
    });
    ctx.fillStyle = "rgba(255,253,248,0.78)";
    subline.lines.forEach((line, i) => {
      ctx.font = `400 ${subline.size}px ${family}`;
      ctx.fillText(line, pad, cursorY + subline.size * 0.82 + i * subline.lineHeight);
    });
    cursorY += subline.lines.length * subline.lineHeight + (isSquare ? 20 : 28);
  }

  // Reserve bottom area for highlights + price + CTA
  const highlights = (data.highlights ?? []).filter(Boolean).slice(0, isSquare ? 2 : 3);
  const bottomReserve = (isSquare ? 245 : isStory ? 410 : 320) + (highlights.length > 0 ? (isSquare ? 54 : 68) : 0);
  const heroHeight = Math.max(240, height - cursorY - pad - bottomReserve);

  // 4. Clean Framed Product Hero Card (real product photo never cropped awkwardly)
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.42)";
  ctx.shadowBlur = 44;
  ctx.shadowOffsetY = 18;
  roundedRect(ctx, pad, cursorY, contentWidth, heroHeight, 36);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.restore();

  if (productImage && productImage.naturalWidth > 0) {
    ctx.save();
    roundedRect(ctx, pad, cursorY, contentWidth, heroHeight, 36);
    ctx.clip();
    drawContain(ctx, productImage, {
      x: pad + 20,
      y: cursorY + 20,
      width: contentWidth - 40,
      height: heroHeight - 40,
    });
    ctx.restore();
  } else {
    drawArt(ctx, { x: pad, y: cursorY, width: contentWidth, height: heroHeight }, colors, "bold", null);
  }

  // Subtle accent border around product frame
  ctx.strokeStyle = withAlpha(colors.accent, 0.55);
  ctx.lineWidth = 3;
  roundedRect(ctx, pad, cursorY, contentWidth, heroHeight, 36);
  ctx.stroke();

  cursorY += heroHeight + (isSquare ? 20 : 26);

  // 5. Key Problem-Solving Highlight Pills
  if (highlights.length > 0) {
    let pillX = pad;
    const pillH = isSquare ? 42 : 48;
    ctx.font = `560 ${isSquare ? 21 : 23}px ${family}`;
    for (const rawFeat of highlights) {
      const text = `✓ ${rawFeat.slice(0, 26)}${rawFeat.length > 26 ? "…" : ""}`;
      const pillW = Math.min(contentWidth, ctx.measureText(text).width + 34);
      if (pillX + pillW > width - pad) break;
      roundedRect(ctx, pillX, cursorY, pillW, pillH, pillH / 2);
      ctx.fillStyle = "rgba(255,253,248,0.12)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,253,248,0.22)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#FFFDF8";
      ctx.textAlign = "left";
      ctx.fillText(text, pillX + 17, cursorY + pillH * 0.67);
      pillX += pillW + 14;
    }
    cursorY += pillH + (isSquare ? 20 : 26);
  }

  // 6. Bottom Conversion Block: Offer Price + Compare Price + Trust Line
  const ctaHeight = isSquare ? 88 : 98;
  const ctaY = height - pad - ctaHeight;
  const priceBaseline = ctaY - (isSquare ? 52 : 66);

  ctx.textAlign = "left";
  ctx.fillStyle = "#FFFDF8";
  ctx.font = `700 ${isSquare ? 68 : 78}px ${numeric}`;
  ctx.fillText(data.price, pad, priceBaseline);
  const priceW = ctx.measureText(data.price).width;

  if (data.comparePrice) {
    ctx.font = `500 ${isSquare ? 32 : 36}px ${numeric}`;
    ctx.fillStyle = "rgba(255,253,248,0.48)";
    const cx = pad + priceW + 22;
    const cy = priceBaseline - 8;
    ctx.fillText(data.comparePrice, cx, cy);
    const cw = ctx.measureText(data.comparePrice).width;
    ctx.beginPath();
    ctx.strokeStyle = withAlpha(colors.accent, 0.9);
    ctx.lineWidth = 3.5;
    ctx.moveTo(cx - 4, cy - 12);
    ctx.lineTo(cx + cw + 4, cy - 12);
    ctx.stroke();
  }

  // Trust line under price
  const trustText = data.trustLine || "🚚 সারা বাংলাদেশে ক্যাশ অন ডেলিভারি · 🛡️ ৭ দিন রিপ্লেসমেন্ট";
  ctx.font = `500 ${isSquare ? 21 : 24}px ${family}`;
  ctx.fillStyle = "rgba(255,253,248,0.74)";
  ctx.fillText(trustText, pad, priceBaseline + (isSquare ? 32 : 38));

  // 7. High-contrast CTA Bar + Hotline
  roundedRect(ctx, pad, ctaY, contentWidth, ctaHeight, 24);
  ctx.fillStyle = colors.accent;
  ctx.fill();

  ctx.fillStyle = "#FFFDF8";
  ctx.textAlign = "left";
  ctx.font = `700 ${isSquare ? 32 : 36}px ${family}`;
  ctx.fillText(data.cta || "অর্ডার করতে ইনবক্স করুন", pad + 32, ctaY + ctaHeight * 0.62);

  const rightBadge = data.hotline ? `📞 ${data.hotline}` : data.watermark || data.brandName;
  ctx.textAlign = "right";
  ctx.font = `600 ${isSquare ? 24 : 26}px ${numeric}`;
  ctx.fillStyle = "rgba(255,253,248,0.92)";
  ctx.fillText(rightBadge, width - pad - 30, ctaY + ctaHeight * 0.6);
}

export async function drawPoster(canvas: HTMLCanvasElement, data: PosterData, productImage?: HTMLImageElement | null): Promise<void> {
  const { width, height } = posterSize(data.ratio);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  await ensurePosterFonts();

  if (data.template === "viral") {
    drawViralPoster(ctx, width, height, data, productImage);
    return;
  }

  const family = '"Anek Bangla", "Inter", system-ui, sans-serif';
  const numeric = '"Inter", "Anek Bangla", system-ui, sans-serif';
  const layout = layoutFor(data.ratio);
  const pad = layout.pad;
  const contentWidth = width - pad * 2;
  const { colors, template } = data;
  const centered = template === "minimal";

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = colors.surface;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(width * 0.9, height * 0.05, 0, width * 0.9, height * 0.05, width * 0.9);
  glow.addColorStop(0, withAlpha(colors.accent, 0.14));
  glow.addColorStop(1, withAlpha(colors.accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  const glowTwo = ctx.createRadialGradient(width * 0.05, height * 0.95, 0, width * 0.05, height * 0.95, width * 0.75);
  glowTwo.addColorStop(0, withAlpha(colors.primary, 0.1));
  glowTwo.addColorStop(1, withAlpha(colors.primary, 0));
  ctx.fillStyle = glowTwo;
  ctx.fillRect(0, 0, width, height);

  let cursorY = pad;

  if (template === "bold") {
    drawArt(ctx, { x: 0, y: 0, width, height: Math.round(height * 0.46) }, colors, template, productImage);
    ctx.fillStyle = "#FFFDF8";
    ctx.font = `700 ${Math.round(layout.logoSize * 0.62)}px ${family}`;
    ctx.textAlign = "left";
    ctx.fillText(data.logoMark || data.brandName.slice(0, 2), pad, pad + 52);
    ctx.font = `600 ${Math.round(layout.logoSize * 0.3)}px ${family}`;
    ctx.fillStyle = "rgba(255,255,255,0.86)";
    ctx.fillText(data.brandName.toUpperCase(), pad + layout.logoSize * 0.92, pad + 38);
    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.font = `400 ${Math.round(layout.logoSize * 0.22)}px ${family}`;
    ctx.fillText(data.tagline, pad + layout.logoSize * 0.92, pad + 66);
    cursorY = Math.round(height * 0.46) + pad * 0.9;
  } else {
    const logoBox = layout.logoSize;
    roundedRect(ctx, pad, cursorY, logoBox, logoBox, 18);
    ctx.fillStyle = colors.ink;
    ctx.fill();
    ctx.fillStyle = "#FFFDF8";
    ctx.textAlign = "center";
    ctx.font = `640 ${Math.round(logoBox * 0.4)}px ${family}`;
    ctx.fillText(data.logoMark || data.brandName.slice(0, 2), pad + logoBox / 2, cursorY + logoBox / 2 + logoBox * 0.14);

    ctx.textAlign = "left";
    ctx.fillStyle = colors.ink;
    ctx.font = `640 ${Math.round(logoBox * 0.3)}px ${family}`;
    ctx.fillText(data.brandName, pad + logoBox + 20, cursorY + logoBox * 0.46);
    ctx.fillStyle = withAlpha(colors.ink, 0.55);
    ctx.font = `400 ${Math.round(logoBox * 0.22)}px ${family}`;
    ctx.fillText(data.tagline, pad + logoBox + 20, cursorY + logoBox * 0.8);
    cursorY += logoBox + pad * 0.7;
  }

  // Badge
  if (data.badge) {
    ctx.font = `640 ${layout.badgeSize}px ${family}`;
    const badgeWidth = ctx.measureText(data.badge).width + layout.badgeSize * 1.9;
    const badgeHeight = layout.badgeSize * 2.1;
    const badgeX = centered ? (width - badgeWidth) / 2 : template === "bold" ? pad : pad;
    roundedRect(ctx, badgeX, cursorY, badgeWidth, badgeHeight, badgeHeight / 2);
    ctx.fillStyle = colors.accent;
    ctx.fill();
    ctx.fillStyle = "#FFFDF8";
    ctx.textAlign = "center";
    ctx.font = `640 ${layout.badgeSize}px ${family}`;
    ctx.fillText(data.badge, badgeX + badgeWidth / 2, cursorY + badgeHeight * 0.68);
    cursorY += badgeHeight + pad * 0.55;
  }

  // Headline
  const headline = fitLines(ctx, data.headline, {
    maxWidth: contentWidth,
    maxLines: 3,
    size: layout.headlineSize,
    minSize: Math.round(layout.headlineSize * 0.62),
    weight: 640,
    family,
  });
  ctx.textAlign = centered ? "center" : "left";
  ctx.fillStyle = colors.ink;
  headline.lines.forEach((line, index) => {
    ctx.font = `640 ${headline.size}px ${family}`;
    ctx.fillText(line, centered ? width / 2 : pad, cursorY + headline.size * 0.86 + index * headline.lineHeight);
  });
  cursorY += headline.lines.length * headline.lineHeight + pad * 0.24;

  // Subline
  if (data.subline) {
    const subline = fitLines(ctx, data.subline, {
      maxWidth: contentWidth,
      maxLines: 2,
      size: layout.sublineSize,
      minSize: Math.round(layout.sublineSize * 0.78),
      weight: 400,
      family,
    });
    ctx.fillStyle = withAlpha(colors.ink, 0.66);
    subline.lines.forEach((line, index) => {
      ctx.font = `400 ${subline.size}px ${family}`;
      ctx.fillText(line, centered ? width / 2 : pad, cursorY + subline.size * 0.8 + index * subline.lineHeight);
    });
    cursorY += subline.lines.length * subline.lineHeight + pad * 0.35;
  }

  if (template !== "bold") {
    const artTop = cursorY;
    const artHeight = Math.min(layout.artHeight, height - artTop - pad - 330);
    if (artHeight > 140) {
      drawArt(ctx, { x: pad, y: artTop, width: contentWidth, height: artHeight }, colors, template, productImage);
      cursorY = artTop + artHeight + pad * 0.62;
    }
  }

  // Price block
  const priceY = Math.max(cursorY, height - pad - 300);
  ctx.textAlign = "left";
  ctx.fillStyle = colors.ink;
  ctx.font = `700 ${Math.round(layout.headlineSize * 0.86)}px ${numeric}`;
  ctx.fillText(data.price, pad, priceY);
  const priceWidth = ctx.measureText(data.price).width;

  if (data.comparePrice) {
    ctx.font = `400 ${Math.round(layout.sublineSize * 0.92)}px ${numeric}`;
    ctx.fillStyle = withAlpha(colors.ink, 0.42);
    const compareY = priceY - 6;
    ctx.fillText(data.comparePrice, pad + priceWidth + 22, compareY);
    const compareWidth = ctx.measureText(data.comparePrice).width;
    ctx.beginPath();
    ctx.strokeStyle = withAlpha(colors.ink, 0.35);
    ctx.lineWidth = 2.5;
    ctx.moveTo(pad + priceWidth + 18, compareY - layout.sublineSize * 0.28);
    ctx.lineTo(pad + priceWidth + 26 + compareWidth, compareY - layout.sublineSize * 0.28);
    ctx.stroke();
  }

  if (data.offer) {
    ctx.textAlign = centered ? "center" : "left";
    ctx.font = `500 ${Math.round(layout.sublineSize * 0.78)}px ${family}`;
    ctx.fillStyle = withAlpha(colors.ink, 0.6);
    ctx.fillText(
      data.offer,
      centered ? width / 2 : pad,
      priceY + Math.round(layout.sublineSize * 1.25),
    );
  }

  // CTA bar
  const ctaHeight = Math.round(layout.ctaSize * 2.5);
  const ctaY = height - pad - ctaHeight;
  roundedRect(ctx, pad, ctaY, contentWidth, ctaHeight, 24);
  ctx.fillStyle = colors.ink;
  ctx.fill();

  ctx.fillStyle = "#FFFDF8";
  ctx.textAlign = "left";
  ctx.font = `600 ${layout.ctaSize}px ${family}`;
  ctx.fillText(data.cta, pad + layout.ctaSize * 0.9, ctaY + ctaHeight / 2 + layout.ctaSize * 0.34);

  const arrowX = pad + contentWidth - layout.ctaSize * 1.4;
  const arrowY = ctaY + ctaHeight / 2;
  ctx.strokeStyle = "rgba(255,253,248,0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(arrowX - 18, arrowY);
  ctx.lineTo(arrowX + 12, arrowY);
  ctx.moveTo(arrowX + 2, arrowY - 11);
  ctx.lineTo(arrowX + 13, arrowY);
  ctx.lineTo(arrowX + 2, arrowY + 11);
  ctx.stroke();

  // Watermark
  if (data.watermark) {
    ctx.textAlign = "right";
    ctx.fillStyle = withAlpha(colors.ink, 0.35);
    ctx.font = `400 ${Math.round(layout.sublineSize * 0.56)}px ${family}`;
    ctx.fillText(data.watermark, width - pad, height - pad * 0.32);
  }

  // Bottom accent rule
  ctx.fillStyle = colors.accent;
  ctx.fillRect(pad, height - pad * 0.52, Math.min(contentWidth * 0.18, 180), 5);
}
