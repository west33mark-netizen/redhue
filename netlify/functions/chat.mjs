// REDHUE Pro · Fællesskabs-chat. Endpoint: /api/chat
// Beskeder ligger i Netlify Blobs (store "redhue-chat"), én nøgle pr. besked, så to brugere aldrig overskriver hinanden.
//   GET  ?since=<nøgle>          header x-license  → nye beskeder (eller de seneste 60)
//   POST { action:"send", name, body }   header x-license
//   POST { action:"delete", key }        header x-license (egen besked, eller ejer)
// Kun Pro-licenser kan læse og skrive. Brugere identificeres anonymt ud fra licensen.
import { getStore } from "@netlify/blobs";
import { json, verifyLicense, authorId, isOwner, limited } from "../lib/shared.mjs";

export const deps = { getStore }; // kan udskiftes i tests
const STORE = "redhue-chat", PREFIX = "msg/", KEEP = 500, PAGE = 60, MAX_BODY = 500;
const store = () => deps.getStore({ name: STORE, consistency: "strong" });

const cleanName = (n) => String(n || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 24) || "Creator";
const cleanBody = (b) => String(b || "").replace(/[\u0000-\u0008\u000b-\u001f]/g, "").trim().slice(0, MAX_BODY);

async function allKeys(s) {
  const { blobs } = await s.list({ prefix: PREFIX });
  return blobs.map((b) => b.key).sort();
}

export default async (req) => {
  const license = req.headers.get("x-license") || "";
  if (!(await verifyLicense(license))) return json(402, { error: "pro_required" });
  const me = await authorId(license);
  const s = store();

  if (req.method === "GET") {
    const since = new URL(req.url).searchParams.get("since") || "";
    let keys = await allKeys(s);
    keys = since ? keys.filter((k) => k > since).slice(-PAGE) : keys.slice(-PAGE);
    const msgs = (await Promise.all(keys.map(async (key) => {
      const m = await s.get(key, { type: "json" });
      return m ? { key, ...m, mine: m.author === me } : null;
    }))).filter(Boolean);
    return json(200, { me, messages: msgs });
  }

  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  let body;
  try { body = await req.json(); } catch { return json(400, { error: "bad_json" }); }

  if (body?.action === "delete") {
    const key = String(body.key || "");
    if (!key.startsWith(PREFIX)) return json(400, { error: "bad_key" });
    const m = await s.get(key, { type: "json" });
    if (!m) return json(404, { error: "not_found" });
    if (m.author !== me && !isOwner(license)) return json(403, { error: "not_yours" });
    await s.delete(key);
    return json(200, { deleted: key });
  }

  if (body?.action === "send") {
    const text = cleanBody(body.body);
    if (!text) return json(400, { error: "empty" });
    if (limited("chat-burst", license, 1, 2000) || limited("chat-min", license, 20, 60 * 1000)) return json(429, { error: "rate_limited" });
    const ts = Date.now();
    const key = `${PREFIX}${String(ts).padStart(13, "0")}-${me}-${Math.random().toString(36).slice(2, 6)}`;
    const msg = { author: me, name: cleanName(body.name), body: text, ts, owner: isOwner(license) };
    await s.setJSON(key, msg, { onlyIfNew: true });
    // Ryd op: behold kun de nyeste beskeder
    const keys = await allKeys(s);
    if (keys.length > KEEP + 50) await Promise.all(keys.slice(0, keys.length - KEEP).map((k) => s.delete(k)));
    return json(200, { message: { key, ...msg, mine: true } });
  }

  return json(400, { error: "unknown_action" });
};

export const config = { path: "/api/chat" };
