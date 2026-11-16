// REDHUE Pro · AI-coach (chat). Endpoint: POST /api/coach
// Body: { license, lang: "da"|"en", messages: [{role:"user"|"assistant", content}], context: {...brugerens nøgletal},
//         persona?: { role: "mom"|"dad"|"mentor", name } }  ← "virtuel mor/far": varm, støttende, ærlig
// Env: ANTHROPIC_API_KEY (krævet), ANTHROPIC_MODEL (valgfri), GUMROAD_PRODUCT_ID, REDHUE_DEV_KEY
import { json, verifyLicense, limited, preflight } from "../lib/shared.mjs";
import { SYSTEM, personaSystem, contextBlock } from "../lib/prompts.mjs";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const MAX_MSGS = 20, MAX_LEN = 2000;

export default async (req) => {
  const pre = preflight(req); if (pre) return pre;
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
