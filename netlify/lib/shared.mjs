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
// Pro-licenser udstedt af ejeren: koder af formen PRO-XXXXX-XXXXX, uden udløb.
// Kun SHA-256-hashes ligger her. Ekstra koder uden ny udgivelse: env REDHUE_PRO_HASHES (kommasepareret).
const PRO_HASHES = new Set([
  "fcf4bced63fcd7eaf23c951b65bde1188ea698718d2b19154b1c9f98ccbd9dbf",
  "79b62349cfeb81706ff057d7e2f539c727e7e0da26082ac624f7912e44219208",
  "01c91f25550ed24d5bac119ce92e55618662e9aab16ab513d12e618cc8ca24c1",
  "69551423896fd801dd7efbf8f14e11c4a0113409bcc1df714eef3d935fbc4904",
  "35c78e960434dbc67eff36c9f33f51d8ec5bde8e868250f789e786b991ba39a3",
  "6c88d5b9c1becd20ba5b795848bb25a039670f7a5b7a7e78963e5147f67cb216",
  "236b14389f018cd759b426c880aa450b6293a292afd4cf55d44b93125165a21c",
  "4199cfd402430d82866f22aa9316c1cdef7ffed444dd3c5d2a114543cb38570d",
  "7584ab5d0fe65bf2f1631ad3e6afa1672edda92e04f59d137098f156d07eb7a1",
  "38f9852a2700e43665f6760de7a9abe67bacb74325c981e3a253b3b10dbfc7b2",
  "aa02d90e76193edb9a83ef00110aea9b1cf629a6140131c9da6129e91946a1a1",
  "3dabff66e12fb87013af754dc7a62e9e1870ec205f855287b43da26a96658b59",
  "aa75b9bc4bed7e3649dbb6a4ec5e8679db864e732f1cddb1576c19feb20a0284",
  "80e0d090fbe2ed1186515ac430c3842cbb47a2c9c7b0ab319ac1507588376c96",
  "d7e7b932b435d473da2fb956d3e0b5b2394c383e9f72e45244756dc82de9f144",
  "0a5b83cf8a724fe71e50a0fd9ed55480ad241e800a6c1ab5ad9272bd0b49d264",
  "310803d63d2517ac69588b290b343bb823f79a898da1cfb00873967a8d9df167",
  "9704142d59dee74c543c608adc97f1470895dd11a4b0fba840d4b55a38b31d95",
  "7ca68063df225b729ac9b0cbbc08aa6ae46b4b9241fb86b1498fe759f5e6405d",
  "2fc1fff14a009ec578ef5fe5bd3b66229b0884a38084942df1a5f273c6bf9b2d",
  "566d73f1bd192a0403ea35c4a11c75fbedb6ae0fe3fd7c66b7eaeb8c1c2447db",
  "9e6b427466aa9b41c63e2f82bbcfa8639e6f72113c3cbadfbf1f701892a640a9",
  "6dd7d0e93cde145f3e726149c22b4a5e69e430689c1d440b085e7f3a6ea0f84e",
  "0d0e4c658db4721c43b5afbf054481216e718c808903e98c5ca2fc80afcebfc7",
  "ce6d76cfcc547d219e87b85ec68f3e10a6bd9f6d129e278e7a2e23dff9226640",
  "a3a01871b4c3a68109d15485bfcf827079751672a46027ec1af3e7bc8894a774",
  "d880db3929d7e486aafb95ab2a2663d1c36722f4f3aaf7b06b464c0cae101322",
  "aa6278ee5411a50a5d77da9146a48bb9b489eeca166da8045a205536a9770888",
  "58e80dd4ef4abfe055984fefa631533b233585d3ce2d69e195f709f8473759a3",
  "41bd1c75c9f66db5c493681e45108069def7a117df23250bc30904eee326a368",
  "ac19ca5e8311afa1273dab6ec9a2c1c8153f6e4fa6fd8218a0d336cc5702f8ad",
  "ef4b5738fe7c9a04001e3b6dcd81efb22ea33e90c489c02987cc4fde234deabd",
  "4d947c2ed24023e3eeb8e52d2d5eb2e20c3b38a8be8f80bc2f1bc948c5ab8dae",
  "39f32782424e8c0497b3eec4b4bfdc1816b2c668bdd5f51b192f936a7e67f5af",
  "0aba43a6aa2d3da056c85a54faabb49cd6bb41cef048eb156846b998a56f88b0",
  "37f2d7aec3fa85f66630c7e5a5745d84a34d34a04c01f9f24e158ee428c417ec",
  "742e8712de99d5d5376dbf03bd674ae2aae8900c62266ef02808db2959b50ffc",
  "638cea89eab796cb6e29bd19af652e3e1ed7374b68935650e199a2eb5571c2ae",
  "c5297bdd84c7a13f19a693990902e23875648ab22aae9e586bde69131cd9073e",
  "9a616633de3d84b2e7b9a279fb52437c3709c8ae4acfe2ff5883a1ad6338fd3e"
]);
export async function isProKey(key) {
  if (!/^PRO-[0-9A-F]{5}-[0-9A-F]{5}$/.test(String(key || ""))) return false;
  const extra = (process.env.REDHUE_PRO_HASHES || "").split(",").map((x) => x.trim()).filter(Boolean);
  const h = await sha("redhue-pro:" + key);
  return PRO_HASHES.has(h) || extra.includes(h);
}

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
  if (key.startsWith("PRO-")) return isProKey(key);
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
