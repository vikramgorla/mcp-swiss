#!/usr/bin/env node
// Measures the size of the tool schemas sent to the model (tools/list payload).
// Usage: npm run build && node scripts/measure-schema-tokens.mjs [--json]
// Token count is approximate: characters / 4.
//
// Imports each module's tool array directly so this does not start the server
// (src/index.ts connects stdio on import). Discovery mode is reported when
// dist/server.js exports the meta-tools.
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const approxTokens = (chars) => Math.round(chars / 4);

const modules = [
  ["transport", "transportTools"],
  ["weather", "weatherTools"],
  ["geodata", "geodataTools"],
  ["companies", "companiesTools"],
  ["holidays", "holidaysTools"],
  ["parliament", "parliamentTools"],
  ["avalanche", "avalancheTools"],
  ["airquality", "airqualityTools"],
  ["post", "postTools"],
  ["energy", "energyTools"],
  ["statistics", "statisticsTools"],
  ["snb", "snbTools"],
  ["recycling", "recyclingTools"],
  ["news", "newsTools"],
  ["voting", "votingTools"],
  ["dams", "damsTools"],
  ["hiking", "hikingTools"],
  ["realestate", "realEstateTools"],
  ["traffic", "trafficTools"],
  ["earthquakes", "earthquakeTools"],
  ["snow", "snowTools"],
  ["pollen", "pollenTools"],
  ["gwr", "gwrTools"],
  ["opendata", "opendataTools"],
  ["meteoswiss", "meteoswissTools"],
  ["maplayers", "maplayerTools"],
  ["sbbdata", "sbbDataTools"],
];

const rows = [];
const allTools = [];
for (const [name, exportName] of modules) {
  const url = pathToFileURL(join(process.cwd(), "dist", "modules", `${name}.js`)).href;
  let mod;
  try {
    mod = await import(url);
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "ERR_MODULE_NOT_FOUND") continue;
    throw err;
  }
  const tools = mod[exportName];
  if (!Array.isArray(tools)) continue;
  allTools.push(...tools);
  const chars = JSON.stringify(tools).length;
  rows.push({ module: name, tools: tools.length, chars, tokens: approxTokens(chars) });
}

const totalChars = JSON.stringify(allTools).length;
const total = { module: "TOTAL", tools: allTools.length, chars: totalChars, tokens: approxTokens(totalChars) };

// What a client actually receives (tools/list plus initialize instructions)
// in each mode, measured from the real server code.
let modes = null;
try {
  const server = await import(pathToFileURL(join(process.cwd(), "dist", "server.js")).href);
  const registry = await import(pathToFileURL(join(process.cwd(), "dist", "registry.js")).href);
  if (server.listing && registry.resolveModules) {
    const active = registry.resolveModules(null);
    const measure = (discovery) => {
      const { tools, instructions } = server.listing(active, discovery);
      const chars = JSON.stringify(tools).length + (instructions?.length ?? 0);
      return { listed: tools.length, chars, tokens: approxTokens(chars) };
    };
    modes = { search: measure(true), full: measure(false) };
  }
} catch {
  // Older build without listing(): only the per-module table is shown.
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ modules: rows, total, modes }, null, 2));
} else {
  const pad = (s, n) => String(s).padEnd(n);
  const lpad = (s, n) => String(s).padStart(n);
  console.log(`${pad("module", 14)} ${lpad("tools", 5)} ${lpad("chars", 7)} ${lpad("~tokens", 8)}`);
  for (const r of [...rows, total]) {
    console.log(`${pad(r.module, 14)} ${lpad(r.tools, 5)} ${lpad(r.chars, 7)} ${lpad(r.tokens, 8)}`);
  }
  if (modes) {
    const saved = Math.round(100 * (1 - modes.search.chars / modes.full.chars));
    console.log(`\nWhat a client receives (tools/list + instructions, annotations included):`);
    console.log(`  search mode (default): ${modes.search.listed} tools listed, ~${modes.search.tokens} tokens`);
    console.log(`  full mode:             ${modes.full.listed} tools listed, ~${modes.full.tokens} tokens`);
    console.log(`  search mode saves ${saved}%`);
  }
}
