import { demoCaptionSet, demoPosterCopy } from "@/lib/ai/demo";
import { dhakaDate } from "@/lib/format";
import type { BrandKit, Page, Product } from "@/lib/types";

interface BaseProduct {
  key: string;
  name: string;
  category: string;
  price: number;
  compareAt: number;
  stock: number;
  offer: string;
  features: string[];
  problem: string;
  solution: string;
  material: string;
  audience: string;
  tags: string[];
}

const BASE: BaseProduct[] = [
  {
    key: "mini-fan",
    name: "রিচার্জেবল মিনি ফ্যান",
    category: "ফ্যান",
    price: 1290,
    compareAt: 1690,
    stock: 42,
    offer: "সারা দেশে ফ্রি ডেলিভারি",
    features: ["ফুল চার্জে ৬–৮ ঘণ্টা ব্যাকআপ", "USB-C চার্জিং", "৩ স্পিড", "মাত্র ৭২০ গ্রাম"],
    problem: "লোডশেডিং-এ গরমে ঘুম হয় না, বাতাসের অভাবে সারাদিন ক্লান্তি",
    solution: "ফুল চার্জে ৬–৮ ঘণ্টা ঠান্ডা বাতাস, বিদ্যুৎ ছাড়াই",
    material: "ABS বডি + ব্রাশলেস মোটর",
    audience: "ছাত্র, চাকরিজীবী, ট্রাভেলার",
    tags: ["লোডশেডিং", "মিনিফ্যান", "গরম"],
  },
  {
    key: "rice-cooker",
    name: "ইলেকট্রিক রাইস কুকার ১.৮ লিটার",
    category: "কিচেন",
    price: 2450,
    compareAt: 3200,
    stock: 28,
    offer: "২ বছরের ওয়ারেন্টি",
    features: ["১.৮ লিটার ধারণক্ষমতা", "নন-স্টিক ইন্টেরিয়র পট", "অটো কিপ-ওয়ার্ম", "৬ জনের ভাত একসাথে"],
    problem: "গ্যাসের দাম বাড়ায় প্রতিদিনের রান্নার খরচ বাড়ছে",
    solution: "একবার সেট করলেই ভাত, খিচুড়ি, স্টিম — বিদ্যুৎ খরচ অনেক কম",
    material: "স্টেইনলেস স্টিল + নন-স্টিক কোটিং",
    audience: "ছোট পরিবার, ব্যাচেলর",
    tags: ["রাইসকুকার", "রান্না", "কিচেন"],
  },
  {
    key: "blender",
    name: "স্টেইনলেস স্টিল ব্লেন্ডার (২ জার)",
    category: "কিচেন",
    price: 3150,
    compareAt: 4200,
    stock: 15,
    offer: "ক্যাশ অন ডেলিভারি",
    features: ["৬০০ ওয়াট মোটর", "২টি জার — ব্লেন্ড ও গ্রাইন্ড", "স্টেইনলেস স্টিল ব্লেড", "ওভারলোড প্রোটেকশন"],
    problem: "মসলা বাটতে দেরি হয়, ব্লেড ভোঁতা হয়ে যায়",
    solution: "৬০০ ওয়াট মোটরে ৩০ সেকেন্ডে মসলা গুঁড়ো",
    material: "ABS বডি + স্টেইনলেস ব্লেড",
    audience: "রান্না করা পরিবার",
    tags: ["ব্লেন্ডার", "মসলা", "কিচেন"],
  },
  {
    key: "water-filter",
    name: "৭ স্তরের ওয়াটার ফিল্টার",
    category: "হোম",
    price: 1890,
    compareAt: 2500,
    stock: 33,
    offer: "ইনস্টলেশন ফ্রি",
    features: ["৭ স্তরের ফিল্ট্রেশন", "১২ লিটার ধারণক্ষমতা", "RO + UV", "ফিল্টার বদল সহজ"],
    problem: "টিউবওয়েলের পানিতে লোহার গন্ধ আর পোকা",
    solution: "৭ স্তরে ফিল্টার করে পানিকে নিরাপদ ও গন্ধহীন করে",
    material: "খাদ্য-গ্রেড প্লাস্টিক",
    audience: "পরিবার, অফিস",
    tags: ["ওয়াটারফিল্টার", "বিশুদ্ধপানি", "হোম"],
  },
  {
    key: "mosquito-killer",
    name: "ইলেকট্রিক মশা মারার লাইট",
    category: "হোম",
    price: 990,
    compareAt: 1350,
    stock: 60,
    offer: "২টি কিনলে ১টি ফ্রি",
    features: ["UV লাইট অ্যাট্রাকশন", "নীরব ফ্যান", "ইনডোর ও আউটডোর", "কম বিদ্যুৎ খরচ"],
    problem: "রাতে মশার কামড়ে ঘুম হয় না, বাচ্চাদের গায়ে দাগ",
    solution: "UV লাইটে মশা টেনে নীরবে শেষ করে, কোনো কেমিক্যাল নেই",
    material: "ABS",
    audience: "পরিবার, বাচ্চা থাকা বাড়ি",
    tags: ["মশা", "লাইট", "হোম"],
  },
  {
    key: "smart-watch",
    name: "স্মার্ট ওয়াচ T900",
    category: "গ্যাজেট",
    price: 1650,
    compareAt: 2400,
    stock: 22,
    offer: "ফ্রি স্ট্র্যাপ",
    features: ["ব্লুটুথ কলিং", "হার্ট রেট + SpO2", "১.৯ ইঞ্চি ডিসপ্লে", "৭ দিন ব্যাটারি"],
    problem: "ফোন হাতে না থাকলেও জরুরি কল মিস হয়ে যায়",
    solution: "হাতে থেকেই কল, নোটিফিকেশন আর হেলথ ট্র্যাকিং",
    material: "অ্যালয় বডি + সিলিকন স্ট্র্যাপ",
    audience: "তরুণ, অফিসগামী",
    tags: ["স্মার্টওয়াচ", "গ্যাজেট", "স্মার্টলাইফ"],
  },
  {
    key: "power-bank",
    name: "পাওয়ার ব্যাংক ২০০০০mAh",
    category: "গ্যাজেট",
    price: 1750,
    compareAt: 2300,
    stock: 38,
    offer: "ফাস্ট চার্জিং কেবল ফ্রি",
    features: ["২০০০০mAh", "২২.৫W ফাস্ট চার্জ", "ডুয়াল আউটপুট", "ডিজিটাল ডিসপ্লে"],
    problem: "বাইরে বের হলেই ফোনের চার্জ শেষ, লোডশেডিং-এ আরও ঝামেলা",
    solution: "৩–৪ বার ফুল চার্জ, ল্যাপটপও চার্জ করা যায়",
    material: "লিথিয়াম পলিমার",
    audience: "ট্রাভেলার, ছাত্র",
    tags: ["পাওয়ারব্যাংক", "চার্জিং", "গ্যাজেট"],
  },
  {
    key: "hair-dryer",
    name: "হেয়ার ড্রায়ার ২০০০W",
    category: "বিউটি",
    price: 1150,
    compareAt: 1600,
    stock: 25,
    offer: "ফ্রি নজেল",
    features: ["২০০০ ওয়াট", "২ স্পিড + ২ হিট", "কুল শট", "ফোল্ডেবল হ্যান্ডেল"],
    problem: "ভেজা চুলে সকালে বের হতে দেরি হয়ে যায়",
    solution: "৫ মিনিটে চুল শুকিয়ে সেট, বারবার পার্লারে যেতে হয় না",
    material: "ABS + সিরামিক গ্রিল",
    audience: "মেয়ে, পার্লার",
    tags: ["হেয়ারড্রায়ার", "বিউটি", "সেলুন"],
  },
  {
    key: "knife-set",
    name: "কিচেন নাইফ সেট (৫ পিস)",
    category: "কিচেন",
    price: 1450,
    compareAt: 1990,
    stock: 18,
    offer: "ফ্রি স্ট্যান্ড",
    features: ["স্টেইনলেস স্টিল ব্লেড", "কাঠের হাতল", "৫টি চাকু + স্ট্যান্ড", "ধারালো ও টেকসই"],
    problem: "পুরনো চাকুতে সবজি কাটতে জোর লাগে, রান্নায় সময় নষ্ট",
    solution: "তীক্ষ্ণ ব্লেডে দ্রুত কাটা, কম পরিশ্রমে রান্না",
    material: "স্টেইনলেস স্টিল + কাঠ",
    audience: "রান্না করা পরিবার",
    tags: ["নাইফ", "কিচেন", "রান্না"],
  },
  {
    key: "stroller",
    name: "বেবি স্ট্রলার (ফোল্ডেবল)",
    category: "বেবি",
    price: 5600,
    compareAt: 7500,
    stock: 9,
    offer: "ফ্রি হোম ডেলিভারি",
    features: ["এক হাতে ফোল্ড", "৫-পয়েন্ট সেফটি বেল্ট", "শক-অ্যাবজর্বিং হুইল", "সানশেড ক্যানোপি"],
    problem: "বাচ্চা নিয়ে বাইরে বের হওয়া কষ্টকর, কোলে নিয়ে হাঁটা ক্লান্তিকর",
    solution: "হালকা ফোল্ডেবল স্ট্রলারে বাচ্চা নিরাপদে ঘুরতে পারে",
    material: "অ্যালুমিনিয়াম ফ্রেম",
    audience: "নতুন বাবা-মা",
    tags: ["স্ট্রলার", "বেবি", "প্যারেন্টিং"],
  },
];

