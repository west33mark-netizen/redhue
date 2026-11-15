// REDHUE · Vejr fra DMI. Endpoint: /api/weather?lat=55.68&lon=12.57
// Kilde: DMI's frie data (opendataapi.dmi.dk – ingen nøgle siden 2. dec. 2025).
//  1) Prognose: HARMONIE DINI (collection harmonie_dini_sf) for nærmeste gitterpunkt, op til 60 timer.
//  2) Usikkerhed: HARMONIE DINI ensemble-percentiler (10 % / 50 % / 90 %), hvis tilgængelig.
//  3) Målt nu: nærmeste DMI-station (metObs, seneste time).
// Gennemsigtighed: svaret fortæller præcis hvilke kilder, parametre, enheder og tidspunkter der er brugt.
// Parameternavne slås op i DMI's egne metadata, så endpointet tåler navneændringer.
import { json, endpoint } from "../lib/shared.mjs";
export const config = { path: "/api/weather" };
export const deps = { fetch: (...a) => fetch(...a) };
const HOST = "https://opendataapi.dmi.dk";
const SF = "harmonie_dini_sf", EPS = "harmonie_dini_eps_percentiles";
const cache = new Map(), meta = new Map();
const TTL = 15 * 60 * 1000, META_TTL = 24 * 3600 * 1000;

