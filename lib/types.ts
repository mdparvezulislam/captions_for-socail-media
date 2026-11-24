export type CaptionType = "image" | "video" | "problem";

export type CaptionStatus = "draft" | "ready" | "edited" | "posted" | "rejected" | "failed";

export interface BrandKit {
  primary: string;
  accent: string;
  surface: string;
  ink: string;
  logoMark: string;
  watermark: string;
  font: "anek" | "hind" | "baloo";
  layout: "editorial" | "bold" | "minimal";
}

export interface Page {
  id: string;
  name: string;
  slug: string;
  brandName: string;
  tagline: string;
  voice: string;
  ctaText: string;
  hashtags: string[];
  dailyCount: number;
  repeatGapDays: number;
  brand: BrandKit;
  isActive: boolean;
  createdAt: string;
}

export interface ProductEnrich {
  nameEn?: string;
  keyword?: string;
  featureLabels?: string[];
  orderUrl?: string;
  whatsapp?: string;
  warranty?: string;
}

export interface Product {
  id: string;
  pageId: string;
  sourceId: string;
  nameBn: string;
  category: string;
  priceBdt: number;
  compareAtPriceBdt: number | null;
  stock: number;
  offerText: string | null;
  features: string[];
  problemBn: string;
  solutionBn: string;
  material: string | null;
  targetAudience: string | null;
  tags: string[];
  imageUrl: string | null;
  artSeed: string;
  enrich?: ProductEnrich | null;
  isActive: boolean;
  sourceUpdatedAt: string | null;
  createdAt: string;
}

export interface PosterCopy {
  headline: string;
  subline: string;
  badge: string;
  cta: string;
}

export interface CaptionMeta {
  hook?: string;
  cta?: string;
  keyword?: string;
  angle?: string;
  source?: "gemini" | "demo";
  poster?: PosterCopy;
}

export interface Caption {
  id: string;
  pageId: string;
  productId: string;
  runDate: string;
  batch: number;
  type: CaptionType;
  body: string;
  hashtags: string[];
  meta: CaptionMeta;
  status: CaptionStatus;
  model: string;
  tokensIn: number;
  tokensOut: number;
  createdAt: string;
  postedAt: string | null;
  product?: Product;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "moderator";
  pageIds: string[];
  lastActiveAt: string | null;
}

export interface FeedItem {
  caption: Caption;
  product: Product;
}

export interface BatchInfo {
  id: string;
  batch: number;
  createdAt: string;
  count: number;
  ready: number;
}

export interface Session {
  email: string;
  name: string;
  role: Member["role"];
  isDemo: boolean;
}

export interface GenerationResult {
  ok: boolean;
  captions: Caption[];
  error?: string;
  demoMode: boolean;
}

export const CAPTION_TYPES: { type: CaptionType; label: string; short: string; hint: string }[] = [
  { type: "image", label: "ইমেজ ক্যাপশন", short: "ইমেজ", hint: "ফিডে ছবির সাথে" },
  { type: "video", label: "ভিডিও ক্যাপশন", short: "ভিডিও", hint: "রিলস / ভিডিওর জন্য" },
  { type: "problem", label: "প্রবলেম-সলিউশন", short: "সমস্যা", hint: "গল্পের ছলে বিক্রি" },
];

export const STATUS_LABEL: Record<CaptionStatus, string> = {
  draft: "খসড়া",
  ready: "রেডি",
  edited: "এডিটেড",
  posted: "পোস্ট হয়েছে",
  rejected: "বাতিল",
  failed: "ব্যর্থ",
};
