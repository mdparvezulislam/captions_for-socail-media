const PALETTES: { from: string; to: string; blobs: string[]; ink: string }[] = [
  { from: "#F3D9C4", to: "#E7A97F", blobs: ["#C96A38", "#F7E9DA", "#8F3F1B"], ink: "#5A2A14" },
  { from: "#DCE8E0", to: "#9FC3AE", blobs: ["#2C6A51", "#EEF5F0", "#17402F"], ink: "#123326" },
  { from: "#E8E2D4", to: "#C9B99A", blobs: ["#8C7346", "#F7F2E5", "#5A4A2C"], ink: "#3D3220" },
  { from: "#D9E4EC", to: "#9DBBD0", blobs: ["#1F5D8C", "#EDF3F8", "#123A57"], ink: "#0E2C42" },
  { from: "#F1DCD3", to: "#D9A08F", blobs: ["#9C2F45", "#FBEDE8", "#5E1B28"], ink: "#46131D" },
  { from: "#EDE4CE", to: "#D9C08A", blobs: ["#A76B12", "#FAF4E4", "#6B4208"], ink: "#46300B" },
];

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function artSvg(seed: string, size = 640): string {
  const h = hash(seed || "art");
  const palette = PALETTES[h % PALETTES.length];
  const a = h % 37;
  const b = (h >> 3) % 53;
  const c = (h >> 7) % 71;
  const cx1 = 18 + (a % 46);
  const cy1 = 14 + (b % 40);
  const r1 = 26 + (c % 22);
  const cx2 = 58 + (b % 34);
  const cy2 = 62 + (a % 30);
  const r2 = 20 + ((a + c) % 24);
  const cx3 = 30 + (c % 50);
  const cy3 = 80 - (b % 24);
  const r3 = 14 + ((b + c) % 18);
  const angle = 20 + (h % 40);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${angle} 0.5 0.5)">
      <stop offset="0" stop-color="${palette.from}"/>
      <stop offset="1" stop-color="${palette.to}"/>
    </linearGradient>
    <radialGradient id="b1" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${palette.blobs[0]}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${palette.blobs[0]}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="b2" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${palette.blobs[1]}" stop-opacity="0.75"/>
      <stop offset="1" stop-color="${palette.blobs[1]}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="0.6" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#g)"/>
  <circle cx="${cx1}%" cy="${cy1}%" r="${r1}%" fill="url(#b1)"/>
  <circle cx="${cx2}%" cy="${cy2}%" r="${r2}%" fill="url(#b2)"/>
  <circle cx="${cx3}%" cy="${cy3}%" r="${r3}%" fill="${palette.blobs[2]}" fill-opacity="0.16"/>
  <g stroke="${palette.ink}" stroke-opacity="0.14" stroke-width="1">
    ${[16, 32, 48, 64, 80]
      .map((p) => `<line x1="${(p / 100) * size}" y1="0" x2="${(p / 100) * size}" y2="${size}"/>`)
      .join("")}
    ${[22, 44, 66, 88].map((p) => `<line x1="0" y1="${(p / 100) * size}" x2="${size}" y2="${(p / 100) * size}"/>`).join("")}
  </g>
  <rect width="${size}" height="${size}" fill="url(#sheen)"/>
  <circle cx="${cx2}%" cy="${cy1}%" r="${(r2 + 6) / 2}%" fill="none" stroke="${palette.blobs[1]}" stroke-opacity="0.5" stroke-width="1.4"/>
</svg>`;
}
