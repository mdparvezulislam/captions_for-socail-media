import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const OUT = ".cache/shots";
const ROUTES = [
  { path: "/today", name: "today" },
  { path: "/products", name: "products" },
  { path: "/library", name: "library" },
  { path: "/pages", name: "pages" },
  { path: "/team", name: "team" },
  { path: "/settings", name: "settings" },
  { path: "/poster/cap_seed_prod_1_1_image", name: "poster" },
];
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 1000 },
];

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const report = [];

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 2,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 200));
  });
  page.on("pageerror", (error) => consoleErrors.push(`pageerror: ${error.message.slice(0, 200)}`));

  for (const route of ROUTES) {
    consoleErrors.length = 0;
    const response = await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(route.name === "poster" ? 900 : 250);

    const metrics = await page.evaluate(() => {
      const body = document.body;
      const doc = document.documentElement;
      const buttons = Array.from(document.querySelectorAll("button, a")).map((element) => {
        const rect = element.getBoundingClientRect();
        return { text: (element.textContent ?? "").trim().slice(0, 30), height: Math.round(rect.height), width: Math.round(rect.width) };
      });
      const smallTargets = buttons.filter((item) => item.height > 0 && item.height < 40 && item.width > 0);
      const images = Array.from(document.images).map((image) => ({
        src: image.currentSrc.split("/").pop(),
        ok: image.complete && image.naturalWidth > 0,
      }));
      return {
        title: document.title,
        overflowX: Math.max(body.scrollWidth, doc.scrollWidth) - window.innerWidth,
        fontLoaded: document.fonts.check('16px "Anek Bangla"'),
        h1: document.querySelector("h1")?.textContent?.trim() ?? null,
        smallTargets: smallTargets.length,
        smallTargetSamples: smallTargets.slice(0, 5),
        imageCount: images.length,
        brokenImages: images.filter((image) => !image.ok).length,
        canvasPainted: (() => {
          const canvas = document.querySelector("canvas");
          if (!canvas) return null;
          const context = canvas.getContext("2d");
          const data = context.getImageData(20, 20, 1, 1).data;
          return { width: canvas.width, height: canvas.height, alpha: data[3] };
        })(),
        hasCopyButton: Array.from(document.querySelectorAll("button")).some((button) =>
          (button.textContent ?? "").includes("কপি"),
        ),
      };
    });

    await page.screenshot({ path: `${OUT}/${route.name}-${viewport.name}.png`, fullPage: viewport.name === "desktop" && route.name !== "library" });
    report.push({
      viewport: viewport.name,
      route: route.path,
      status: response?.status(),
      ...metrics,
      consoleErrors: [...new Set(consoleErrors)].slice(0, 5),
    });
  }
  await context.close();
}

await browser.close();
await writeFile(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
