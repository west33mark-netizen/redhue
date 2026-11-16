// Indlejrer netlify/lib/prompts.mjs i index.html (mellem markørerne), så sky-tilstanden i Claude
// bruger præcis de samme AI-instruktioner som serveren.  node tools/embed-prompts.mjs [--check]
import { readFileSync, writeFileSync } from "node:fs";
const root = new URL("..", import.meta.url).pathname;
const src = readFileSync(root + "netlify/lib/prompts.mjs", "utf8").replace(/^export\s+/gm, "");
const block = `/* PROMPTS:START – genereret af tools/embed-prompts.mjs fra netlify/lib/prompts.mjs. Ret ikke her. */
const RH_PROMPTS=(()=>{
${src}
return { buildAgent, buildCoach };
})();
/* PROMPTS:END */`;
const file = root + "index.html", html = readFileSync(file, "utf8");
const re = /\/\* PROMPTS:START[\s\S]*?\/\* PROMPTS:END \*\//;
if (!re.test(html)) { console.error("Markørerne PROMPTS:START/END mangler i index.html"); process.exit(1); }
const out = html.replace(re, () => block);
if (process.argv.includes("--check")) { if (out !== html) { console.error("index.html har en gammel kopi af prompts – kør node tools/embed-prompts.mjs"); process.exit(1); } console.log("Prompts er opdateret i index.html"); }
else { writeFileSync(file, out); console.log(out === html ? "Uændret" : "Prompts indlejret i index.html"); }
