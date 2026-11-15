// REDHUE · Status. Endpoint: /api/health
// Viser hvilke dele af backenden der er klar – aldrig selve nøglerne, kun om de er sat.
import { json, endpoint, ROUTES, BETA_UNTIL } from "../lib/shared.mjs";
export const config = { path: "/api/health" };
const has = (k) => !!(process.env[k] && String(process.env[k]).trim());
export default endpoint("health", async () => json(200, {
  ok: true,
  at: new Date().toISOString(),
  routes: Object.fromEntries(Object.entries(ROUTES).map(([k, v]) => [k, { path: `/api/${k}`, what: v }])),
  keys: {
    ANTHROPIC_API_KEY: has("ANTHROPIC_API_KEY"),
    REDHUE_DEV_KEY: has("REDHUE_DEV_KEY"),
    GUMROAD_PRODUCT_ID: has("GUMROAD_PRODUCT_ID"),
    YOUTUBE_API_KEY: has("YOUTUBE_API_KEY")
  },
  ready: {
    ai: has("ANTHROPIC_API_KEY"),
    owner: has("REDHUE_DEV_KEY"),
    sales: has("GUMROAD_PRODUCT_ID"),
    youtube_stats: has("YOUTUBE_API_KEY"),
    youtube_feed: true
  },
  betaUntil: BETA_UNTIL
}), { limit: [60, 60_000] });
