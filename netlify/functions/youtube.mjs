// REDHUE · YouTube. Endpoint: /api/youtube?channel=<UC…-id | @handle | kanal-URL>
// Henter OFFENTLIGE tal for en kanal: navn, abonnenter, visninger og de seneste videoer.
//  - Med YOUTUBE_API_KEY (YouTube Data API v3): fuld statistik, @handles virker.
//  - Uden nøgle: kanalens offentlige RSS-feed (kræver kanal-id UC…): seneste 15 videoer med visninger.
// Intet login, ingen upload, intet gemt om brugeren. Svar caches 10 minutter.
import { json, endpoint } from "../lib/shared.mjs";
export const config = { path: "/api/youtube" };
export const deps = { fetch: (...a) => fetch(...a) };
const cache = new Map(); const TTL = 10 * 60 * 1000;
const API = "https://www.googleapis.com/youtube/v3";

export function parseChannel(input) {
  const s = String(input || "").trim();
  let m = s.match(/(UC[0-9A-Za-z_-]{22})/); if (m) return { id: m[1] };
  m = s.match(/(?:youtube\.com\/)?@([0-9A-Za-z._-]{3,30})/); if (m) return { handle: m[1] };
  if (/^[0-9A-Za-z._-]{3,30}$/.test(s)) return { handle: s };
  return null;
}
const dec = (s) => String(s || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
export function parseFeed(xml) {
  const title = dec((xml.match(/<feed[\s\S]*?<title>([\s\S]*?)<\/title>/) || [])[1]);
  const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => ({
    id: (e.match(/<yt:videoId>([^<]+)/) || [])[1],
    title: dec((e.match(/<title>([\s\S]*?)<\/title>/) || [])[1]),
    published: (e.match(/<published>([^<]+)/) || [])[1],
    views: +((e.match(/<media:statistics views="(\d+)"/) || [])[1] || 0),
    likes: +((e.match(/<media:starRating count="(\d+)"/) || [])[1] || 0)
  })).filter((v) => v.id);
  return { title, videos };
}
// ISO 8601-varighed (PT1M5S) → sekunder. Shorts er op til 3 minutter.
export const secs = (d) => { const m = String(d || "").match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/); return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0; };
async function viaApi(key, ch) {
  const q = ch.id ? `id=${ch.id}` : `forHandle=${encodeURIComponent("@" + ch.handle)}`;
  const r = await deps.fetch(`${API}/channels?part=snippet,statistics,contentDetails&${q}&key=${key}`);
  if (!r.ok) throw Object.assign(new Error("yt_api"), { status: r.status });
  const c = ((await r.json()).items || [])[0]; if (!c) return null;
  const uploads = c.contentDetails && c.contentDetails.relatedPlaylists && c.contentDetails.relatedPlaylists.uploads;
  let videos = [];
  if (uploads) {
    const pl = await (await deps.fetch(`${API}/playlistItems?part=contentDetails,snippet&maxResults=15&playlistId=${uploads}&key=${key}`)).json();
    const ids = (pl.items || []).map((i) => i.contentDetails.videoId).join(",");
    if (ids) {
      const vs = await (await deps.fetch(`${API}/videos?part=snippet,statistics,contentDetails&id=${ids}&key=${key}`)).json();
      videos = (vs.items || []).map((v) => ({ id: v.id, title: v.snippet.title, published: v.snippet.publishedAt,
        views: +(v.statistics.viewCount || 0), likes: +(v.statistics.likeCount || 0), comments: +(v.statistics.commentCount || 0),
        seconds: secs(v.contentDetails.duration), short: secs(v.contentDetails.duration) <= 180 }));
    }
  }
  const s = c.statistics || {};
  return { id: c.id, title: c.snippet.title, handle: c.snippet.customUrl || "", thumb: ((c.snippet.thumbnails || {}).default || {}).url || "",
    subscribers: s.hiddenSubscriberCount ? null : +(s.subscriberCount || 0), views: +(s.viewCount || 0), videoCount: +(s.videoCount || 0), videos, source: "api" };
}
async function viaFeed(id) {
  const r = await deps.fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`);
  if (r.status === 404) return null;
  if (!r.ok) throw Object.assign(new Error("yt_feed"), { status: r.status });
  const f = parseFeed(await r.text());
  return { id, title: f.title, handle: "", thumb: "", subscribers: null, views: null, videoCount: null, videos: f.videos, source: "feed" };
}
export default endpoint("youtube", async (req, ctx) => {
  const ch = parseChannel(ctx.url.searchParams.get("channel"));
  if (!ch) return json(400, { error: "bad_channel" });
  const key = process.env.YOUTUBE_API_KEY || "";
  if (!ch.id && !key) return json(400, { error: "need_channel_id" });
  const ck = ch.id || "@" + ch.handle.toLowerCase(); const hit = cache.get(ck);
  if (hit && Date.now() - hit.at < TTL) return json(200, { ...hit.data, cached: true });
  let data = null;
  try { data = key ? await viaApi(key, ch) : await viaFeed(ch.id); }
  catch (e) { if (key && ch.id) data = await viaFeed(ch.id).catch(() => null); if (!data) return json(502, { error: "youtube_unreachable" }); }
  if (!data) return json(404, { error: "not_found" });
  const total = data.videos.reduce((a, v) => a + (v.views || 0), 0);
  data.recent = { count: data.videos.length, views: total, avgViews: data.videos.length ? Math.round(total / data.videos.length) : 0,
    best: data.videos.slice().sort((a, b) => b.views - a.views)[0] || null };
  cache.set(ck, { at: Date.now(), data }); if (cache.size > 200) cache.delete(cache.keys().next().value);
  return json(200, data);
}, { limit: [60, 60_000] });
