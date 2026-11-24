import { describe, expect, it, vi } from "vitest";

vi.mock("cloudflare:workers", () => ({ env: {} }));

import { firstBanglaSentence, mapUniStoreProduct } from "@/lib/sync";

describe("mapUniStoreProduct", () => {
  it("maps retail price, compareAt, highlights, primary image fallback, and enrich metadata without cost fields", () => {
    const mapped = mapUniStoreProduct(
      {
        id: "prod-uuid-1",
        title: "CYXG Q102 3-in-1 Wireless Earbuds",
        slug: "cyxg-q102-earbuds",
        sku: "  USB-Q102 ",
        price: 1290,
        regularPrice: 1650,
        salePrice: 1290,
        discountAmount: 360,
        discountPercent: 22,
        description: "🔥 দারুণ অডিও\nগান শোনা বা গেম খেলার সময় অডিওর মান খারাপ হওয়াটা মেজাজটাই নষ্ট করে দেয়। আরও তথ্য।",
        highlights: ["Smart 3-in-1 Design: একসাথে ৩ জোড়া ইয়ারবাডস", "LED Display: ব্যাটারি লেভেল দেখার সুবিধা"],
        primaryImage: null,
        images: [{ url: "https://ik.imagekit.io/pemifp53t/earbuds.jpg", isPrimary: false }],
        category: { name: "Audio", slug: "audio" },
        inStock: true,
        deliveryInfo: { warranty: "7 Days Replacement Warranty", cashOnDelivery: true },
        orderLinks: {
          productPage: "https://uniquestorebd.top/product/cyxg-q102-earbuds",
          hotline: "01608257876",
        },
        updatedAt: "2026-11-24T10:00:00.000Z",
      },
      "page_unique",
    );

    expect(mapped.sourceId).toBe("USB-Q102");
    expect(mapped.priceBdt).toBe(1290);
    expect(mapped.compareAtPriceBdt).toBe(1650);
    expect(mapped.offerText).toBe("Save ৳360 (22% OFF)");
    expect(mapped.imageUrl).toBe("https://ik.imagekit.io/pemifp53t/earbuds.jpg");
    expect(mapped.enrich.images).toEqual(["https://ik.imagekit.io/pemifp53t/earbuds.jpg"]);
    expect(mapped.features).toEqual(["একসাথে ৩ জোড়া ইয়ারবাডস", "ব্যাটারি লেভেল দেখার সুবিধা"]);
    expect(mapped.enrich.featureLabels).toEqual(["Smart 3-in-1 Design", "LED Display"]);
    expect(mapped.enrich.orderUrl).toBe("https://uniquestorebd.top/product/cyxg-q102-earbuds");
    expect(mapped.enrich.whatsapp).toBe("01608257876");
    expect(mapped.problemBn).toContain("গান শোনা বা গেম খেলার সময়");
  });

  it("handles zero price safely without NaN discount", () => {
    const mapped = mapUniStoreProduct(
      {
        id: "prod-2",
        slug: "sample",
        price: 0,
        discountAmount: 10,
      },
      "page_unique",
    );
    expect(mapped.offerText).toBe("Save ৳10 (0% OFF)");
    expect(mapped.category).toBe("অন্যান্য");
  });
});

describe("firstBanglaSentence", () => {
  it("picks the first clean Bangla sentence skipping emoji headings", () => {
    const text = "🔥 কেন নেবেন?\nগরমে আরাম পেতে মিনি ফ্যান দারুণ কাজের। দ্বিতীয় লাইন।";
    expect(firstBanglaSentence(text)).toBe("গরমে আরাম পেতে মিনি ফ্যান দারুণ কাজের");
  });
});
