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

let discovery = null;
for (const file of ["discovery.js", "server.js"]) {
  try {
    const serverUrl = pathToFileURL(join(process.cwd(), "dist", file)).href;
    const server = await import(serverUrl);
    const meta = [server.SEARCH_TOOLS_TOOL, server.CALL_TOOL, server.LIST_MODULES_TOOL].filter(Boolean);
    if (meta.length) {
      const listed = server.annotationsFor
        ? meta.map((tool) => ({ ...tool, annotations: server.annotationsFor(tool) }))
        : meta;
      const chars = JSON.stringify(listed).length;
      discovery = { tools: meta.length, chars, tokens: approxTokens(chars) };
      break;
    }
  } catch {
    // This build does not export the discovery meta-tools from that file.
  }
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ modules: rows, total, discovery }, null, 2));
} else {
  const pad = (s, n) => String(s).padEnd(n);
  const lpad = (s, n) => String(s).padStart(n);
  console.log(`${pad("module", 14)} ${lpad("tools", 5)} ${lpad("chars", 7)} ${lpad("~tokens", 8)}`);
  for (const r of [...rows, total]) {
    console.log(`${pad(r.module, 14)} ${lpad(r.tools, 5)} ${lpad(r.chars, 7)} ${lpad(r.tokens, 8)}`);
  }
  if (discovery) {
    console.log(
      `\ndiscovery mode: ${discovery.tools} meta-tools, ${discovery.chars} chars, ~${discovery.tokens} tokens`
    );
  }
}
