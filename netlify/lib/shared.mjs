// Fælles hjælpere til REDHUE's Netlify Functions (licens, svar, spam-bremse).
// Ligger uden for netlify/functions, så Netlify ikke gør filen til et endpoint.

const LICENSE_TTL_MS = 6 * 60 * 60 * 1000;
const licenseCache = new Map(); // key -> { ok, at }
const buckets = new Map();      // name:key -> { count, windowStart }

export const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS }
  });

// Appen kan også køre som forhåndsvisning (andet domæne). Ingen cookies bruges – nøgler sendes i headers –
// så det er sikkert at tillade alle oprindelser.
export const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, x-license, x-device",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-max-age": "86400"
};
export const preflight = (req) => (req.method === "OPTIONS" ? new Response(null, { status: 204, headers: CORS }) : null);

export const isOwner = (key) => !!process.env.REDHUE_DEV_KEY && key === process.env.REDHUE_DEV_KEY;

// Beta-testere: koder af formen BETA-XXXXX-XXXXX giver Pro gratis indtil BETA_UNTIL.
// Kun SHA-256-hashes ligger her, så koderne selv ikke kan læses ud af repoet.
// Ekstra koder kan tilføjes uden kodeændring via env REDHUE_BETA_HASHES (kommasepareret).
export const BETA_UNTIL = "2027-02-28";
const BETA_HASHES = new Set([
  "2a7f3dbb788059131f16bd7cac372ef623aae588121e2c19929fe3e432137fe8",
  "76004a3e68bda5305b9a9885c0e42c77319fbbf741e9b2e3098fdd785748e07f",
  "e5efc91f9379f4238ee4cc874999b8fc562b44b9cfe0e8200f77669ec8ddb2a4",
  "39b34117ec29533dd7381d8b45631809c6f4f4347b26f349a1a4afd8147e0e34",
  "7d53fb6dd5e9be5ab90dda2f8edea23cf7141d6f8e92128c1ebf8aa4d87b1a3e",
  "3ec6bcf9623a0d9a8b6bf729e8b2b0c7590127254927617c9bc32224aca02588",
  "c8df5a817f67c55170e5e563d70429d72dfa4bd545dd5944b33ad48c1bf88d7e",
  "edffeab6f20565d5a120b328539118b10940245201782abd194e78876297d38e",
  "458c0302c6bf00c43f6b0483413b18ef9798f6aa1984fb582884501c1b6ea29f",
  "3e7776eec55f9c8b10015ff8c0402904ca1d09916c4c158c534d67f3625e9d71",
  "028bae4be47632b6e832e6884001481de07de50032f37eddf7ef4ba502a923ff",
  "3fad83fc49c944ab3823c7d12d494228e17c59e68368908ec59358143bec329a",
  "673f8c8ac77328cb0feac42496e4e74a4d56f8716c53ea69bde4db42606e93e2",
  "30d098ded6d6731b0a95fbd1cea9ca29cd0136a5ede21a13cc79b1d221e7a6a9",
  "4ad941b877417bb15fdf2caea64872c4389aa700e3bfd5437c3a46b439c46b0b",
  "f629853791980159c4155ea357b67c7ed8e9e72681116ed5a28891db0d7b4584",
  "8ad3cfaadf8a7a02210a35419b1e0a2b93779ec39012e8f5d86aa3320a09b9f6",
  "11bf8b2d806950a18713c2069f3c8240e1d7f440b045b822a986882dabf0b747",
  "b14165dc00831c6cbb945d062c92e2ab035c6a13611cefa518a1dfd4b6e3abca",
  "f45679d458e9908ec4ce2257d52dc5af560d1bd8074dcadef07360d92d62310e",
  "057fd44aee7b6408eab072c58e7e997da228a9e0b1d25b165027062d88087aa6",
  "30fd1d30f75f0668326f49471dbcdde26a54f91d1fccd39727f53faf67008adb",
  "54cfcd701720a4e865434a2d547cc6cb3f8fc0f65d8930a7b34007dbaf55706f",
  "57afc25963cabe0f35891f0d0594bad5078fda35088af9da2e8c95f146bf5b37",
  "ee55625eec6da815b8091c7948579ed07ccb01612a28e2dcd260fea2910a3d90",
  "47ac0a6cf75ec39903e49bf180b2d9671a7d65bc3f17206a9749edb80a41eb61",
  "e9accbecba640df13853602474faac36df7ff934da0cdddac4ea5f6bbbadcf60",
  "9660a60a7a4dc85ed2c172750f1517afcd19ffe40e6da81b83682c4552e67f40",
  "790d1220753922656221ff960df4c3d499017ee6d8caa62b6bfbb9209da6f6f9",
  "0f2a5691e7ff93bff82a45ff36eedad89b178c5f785091c6243c378ccd030a51"
]);
const sha = async (s) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");
export async function isBeta(key, now = Date.now()) {
  if (!/^BETA-[0-9A-F]{5}-[0-9A-F]{5}$/.test(String(key || ""))) return false;
  if (now > Date.parse(BETA_UNTIL + "T23:59:59Z")) return false;
  const extra = (process.env.REDHUE_BETA_HASHES || "").split(",").map((x) => x.trim()).filter(Boolean);
  const h = await sha("redhue-beta:" + key);
  return BETA_HASHES.has(h) || extra.includes(h);
}

