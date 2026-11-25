"use server";

import { revalidatePath } from "next/cache";
import { syncUniStoreCatalog } from "@/lib/sync";
import { db, readyDb } from "@/lib/db";
import { getCaption, getPageById, getPageBySlug, getProduct } from "@/lib/data";
import {
  ensureProductCaptions,
  generateBatch,
  generatePoolForProduct,
  markPosted,
  pickBatchProducts,
  regenerateOne,
  regenerateWhatsapp,
  saveBody,
} from "@/lib/captions";
import { getSession } from "@/lib/session";
import type { BrandKit } from "@/lib/types";

const REVALIDATE = ["/today", "/library", "/products", "/pages"];

function refreshAll(): void {
  for (const path of REVALIDATE) revalidatePath(path);
}

export async function pickBatchAction(
  pageSlug: string,
  count?: number,
): Promise<{
  ok: boolean;
  batch?: number;
  runId?: string;
  relaxed?: boolean;
  products: { id: string; nameBn: string; score: number }[];
  message?: string;
}> {
  const page = await getPageBySlug(pageSlug);
  if (!page) return { ok: false, products: [], message: "পেজ পাওয়া যায়নি" };
  return pickBatchProducts(page, count);
}

export async function generateBatchAction(pageSlug: string): Promise<{
  ok: boolean;
  created: number;
  batch?: number;
  message?: string;
  productNames: string[];
}> {
  const page = await getPageBySlug(pageSlug);
  if (!page) return { ok: false, created: 0, message: "পেজ পাওয়া যায়নি", productNames: [] };
  const result = await generateBatch(page);
  refreshAll();
  return result;
}