interface PageSeed {
  slug: string;
  name: string;
  tagline: string;
  voice: string;
  ctaText: string;
  hashtags: string[];
  dailyCount: number;
  repeatGapDays: number;
  brand: BrandKit;
  priceFactor: number;
  sourcePrefix: string;
}

const PAGES: PageSeed[] = [
  {
    slug: "unique-store-bd",
    name: "Unique Store BD",
    tagline: "ঘরের প্রয়োজন, এক জায়গায়",
    voice: "বন্ধুত্বপূর্ণ ও ভরসার, «আপনি» সম্বোধন। ছোট বাক্য, বাস্তব উপকারের কথা।",
    ctaText: "অর্ডার করতে ইনবক্স করুন",
    hashtags: ["#UniqueStoreBD", "#ঘরেরপ্রয়োজন", "#ক্যাশঅনডেলিভারি"],
    dailyCount: 5,
    repeatGapDays: 14,
    brand: {
      primary: "#1C1917",
      accent: "#E5632A",
      surface: "#FBF7F1",
      ink: "#191512",
      logoMark: "ইউ",
      watermark: "uniquestorebd.com",
      font: "anek",
      layout: "editorial",
    },
    priceFactor: 1,
    sourcePrefix: "USB",
  },
  {
    slug: "nn-enterprise",
    name: "NN Enterprise",
    tagline: "পাইকারি ও খুচরা সরবরাহ",
    voice: "সরাসরি ও পেশাদার, দাম ও স্টকের তথ্য স্পষ্ট।",
    ctaText: "কল করুন: ০১৭০০-০০০০০০",
    hashtags: ["#NNEnterprise", "#পাইকারিদাম", "#হোমডেলিভারি"],
    dailyCount: 5,
    repeatGapDays: 10,
    brand: {
      primary: "#0B2A3B",
      accent: "#0E7C66",
      surface: "#F2F7F5",
      ink: "#0E1F27",
      logoMark: "NN",
      watermark: "nnenterprise.bd",
      font: "anek",
      layout: "bold",
    },
    priceFactor: 0.92,
    sourcePrefix: "NNE",
  },
  {
    slug: "gadget-bazar",
    name: "Gadget Bazar",
    tagline: "গ্যাজেটে সেরা দাম",
    voice: "এনার্জেটিক ও টেক-স্যাভি, তরুণ অডিয়েন্সের জন্য।",
    ctaText: "অর্ডার করতে মেসেজ দিন",
    hashtags: ["#GadgetBazar", "#গ্যাজেট", "#স্মার্টলাইফ"],
    dailyCount: 4,
    repeatGapDays: 7,
    brand: {
      primary: "#14213D",
      accent: "#F0A202",
      surface: "#F7F6F2",
      ink: "#111827",
      logoMark: "GB",
      watermark: "gadgetbazar.com",
      font: "anek",
      layout: "minimal",
    },
    priceFactor: 1.08,
    sourcePrefix: "GBZ",
  },
];

