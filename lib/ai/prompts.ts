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
    "ছোট ভার্সন (অর্গানিক রিচ / ৪–৫ লাইন, সর্বোচ্চ ৫ লাইন): কখনো ২–৩ লাইনে শেষ করবে না! ঠিক ৪–৫ লাইনে সাজাবে — (১) প্রথম লাইন: স্ক্রল থামানো আকর্ষণীয় ভাইরাল হুক বা বাস্তব সমস্যার প্রশ্ন (২) দ্বিতীয় লাইন: <English product name> কীভাবে মূল সমস্যার সমাধান করে (৩) তৃতীয় ও চতুর্থ লাইন: ২টি মূল পয়েন্ট «✅ Short English Label - বাংলায় সমাধান/সুবিধা» (৪) শেষ লাইন: অর্গানিক কমেন্ট/ইনবক্স CTA।",
  problem:
    "সমস্যা-সমাধান ভার্সন: কাঠামো — (১) সমস্যার কথা (problemBn নিজের ভাষায়, হুবহু কপি নয়) (২) ফাঁকা লাইন (৩) «সমাধান: <solutionBn> — <English product name>।» (৪) ফাঁকা লাইন (৫) ২–৩টি ✅ বুলেট (৬) ফাঁকা লাইন (৭) CTA লাইন।",
};

export const RESPONSE_SCHEMA: Record<string, unknown> = {
  type: "OBJECT",
  properties: {
    image_caption: {
      type: "STRING",
      description: "লম্বা ফিড পোস্ট ক্যাপশন — হুক + প্রোডাক্টের ইংরেজি নাম + ৩–৫টি «✅ English Label - বাংলা সুবিধা» বুলেট + CTA, লাইন ভাঙা \\n দিয়ে।",
      maxLength: 900,
    },
    video_caption: {
      type: "OBJECT",
      properties: {
        hook: { type: "STRING", description: "১ লাইন (৯০ অক্ষরের কম) — আকর্ষণীয় অর্গানিক হুক বা বাস্তব সমস্যার প্রশ্ন যা স্ক্রল থামায়", maxLength: 130 },
        body: { type: "STRING", description: "ঠিক ৩ লাইন (\\n দিয়ে আলাদা): ১ম লাইনে প্রোডাক্টের ইংরেজি নাম ও মূল সমাধান, পরের ২ লাইনে ২টি «✅ Short English Label - বাংলা সুবিধা» বুলেট।", maxLength: 480 },
        cta: { type: "STRING", description: "শেষ লাইন — অর্গানিক কমেন্ট ট্রিগার বা ইনবক্স CTA", maxLength: 130 },
      },
      required: ["hook", "body", "cta"],
      propertyOrdering: ["hook", "body", "cta"],
    },
    problem_caption: {
      type: "STRING",
      description: "সমস্যা → সমাধান + প্রোডাক্টের নাম → ২–৩টি ✅ বুলেট → CTA, লাইন ভাঙা \\n দিয়ে।",
      maxLength: 900,
    },
    comment_keyword: {
      type: "STRING",
      description: "কমেন্ট ট্রিগার কীওয়ার্ড — প্রোডাক্টের সহজ ইংরেজি শব্দ (যেমন Chopper, Fan, Earbuds)",
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
  propertyOrdering: ["image_caption", "video_caption", "problem_caption", "comment_keyword", "hashtags", "poster"],
};

const GOLD_EXAMPLES = `উদাহরণ ১ (লম্বা ভার্সন — রিচার্জেবল মিনি ফ্যান):
ইমেজ: "লোডশেডিং-এ গরমে ঘুম ভেঙে যাওয়াটা সত্যিই বিরক্তিকর। এই ঝামেলা এড়াতে আমি এখন ব্যবহার করছি Rechargeable Mini Fan।\\n\\n✅ Long Battery Backup - এক চার্জেই ৬–৮ ঘণ্টা টানা বাতাস\\n✅ USB-C Fast Charging - পাওয়ার ব্যাংক বা চার্জার দিয়েই সহজে চার্জ\\n✅ 3 Speed Modes - প্রয়োজনমতো বাতাসের গতি কমানো-বাড়ানো যায়\\n\\nদাম ও অর্ডার লিংক পেতে কমেন্টে 'Fan' লিখুন বা সরাসরি ইনবক্স করুন 👇"

উদাহরণ ২ (ছোট ভার্সন / অর্গানিক রিচ — ঠিক ৪–৫ লাইন):
ভিডিও:
hook: "গেমিং বা মুভি দেখার সময় সাউন্ড ল্যাগ কি আপনার মুড নষ্ট করে দেয়? 🎧"
body: "এই ঝামেলার সেরা সমাধান FRB N-26 Wireless Neckband — টানা ব্যবহারেও নো ল্যাগ, ক্রিস্টাল ক্লিয়ার সাউন্ড!\\n✅ Bluetooth 5.4 Low Latency - গেমিং ও কলে জিরো ল্যাগ কানেকশন\\n✅ Digital Battery Display - চার্জ কতটুকু আছে সাথে সাথেই দেখা যায়"
cta: "দাম জানতে কমেন্টে 'Neckband' লিখুন অথবা ইনবক্স করুন 👇"

উদাহরণ ৩ (সমস্যা-সমাধান — রাইস কুকার):
প্রবলেম: "গ্যাসের চাপ কমে গেলে প্রতিবেলা রান্নায় বাড়তি সময় আর ঝামেলা পোহাতে হয়।\\n\\nসমাধান: এক সুইচেই ঝরঝরে ভাত, খিচুড়ি আর স্টিম — Electric Rice Cooker 1.8L।\\n\\n✅ Non-Stick Pot - তলায় লাগে না, ধোয়াও একদম সহজ\\n✅ Auto Keep Warm - রান্নার পর খাবার দীর্ঘক্ষণ গরম থাকে\\n\\nঅর্ডার করতে কমেন্টে 'Cooker' লিখুন অথবা ইনবক্স করুন 📩"

(উপরের উদাহরণ — হুবহু কপি করবে না, স্টাইল ও কাঠামো বুঝে নাও।)`;

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
