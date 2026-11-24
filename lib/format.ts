const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function bn(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

export function bnNumber(value: number): string {
  return bn(new Intl.NumberFormat("en-IN").format(value));
}

export function taka(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  return `৳${bnNumber(value)}`;
}

const BN_MONTHS = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
];

const BN_WEEKDAYS = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];

/** ঢাকা (UTC+6) 기준 YYYY-MM-DD */
export function dhakaDate(date = new Date()): string {
  const shifted = new Date(date.getTime() + 6 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

export function dhakaTime(date = new Date()): string {
  const shifted = new Date(date.getTime() + 6 * 60 * 60 * 1000);
  return shifted.toISOString().slice(11, 16);
}

export function bnDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return `${bn(d.getUTCDate())} ${BN_MONTHS[d.getUTCMonth()]}`;
}

export function bnFullDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return `${BN_WEEKDAYS[d.getUTCDay()]}, ${bn(d.getUTCDate())} ${BN_MONTHS[d.getUTCMonth()]} ${bn(d.getUTCFullYear())}`;
}

export function bnRelative(iso: string | null): string {
  if (!iso) return "কখনো নয়";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "এইমাত্র";
  if (mins < 60) return `${bn(mins)} মিনিট আগে`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${bn(hours)} ঘণ্টা আগে`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${bn(days)} দিন আগে`;
  return bnDate(iso.slice(0, 10));
}

export function discountPercent(price: number, compareAt: number | null): number {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function excerpt(text: string, max = 120): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
