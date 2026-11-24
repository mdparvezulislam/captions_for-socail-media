import { bnNumber, taka } from "@/lib/format";
import type { CaptionType, Page, Product } from "@/lib/types";

export type Angle = "emotional" | "benefit" | "urgency";

export interface PromptInput {
  page: Page;
  product: Product;
  type: CaptionType;
  angle: Angle;
  avoid: string[];
}

export interface BuiltPrompt {
  system: string;
  user: string;
  responseSchema: Record<string, unknown>;
  promptVersion: string;
}

const ANGLE_BRIEF: Record<Angle, string> = {
  emotional: "আবেগ দিয়ে শুরু করো — গ্রাহকের ঝামেলা বা কষ্টটা মূর্ত করো, তারপর সমাধান।",
  benefit: "সরাসরি উপকার দিয়ে শুরু করো — কী লাভ হবে সেটা প্রথম লাইনেই।",
  urgency: "স্টক বা অফারের সীমাবদ্ধতা দিয়ে শুরু করো — কিন্তু বানিয়ে কিছু লিখবে না।",
};

const TYPE_BRIEF: Record<CaptionType, string> = {
  image:
    "লম্বা ভার্সন (ফিড পোস্ট): কাঠামো — (১) ১–২ লাইনে গ্রাহকের বাস্তব সমস্যা/পরিস্থিতি, শেষে «এই ঝামেলা এড়াতে আমি এখন ব্যবহার করছি <English product name>।» (২) ফাঁকা লাইন (৩) ৩–৫টি বুলেট, প্রতিটি ফরম্যাট: «✅ <ছোট English Feature Label> - <বাংলায় সুবিধা>» (৪) ফাঁকা লাইন (৫) CTA লাইন (নিচের টেমপ্লেট)। দাম বডিতে লিখবে না।",
  video:
    "ছোট ভার্সন (রিলস/ভিডিও): কাঠামো — (১) প্রশ্ন দিয়ে শুরু হুক + «আজই নিয়ে নিন <English product name>।» (২) ফাঁকা লাইন (৩) একটিমাত্র বুলেট «✅ <সবচেয়ে বড় সুবিধা বাংলায়>।» (৪) ফাঁকা লাইন (৫) CTA লাইন।",
  problem:
    "সমস্যা-সমাধান ভার্সন: কাঠামো — (১) সমস্যার কথা (problemBn নিজের ভাষায়, হুবহু কপি নয়) (২) ফাঁকা লাইন (৩) «সমাধান: <solutionBn> — <English product name>।» (৪) ফাঁকা লাইন (৫) ২–৩টি ✅ বুলেট (৬) ফাঁকা লাইন (৭) CTA লাইন।",
};

export const RESPONSE_SCHEMA: Record<string, unknown> = {
  type: "OBJECT",
  properties: {
    image_caption: {
      type: "STRING",
      description: "ছবির পোস্টের ক্যাপশন — ৪–৫ লাইন, ৪০–৭০ শব্দ, লাইন ভাঙা \\n দিয়ে।",
      maxLength: 700,
    },
    video_caption: {
      type: "OBJECT",
      properties: {
        hook: { type: "STRING", description: "১ লাইন, ৯০ অক্ষরের কম, স্ক্রল থামায়", maxLength: 120 },
        body: { type: "STRING", description: "২ লাইন — উপকার ও দাম/অফার", maxLength: 320 },
        cta: { type: "STRING", description: "শেষ লাইন, কাজ করতে বলো", maxLength: 120 },
      },
      required: ["hook", "body", "cta"],
      propertyOrdering: ["hook", "body", "cta"],
    },
    problem_caption: {
      type: "STRING",
      description: "সমস্যা → সমাধান → কেন এটাই → দাম → CTA, ৪–৫ লাইন",
      maxLength: 900,
    },
    comment_keyword: {
      type: "STRING",
      description: "কমেন্ট ট্রিগার কীওয়ার্ড — প্রোডাক্টের সহজ ইংরেজি শব্দ (যেমন Chopper, Fan)",
      maxLength: 20,
    },
    hashtags: {
      type: "ARRAY",
      description: "৫–৭টি হ্যাশট্যাগ, প্রতিটি # দিয়ে শুরু",
      items: { type: "STRING" },
      minItems: 5,
      maxItems: 7,
    },
    poster: {
      type: "OBJECT",
      properties: {
        headline: { type: "STRING", description: "পোস্টারের বড় লেখা, ২৮ অক্ষরের কম", maxLength: 32 },
        subline: { type: "STRING", description: "ছোট সাব-লাইন, ৪০ অক্ষরের কম", maxLength: 44 },
        badge: { type: "STRING", description: "ব্যাজ, যেমন ২৩% OFF বা নতুন", maxLength: 14 },
        cta: { type: "STRING", description: "ছোট CTA, ২০ অক্ষরের কম", maxLength: 24 },
      },
      required: ["headline", "subline", "badge", "cta"],
      propertyOrdering: ["headline", "subline", "badge", "cta"],
    },
  },
  required: ["image_caption", "video_caption", "problem_caption", "comment_keyword", "hashtags", "poster"],
  propertyOrdering: ["image_caption", "video_caption", "problem_caption", "hashtags", "poster"],
};

