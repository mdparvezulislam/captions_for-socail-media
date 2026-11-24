import { describe, expect, it } from "vitest";
import { captionCopyText, deriveKeyword, formatForFacebook, toBold } from "@/lib/facebook-text";

describe("toBold", () => {
  it("maps Latin letters and digits to mathematical bold", () => {
    const cps = (input: string) => Array.from(input).map((c) => c.codePointAt(0));
    // F a s t -> Mathematical Sans-Serif Bold
    expect(cps(toBold("Fast"))).toEqual([0x1d5f1, 0x1d606, 0x1d618, 0x1d619]);
    expect(cps(toBold("T900"))).toEqual([0x1d5ff, 0x1d7f5, 0x1d7ec, 0x1d7ec]);
  });

  it("leaves Bangla, emoji and symbols untouched", () => {
    expect(toBold("ফ্যান ✅ ৳")).toBe("ফ্যান ✅ ৳");
  });
});

describe("formatForFacebook", () => {
  const body = [
    "পেঁয়াজ কাটতে চোখে পানি আসে। এই ঝামেলা এড়াতে আমি ব্যবহার করছি Rechargeable Mini Chopper।",
    "",
    "✅ Fast Chopping - কয়েক সেকেন্ডেই কুটে ফেলে",
    "✅ Wireless - USB চার্জ",
    "",
    "কমেন্টে 'Chopper' লিখুন। দাম আর অর্ডার লিংক ইনবক্সে দিয়ে দিচ্ছি।",
  ].join("\n");

  it("bolds English runs but keeps Bangla and bullets readable", () => {
    const formatted = formatForFacebook(body);
    expect(formatted).toContain(toBold("Rechargeable Mini Chopper"));
    expect(formatted).toContain(`✅ ${toBold("Fast Chopping")} - কয়েক সেকেন্ডেই কুটে ফেলে`);
    expect(formatted).toContain("পেঁয়াজ কাটতে চোখে পানি আসে");
    expect(formatted).toContain(`'${toBold("Chopper")}'`);
  });

  it("never styles hashtag lines", () => {
    const formatted = formatForFacebook("#ElectricChopper #UniqueStoreBD");
    expect(formatted).toBe("#ElectricChopper #UniqueStoreBD");
  });

  it("returns plain text when bold is off", () => {
    expect(formatForFacebook("Fast Chopping", { bold: false })).toBe("Fast Chopping");
  });
});

describe("captionCopyText", () => {
  it("appends hashtags outside the styled zone", () => {
    const text = captionCopyText("দামে কম 𝗫", ["#Fan", "#Store"], { facebookBold: false });
    expect(text).toBe("দামে কম 𝗫\n\n#Fan #Store");
  });

  it("excludes hashtags when asked", () => {
    const text = captionCopyText("লেখা", ["#Fan"], { includeHashtags: false });
    expect(text).toBe("লেখা");
  });
});

describe("deriveKeyword", () => {
  it("uses the last English word in the name", () => {
    expect(deriveKeyword("স্মার্ট ওয়াচ T900", "গ্যাজেট")).toBe("T900");
  });

  it("falls back to a category map", () => {
    expect(deriveKeyword("রিচার্জেবল মিনি ফ্যান", "ফ্যান")).toBe("Fan");
    expect(deriveKeyword("কিছু নাম", "অজানা")).toBe("অর্ডার");
  });
});
