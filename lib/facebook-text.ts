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

/** পণ্যের ধরন বোঝার শব্দভাণ্ডার — কমেন্ট-কীওয়ার্ড এর থেকে বেছে নেওয়া হয় */
const PRODUCT_WORDS = [
  "smartwatch", "watch", "earbuds", "earphone", "headphone", "speaker", "fan", "chopper",
  "blender", "cooker", "kettle", "iron", "trimmer", "dryer", "straightener", "powerbank",
  "power bank", "charger", "cable", "lamp", "light", "projector", "printer", "tablet",
  "stroller", "bottle", "flask", "filter", "purifier", "vacuum", "cleaner", "massager",
  "mouse", "keyboard", "holder", "stand", "bag", "wallet", "toy", "book", "camera",
];

const CATEGORY_MAP: Record<string, string> = {
  ফ্যান: "Fan", কিচেন: "Kitchen", গ্যাজেট: "Gadget", হোম: "Home",
  বিউটি: "Beauty", বেবি: "Baby", "Kids Zone": "Kids", Electronics: "Gadget",
  "Home & Kitchen": "Home", "Home Appliances": "Home",
};

/** Comment-trigger keyword: পণ্যের ধরন (smartwatch/earbuds...), নাহলে ব্র্যান্ড, নাহলে ক্যাটাগরি */
export function deriveKeyword(nameBn: string, category: string): string {
  const lower = nameBn.toLowerCase();
  const known = PRODUCT_WORDS.find((word) => lower.includes(word));
  if (known) {
    const label = known.replace(/\s+/g, "");
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  const latin = nameBn.match(/[A-Za-z][A-Za-z0-9-]{2,}/g);
  if (latin && latin.length > 0) {
    const stop = new Set(["with", "and", "for", "the", "kitchen", "original", "premium", "wireless"]);
    const meaningful = latin.filter((word) => !stop.has(word.toLowerCase()));
    return meaningful[0] ?? latin[0];
  }
  return CATEGORY_MAP[category] ?? "অর্ডার";
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

/**
 * WhatsApp / ইনবক্স রিপ্লাই ফরম্যাটার:
 * - শুরুতে অবশ্যই "আসসালামু আলাইকুম!" থাকবে
 * - একটানা লম্বা প্যারাগ্রাফ ভেঙে পরিষ্কার গ্যাপ ও ছোট ছোট ব্লকে সাজাবে যাতে গ্রাহক সহজেই পড়তে পারে
 * - অর্ডার লিংক সবসময় আলাদা লাইনে নিচে থাকবে
 */
export function formatWhatsAppReply(raw: string): string {
  const normalized = raw
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!normalized) return "";

  const greetingRegex = /^আসসালামু\s*আলাইকুম[!।,\s]*/u;

  // ইতিমধ্যে ভালোভাবে ফাঁকা লাইন (\n\n) দিয়ে সাজানো থাকলে শুধু সালাম ও লিংক নিশ্চিত করি
  if ((normalized.match(/\n\n/g) ?? []).length >= 2) {
    let text = normalized;
    if (!greetingRegex.test(text)) {
      text = `আসসালামু আলাইকুম!\n${text}`;
    } else {
      text = text.replace(/^আসসালামু\s*আলাইকুম[!।,]?\s+/u, "আসসালামু আলাইকুম!\n");
    }
    // প্যারাগ্রাফের ভেতরে লেগে থাকা লিংক আলাদা লাইনে নামানো
    text = text.replace(
      /[ \t]*(?:বিস্তারিত(?:\s+এখানে)?\s+দেখুন\s*[:ঃ]?\s*|লিংক\s*[:ঃ]?\s*)?(?:🔗\s*)?(https?:\/\/\S+)/gi,
      "\n\n🔗 $1",
    );
    return text.replace(/\n{3,}/g, "\n\n").trim();
  }

  // একটানা প্যারাগ্রাফ — লিংক আলাদা করে বাক্যগুলো সুন্দর ব্লকে ভাগ করি
  let working = normalized.replace(/\n+/g, " ").replace(/\s{2,}/g, " ").trim();
  let urlLine: string | null = null;
  const urlMatch = working.match(
    /(?:বিস্তারিত(?:\s+এখানে)?\s+দেখুন\s*[:ঃ]?\s*|অর্ডার\s+লিংক\s*[:ঃ]?\s*|লিংক\s*[:ঃ]?\s*)?(?:🔗\s*)?(https?:\/\/\S+)/i,
  );
  if (urlMatch) {
    const cleanUrl = urlMatch[1].replace(/[.,;!?]+$/, "");
    urlLine = `🔗 ${cleanUrl}`;
    working = working.replace(urlMatch[0], "").trim();
  }

  // শেষে ঝুলে থাকা ইমোজি (যেমন 😊) ধরে রাখা
  const trailingEmojiMatch = working.match(/\s*([\u{1F300}-\u{1FAFF}]+)$/u);
  const trailingEmoji = trailingEmojiMatch ? trailingEmojiMatch[1] : "";
  if (trailingEmojiMatch) {
    working = working.slice(0, trailingEmojiMatch.index).trim();
  }

  const hasGreeting = greetingRegex.test(working);
  if (hasGreeting) {
    working = working.replace(greetingRegex, "").trim();
  }

  const sentences = working
    .split(/(?<=[।!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const greetingExtras: string[] = [];
  const benefitLines: string[] = [];
  const detailLines: string[] = [];
  const ctaLines: string[] = [];

  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    if (i === 0 && /^(জি[,،\s]|ধন্যবাদ|হ্যালো|হাই)/u.test(s) && s.length <= 75) {
      greetingExtras.push(s.replace(/^জি[,،\s]+/u, "").trim());
    } else if (/(অর্ডার\s*করতে|অর্ডার\s*কনফার্ম|নাম[,،\s]*মোবাইল|ঠিকানা\s*(দিন|পাঠান|লিখুন))/u.test(s)) {
      ctaLines.push(s);
    } else if (/(দাম|৳|টাকা|ডিসকাউন্ট|ছা[ড়র]|ডেলিভারি|ওয়ারেন্টি|ওয়ারেন্টি)/u.test(s)) {
      detailLines.push(s);
    } else {
      benefitLines.push(s);
    }
  }

  const greetingBlock =
    greetingExtras.length > 0
      ? `আসসালামু আলাইকুম!${trailingEmoji ? ` ${trailingEmoji}` : ""}\n${greetingExtras.join(" ")}`
      : `আসসালামু আলাইকুম!${trailingEmoji ? ` ${trailingEmoji}` : ""}`;

  const blocks = [
    greetingBlock,
    benefitLines.join(" "),
    detailLines.join("\n"),
    ctaLines.join(" "),
    urlLine ?? "",
  ].filter(Boolean);

  return blocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}
