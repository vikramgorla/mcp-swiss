import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveModules } from "../../src/registry.js";

// The GitHub Pages site is generated from dist/, so it can't drift from the
// tools. These checks fail if the generator breaks or leaves something out.
const DIST = join(process.cwd(), "dist", "server.js");

describe.runIf(existsSync(DIST))("documentation site", () => {
  let html = "";
  const out = mkdtempSync(join(tmpdir(), "mcp-swiss-site-"));

  beforeAll(() => {
    execFileSync(process.execPath, ["scripts/build-site.mjs", out], { stdio: "pipe" });
    html = readFileSync(join(out, "index.html"), "utf8");
  });

  it("documents every tool and every module", () => {
    const modules = resolveModules(null);
    for (const mod of modules) {
      expect(html).toContain(`id="module-${mod.name}"`);
      for (const tool of mod.tools) expect(html, tool.name).toContain(`id="tool-${tool.name}"`);
    }
    const tools = modules.reduce((n, m) => n + m.tools.length, 0);
    expect(html).toContain(`${tools} tools in ${modules.length} modules`);
  });

  it("fills every placeholder and ships its assets", () => {
    expect(html).not.toMatch(/\{\{[A-Z_]+\}\}/);
    for (const file of ["site.css", "site.js", "icon.svg", ".nojekyll", "llms.txt"]) {
      expect(existsSync(join(out, file)), file).toBe(true);
    }
  });

  it("keeps the repository's llms.txt in step with the code", () => {
    const fresh = readFileSync(join(out, "llms.txt"), "utf8");
    const committed = readFileSync(join(process.cwd(), "llms.txt"), "utf8");
    expect(committed, "run: npm run build && node scripts/llms.mjs").toBe(fresh);
  });

  it("runs the server's own search in the page", () => {
    const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "";
    const win: Record<string, unknown> = {};
    new Function("window", script)(win);
    const search = win.SwissSearch as { searchTools: (m: unknown, a: object) => string };
    const result = JSON.parse(search.searchTools(win.CATALOGUE, { query: "train from Aigle to Geneva", limit: 3 }));
    expect(result.tools[0].name).toBe("get_connections");
  });
});
