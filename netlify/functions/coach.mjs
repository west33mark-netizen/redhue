// REDHUE Pro · AI-coach (chat). Endpoint: POST /api/coach
// Body: { license, lang: "da"|"en", messages: [{role:"user"|"assistant", content}], context: {...brugerens nøgletal} }
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
      body: JSON.stringify({ model: MODEL, max_tokens: 900, system: SYSTEM[lang] + (ctx ? "\n\n" + ctx : ""), messages })
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
