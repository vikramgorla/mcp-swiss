#!/usr/bin/env node
// Regenerates docs/tools.schema.json and the tools array of manifest.json
// from the built modules. Usage:
//   npm run docs:tools
//   node scripts/generate-tool-docs.mjs --check
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");

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
];

const tools = [];
for (const [name, exportName] of modules) {
  const url = pathToFileURL(join(root, "dist", "modules", `${name}.js`)).href;
  let mod;
  try {
    mod = await import(url);
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "ERR_MODULE_NOT_FOUND") continue;
    throw err;
  }
  if (Array.isArray(mod[exportName])) tools.push(...mod[exportName]);
}

const schemaPath = join(root, "docs/tools.schema.json");
const schemaOut = JSON.stringify({
  tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
}, null, 2) + "\n";

const manifestPath = join(root, "manifest.json");
const manifestIn = readFileSync(manifestPath, "utf8");
const toolsBlock = JSON.stringify(tools.map(({ name, description }) => ({ name, description })), null, 2)
  .split("\n")
  .map((line, i) => (i === 0 ? line : "  " + line))
  .join("\n");
const toolsRe = /\n {2}"tools": \[[\s\S]*?\n {2}\]/;
if (!toolsRe.test(manifestIn)) {
  console.error('manifest.json: top-level "tools" array not found');
  process.exit(2);
}
const manifestOut = manifestIn.replace(toolsRe, () => `\n  "tools": ${toolsBlock}`);
JSON.parse(manifestOut);

if (check) {
  const schemaSame = readFileSync(schemaPath, "utf8") === schemaOut;
  const manifestSame = manifestIn === manifestOut;
  if (!schemaSame || !manifestSame) {
    console.error("docs/tools.schema.json or manifest.json is stale. Run: npm run docs:tools");
    process.exit(1);
  }
  console.log(`tool docs in sync (${tools.length} tools)`);
} else {
  writeFileSync(schemaPath, schemaOut);
  writeFileSync(manifestPath, manifestOut);
  console.log(`wrote ${tools.length} tools`);
}
