import dns from "node:dns/promises";
import net from "node:net";

const IPV4_PRIVATE_RANGES = [
  { start: "10.0.0.0", end: "10.255.255.255" },
  { start: "172.16.0.0", end: "172.31.255.255" },
  { start: "192.168.0.0", end: "192.168.255.255" },
  { start: "127.0.0.0", end: "127.255.255.255" },
  { start: "169.254.0.0", end: "169.254.255.255" }, // includes the 169.254.169.254 cloud metadata IP
];

function ipv4ToLong(ip) {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isPrivateIPv4(ip) {
  const val = ipv4ToLong(ip);
  return IPV4_PRIVATE_RANGES.some(({ start, end }) => val >= ipv4ToLong(start) && val <= ipv4ToLong(end));
}

function isPrivateIPv6(ip) {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd")
    || lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) {
    return true;
  }
  // IPv4-mapped IPv6 (::ffff:a.b.c.d or ::ffff:aabb:ccdd) — extract the
  // embedded IPv4 address and re-check it, since a private IPv4 address
  // embedded this way would otherwise bypass isPrivateIPv4 entirely.
  const mappedDotted = lower.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mappedDotted) return isPrivateIPv4(mappedDotted[1]);
  const mappedHex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16);
    const lo = parseInt(mappedHex[2], 16);
    const dotted = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
    return isPrivateIPv4(dotted);
  }
  return false;
}

// Extracts the `content` attribute from the first <meta> tag whose given
// attribute (name/property) matches the given value, regardless of
// attribute order within the tag.
function extractMetaContent(html, attr, value) {
  const tags = html.match(/<meta\s+[^>]*>/gi) || [];
  for (const tag of tags) {
    if (new RegExp(`${attr}\\s*=\\s*["']${value}["']`, "i").test(tag)) {
      const m = tag.match(/content\s*=\s*["']([^"']*)["']/i);
      if (m) return m[1].trim();
    }
  }
  return "";
}

function extractHeadings(html, max = 3) {
  const matches = [...html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)];
  return matches
    .map(m => m[1].replace(/<[^>]+>/g, "").trim())
    .filter(Boolean)
    .slice(0, max);
}

const FETCH_TIMEOUT_MS = 5000;
const MAX_BYTES = 500_000;

// Fetches a URL and extracts lightweight page context (title, meta
// description, top headings) for use in AI prompt building. Rejects
// private/loopback/link-local IPs before making any request (SSRF guard),
// does not follow redirects, and degrades to `{ context: null, reason }` on
// any failure — never throws. `reason` lets the caller tell a bad URL format
// apart from an unreachable/blocked one instead of collapsing every failure
// into one generic message (BUG-030). SSRF-blocked targets deliberately
// report the same "unreachable" reason as a DNS/network failure rather than
// a distinct "blocked" one, so a caller can't use the message to probe which
// internal addresses are reachable.
export async function fetchUrlContext(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { context: null, reason: "invalid_url" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return { context: null, reason: "invalid_url" };

  let address;
  try {
    address = (await dns.lookup(parsed.hostname)).address;
  } catch {
    return { context: null, reason: "unreachable" };
  }
  if (net.isIPv4(address) && isPrivateIPv4(address)) return { context: null, reason: "unreachable" };
  if (net.isIPv6(address) && isPrivateIPv6(address)) return { context: null, reason: "unreachable" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(parsed.href, {
      signal: controller.signal,
      redirect: "manual",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ValidationCrewBot/1.0)" },
    });
    if (res.status < 200 || res.status >= 300) return { context: null, reason: "unreachable" };

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return { context: null, reason: "non_html" };

    const reader = res.body.getReader();
    const chunks = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      if (received > MAX_BYTES) { reader.cancel(); break; }
      chunks.push(value);
    }
    const html = Buffer.concat(chunks.map(c => Buffer.from(c))).toString("utf-8");

    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
    const description = extractMetaContent(html, "name", "description") || extractMetaContent(html, "property", "og:description");
    const headings = extractHeadings(html);

    if (!title && !description && headings.length === 0) return { context: null, reason: "empty" };

    return { context: { title, description, headings }, reason: null };
  } catch (err) {
    return { context: null, reason: err?.name === "AbortError" ? "timeout" : "unreachable" };
  } finally {
    clearTimeout(timeout);
  }
}
