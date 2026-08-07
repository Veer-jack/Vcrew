/**
 * translate.js — dynamic (user-generated) content translation, with a
 * DB-backed cache so the same text is only ever sent to the Translation API
 * once per target language. See backend/src/schema.sql's translation_cache
 * table for the cache shape.
 *
 * This is deliberately separate from frontend/src/i18n/* -- that system
 * covers static UI strings, pre-translated at build time. This module
 * covers content that doesn't exist until a user creates it (mission text,
 * notifications, submission notes, ...), translated lazily on first read.
 */
import crypto from "node:crypto";
import { db } from "./db.js";

const VALID_LANGS = ["en", "hi", "zh", "es", "ar", "fr", "bn", "pt", "ru", "ur"];
// Google Translate's code for Mandarin differs from the code this app uses internally.
const API_LANG = { zh: "zh-CN" };
const CHUNK_SIZE = 100; // stay well under the Translation API's per-request item limit

function hashText(text) {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}

function keyOf(entityType, entityId, field) {
  return `${entityType}:${entityId}:${field}`;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function callGoogleTranslate(texts, targetLang) {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) return null;
  const target = API_LANG[targetLang] || targetLang;
  try {
    const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: texts, source: "en", target, format: "text" }),
    });
    if (!res.ok) {
      console.error("[translate] API error", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = await res.json();
    return data.data.translations.map((t) => t.translatedText);
  } catch (err) {
    console.error("[translate] request failed:", err.message);
    return null;
  }
}

/**
 * Translates a batch of entity fields into targetLang, using the DB cache
 * wherever possible and only calling the Translation API for genuine misses.
 *
 * @param {Array<{entityType: string, entityId: string|number, field: string, text: string}>} items
 * @param {string} targetLang
 * @returns {Promise<Map<string, string>>} keyed by "entityType:entityId:field" -> translated text
 *   (or the original text, untouched, if targetLang is "en"/unsupported or translation failed)
 */
export async function translateBatch(items, targetLang) {
  const result = new Map();
  const usable = items.filter((it) => it.text && it.text.trim());
  for (const it of items) {
    if (!it.text || !it.text.trim()) result.set(keyOf(it.entityType, it.entityId, it.field), it.text || "");
  }

  if (!targetLang || targetLang === "en" || !VALID_LANGS.includes(targetLang)) {
    for (const it of usable) result.set(keyOf(it.entityType, it.entityId, it.field), it.text);
    return result;
  }

  const withHash = usable.map((it) => ({ ...it, hash: hashText(it.text) }));
  if (!withHash.length) return result;

  // One round trip for the whole batch instead of one query per item -- on a
  // page with dozens of translatable strings (e.g. an activity feed), that
  // N+1 pattern was the actual multi-second bottleneck, not the translate API.
  const cacheRowKey = (t, id, f, h) => `${t}:${id}:${f}:${h}`;
  const cached = await db
    .prepare(`
      SELECT entity_type, entity_id, field, source_hash, translated
      FROM translation_cache
      WHERE lang = ?
        AND (entity_type, entity_id, field, source_hash) IN (
          SELECT * FROM unnest(?::text[], ?::text[], ?::text[], ?::text[])
        )
    `)
    .all(
      targetLang,
      withHash.map((it) => it.entityType),
      withHash.map((it) => String(it.entityId)),
      withHash.map((it) => it.field),
      withHash.map((it) => it.hash),
    );
  const cacheMap = new Map(cached.map((r) => [cacheRowKey(r.entity_type, r.entity_id, r.field, r.source_hash), r.translated]));

  const toFetch = [];
  for (const it of withHash) {
    const hit = cacheMap.get(cacheRowKey(it.entityType, String(it.entityId), it.field, it.hash));
    if (hit !== undefined) result.set(keyOf(it.entityType, it.entityId, it.field), hit);
    else toFetch.push(it);
  }

  const toInsert = [];
  for (const batch of chunk(toFetch, CHUNK_SIZE)) {
    const translated = await callGoogleTranslate(batch.map((it) => it.text), targetLang);
    if (!translated) {
      // API unavailable/failed for this chunk -- fall back to originals, don't cache failures
      for (const it of batch) result.set(keyOf(it.entityType, it.entityId, it.field), it.text);
      continue;
    }
    for (let i = 0; i < batch.length; i++) {
      const it = batch[i];
      const text = translated[i] ?? it.text;
      result.set(keyOf(it.entityType, it.entityId, it.field), text);
      toInsert.push({ ...it, text });
    }
  }

  if (toInsert.length) {
    await db
      .prepare(`
        INSERT INTO translation_cache (entity_type, entity_id, field, source_hash, lang, translated)
        SELECT * FROM unnest(?::text[], ?::text[], ?::text[], ?::text[], ?::text[], ?::text[])
        ON CONFLICT (entity_type, entity_id, field, lang, source_hash) DO NOTHING
      `)
      .run(
        toInsert.map((it) => it.entityType),
        toInsert.map((it) => String(it.entityId)),
        toInsert.map((it) => it.field),
        toInsert.map((it) => it.hash),
        toInsert.map(() => targetLang),
        toInsert.map((it) => it.text),
      );
  }

  return result;
}

/**
 * Convenience wrapper for translating a single field on a single entity.
 */
export async function translateOne(entityType, entityId, field, text, targetLang) {
  const result = await translateBatch([{ entityType, entityId, field, text }], targetLang);
  return result.get(keyOf(entityType, entityId, field)) ?? text;
}
