// Bygger dist/ (og REDHUE-KOMPLET.zip): en komplet udgave, der kan trækkes direkte ind i Netlify
// (Deploys → træk-og-slip). Ingen build eller npm nødvendig: hver server-funktion samles i én fil.
//   node tools/build-drop.mjs
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
const root = new URL("..", import.meta.url).pathname, out = root + "dist/";
rmSync(out, { recursive: true, force: true }); mkdirSync(out + "netlify/functions", { recursive: true });
// 1) Offentlige filer – kun dem, appen bruger
for (const f of ["index.html", "sw.js", "manifest.json", "avatar.png", "privatliv.html", "salg.html"]) cpSync(root + f, out + f);
cpSync(root + "icons", out + "icons", { recursive: true });
// Google Play (TWA): Digital Asset Links skal ligge på /.well-known/assetlinks.json
cpSync(root + ".well-known", out + ".well-known", { recursive: true });
cpSync(root + "store/manifest", out + "store/manifest", { recursive: true }); // manifest-screenshots (webp)
// 2) Headers (træk-og-slip læser _headers, ikke netlify.toml)
// Kildekoden til funktionerne skal ikke kunne hentes som almindelige filer
writeFileSync(out + "_redirects", "/netlify/*  /404  404!\n");
writeFileSync(out + "_headers", "/sw.js\n  Cache-Control: no-cache\n/.well-known/assetlinks.json\n  Content-Type: application/json\n  Access-Control-Allow-Origin: *\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n");
// 3) Funktioner: én selvstændig fil hver. `export const config` bevares bogstaveligt, så Netlify finder /api/-stien.
const fns = readdirSync(root + "netlify/functions").filter((f) => f.endsWith(".mjs"));
for (const f of fns) {
  const src = readFileSync(root + "netlify/functions/" + f, "utf8");
  const m = src.match(/export const config = (\{[^;]*?\});/); if (!m) throw new Error(f + ": mangler export const config");
  const r = await build({ entryPoints: [root + "netlify/functions/" + f], bundle: true, platform: "node", format: "esm", target: "node20", write: false, legalComments: "none",
    banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" } });
  let code = r.outputFiles[0].text;
  // esbuild skriver `var config = {...}` + `export { config, x as default }` – lav det om til en bogstavelig export
  code = code.replace(/\bvar config = \{/, "export const config = {").replace(/export \{([^}]*)\};?\s*$/, (all, list) => "export {" + list.split(",").map((s) => s.trim()).filter((s) => s && s !== "config").join(", ") + "};\n");
  if (!/export const config = \{\s*path:\s*"\/api\//.test(code)) throw new Error(f + ": config.path blev ikke bevaret");
  writeFileSync(out + "netlify/functions/" + f, code);
}
// Tjekliste i pakken, så man kan se, at den er komplet
const ver=(readFileSync(root+"index.html","utf8").match(/const VERSION = "([^"]+)"/)||[])[1];
writeFileSync(out+"INDHOLD.txt",`REDHUE ${ver} – komplet pakke\nTræk denne zip (eller den udpakkede mappe) ind under Deploys i Netlify.\n\nApp: index.html, sw.js, manifest.json, ikoner, privatliv.html, salg.html\nServer (${fns.length} dele): ${fns.map(f=>"/api/"+f.replace(".mjs","")).join(", ")}\n\nEfter upload skal Netlify vise ${fns.length} funktioner, og appen viser "Server: Komplet" under Indstillinger → Beta.\n`);
// 4) Zip
rmSync(root + "REDHUE-KOMPLET.zip", { force: true });
execSync(`cd "${out}" && zip -qr "${root}REDHUE-KOMPLET.zip" .`);
const kb = (p) => Math.round(statSync(p).size / 1024);
console.log(`dist/ klar · ${fns.length} funktioner · zip ${kb(root + "REDHUE-KOMPLET.zip")} KB`);
