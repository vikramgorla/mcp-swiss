#!/usr/bin/env node
// Builds the GitHub Pages site into site/dist from the compiled server.
// Usage: npm run build && node scripts/build-site.mjs [outDir]
//
// The tool catalogue, counts, token figures and the question board all come
// from dist/, so the site cannot drift from the code. The board runs the real
// swiss_search_tools ranking (dist/discovery.js) in the browser.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { renderLlms } from "./llms.mjs";

const root = process.cwd();
const out = process.argv[2] ?? join(root, "site", "dist");
const require = createRequire(join(root, "package.json"));

const { resolveModules, presets } = require("./dist/registry.js");
const { listing } = require("./dist/server.js");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const modules = resolveModules(null);
const toolCount = modules.reduce((n, m) => n + m.tools.length, 0);
const approx = (discovery) => {
  const { tools, instructions } = listing(modules, discovery);
  const chars = JSON.stringify(tools).length + (instructions?.length ?? 0);
  return Math.round(chars / 4 / 100) * 100;
};

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmt = (n) => n.toLocaleString("en-US");

function paramsHtml(tool) {
  const props = tool.inputSchema?.properties ?? {};
  const required = new Set(tool.inputSchema?.required ?? []);
  const items = Object.entries(props).map(([key, schema]) => {
    const parts = [];
    if (schema.description) parts.push(esc(schema.description));
    if (schema.enum) parts.push(`one of ${schema.enum.map((v) => `<code>${esc(v)}</code>`).join(", ")}`);
    const req = required.has(key) ? '<span class="req">required</span>' : "";
    return `<li><code>${esc(key)}</code>${req}${parts.length ? ": " + parts.join("; ") : ""}</li>`;
  });
  return items.length ? `<ul class="params">${items.join("")}</ul>` : `<ul class="params"><li>No parameters</li></ul>`;
}

const catalogue = modules
  .map((mod) => {
    const tools = mod.tools
      .map(
        (tool) => `      <div class="tool" id="tool-${esc(tool.name)}">
        <h4>${esc(tool.name)}</h4>
        <p>${esc(tool.description)}</p>
        ${paramsHtml(tool)}
      </div>`
      )
      .join("\n");
    const count = `${mod.tools.length} ${mod.tools.length === 1 ? "tool" : "tools"}`;
    return `    <details class="module" id="module-${esc(mod.name)}">
      <summary><span class="mod-name">${esc(mod.name)}</span><span class="mod-desc">${esc(mod.description ?? "")}</span><span class="mod-count">${count}</span></summary>
${tools}
    </details>`;
  })
  .join("\n");

const sources = JSON.parse(readFileSync(join(root, "site", "sources.json"), "utf8"));
const sourcesHtml = `  <ul class="sources">
${sources.map((s) => `    <li><a href="${esc(s.url)}">${esc(s.name)}</a> <span>${esc(s.data)}</span></li>`).join("\n")}
  </ul>`;

const presetText = Object.entries(presets)
  .filter(([name]) => name !== "full")
  .map(([name, mods]) => `<code>${esc(name)}</code> (${mods.join(", ")})`)
  .join(", ");

// The real search code, wrapped as a CommonJS module with two stubs: the
// browser only needs searchTools, which uses neither the registry nor validation.
const discoverySource = readFileSync(join(root, "dist", "discovery.js"), "utf8");
const catalogueData = modules.map((m) => ({
  name: m.name,
  description: m.description,
  tools: m.tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
}));
const runtime = `
window.CATALOGUE = ${JSON.stringify(catalogueData)};
window.SwissSearch = (function () {
  var module = { exports: {} };
  var exports = module.exports;
  var process = { argv: [], env: {} };
  function require(name) {
    if (name === "./registry.js") return { moduleRegistry: {} };
    if (name === "./utils/validate.js") return { validateArgs: function (_t, a) { return a; } };
    throw new Error("not available in the browser: " + name);
  }
  ${discoverySource.replace(/<\/script/gi, "<\\/script")}
  return module.exports;
})();`;

const html = readFileSync(join(root, "site", "template.html"), "utf8")
  .replaceAll("{{TOOL_COUNT}}", String(toolCount))
  .replaceAll("{{MODULE_COUNT}}", String(modules.length))
  .replaceAll("{{VERSION}}", esc(pkg.version))
  .replaceAll("{{FULL_TOKENS}}", fmt(approx(false)))
  .replaceAll("{{SEARCH_TOKENS}}", fmt(approx(true)))
  .replaceAll("{{PRESETS}}", presetText)
  .replace("{{CATALOGUE}}", () => catalogue)
  .replace("{{SOURCES}}", () => sourcesHtml)
  .replace("{{SEARCH_RUNTIME}}", () => runtime);

const leftover = html.match(/\{\{[A-Z_]+\}\}/);
if (leftover) throw new Error(`Unfilled placeholder ${leftover[0]} in site/template.html`);

mkdirSync(out, { recursive: true });
writeFileSync(join(out, "index.html"), html);
copyFileSync(join(root, "site", "site.css"), join(out, "site.css"));
copyFileSync(join(root, "site", "site.js"), join(out, "site.js"));
copyFileSync(join(root, "assets", "icon.svg"), join(out, "icon.svg"));
writeFileSync(join(out, ".nojekyll"), "");
writeFileSync(join(out, "llms.txt"), renderLlms(root));
console.log(`site: ${toolCount} tools, ${modules.length} modules -> ${out}`);
