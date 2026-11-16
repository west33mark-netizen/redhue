// REDHUE beta · Feedback fra testere. Endpoint: /api/feedback
// Netlify Blobs (store "redhue-feedback"), én nøgle pr. indsendelse.
//   POST { kind:"idea"|"bug"|"other", text, page?, version?, errors?, contact? }  (alle må sende; x-license valgfri)
//   GET                     header x-license = ejer-nøgle  → de seneste 200 indsendelser
//   POST { action:"done", key }  header x-license = ejer-nøgle  → markér som behandlet
// Der gemmes ingen IP-adresse og ingen licensnøgle; kun et anonymt id, hvis afsenderen har licens.
import { getStore } from "@netlify/blobs";
import { json, isOwner, authorId, limited, preflight } from "../lib/shared.mjs";

export const deps = { getStore };
export const config = { path: "/api/feedback" };
const STORE = "redhue-feedback", PREFIX = "fb/", KINDS = ["idea", "bug", "other"], KEEP = 2000;
const store = () => deps.getStore({ name: STORE, consistency: "strong" });
const clean = (v, n) => String(v || "").replace(/[\u0000-\u0008\u000b-\u001f]/g, "").trim().slice(0, n);

export default async (req) => {
  const pre = preflight(req); if (pre) return pre;
  const license = req.headers.get("x-license") || "";
  const s = store();

  if (req.method === "GET") {
    if (!isOwner(license)) return json(403, { error: "owner_only" });
    const { blobs } = await s.list({ prefix: PREFIX });
    const keys = blobs.map((b) => b.key).sort().slice(-200).reverse();
    const items = (await Promise.all(keys.map(async (key) => { const m = await s.get(key, { type: "json" }); return m ? { key, ...m } : null; }))).filter(Boolean);
    return json(200, { items });
  }
  if (req.method !== "POST") return json(405, { error: "method" });

  let b; try { b = await req.json(); } catch { return json(400, { error: "bad_json" }); }

  if (b.action === "done") {
    if (!isOwner(license)) return json(403, { error: "owner_only" });
    const key = String(b.key || "");
    if (!key.startsWith(PREFIX)) return json(400, { error: "bad_key" });
    const m = await s.get(key, { type: "json" });
    if (!m) return json(404, { error: "not_found" });
    await s.setJSON(key, { ...m, done: !m.done });
    return json(200, { ok: true, done: !m.done });
  }

  const text = clean(b.text, 2000);
  if (text.length < 3) return json(400, { error: "missing_fields" });
  // Spam-bremse pr. IP – holdes kun i hukommelsen, gemmes aldrig
  const who = clean(req.headers.get("x-nf-client-connection-ip"), 64) || "anon";
  if (limited("feedback", who, 20, 60 * 60 * 1000)) return json(429, { error: "rate_limited" });

  const item = {
    kind: KINDS.includes(b.kind) ? b.kind : "other",
    text,
    page: clean(b.page, 40),
    version: clean(b.version, 40),
    channel: ["alpha", "beta", "gamma", "delta"].includes(b.channel) ? b.channel : "",
    errors: clean(b.errors, 1500),
    contact: clean(b.contact, 120),
    ua: clean(req.headers.get("user-agent"), 160),
    from: license ? await authorId(license) : "",
    at: new Date().toISOString(),
    done: false
  };
  const key = PREFIX + item.at.replace(/[:.]/g, "-") + "-" + Math.random().toString(36).slice(2, 8);
  await s.setJSON(key, item);

  // Hold lageret nede
  const { blobs } = await s.list({ prefix: PREFIX });
  if (blobs.length > KEEP) {
    const old = blobs.map((x) => x.key).sort().slice(0, blobs.length - KEEP);
    await Promise.all(old.map((k) => s.delete(k)));
  }
  return json(200, { ok: true });
};
