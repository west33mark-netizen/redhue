// REDHUE Pro · Agent-team backend
// Netlify Function (v2). Endpoint: POST /api/agents
// Env vars (Netlify → Site configuration → Environment variables):
//   ANTHROPIC_API_KEY     – required
//   GUMROAD_PRODUCT_ID    – required (your Gumroad product ID for REDHUE Pro)
//   ANTHROPIC_MODEL       – optional, default "claude-sonnet-5"
//   REDHUE_DEV_KEY        – optional, a private key that bypasses Gumroad (for your own testing)

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const LICENSE_TTL_MS = 6 * 60 * 60 * 1000; // re-verify license every 6 hours
const RATE_LIMIT = 40;                      // runs per license per hour (per function instance)

const licenseCache = new Map(); // key -> { ok, at }
const usage = new Map();        // key -> { count, windowStart }

// ---------- Agent definitions ----------
const AGENTS = {
  script: {
    maxTokens: 1500,
    system: {
      da: `Du er REDHUE Script-agenten: ekspert i faceless short-form video (TikTok, Reels, Shorts).
Skriv manuskripter der fanger i første sekund og holder på seeren til slut.
Regler: Ingen ansigt på kamera — alt skal kunne laves med voiceover, B-roll, tekst på skærm eller AI-visuals.
Format for hvert manuskript:
## Manuskript X – <arbejdstitel>
**Hook (0–2 sek):** ...
**Voiceover:** tidsmærkede linjer (fx [0:02] ...)
**Visuals:** hvad der vises
**Tekst på skærm:** ...
**CTA:** ...
Skriv på dansk.`,
      en: `You are the REDHUE Script Agent: an expert in faceless short-form video (TikTok, Reels, Shorts).
Write scripts that grab attention in the first second and hold viewers to the end.
Rules: No face on camera — everything must work with voiceover, B-roll, on-screen text or AI visuals.
Format for each script:
## Script X – <working title>
**Hook (0–2s):** ...
**Voiceover:** timestamped lines (e.g. [0:02] ...)
**Visuals:** what is shown
**On-screen text:** ...
**CTA:** ...
Write in English.`
    },
    user: (f, lang) => lang === "da"
      ? `Niche: ${f.niche}\nEmne: ${f.topic}\nLængde: ${f.length || "30"} sekunder\nTone: ${f.tone || "nysgerrig og energisk"}\nAntal varianter: ${f.count || 2}`
      : `Niche: ${f.niche}\nTopic: ${f.topic}\nLength: ${f.length || "30"} seconds\nTone: ${f.tone || "curious and energetic"}\nNumber of variants: ${f.count || 2}`
  },

  hooks: {
    maxTokens: 1200,
    system: {
      da: `Du er REDHUE Hook & Caption-agenten. Du skriver scroll-stoppende hooks og platformtilpassede captions.
Levér i denne rækkefølge:
## 10 hooks
Nummereret, maks 12 ord hver, blandet stil (spørgsmål, chok-fakta, kontrast, "ingen fortæller dig…").
## Captions
**TikTok:** kort + 4–6 hashtags
**Instagram Reels:** lidt længere, linjeskift, 8–12 hashtags
**YouTube Shorts:** titel (maks 60 tegn) + kort beskrivelse + 3 hashtags
Blanding af danske og engelske hashtags hvis det giver mening. Skriv på dansk.`,
      en: `You are the REDHUE Hook & Caption Agent. You write scroll-stopping hooks and platform-specific captions.
Deliver in this order:
## 10 hooks
Numbered, max 12 words each, mixed styles (question, shock fact, contrast, "nobody tells you…").
## Captions
**TikTok:** short + 4–6 hashtags
**Instagram Reels:** a bit longer, line breaks, 8–12 hashtags
**YouTube Shorts:** title (max 60 chars) + short description + 3 hashtags
Write in English.`
    },
    user: (f, lang) => lang === "da"
      ? `Niche: ${f.niche}\nVideoens indhold/emne: ${f.topic}${f.script ? `\nManuskript:\n${f.script}` : ""}`
      : `Niche: ${f.niche}\nVideo content/topic: ${f.topic}${f.script ? `\nScript:\n${f.script}` : ""}`
  },

  planner: {
    maxTokens: 1800,
    system: {
      da: `Du er REDHUE Planlægger-agenten. Du laver realistiske postingplaner for en solo faceless creator, der arbejder mod en 90-dages indkomstmission.
Levér:
## Ugeplan
En tabel i markdown med kolonnerne: Dag | Platform | Format | Emne/idé | Hook-vinkel | Tid (dansk tid)
## Batch-produktion
Hvilke videoer der kan optages/genereres i samme session, og estimeret tid.
## Ugens fokus
3 punkter der flytter tallene mest mod indkomstmålet.
Tag højde for den tid brugeren har til rådighed. Skriv på dansk.`,
      en: `You are the REDHUE Planner Agent. You build realistic posting plans for a solo faceless creator working toward a 90-day income mission.
Deliver:
## Weekly plan
A markdown table with columns: Day | Platform | Format | Topic/idea | Hook angle | Time (local)
## Batch production
Which videos can be produced in the same session, with estimated time.
## Focus this week
3 points that move the numbers most toward the income goal.
Respect the time the user has available. Write in English.`
    },
    user: (f, lang) => lang === "da"
      ? `Niche: ${f.niche}\nPlatforme: ${f.platforms || "TikTok, Reels, Shorts"}\nVideoer pr. uge: ${f.perWeek || 7}\nTimer pr. uge: ${f.hours || 5}\nMissionsdag: ${f.day || "1"} af 90\nIndkomstmål: ${f.goal || "ikke angivet"}`
      : `Niche: ${f.niche}\nPlatforms: ${f.platforms || "TikTok, Reels, Shorts"}\nVideos per week: ${f.perWeek || 7}\nHours per week: ${f.hours || 5}\nMission day: ${f.day || "1"} of 90\nIncome goal: ${f.goal || "not set"}`
  },

  analyst: {
    maxTokens: 1500,
    system: {
      da: `Du er REDHUE Analyse-agenten. Du læser brugerens performance-tal og giver skarpe, konkrete råd.
Opfind aldrig tal. Hvis data mangler, så sig hvad der mangler.
Levér:
## Hvad virker
## Hvad virker ikke
## 3 eksperimenter til næste uge
Hvert eksperiment: hypotese, hvad der ændres, hvilket tal der skal måles.
## Status på missionen
Kort vurdering af om tempoet holder mod 90-dages målet.
Skriv på dansk.`,
      en: `You are the REDHUE Analyst Agent. You read the user's performance numbers and give sharp, concrete advice.
Never invent numbers. If data is missing, say what is missing.
Deliver:
## What works
## What doesn't
## 3 experiments for next week
Each experiment: hypothesis, what to change, which metric to measure.
## Mission status
Short assessment of whether the pace holds toward the 90-day goal.
Write in English.`
    },
    user: (f, lang) => lang === "da"
      ? `Niche: ${f.niche}\nMissionsdag: ${f.day || "?"} af 90\nIndkomstmål: ${f.goal || "ikke angivet"}\nData (indsat af brugeren):\n${f.stats}`
      : `Niche: ${f.niche}\nMission day: ${f.day || "?"} of 90\nIncome goal: ${f.goal || "not set"}\nData (pasted by user):\n${f.stats}`
  }
};

