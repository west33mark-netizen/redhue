import { verifyLicense, preflight, CORS } from "../lib/shared.mjs";
import { AGENTS, REQUIRED, clean } from "../lib/prompts.mjs";
// REDHUE Pro · Agent-team backend
// Netlify Function (v2). Endpoint: POST /api/agents
// Env vars (Netlify → Site configuration → Environment variables):
//   ANTHROPIC_API_KEY     – required
//   GUMROAD_PRODUCT_ID    – required (your Gumroad product ID for REDHUE Pro)
//   ANTHROPIC_MODEL       – optional, default "claude-sonnet-5"
//   REDHUE_DEV_KEY        – optional, a private key that bypasses Gumroad (for your own testing)
// Se også coach.mjs (AI-coach) og chat.mjs (fællesskabs-chat), som deler netlify/lib/shared.mjs.

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const RATE_LIMIT = 40;                      // runs per license per hour (per function instance)

const usage = new Map();        // key -> { count, windowStart }

// ---------- Agent definitions ----------
// ---------- Helpers ----------
const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS }
  });

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
  const pre = preflight(req); if (pre) return pre;
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
