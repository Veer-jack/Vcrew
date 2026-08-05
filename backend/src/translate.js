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

  const toFetch = [];
  for (const it of withHash) {
    const row = await db
      .prepare(`SELECT translated FROM translation_cache WHERE entity_type=? AND entity_id=? AND field=? AND lang=? AND source_hash=?`)
      .get(it.entityType, it.entityId, it.field, targetLang, it.hash);
    if (row) result.set(keyOf(it.entityType, it.entityId, it.field), row.translated);
    else toFetch.push(it);
  }

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
      await db
        .prepare(
          `INSERT INTO translation_cache (entity_type, entity_id, field, source_hash, lang, translated)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT (entity_type, entity_id, field, lang, source_hash) DO NOTHING`
        )
        .run(it.entityType, it.entityId, it.field, it.hash, targetLang, text);
    }
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