const REQUIRED = { script: ["niche", "topic"], hooks: ["niche", "topic"], planner: ["niche"], analyst: ["niche", "stats"] };

// ---------- Helpers ----------
const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });

function clean(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields || {})) {
    if (typeof v !== "string" && typeof v !== "number") continue;
    out[k] = String(v).slice(0, k === "stats" || k === "script" ? 6000 : 400).trim();
  }
  return out;
}

async function verifyLicense(key) {
  if (!key) return false;
  if (process.env.REDHUE_DEV_KEY && key === process.env.REDHUE_DEV_KEY) return true;

  const cached = licenseCache.get(key);
  if (cached && Date.now() - cached.at < LICENSE_TTL_MS) return cached.ok;

  try {
    const res = await fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        product_id: process.env.GUMROAD_PRODUCT_ID || "",
        license_key: key,
        increment_uses_count: "false"
      })
    });
    const data = await res.json();
    const p = data.purchase || {};
    const ok = !!data.success && !p.refunded && !p.chargebacked &&
      !p.subscription_cancelled_at && !p.subscription_failed_at;
    licenseCache.set(key, { ok, at: Date.now() });
    return ok;
  } catch {
    return false;
  }
}

function rateLimited(key) {
  const now = Date.now();
  const u = usage.get(key) || { count: 0, windowStart: now };
  if (now - u.windowStart > 60 * 60 * 1000) { u.count = 0; u.windowStart = now; }
  u.count++;
  usage.set(key, u);
  return u.count > RATE_LIMIT;
}

// ---------- Handler ----------
export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  if (!process.env.ANTHROPIC_API_KEY) return json(500, { error: "server_not_configured" });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: "bad_json" }); }

  const { agent, license, lang: rawLang } = body || {};
  const lang = rawLang === "en" ? "en" : "da";
  const def = AGENTS[agent];
  if (!def) return json(400, { error: "unknown_agent" });

  const fields = clean(body.fields);
  const missing = REQUIRED[agent].filter((k) => !fields[k]);
  if (missing.length) return json(400, { error: "missing_fields", fields: missing });

  if (!(await verifyLicense(license))) return json(402, { error: "pro_required" });
  if (rateLimited(license)) return json(429, { error: "rate_limited" });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: def.maxTokens,
        system: def.system[lang],
        messages: [{ role: "user", content: def.user(fields, lang) }]
      })
    });
    const data = await res.json();
    if (!res.ok) return json(502, { error: "ai_error", detail: data?.error?.message || res.status });

    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    return json(200, { agent, text, usage: data.usage });
  } catch (e) {
    return json(502, { error: "ai_unreachable" });
  }
};

export const config = { path: "/api/agents" };
