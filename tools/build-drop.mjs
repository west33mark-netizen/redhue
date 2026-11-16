// Bygger dist/ (og redhue-netlify.zip): en komplet udgave, der kan trækkes direkte ind i Netlify
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
// 2) Headers (træk-og-slip læser _headers, ikke netlify.toml)
// Kildekoden til funktionerne skal ikke kunne hentes som almindelige filer
writeFileSync(out + "_redirects", "/netlify/*  /404  404!\n");
writeFileSync(out + "_headers", "/sw.js\n  Cache-Control: no-cache\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n");
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
// 4) Zip
rmSync(root + "redhue-netlify.zip", { force: true });
execSync(`cd "${out}" && zip -qr "${root}redhue-netlify.zip" .`);
const kb = (p) => Math.round(statSync(p).size / 1024);
console.log(`dist/ klar · ${fns.length} funktioner · zip ${kb(root + "redhue-netlify.zip")} KB`);
