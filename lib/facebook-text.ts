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
  upper: 0x1d5ec, // MATHEMATICAL SANS-SERIF BOLD CAPITAL A
  lower: 0x1d606, // MATHEMATICAL SANS-SERIF BOLD SMALL A
  digit: 0x1d7ec, // MATHEMATICAL SANS-SERIF BOLD DIGIT ZERO
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
