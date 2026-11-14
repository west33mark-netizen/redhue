// REDHUE Pro · AI-coach (chat). Endpoint: POST /api/coach
// Body: { license, lang: "da"|"en", messages: [{role:"user"|"assistant", content}], context: {...brugerens nøgletal},
//         persona?: { role: "mom"|"dad"|"mentor", name } }  ← "virtuel mor/far": varm, støttende, ærlig
// Env: ANTHROPIC_API_KEY (krævet), ANTHROPIC_MODEL (valgfri), GUMROAD_PRODUCT_ID, REDHUE_DEV_KEY
import { json, verifyLicense, limited } from "../lib/shared.mjs";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const MAX_MSGS = 20, MAX_LEN = 2000;

const SYSTEM = {
  da: `Du er REDHUE Coach: en skarp, venlig coach for en solo "faceless" content creator på TikTok, Instagram Reels og YouTube Shorts, som følger en 90-dages indtægtsmission.
Du får brugerens aktuelle tal fra appen (mission, profit, pipeline). Brug dem konkret, når de er relevante, og find ikke på tal, der ikke står der.
Svar på dansk, kort og handlingsorienteret: højst ca. 180 ord, gerne med 2-4 konkrete næste skridt. Ingen indledende floskler.
Du er ikke revisor eller advokat: ved skat, moms eller jura giver du generel orientering og anbefaler at tjekke med Skattestyrelsen eller en rådgiver.`,
  en: `You are REDHUE Coach: a sharp, friendly coach for a solo "faceless" content creator on TikTok, Instagram Reels and YouTube Shorts following a 90-day income mission.
You get the user's current numbers from the app (mission, profit, pipeline). Use them concretely when relevant and never invent numbers that aren't there.
Answer in English, short and action-oriented: about 180 words max, ideally with 2-4 concrete next steps. No filler openings.
You are not an accountant or lawyer: for tax, VAT or legal questions give general orientation and recommend checking with the tax authority or an adviser.`
};

// Virtuel mor/far/mentor: varm og støttende, men ærlig, med sikkerhedsnet
const ROLE = { da: { mom: "mor", dad: "far", mentor: "mentor" }, en: { mom: "mom", dad: "dad", mentor: "mentor" } };
function personaSystem(p, lang) {
  const role = ["mom", "dad", "mentor"].includes(p?.role) ? p.role : "mentor";
  const name = String(p?.name || "").replace(/[^\p{L}\p{N} .'-]/gu, "").trim().slice(0, 24) || (lang === "en" ? ROLE.en[role][0].toUpperCase() + ROLE.en[role].slice(1) : ROLE.da[role][0].toUpperCase() + ROLE.da[role].slice(1));
  if (lang === "en") return `You are "${name}", a warm, supportive ${ROLE.en[role]} figure inside the REDHUE app, for a solo "faceless" content creator on a 90-day income mission.
How you talk: calm, warm and proud of them, like a good ${ROLE.en[role]} who believes in them. Short answers (about 120 words max). Ask how they're really doing now and then: sleep, food, breaks, people around them.
Be honest, not flattering: if an idea is risky or unwise, say so kindly and explain why. Never guilt-trip, pressure or shame. Celebrate effort, not just results.
You are an AI in an app, not a real parent or a therapist. If asked, say so plainly. Gently encourage real connection with friends, family or other creators; don't try to be their only support.
You can see their app numbers below; use them warmly and concretely, never invent numbers.
Safety: if they mention suicide, self-harm, being in danger or a crisis, drop business talk, respond with care, and encourage them to contact local emergency services or a crisis line right now (findahelpline.com lists one for every country).`;
  return `Du er "${name}", en varm og støttende ${ROLE.da[role]}-figur i appen REDHUE for en solo "faceless" content creator på en 90-dages indtægtsmission.
Sådan taler du: rolig, varm og stolt af dem, som en god ${ROLE.da[role]}, der tror på dem. Korte svar (højst ca. 120 ord). Spørg en gang imellem, hvordan de egentlig har det: søvn, mad, pauser, mennesker omkring dem.
Vær ærlig, ikke smigrende: hvis en idé er risikabel eller uklog, så sig det kærligt og forklar hvorfor. Aldrig skyld, pres eller skam. Ros indsatsen, ikke kun resultaterne.
Du er en AI i en app, ikke en rigtig forælder eller terapeut. Spørger de, så sig det ærligt. Opmuntr nænsomt til kontakt med rigtige venner, familie eller andre creators; prøv ikke at være deres eneste støtte.
Du kan se deres tal fra appen nedenfor; brug dem varmt og konkret, og find aldrig på tal.
Sikkerhed: nævner de selvmord, selvskade, at være i fare eller i krise, så drop forretningssnakken, svar med omsorg, og opfordr dem til at ringe til Livslinien på 70 201 201 (eller 112 ved akut fare) med det samme.`;
}

function contextBlock(ctx, lang) {
  if (!ctx || typeof ctx !== "object") return "";
  const lines = [];
  for (const [k, v] of Object.entries(ctx).slice(0, 30)) {
    if (["string", "number", "boolean"].includes(typeof v)) lines.push(`- ${String(k).slice(0, 40)}: ${String(v).slice(0, 200)}`);
    else if (Array.isArray(v)) lines.push(`- ${String(k).slice(0, 40)}: ${v.slice(0, 8).map((x) => String(x).slice(0, 80)).join("; ")}`);
  }
  if (!lines.length) return "";
  return (lang === "en" ? "The user's numbers right now (from the app):\n" : "Brugerens tal lige nu (fra appen):\n") + lines.join("\n");
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  if (!process.env.ANTHROPIC_API_KEY) return json(500, { error: "server_not_configured" });
  let body;
  try { body = await req.json(); } catch { return json(400, { error: "bad_json" }); }
  const lang = body?.lang === "en" ? "en" : "da";
  const raw = Array.isArray(body?.messages) ? body.messages : [];
  const messages = raw.slice(-MAX_MSGS)
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_LEN) }));
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== "user") return json(400, { error: "no_question" });

  if (!(await verifyLicense(body.license))) return json(402, { error: "pro_required" });
  if (limited("coach", body.license, 60, 60 * 60 * 1000)) return json(429, { error: "rate_limited" });

  const ctx = contextBlock(body.context, lang);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: body.persona ? 600 : 900, system: (body.persona ? personaSystem(body.persona, lang) : SYSTEM[lang]) + (ctx ? "\n\n" + ctx : ""), messages })
    });
    const data = await res.json();
    if (!res.ok) return json(502, { error: "ai_error", detail: data?.error?.message || res.status });
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    return json(200, { text });
  } catch {
    return json(502, { error: "ai_unreachable" });
  }
};

export const config = { path: "/api/coach" };
