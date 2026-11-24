import { describe, expect, it } from "vitest";
import { captionCopyText, deriveKeyword, formatForFacebook, toBold } from "@/lib/facebook-text";

describe("toBold", () => {
  it("maps Latin letters and digits to mathematical bold", () => {
    const cps = (input: string) => Array.from(input).map((c) => c.codePointAt(0));
    // F a s t -> Mathematical Sans-Serif Bold (0x1d5d9, 0x1d5ee, 0x1d600, 0x1d601)
    expect(toBold("Fast")).toBe("𝗙𝗮𝘀𝘁");
    expect(cps(toBold("Fast"))).toEqual([0x1d5d9, 0x1d5ee, 0x1d600, 0x1d601]);
    expect(toBold("T900")).toBe("𝗧𝟵𝟬𝟬");
    expect(cps(toBold("T900"))).toEqual([0x1d5e7, 0x1d7f5, 0x1d7ec, 0x1d7ec]);

    // Product and feature names from store catalog
    expect(toBold("CYXG Q102 3-in-1 Wireless Earbuds")).toBe("𝗖𝗬𝗫𝗚 𝗤𝟭𝟬𝟮 𝟯-𝗶𝗻-𝟭 𝗪𝗶𝗿𝗲𝗹𝗲𝘀𝘀 𝗘𝗮𝗿𝗯𝘂𝗱𝘀");
    expect(toBold("Smart 3-in-1 Design")).toBe("𝗦𝗺𝗮𝗿𝘁 𝟯-𝗶𝗻-𝟭 𝗗𝗲𝘀𝗶𝗴𝗻");
    expect(toBold("Crystal Clear Audio")).toBe("𝗖𝗿𝘆𝘀𝘁𝗮𝗹 𝗖𝗹𝗲𝗮𝗿 𝗔𝘂𝗱𝗶𝗼");
    expect(toBold("LED Display Screen")).toBe("𝗟𝗘𝗗 𝗗𝗶𝘀𝗽𝗹𝗮𝘆 𝗦𝗰𝗿𝗲𝗲𝗻");
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
