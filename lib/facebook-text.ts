/**
 * Facebook post formatting.
 *
 * Facebook posts support plain text, line breaks, emojis and — crucially —
 * Unicode "Mathematical Alphanumeric" characters. Those are real characters,
 * so pasting them keeps the bold/italic look everywhere (posts, comments,
 * groups, Messenger). Markdown/HTML (**bold**, <h2>) does NOT work on Facebook.
 *
 * Bangla has no bold Unicode range — Bangla text stays untouched while
 * English product names, feature labels and comment keywords get bolded.
 */

const BOLD_BASE = {
  upper: 0x1d5d4, // MATHEMATICAL SANS-SERIF BOLD CAPITAL A (U+1D5D4..U+1D5ED: 𝗔..𝗭)
  lower: 0x1d5ee, // MATHEMATICAL SANS-SERIF BOLD SMALL A (U+1D5EE..U+1D607: 𝗮..𝘇)
  digit: 0x1d7ec, // MATHEMATICAL SANS-SERIF BOLD DIGIT ZERO (U+1D7EC..U+1D7F5: 𝟬..𝟵)
};

const ITALIC_BASE = {
  upper: 0x1d608, // MATHEMATICAL SANS-SERIF ITALIC CAPITAL A
  lower: 0x1d622, // MATHEMATICAL SANS-SERIF ITALIC SMALL A
  digit: null as number | null,
};

type Base = { upper: number; lower: number; digit: number | null };

function transform(text: string, base: Base): string {
  let out = "";
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 65 && code <= 90 && base.upper) out += String.fromCodePoint(base.upper + (code - 65));
    else if (code >= 97 && code <= 122 && base.lower) out += String.fromCodePoint(base.lower + (code - 97));
    else if (code >= 48 && code <= 57 && base.digit) out += String.fromCodePoint(base.digit + (code - 48));
    else out += char;
  }
  return out;
}

export function toBold(text: string): string {
  return transform(text, BOLD_BASE);
}

export function toItalic(text: string): string {
  return transform(text, ITALIC_BASE);
}

const RUN_PATTERN = /[A-Za-z0-9][A-Za-z0-9&'’\-\. ]*[A-Za-z0-9]|[A-Za-z0-9]/g;

/**
 * Bolds every English/number run of 2+ characters inside a single line.
 * Hashtag lines (starting with #) are never touched — styling inside a
 * hashtag breaks the tag. Bangla, emojis and ✅ symbols pass through.
 */
function boldLatinRuns(line: string): string {
  if (line.trimStart().startsWith("#")) return line;
  return line.replace(RUN_PATTERN, (run) => {
    const letters = run.match(/[A-Za-z]/g)?.length ?? 0;
    const digits = run.match(/[0-9]/g)?.length ?? 0;
    if (letters + digits < 2) return run;
    return toBold(run);
  });
}

export interface FormatOptions {
  bold?: boolean;
  italicCta?: boolean;
}

export function formatForFacebook(text: string, options: FormatOptions = {}): string {
  const { bold = true, italicCta = false } = options;
  if (!bold && !italicCta) return text;
  return text
    .split("\n")
    .map((line) => {
      if (!bold) return line;
      const styled = boldLatinRuns(line);
      if (italicCta && line.includes("কমেন্টে")) {
        return styled.replace(/[A-Za-z0-9&'’\-\. ]+/g, (run) => (run.trim() ? toItalic(run) : run));
      }
      return styled;
    })
    .join("\n");
}

export interface CopyOptions {
  facebookBold?: boolean;
  includeHashtags?: boolean;
}

/** The exact string a moderator should paste into Facebook. */
export function captionCopyText(body: string, hashtags: string[], options: CopyOptions = {}): string {
  const { facebookBold = true, includeHashtags = true } = options;
  const tags = includeHashtags && hashtags.length > 0 ? `\n\n${hashtags.join(" ")}` : "";
  return formatForFacebook(`${body}${tags}`, { bold: facebookBold });
}

const KEYWORD_MAP: Record<string, string> = {
  ফ্যান: "Fan",
  কিচেন: "Kitchen",
  গ্যাজেট: "Gadget",
  হোম: "Home",
  বিউটি: "Beauty",
  বেবি: "Baby",
};

/** Comment-trigger keyword: English word from the name, else from the category. */
export function deriveKeyword(nameBn: string, category: string): string {
  const latin = nameBn.match(/[A-Za-z][A-Za-z0-9-]{2,}/g);
  if (latin && latin.length > 0) return latin[latin.length - 1];
  return KEYWORD_MAP[category] ?? "অর্ডার";
}

/** প্রোডাক্টের ডিসপ্লে ইমেজ সোর্স — রিয়েল ছবি থাকলে same-origin প্রক্সি, নাহলে জেনারেটেড আর্ট। */
export function imageSrcFor(product: { imageUrl?: string | null; artSeed?: string; id?: string }): string {
  if (product.imageUrl && product.imageUrl.startsWith("https://")) {
    return `/api/image?url=${encodeURIComponent(product.imageUrl)}`;
  }
  return `/api/art/${encodeURIComponent(product.artSeed || product.id || "art")}`;
}

/** প্রোডাক্টের সব গ্যালারি ইমেজ (same-origin proxy URL) — প্রাইমারি ছবি আগে, ডুপ্লিকেট বাদ। */
export function productGallerySources(product: {
  imageUrl?: string | null;
  artSeed?: string;
  id?: string;
  enrich?: { images?: string[] } | null;
}): string[] {
  const raw: string[] = [];
  if (product.imageUrl && product.imageUrl.startsWith("https://")) {
    raw.push(product.imageUrl.trim());
  }
  for (const url of product.enrich?.images ?? []) {
    if (typeof url === "string" && url.startsWith("https://")) {
      const clean = url.trim();
      if (clean && !raw.includes(clean)) raw.push(clean);
    }
  }
  if (raw.length === 0) {
    return [imageSrcFor(product)];
  }
  return raw.map((url) => `/api/image?url=${encodeURIComponent(url)}`);
}

export interface GroupBlockInput {
  orderUrl?: string | null;
  whatsapp?: string | null;
  warranty?: string | null;
}

/** গ্রুপ পোস্টে ক্যাপশনের নিচে যাওয়া অর্ডার-ব্লক। */
export function groupOrderBlock(input: GroupBlockInput): string {
  const parts: string[] = [];
  if (input.orderUrl) parts.push(`🛒 অর্ডার লিংক: ${input.orderUrl}`);
  if (input.whatsapp) parts.push(`📞 হটলাইন / WhatsApp: ${input.whatsapp}`);
  parts.push("🚚 ঢাকায় ৳৬০ · ঢাকার বাইরে ৳১২০ · ১০০% ক্যাশ অন ডেলিভারি");
  if (input.warranty) parts.push(`🛡️ ${input.warranty}`);
  return parts.join("\n");
}
