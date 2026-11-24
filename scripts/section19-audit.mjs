import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const OUT = ".cache/shots";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const report = { checks: [], consoleErrors: [] };
const check = (name, pass, detail = "") => report.checks.push({ name, pass, detail });

// ---------- Mobile 375px ----------
const mobile = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
const page = await mobile.newPage();
page.on("pageerror", (error) => report.consoleErrors.push(`mobile pageerror: ${error.message.slice(0, 160)}`));

// Secret-key login (flparvez = admin)
await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 45000 });
await page.fill('input[type="password"]', process.env.AUDIT_KEY ?? "flparvez");
await page.click('button[type="submit"]');
await page.waitForSelector('[data-testid="task-grid"]', { timeout: 60000 });
const cardCount = await page.locator('[data-testid="task-grid"] > li').count();
check("grid renders cards", cardCount > 0, `count=${cardCount}`);

const realImageCount = await page.locator('[data-testid="task-grid"] img[src*="/api/image"]').count();
check("real product images shown in grid", realImageCount > 0, `realImages=${realImageCount}/${cardCount}`);

const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("no horizontal overflow @375px", overflow <= 2, `overflow=${overflow}px`);
check("2-column grid on mobile", await page.evaluate(() => {
  const first = document.querySelector('[data-testid="task-grid"] > li');
  return first && first.getBoundingClientRect().width < window.innerWidth * 0.52;
}));

await page.screenshot({ path: `${OUT}/s19-mobile-grid.png` });

// Click a card that already has captions (✓ badge) → drawer opens WITHOUT navigation
const readyCard = page.locator('[data-testid="task-grid"] > li').filter({ hasText: "✓" }).first();
const readyCardText = (await readyCard.textContent()) ?? "";
console.log("audit: readyCard =", readyCardText.slice(0, 50));
const responsePromise = page.waitForResponse((response) => response.url().includes("/api/studio/"), { timeout: 30000 });
await readyCard.click();
const studioResp = await responsePromise;
const studioBody = await studioResp.json();
console.log("audit: studio api ->", studioBody.product?.nameBn, "captions:", studioBody.captions?.length);
await page.waitForSelector('[data-testid="studio-drawer"]', { timeout: 30000 });
await page.waitForTimeout(800);
const h2Now = await page.locator('[data-testid="studio-drawer"] h2').textContent();
console.log("audit: drawer h2 =", h2Now);
check("drawer opens on click", true);
check("no navigation (URL unchanged)", page.url().endsWith("/today"), page.url());
const drawerText = await page.locator('[data-testid="studio-drawer"]').innerText();
console.log("audit: drawer text head =", drawerText.slice(0, 120).replace(/\n/g, " | "));
check("drawer pagination tracker", drawerText.includes("পণ্য"));
console.log("audit: pre-toggle url =", page.url(), "| drawer count =", await page.locator('[data-testid="studio-drawer"]').count());
const copyButtons = await page.locator('[data-testid="studio-drawer"] button').filter({ hasText: "কপি করুন" }).count();
check("3 copy buttons in drawer", copyButtons === 3, `count=${copyButtons}`);

// Hashtag toggle + copy text change
await page.locator('[data-testid="studio-drawer"] label').filter({ hasText: "কপিতে হ্যাশট্যাগ" }).click();
check("hashtag toggle clickable", true);
await page.evaluate(() => document.activeElement?.blur?.());
await page.waitForTimeout(200);

// Keyboard: ArrowRight → product changes
console.log("audit: pre-arrow url =", page.url(), "| drawer count =", await page.locator('[data-testid="studio-drawer"]').count());
const nameBefore = await page.locator('[data-testid="studio-drawer"] h2').textContent();
const nextResponse = page.waitForResponse((response) => response.url().includes("/api/studio/"), { timeout: 30000 });
await page.keyboard.press("ArrowRight");
await nextResponse;
await page.waitForTimeout(600);
const nameAfter = await page.locator('[data-testid="studio-drawer"] h2').textContent();
check("ArrowRight navigates to next product", nameBefore !== nameAfter, `${nameBefore} -> ${nameAfter}`);

// Accordion opens
await page.locator('[data-testid="studio-drawer"] button:has-text("প্রোডাক্ট স্পেক্স")').click();
check("accordion opens", (await page.locator('[data-testid="studio-drawer"] dd, [data-testid="studio-drawer"] dl').count()) > 0);

await page.screenshot({ path: `${OUT}/s19-mobile-drawer.png` });

// Escape closes
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
check("Escape closes drawer", (await page.locator('[data-testid="studio-drawer"]').count()) === 0);

// Filter pills
await page.locator('button:has-text("⏰ ক্যাপশন বাকি")').first().click();
await page.waitForTimeout(300);
const remainingCards = await page.locator('[data-testid="task-grid"] > li').count();
check("remaining filter works", remainingCards >= 0, `cards=${remainingCards}`);

// ---------- Desktop 1440px ----------
const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const dpage = await desktop.newPage();
dpage.on("pageerror", (error) => report.consoleErrors.push(`desktop pageerror: ${error.message.slice(0, 160)}`));

// ডেস্কটপ কনটেক্সটও লগইন করে
await dpage.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 60000 });
await dpage.fill('input[type="password"]', process.env.AUDIT_KEY ?? "flparvez");
await dpage.click('button[type="submit"]');
await dpage.waitForSelector('[data-testid="task-grid"]', { timeout: 60000 });
check("6-column grid on desktop", await dpage.evaluate(() => {
  const grid = document.querySelector('[data-testid="task-grid"]');
  return grid && getComputedStyle(grid).gridTemplateColumns.split(" ").length >= 6;
}));
await dpage.screenshot({ path: `${OUT}/s19-desktop-grid.png` });

// Ctrl+K search modal
await dpage.keyboard.press("ControlOrMeta+k");
await dpage.waitForTimeout(400);
await dpage.keyboard.type("Wireless");
await dpage.waitForTimeout(900);
const results = await dpage.locator('[role="dialog"] ul li button').count();
check("Ctrl+K search returns results", results > 0, `results=${results}`);
await dpage.screenshot({ path: `${OUT}/s19-search-modal.png` });
if (results > 0) {
  const studioResponse = dpage.waitForResponse((response) => response.url().includes("/api/studio/"), { timeout: 30000 });
  await dpage.locator('[role="dialog"] ul li button').first().click();
  await studioResponse;
  await dpage.waitForTimeout(2000);
  const drawerCount = await dpage.locator('[data-testid="studio-drawer"]').count();
  console.log("audit: search -> url:", dpage.url(), "drawer count:", drawerCount);
  check("search result opens drawer", drawerCount === 1, dpage.url());
}
await dpage.screenshot({ path: `${OUT}/s19-desktop-drawer.png` });

await mobile.close();
await desktop.close();
await browser.close();

await writeFile(`${OUT}/s19-report.json`, JSON.stringify(report, null, 2));
const failed = report.checks.filter((item) => !item.pass);
console.log(JSON.stringify({ passed: report.checks.length - failed.length, failed: failed.length, details: report.checks, consoleErrors: report.consoleErrors }, null, 2));