export async function generateForProductAction(
  productId: string,
  force = false,
  meta?: { batch?: number; position?: number; runId?: string; score?: number },
): Promise<{ ok: boolean; message?: string }> {
  const product = await getProduct(productId);
  if (!product) return { ok: false, message: "প্রোডাক্ট পাওয়া যায়নি" };
  const page = await getPageById(product.pageId);
  if (!page) return { ok: false, message: "পেজ পাওয়া যায়নি" };
  try {
    await ensureProductCaptions(page, product, {
      force,
      batch: meta?.batch,
      position: meta?.position,
      runId: meta?.runId,
      score: meta?.score,
    });
    refreshAll();
    revalidatePath(`/products/${productId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "জেনারেশন ব্যর্থ" };
  }
}

export async function regenerateAction(
  captionId: string,
  instruction?: string,
): Promise<{ ok: boolean; body?: string; message?: string }> {
  const caption = await getCaption(captionId);
  if (!caption) return { ok: false, message: "ক্যাপশন পাওয়া যায়নি" };
  try {
    const updated = await regenerateOne(caption, instruction?.trim() || undefined);
    refreshAll();
    revalidatePath(`/poster/${captionId}`);
    return updated ? { ok: true, body: updated.body } : { ok: false, message: "রিজেনারেট ব্যর্থ" };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "রিজেনারেট ব্যর্থ" };
  }
}

export async function saveCaptionAction(captionId: string, body: string): Promise<{ ok: boolean }> {
  const trimmed = body.trim();
  if (trimmed.length < 10) return { ok: false };
  await saveBody(captionId, trimmed);
  refreshAll();
  revalidatePath(`/poster/${captionId}`);
  return { ok: true };
}

export async function markPostedAction(captionId: string, posted: boolean): Promise<{ ok: boolean }> {
  const session = await getSession();
  await markPosted(captionId, posted, session?.email ?? "system");
  refreshAll();
  return { ok: true };
}

export async function syncUniStoreAction(pageSlug: string): Promise<{
  ok: boolean;
  message: string;
}> {
  const session = await getSession();
  if (!session || session.role === "moderator") return { ok: false, message: "শুধু অ্যাডমিন সিঙ্ক করতে পারেন" };

  const page = await getPageBySlug(pageSlug);
  if (!page) return { ok: false, message: "পেজ পাওয়া যায়নি" };

  const result = await syncUniStoreCatalog({ pageId: page.id });
  revalidatePath("/products");
  revalidatePath("/today");
  if (!result.ok) return { ok: false, message: `সিঙ্ক ব্যর্থ: ${result.error}` };
  return {
    ok: true,
    message: `সিঙ্ক সম্পন্ন — নতুন ${result.created}, আপডেট ${result.updated}, অপরিবর্তিত ${result.skipped}`,
  };
}

export async function updatePageAction(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  const session = await getSession();
  if (!session || session.role === "moderator") return { ok: false, message: "শুধু অ্যাডমিন পেজ সেটিংস বদলাতে পারেন" };

  const pageId = String(formData.get("pageId") ?? "");
  const existing = await getPageById(pageId);
  if (!existing) return { ok: false, message: "পেজ পাওয়া যায়নি" };

  const brand: BrandKit = {
    ...existing.brand,
    primary: String(formData.get("primary") ?? existing.brand.primary),
    accent: String(formData.get("accent") ?? existing.brand.accent),
    surface: String(formData.get("surface") ?? existing.brand.surface),
    ink: String(formData.get("ink") ?? existing.brand.ink),
    logoMark: String(formData.get("logoMark") ?? existing.brand.logoMark).slice(0, 4),
    watermark: String(formData.get("watermark") ?? existing.brand.watermark),
    layout: (String(formData.get("layout") ?? existing.brand.layout) as BrandKit["layout"]) ?? "editorial",
    font: existing.brand.font,
  };

  const hashtags = String(formData.get("hashtags") ?? "")
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
    .slice(0, 8);

  await db()
    .prepare(
      `UPDATE pages SET name = ?, brand_name = ?, tagline = ?, voice = ?, cta_text = ?, hashtags_json = ?,
       daily_count = ?, repeat_gap_days = ?, brand_json = ? WHERE id = ?`,
    )
    .bind(
      String(formData.get("name") ?? existing.name).trim(),
      String(formData.get("brandName") ?? existing.brandName).trim(),
      String(formData.get("tagline") ?? existing.tagline).trim(),
      String(formData.get("voice") ?? existing.voice).trim(),
      String(formData.get("ctaText") ?? existing.ctaText).trim(),
      JSON.stringify(hashtags.length > 0 ? hashtags : existing.hashtags),
      Math.max(1, Math.min(10, Number(formData.get("dailyCount") ?? existing.dailyCount) || existing.dailyCount)),
      Math.max(0, Math.min(365, Number(formData.get("repeatGapDays") ?? existing.repeatGapDays) || existing.repeatGapDays)),
      JSON.stringify(brand),
      pageId,
    )
    .run();

  refreshAll();
  revalidatePath("/settings");
  revalidatePath(`/pages`);
  return { ok: true };
}

export async function addMemberAction(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  const session = await getSession();
  if (!session || session.role === "moderator") return { ok: false, message: "অনুমতি নেই" };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "moderator");
  const pageIds = formData.getAll("pageIds").map(String);

  if (!name || !email.includes("@")) return { ok: false, message: "নাম আর সঠিক ইমেইল দিন" };

  const database = await readyDb();
  const existing = await database.prepare("SELECT id FROM members WHERE email = ?").bind(email).first<{ id: string }>();
  if (existing) return { ok: false, message: "এই ইমেইল আগে থেকেই আছে" };

  await database
    .prepare(
      `INSERT INTO members (id, name, email, role, page_ids_json, last_active_at, created_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?)`,
    )
    .bind(`mem_${crypto.randomUUID().slice(0, 10)}`, name, email, role, JSON.stringify(pageIds), new Date().toISOString())
    .run();

  revalidatePath("/team");
  return { ok: true };
}

export async function removeMemberAction(memberId: string): Promise<{ ok: boolean; message?: string }> {
  const session = await getSession();
  if (!session || session.role !== "owner") return { ok: false, message: "শুধু মালিক টিম মেম্বার সরাতে পারেন" };
  const database = await readyDb();
  const member = await database.prepare("SELECT role FROM members WHERE id = ?").bind(memberId).first<{ role: string }>();
  if (member?.role === "owner") return { ok: false, message: "মালিককে সরানো যাবে না" };
  await database.prepare("DELETE FROM members WHERE id = ?").bind(memberId).run();
  revalidatePath("/team");
  return { ok: true };
}

export async function updateMemberRoleAction(memberId: string, role: string): Promise<{ ok: boolean }> {
  const session = await getSession();
  if (!session || session.role === "moderator") return { ok: false };
  if (!["admin", "moderator"].includes(role)) return { ok: false };
  (await readyDb()).prepare("UPDATE members SET role = ? WHERE id = ?").bind(role, memberId).run();
  revalidatePath("/team");
  return { ok: true };
}

export async function regenerateWhatsappAction(productId: string): Promise<{ ok: boolean; message?: string }> {
  const product = await getProduct(productId);
  if (!product) return { ok: false, message: "প্রোডাক্ট পাওয়া যায়নি" };
  const page = await getPageById(product.pageId);
  if (!page) return { ok: false, message: "পেজ পাওয়া যায়নি" };
  const text = await regenerateWhatsapp(page, product);
  revalidatePath(`/products/${productId}`);
  revalidatePath("/today");
  return text ? { ok: true } : { ok: false, message: "তৈরি করা যায়নি" };
}

export async function ensurePoolAction(productId: string): Promise<{ ok: boolean; message?: string }> {
  const product = await getProduct(productId);
  if (!product) return { ok: false, message: "প্রোডাক্ট পাওয়া যায়নি" };
  const page = await getPageById(product.pageId);
  if (!page) return { ok: false, message: "পেজ পাওয়া যায়নি" };
  try {
    await generatePoolForProduct(page, product, { force: false });
    revalidatePath(`/products/${productId}`);
    revalidatePath("/today");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "ব্যর্থ" };
  }
}