const GOLD_EXAMPLES = `উদাহরণ ১ (রিচার্জেবল ফ্যান, দাম ৳১,২৯০, আগে ৳১,৬৯০):
ইমেজ: "লোডশেডিং-এ ঘুম ভাঙে? আর নয় 🔥\\nফুল চার্জে ৬–৮ ঘণ্টা বাতাস — বিদ্যুৎ না থাকলেও ঠান্ডা।\\nUSB-C চার্জিং, ৩ স্পিড, মাত্র ৭২০ গ্রাম।\\n💰 ৳১,২৯০ · আগে ৳১,৬৯০ · 📦 ফ্রি ডেলিভারি\\nঅর্ডার করতে ইনবক্স করুন 👇"

উদাহরণ ২ (রাইস কুকার, দাম ৳২,৪৫০):
প্রবলেম: "গ্যাসের দাম বাড়ছে, প্রতিবার ভাত রান্নায় ঝামেলা।\\nসমাধান: একবার সেট করলেই ভাত, খিচুড়ি, স্টিম — বিদ্যুৎ খরচ কম।\\nনন-স্টিক পট, তাই ধোয়াও সহজ।\\nআজ ৳২,৪৫০-এ, ২ বছরের ওয়ারেন্টি।\\nঅর্ডার করতে মেসেজ দিন 📩"

(উপরের উদাহরণ — হুবহু কপি করবে না, স্টাইল বুঝে নাও।)`;

function productFacts(product: Product): string {
  return JSON.stringify(
    {
      নাম: product.nameBn,
      ইংরেজি_নাম: product.enrich?.nameEn ?? null,
      কমেন্ট_কীওয়ার্ড: product.enrich?.keyword ?? null,
      ফিচার_লেবেল_ইংরেজি: product.enrich?.featureLabels ?? null,
      ক্যাটাগরি: product.category,
      দাম: taka(product.priceBdt),
      আগের_দাম: product.compareAtPriceBdt ? taka(product.compareAtPriceBdt) : null,
      স্টক: product.stock,
      অফার: product.offerText,
      ফিচার: product.features,
      সমস্যা: product.problemBn,
      সমাধান: product.solutionBn,
      মেটেরিয়াল: product.material,
      টার্গেট_গ্রাহক: product.targetAudience,
      ট্যাগ: product.tags,
    },
    null,
    2,
  );
}