const roundPrice = (value: number) => Math.round(value / 10) * 10;

export function buildPages(): Page[] {
  const now = new Date().toISOString();
  return PAGES.map((page, index) => ({
    id: `page_${index + 1}`,
    name: page.name,
    slug: page.slug,
    brandName: page.name,
    tagline: page.tagline,
    voice: page.voice,
    ctaText: page.ctaText,
    hashtags: page.hashtags,
    dailyCount: page.dailyCount,
    repeatGapDays: page.repeatGapDays,
    brand: page.brand,
    isActive: true,
    createdAt: now,
  }));
}

export function buildProducts(): Product[] {
  const now = new Date();
  const products: Product[] = [];
  PAGES.forEach((page, pageIndex) => {
    BASE.forEach((base, productIndex) => {
      const price = roundPrice(base.price * page.priceFactor);
      const compareAt = roundPrice(base.compareAt * page.priceFactor);
      const stockShift = ((pageIndex + productIndex) % 5) * 3;
      products.push({
        id: `prod_${pageIndex + 1}_${productIndex + 1}`,
        pageId: `page_${pageIndex + 1}`,
        sourceId: `${page.sourcePrefix}-${1000 + productIndex}`,
        nameBn: base.name,
        category: base.category,
        priceBdt: price,
        compareAtPriceBdt: compareAt > price ? compareAt : null,
        stock: Math.max(2, base.stock - stockShift + pageIndex),
        offerText: base.offer,
        features: base.features,
        problemBn: base.problem,
        solutionBn: base.solution,
        material: base.material,
        targetAudience: base.audience,
        tags: base.tags,
        imageUrl: null,
        artSeed: `${page.slug}-${base.key}`,
        isActive: true,
        sourceUpdatedAt: new Date(now.getTime() - productIndex * 36e5).toISOString(),
        createdAt: new Date(now.getTime() - (productIndex + 1) * 864e5).toISOString(),
      });
    });
  });
  return products;
}