// Pro-licens: ejer-nøgle eller beta-kode eller gyldigt, ikke-refunderet Gumroad-køb
export async function verifyLicense(key) {
  if (!key || typeof key !== "string" || key.length > 200) return false;
  if (isOwner(key)) return true;
  if (key.startsWith("BETA-")) return isBeta(key);
  const cached = licenseCache.get(key);
  if (cached && Date.now() - cached.at < LICENSE_TTL_MS) return cached.ok;
  try {
    const res = await fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ product_id: process.env.GUMROAD_PRODUCT_ID || "", license_key: key, increment_uses_count: "false" })
    });
    const data = await res.json();
    const p = data.purchase || {};
    const ok = !!data.success && !p.refunded && !p.chargebacked && !p.subscription_cancelled_at && !p.subscription_failed_at;
    licenseCache.set(key, { ok, at: Date.now() });
    return ok;
  } catch {
    return false;
  }
}

// Anonymt, stabilt bruger-id ud fra licensen (nøglen selv vises aldrig)
export async function authorId(key) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("redhue:" + key));
  return [...new Uint8Array(buf)].slice(0, 6).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Simpel bremse pr. licens og funktions-instans
export function limited(name, key, max, windowMs) {
  const now = Date.now(), id = name + ":" + key;
  const b = buckets.get(id) || { count: 0, windowStart: now };
  if (now - b.windowStart > windowMs) { b.count = 0; b.windowStart = now; }
  b.count++;
  buckets.set(id, b);
  return b.count > max;
}

// ---------- Samlet backend ----------
// Alle endpoints bruger samme indgang: CORS, preflight, fejlhåndtering og (valgfri) spam-bremse.
//   export default endpoint("youtube", async (req, ctx) => json(200, {...}), { limit: [60, 60_000] })
// ctx: { ip, license, url }. Uventede fejl bliver til 500 { error:"server_error" } i stedet for et nedbrud.
export const ROUTES = {
  agents: "AI-agenter (Pro)", coach: "AI-coach og mor/far (Pro)", chat: "Fællesskab (Pro)",
  safe: "Tryghed: deling, SOS, find enheder", feedback: "Beta-feedback", youtube: "YouTube-kanal (offentlige tal)", weather: "Vejr fra DMI (prognose, usikkerhed, målt nu)", health: "Status"
};
export function endpoint(name, fn, opts = {}) {
  return async (req) => {
    const pre = preflight(req); if (pre) return pre;
    const ctx = {
      ip: req.headers.get("x-nf-client-connection-ip") || "anon",
      license: req.headers.get("x-license") || "",
      url: new URL(req.url)
    };
    if (opts.limit && limited(name, ctx.ip, opts.limit[0], opts.limit[1])) return json(429, { error: "rate_limited" });
    try { return await fn(req, ctx); }
    catch (e) { console.error(`[${name}]`, e && e.stack || e); return json(500, { error: "server_error" }); }
  };
}
