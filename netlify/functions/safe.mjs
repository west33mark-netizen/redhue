// REDHUE · Tryghed: SOS, frivillig positionsdeling og "find mine enheder". Endpoint: POST /api/safe
// Samtykke først: intet spores, uden at personen selv har slået det til på sin egen enhed.
// Identitet: hver enhed har en tilfældig hemmelig nøgle (header x-device). Serveren gemmer kun et hash af den.
// "Find mine enheder" kræver desuden licens (header x-license) – enheder grupperes anonymt pr. licens.
//
// Handlinger (body.action):
//   share_start { name, hours: 1|4|24, pos, sos? }  → { code, exp }    (opretter delingslink)
//   share_update { code, pos }                      → { ok }            (kun ejeren af delingen)
//   share_stop  { code }                            → { ok }            (kun ejeren)
//   view        { code }                            → { name, pos, ts, exp, sos } eller 410 når udløbet
//   ping        { name, pos, battery, findable }    → { ok }            (Pro: opdatér/slet denne enhed)
//   devices     {}                                  → { me, devices: [...] } (Pro: mine egne enheder)
//   forget      { id }                              → { ok }            (Pro: fjern en af mine enheder)
import { getStore } from "@netlify/blobs";
import { json, verifyLicense, authorId, limited } from "../lib/shared.mjs";

export const deps = { getStore }; // kan udskiftes i tests
const store = () => deps.getStore({ name: "redhue-safe", consistency: "strong" });
const HOURS = [1, 4, 24];
const CODE_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

async function hash(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].slice(0, 10).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function cleanPos(p) {
  if (!p || typeof p !== "object") return null;
  const lat = +p.lat, lng = +p.lng, acc = Math.min(100000, Math.max(0, Math.round(+p.acc || 0)));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5, acc };
}
const cleanName = (n) => String(n || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 30) || "REDHUE";
function newCode() {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return [...b].map((x) => CODE_CHARS[x % CODE_CHARS.length]).join("");
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  let body;
  try { body = await req.json(); } catch { return json(400, { error: "bad_json" }); }
  const secret = req.headers.get("x-device") || "";
  if (!/^[a-f0-9]{32,64}$/.test(secret)) return json(400, { error: "no_device" });
  const dev = await hash("dev:" + secret);
  if (limited("safe", dev, 120, 60 * 60 * 1000)) return json(429, { error: "rate_limited" });
  const s = store(), now = Date.now(), a = body?.action;

  if (a === "share_start") {
    const hours = body.sos ? 24 : HOURS.includes(+body.hours) ? +body.hours : 1;
    // Ryd udløbne delinger op, så de ikke tæller med i grænsen
    const { blobs } = await s.list({ prefix: `own/${dev}/` });
    let active = 0;
    for (const { key } of blobs) {
      const o = await s.get(key, { type: "json" });
      if (!o || o.exp < now) { await s.delete(key); await s.delete(`share/${key.split("/").pop()}`); } else active++;
    }
    if (active >= 5 && !body.sos) return json(429, { error: "too_many_shares" });
    const code = newCode(), exp = now + hours * 3600 * 1000;
    await s.setJSON(`share/${code}`, { owner: dev, name: cleanName(body.name), pos: cleanPos(body.pos), ts: now, exp, sos: !!body.sos }, { onlyIfNew: true });
    await s.setJSON(`own/${dev}/${code}`, { exp });
    return json(200, { code, exp });
  }
  if (a === "share_update" || a === "share_stop") {
    const code = String(body.code || "").replace(/[^a-z0-9]/g, "");
    const sh = await s.get(`share/${code}`, { type: "json" });
    if (!sh) return json(404, { error: "not_found" });
    if (sh.owner !== dev) return json(403, { error: "not_yours" });
    if (a === "share_stop" || sh.exp < now) { await s.delete(`share/${code}`); await s.delete(`own/${dev}/${code}`); return json(200, { ok: true, stopped: true }); }
    const pos = cleanPos(body.pos);
    if (pos) await s.setJSON(`share/${code}`, { ...sh, pos, ts: now });
    return json(200, { ok: true });
  }
  if (a === "view") {
    const code = String(body.code || "").replace(/[^a-z0-9]/g, "");
    const sh = await s.get(`share/${code}`, { type: "json" });
    if (!sh) return json(404, { error: "not_found" });
    if (sh.exp < now) { await s.delete(`share/${code}`); await s.delete(`own/${sh.owner}/${code}`); return json(410, { error: "expired" }); }
    return json(200, { name: sh.name, pos: sh.pos, ts: sh.ts, exp: sh.exp, sos: !!sh.sos });
  }
  if (a === "ping" || a === "devices" || a === "forget") {
    const license = req.headers.get("x-license") || "";
    if (!(await verifyLicense(license))) return json(402, { error: "pro_required" });
    const owner = await authorId(license);
    if (a === "ping") {
      const key = `dev/${owner}/${dev}`;
      if (!body.findable) { await s.delete(key); return json(200, { ok: true, findable: false }); }
      const bat = Number.isFinite(+body.battery) ? Math.max(0, Math.min(100, Math.round(+body.battery))) : null;
      await s.setJSON(key, { name: cleanName(body.name), pos: cleanPos(body.pos), battery: bat, ts: now });
      return json(200, { ok: true, findable: true });
    }
    if (a === "forget") {
      const id = String(body.id || "").replace(/[^a-f0-9]/g, "");
      await s.delete(`dev/${owner}/${id}`);
      return json(200, { ok: true });
    }
    const { blobs } = await s.list({ prefix: `dev/${owner}/` });
    const devices = (await Promise.all(blobs.map(async ({ key }) => {
      const d = await s.get(key, { type: "json" });
      const id = key.split("/").pop();
      return d ? { id, ...d, me: id === dev } : null;
    }))).filter(Boolean).sort((x, y) => y.ts - x.ts);
    return json(200, { me: dev, devices });
  }
  return json(400, { error: "unknown_action" });
};

export const config = { path: "/api/safe" };