interface Statement {
  sql: string;
  params: unknown[];
}

export async function seedDatabase(db: D1Database): Promise<void> {
  const existing = await db.prepare("SELECT COUNT(*) AS n FROM pages").first<{ n: number }>();
  if (existing && existing.n > 0) return;

  const now = new Date();
  const yesterday = dhakaDate(new Date(now.getTime() - 864e5));
  const pages = buildPages();
  const products = buildProducts();
  const statements: Statement[] = [];
  const push = (sql: string, ...params: unknown[]) => statements.push({ sql, params });

  for (const page of pages) {
    push(
      `INSERT OR IGNORE INTO pages
       (id, name, slug, brand_name, tagline, voice, cta_text, hashtags_json, daily_count, repeat_gap_days, brand_json, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      page.id,
      page.name,
      page.slug,
      page.brandName,
      page.tagline,
      page.voice,
      page.ctaText,
      JSON.stringify(page.hashtags),
      page.dailyCount,
      page.repeatGapDays,
      JSON.stringify(page.brand),
      page.isActive ? 1 : 0,
      page.createdAt,
    );
  }

  for (const product of products) {
    push(
      `INSERT OR IGNORE INTO products
       (id, page_id, source_id, name_bn, category, price_bdt, compare_at_price_bdt, stock, offer_text,
        features_json, problem_bn, solution_bn, material, target_audience, tags_json, image_url, art_seed,
        is_active, source_updated_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      product.id,
      product.pageId,
      product.sourceId,
      product.nameBn,
      product.category,
      product.priceBdt,
      product.compareAtPriceBdt,
      product.stock,
      product.offerText,
      JSON.stringify(product.features),
      product.problemBn,
      product.solutionBn,
      product.material,
      product.targetAudience,
      JSON.stringify(product.tags),
      product.imageUrl,
      product.artSeed,
      product.isActive ? 1 : 0,
      product.sourceUpdatedAt,
      product.createdAt,
    );
  }

  const members: [string, string, string, string, string[]][] = [
    ["mem_1", "রাকিব হাসান", "owner@uniquestore.bd", "owner", ["page_1", "page_2", "page_3"]],
    ["mem_2", "নুসরাত জাহান", "nusrat@uniquestore.bd", "moderator", ["page_1", "page_3"]],
    ["mem_3", "তানভীর আহমেদ", "tanvir@nnenterprise.bd", "moderator", ["page_2"]],
    ["mem_4", "সাদিয়া ইসলাম", "sadia@uniquestore.bd", "admin", ["page_1", "page_2"]],
  ];
  for (const [id, name, email, role, pageIds] of members) {
    push(
      `INSERT OR IGNORE INTO members (id, name, email, role, page_ids_json, last_active_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id,
      name,
      email,
      role,
      JSON.stringify(pageIds),
      new Date(now.getTime() - 36e5).toISOString(),
      now.toISOString(),
    );
  }

  // Yesterday's published history — makes the library feel alive and proves the no-repeat rule.
  const historyByPage: Record<string, string[]> = {
    page_1: ["prod_1_1", "prod_1_4"],
    page_2: ["prod_2_6", "prod_2_7"],
    page_3: [],
  };
  const productById = new Map(products.map((p) => [p.id, p]));
  const pageById = new Map(pages.map((p) => [p.id, p]));

  for (const [pageId, productIds] of Object.entries(historyByPage)) {
    const page = pageById.get(pageId);
    if (!page) continue;
    for (const productId of productIds) {
      const product = productById.get(productId);
      if (!product) continue;
      for (const [index, item] of demoCaptionSet(product, page).entries()) {
        push(
          `INSERT OR IGNORE INTO captions
           (id, page_id, product_id, run_date, batch, position, type, body, hashtags_json, meta_json, status, model,
            tokens_in, tokens_out, similarity, created_at, posted_at, posted_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          `cap_seed_${productId}_${item.type}`,
          pageId,
          productId,
          yesterday,
          1,
          index,
          item.type,
          item.body,
          JSON.stringify(page.hashtags),
          JSON.stringify({ ...item.meta, poster: demoPosterCopy(product, page) }),
          "posted",
          "demo",
          0,
          0,
          0,
          new Date(now.getTime() - 864e5).toISOString(),
          new Date(now.getTime() - 82e6).toISOString(),
          "mem_1",
        );
      }
    }
  }

  for (let i = 0; i < statements.length; i += 40) {
    const chunk = statements.slice(i, i + 40);
    await db.batch(chunk.map(({ sql, params }) => db.prepare(sql).bind(...params)));
  }
}