// Hvilke parametre vi vil have, og hvordan vi genkender dem i DMI's metadata
export const WANT = {
  temp:  { re: [/^temperature-2m$/], guess: "temperature-2m", unit: "K→°C" },
  wind:  { re: [/^wind-speed-10m$/, /^wind-speed$/], guess: "wind-speed-10m", unit: "m/s" },
  dir:   { re: [/^wind-dir(ection)?-10m$/, /^wind-dir(ection)?$/], guess: "wind-dir-10m", unit: "grader" },
  gust:  { re: [/gust/], guess: "gust-wind-speed-10m", unit: "m/s" },
  rain:  { re: [/^total-precipitation$/, /^total-precipitation-1h$/, /precipitation/], guess: "total-precipitation", unit: "mm" },
  cloud: { re: [/^fraction-of-cloud-cover$/, /^cloud-?cover$/, /cloud/], guess: "fraction-of-cloud-cover", unit: "0–1→%" },
  rh:    { re: [/^relative-humidity-2m$/, /^relative-humidity$/], guess: "relative-humidity-2m", unit: "%" }
};
export function pickParams(names, want = WANT) {
  const out = {};
  for (const [k, w] of Object.entries(want)) { for (const re of w.re) { const hit = names.find((n) => re.test(n)); if (hit) { out[k] = hit; break; } } }
  return out;
}
async function getJSON(url, ms = 12000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { const r = await deps.fetch(url, { signal: c.signal, headers: { accept: "application/json" } }); if (!r.ok) throw Object.assign(new Error("dmi_" + r.status), { status: r.status }); return await r.json(); }
  finally { clearTimeout(t); }
}
async function paramNames(col) {
  const m = meta.get(col); if (m && Date.now() - m.at < META_TTL) return m.names;
  const j = await getJSON(`${HOST}/v1/forecastedr/collections/${col}`);
  const names = Object.keys(j.parameter_names || j.parameters || {});
  meta.set(col, { at: Date.now(), names }); return names;
}
// DMI svarer i GeoJSON (én feature pr. tidsskridt) – CoverageJSON understøttes også
export function series(j) {
  const rows = {};
  if (j && Array.isArray(j.features)) {
    for (const f of j.features) { const p = f.properties || {}; const t = p.step || p.time || p.datetime; if (!t) continue; rows[t] = { ...(rows[t] || {}), ...p }; }
  } else if (j && j.domain && j.ranges) {
    const ts = (j.domain.axes && j.domain.axes.t && j.domain.axes.t.values) || [];
    ts.forEach((t, i) => { rows[t] = rows[t] || {}; for (const [k, r] of Object.entries(j.ranges)) rows[t][k] = (r.values || [])[i]; });
  }
  return Object.keys(rows).sort().map((t) => ({ t, ...rows[t] }));
}
const round = (x, d = 1) => (x == null || Number.isNaN(+x) ? null : Math.round(+x * 10 ** d) / 10 ** d);
const toC = (k) => (k == null ? null : k > 150 ? k - 273.15 : +k);
export function normalize(rows, P) {
  let prevAcc = null;
  return rows.map((r) => {
    let rain = r[P.rain];
    if (P.rain && /^total-precipitation$/.test(P.rain) && rain != null) { const acc = +rain; rain = prevAcc == null ? 0 : Math.max(0, acc - prevAcc); prevAcc = acc; } // akkumuleret → pr. time
    const cl = r[P.cloud];
    return { t: r.t, temp: round(toC(r[P.temp])), wind: round(r[P.wind]), dir: round(r[P.dir], 0), gust: round(r[P.gust]), rain: round(rain), cloud: cl == null ? null : Math.round(cl <= 1 ? cl * 100 : cl), rh: round(r[P.rh], 0) };
  });
}
const km = (a, b, c, d) => { const R = 6371, r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r; const h = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
async function observation(lat, lon) {
  const bb = [lon - 0.5, lat - 0.3, lon + 0.5, lat + 0.3].map((x) => x.toFixed(3)).join(",");
  const j = await getJSON(`${HOST}/v2/metObs/collections/observation/items?bbox=${bb}&period=latest-hour&limit=2000`, 10000);
  const st = {};
  for (const f of j.features || []) { const p = f.properties || {}; const [x, y] = (f.geometry && f.geometry.coordinates) || []; if (x == null) continue;
    const s = st[p.stationId] || (st[p.stationId] = { station: p.stationId, lat: y, lon: x, at: p.observed, v: {} });
    if (!s.v[p.parameterId] || p.observed > s.v[p.parameterId].at) s.v[p.parameterId] = { val: p.value, at: p.observed }; }
  const list = Object.values(st).filter((s) => s.v.temp_dry).map((s) => ({ ...s, dist: km(lat, lon, s.lat, s.lon) })).sort((a, b) => a.dist - b.dist);
  const s = list[0]; if (!s) return null;
  const g = (k) => (s.v[k] ? s.v[k].val : null);
  return { station: s.station, distanceKm: round(s.dist), at: s.v.temp_dry.at, temp: round(g("temp_dry")), wind: round(g("wind_speed")), dir: round(g("wind_dir"), 0), rain1h: round(g("precip_past1h")), rh: round(g("humidity"), 0) };
}
async function ensemble(lat, lon) {
  const names = await paramNames(EPS);
  const pick = (re) => names.find((n) => re.test(n));
  const P = { t10: pick(/^temperature-2m-10percentile$/), t50: pick(/^temperature-2m-50percentile$/), t90: pick(/^temperature-2m-90percentile$/),
    r50: pick(/^total-precipitation-1h-50percentile$/), r90: pick(/^total-precipitation-1h-90percentile$/), w50: pick(/^wind-speed-10m-50percentile$/), w90: pick(/^wind-speed-10m-90percentile$/) };
  const list = Object.values(P).filter(Boolean); if (!list.length) return null;
  const j = await getJSON(`${HOST}/v1/forecastedr/collections/${EPS}/position?coords=POINT(${lon}%20${lat})&crs=crs84&f=GeoJSON&parameter-name=${list.join(",")}`);
  return { params: P, rows: series(j).map((r) => ({ t: r.t, t10: round(toC(r[P.t10])), t50: round(toC(r[P.t50])), t90: round(toC(r[P.t90])), r50: round(r[P.r50]), r90: round(r[P.r90]), w50: round(r[P.w50]), w90: round(r[P.w90]) })) };
}
export default endpoint("weather", async (req, ctx) => {
  const lat = +ctx.url.searchParams.get("lat"), lon = +ctx.url.searchParams.get("lon");
  // HARMONIE DINI dækker Nordeuropa; vi begrænser til Danmark og nærområdet
  if (!(lat >= 53.5 && lat <= 58.5 && lon >= 7 && lon <= 16)) return json(400, { error: "outside_denmark" });
  const la = Math.round(lat * 20) / 20, lo = Math.round(lon * 20) / 20, ck = la + "," + lo; // ~5 km celler
  const hit = cache.get(ck); if (hit && Date.now() - hit.at < TTL) return json(200, { ...hit.data, cached: true });
  const notes = [];
  let names = []; try { names = await paramNames(SF); } catch { notes.push("DMI's parameterliste kunne ikke hentes – bruger kendte navne."); }
  let P = names.length ? pickParams(names) : {};
  for (const [k, w] of Object.entries(WANT)) if (!P[k] && !names.length) P[k] = w.guess;
  if (!P.temp) return json(502, { error: "dmi_params" });
  const fc = async (params) => series(await getJSON(`${HOST}/v1/forecastedr/collections/${SF}/position?coords=POINT(${lo}%20${la})&crs=crs84&f=GeoJSON&parameter-name=${Object.values(params).join(",")}`));
  let rows;
  try { rows = await fc(P); }
  catch (e) { if (e.status === 400) { notes.push("Nogle parametre blev afvist af DMI – viser kun temperatur."); P = { temp: P.temp }; rows = await fc(P).catch(() => null); } }
  if (!rows || !rows.length) return json(502, { error: "dmi_unreachable" });
  const hours = normalize(rows, P).filter((h) => Date.parse(h.t) >= Date.now() - 3600e3).slice(0, 48);
  const [obs, eps] = await Promise.all([observation(la, lo).catch(() => null), ensemble(la, lo).catch(() => null)]);
  if (!obs) notes.push("Ingen målinger fra en DMI-station i nærheden den seneste time.");
  if (!eps) notes.push("Usikkerhedsbånd (ensemble) var ikke tilgængeligt.");
  const data = {
    place: { lat: la, lon: lo, requested: { lat: round(lat, 3), lon: round(lon, 3) } },
    hours, band: eps ? eps.rows.filter((r) => Date.parse(r.t) >= Date.now() - 3600e3).slice(0, 48) : [], obs,
    source: {
      by: "DMI – Danmarks Meteorologiske Institut", license: "DMI's frie data", url: "https://www.dmi.dk/friedata",
      forecast: { model: "HARMONIE DINI", collection: SF, firstStep: rows[0] && rows[0].t, params: P, units: Object.fromEntries(Object.keys(P).map((k) => [k, WANT[k].unit])) },
      ensemble: eps ? { collection: EPS, params: eps.params } : null,
      observation: obs ? { api: "metObs", station: obs.station } : null,
      fetched: new Date().toISOString(), gridCell: "ca. 5 × 5 km omkring dit punkt"
    },
    notes
  };
  cache.set(ck, { at: Date.now(), data }); if (cache.size > 300) cache.delete(cache.keys().next().value);
  return json(200, data);
}, { limit: [60, 60_000] });