export function buildPrompt(input: PromptInput): BuiltPrompt {
  const { page, product, type, angle, avoid } = input;

  const system = `তুমি বাংলাদেশের একজন সিনিয়র সোশ্যাল মিডিয়া কপিরাইটার। তুমি ই-কমার্স ব্র্যান্ডের ফেসবুক পেজের জন্য বাংলা ক্যাপশন লেখো। তোমার লেখা মানুষের মুখের ভাষার মতো শোনায় — বিজ্ঞাপনের মতো নয়।

কঠিন নিয়ম:
১. ভাষা: স্বাভাবিক কথ্য বাংলা, প্রমিত বানান। হিন্দি শব্দ নয় ("করনা", "হ্যায়" নিষেধ)। যান্ত্রিক অনুবাদের গন্ধ থাকবে না।
২. ইংরেজি শব্দ শুধু যেখানে বাংলাদেশিরা সত্যিই বলে: অর্ডার, ডেলিভারি, কোয়ালিটি, স্টক, ক্যাশ অন ডেলিভারি, রিচার্জেবল।
৩. কোনো তথ্য বানিয়ে লিখবে না। দাম, ছাড়, ওয়ারেন্টি, ডেলিভারি সময়, স্টক — শুধু দেওয়া ডেটা থেকে। ডেটা না থাকলে উল্লেখ করবে না।
৩ক. দাম ক্যাপশনের ভেতরে লিখবে না — দাম ইনবক্সে যায় (CTA টেমপ্লেট ব্যবহার করবে)।
৩খ. ফিচার বুলেটের লেবেল ছোট ইংরেজিতে (যেমন Fast Chopping), ব্যাখ্যা বাংলায় — এতে পোস্ট প্রিমিয়াম দেখায়।
৪. চিকিৎসা-সংক্রান্ত দাবি নিষেধ। "১০০% গ্যারান্টি", "সরকারি", "রোগ সারায়", "ক্যান্সার", "ডায়াবেটিস" — এসব শব্দ বা দাবি কখনো লিখবে না।
৫. ইমোজি সর্বোচ্চ ৪–৫টি, ছড়িয়ে দেবে; লাইনের পর লাইনে ইমোজি নয়।
৬. হ্যাশট্যাগ ক্যাপশনের ভেতরে নয় — আলাদা তালিকায় দেবে।
৭. সম্বোধন "আপনি", যদি পেজ-ভয়েসে অন্যথা না বলা থাকে।
৮. প্রতিটি ক্যাপশনে একটাই স্পষ্ট CTA থাকবে।

জেন্ডার/ধর্ম/রাজনীতি নিয়ে কোনো মন্তব্য নয়। প্রতিযোগীর নাম নয়।`;

  const user = `পেজের ব্র্যান্ড:
নাম: ${page.brandName}
ট্যাগলাইন: ${page.tagline}
ভয়েস: ${page.voice}
পছন্দের CTA: ${page.ctaText}
বেস হ্যাশট্যাগ: ${page.hashtags.join(" ")}

প্রোডাক্টের তথ্য (JSON):
${productFacts(product)}

${GOLD_EXAMPLES}

এবার লেখার কাজ:
- ধরন: ${TYPE_BRIEF[type]}
- অ্যাঙ্গেল: ${ANGLE_BRIEF[angle]}
- দাম সবসময় বাংলা অঙ্কে: ${taka(product.priceBdt)}${product.compareAtPriceBdt ? ` (আগে ${taka(product.compareAtPriceBdt)})` : ""}
- স্টক ${bnNumber(product.stock)} — স্টক কম হলে (৫ বা তার কম) তবেই সীমিত স্টকের কথা বলবে।

${
  avoid.length > 0
    ? `এই ক্যাপশনগুলো আগেই ব্যবহার হয়েছে — এগুলোর মতো নয়, একেবারে ভিন্নভাবে শুরু করো:\n${avoid
        .slice(0, 8)
        .map((body, index) => `${index + 1}. ${body.replace(/\s+/g, " ").slice(0, 220)}`)
        .join("\n")}`
    : "এটি নতুন ক্যাপশন — আগের ধাঁচ এড়িয়ে চলো।"
}

শুধু JSON ফেরত দাও, কোনো ব্যাখ্যা বা মার্কডাউন নয়।`;

  return { system, user, responseSchema: RESPONSE_SCHEMA, promptVersion: "bn-caption-v1" };
}
