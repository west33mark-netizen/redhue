// Fælles hjælpere til REDHUE's Netlify Functions (licens, svar, spam-bremse).
// Ligger uden for netlify/functions, så Netlify ikke gør filen til et endpoint.

const LICENSE_TTL_MS = 6 * 60 * 60 * 1000;
const licenseCache = new Map(); // key -> { ok, at }
const buckets = new Map();      // name:key -> { count, windowStart }

export const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });

export const isOwner = (key) => !!process.env.REDHUE_DEV_KEY && key === process.env.REDHUE_DEV_KEY;

// Pro-licens: ejer-nøgle eller gyldigt, ikke-refunderet Gumroad-køb
export async function verifyLicense(key) {
  if (!key || typeof key !== "string" || key.length > 200) return false;
  if (isOwner(key)) return true;
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
