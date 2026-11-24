import { describe, expect, it } from "vitest";
import { captionCopyText, groupOrderBlock, imageSrcFor } from "@/lib/facebook-text";

describe("groupOrderBlock", () => {
  it("includes order link, hotline, delivery and warranty", () => {
    const block = groupOrderBlock({
      orderUrl: "https://uniquestorebd.top/product/x",
      whatsapp: "01608257876",
      warranty: "7 Days Replacement Warranty",
    });
    expect(block).toContain("🛒 অর্ডার লিংক: https://uniquestorebd.top/product/x");
    expect(block).toContain("📞 হটলাইন / WhatsApp: 01608257876");
    expect(block).toContain("🚚 ঢাকায় ৳৬০");
    expect(block).toContain("🛡️ 7 Days Replacement Warranty");
  });

  it("still includes delivery when only partial data exists", () => {
    const block = groupOrderBlock({});
    expect(block).toContain("১০০% ক্যাশ অন ডেলিভারি");
    expect(block).not.toContain("🛒");
  });
});

describe("imageSrcFor", () => {
  it("proxies real catalog images", () => {
    expect(imageSrcFor({ imageUrl: "https://ik.imagekit.io/x/a.webp", artSeed: "s", id: "1" })).toBe(
      "/api/image?url=https%3A%2F%2Fik.imagekit.io%2Fx%2Fa.webp",
    );
  });

  it("falls back to generated art", () => {
    expect(imageSrcFor({ imageUrl: null, artSeed: "seed", id: "p1" })).toBe("/api/art/seed");
    expect(imageSrcFor({ artSeed: "", id: "p2" })).toBe("/api/art/p2");
  });
});

describe("captionCopyText group flow", () => {
  it("keeps hashtags styleable-free", () => {
    const text = captionCopyText("লেখা", ["#Fan", "#Store"], { facebookBold: false });
    expect(text.endsWith("#Fan #Store")).toBe(true);
  });
});
