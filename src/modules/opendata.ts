/**
 * opendata.swiss catalogue module
 *
 * Data source: opendata.swiss CKAN API (no API key)
 * API: https://ckan.opendata.swiss/api/3/action/
 *
 * The opendata.swiss/api host rejects scripted clients, so every call
 * goes to the ckan.opendata.swiss host.
 *
 * Provides:
 *   - search_opendata: full-text search across the national catalogue
 *   - get_opendata_dataset: metadata for one dataset
 *   - list_opendata_resources: downloadable resources for one dataset
 */

import { fetchJSON, buildUrl } from "../utils/http.js";

const CKAN_BASE = "https://ckan.opendata.swiss/api/3/action";
const SOURCE = "opendata.swiss (CKAN)";

// ── API types ────────────────────────────────────────────────────────────────

type LangText = string | Record<string, string>;

interface CkanResource {
  name?: LangText;
  display_name?: LangText;
  description?: LangText;
  format?: string;
  media_type?: string | null;
  url?: string;
  download_url?: string;
  byte_size?: number | null;
}

interface CkanPackage {
  id?: string;
  name: string;
  title?: LangText;
  notes?: LangText;
  description?: LangText;
  keywords?: Record<string, string[]>;
  issued?: string;
  metadata_modified?: string;
  organization?: { name?: string; title?: LangText };
  resources?: CkanResource[];
  num_resources?: number;
}

interface CkanSearchResult {
  success: boolean;
  result?: {
    count?: number;
    results?: CkanPackage[];
  };
}

interface CkanPackageResult {
  success: boolean;
  result?: CkanPackage;
}

// ── Tool definitions ─────────────────────────────────────────────────────────

export const opendataTools = [
  {
    name: "search_opendata",
    description:
      "Search the Swiss open data catalogue (opendata.swiss) for datasets. " +
      "Returns titles, publishers, and dataset ids. Optional organization slug " +
      "narrows results to one publisher (e.g. bundesamt-fur-statistik-bfs). " +
      "Source: opendata.swiss CKAN API.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: {
          type: "string",
          description: "Full-text search (e.g. 'weather', 'population', 'öV Fahrplan').",
        },
        organization: {
          type: "string",
          description:
            "Optional publisher slug (e.g. bundesamt-fur-statistik-bfs, bundesamt-fuer-meteorologie-und-klimatologie-meteoschweiz).",
        },
        limit: {
          type: "number",
          description: "Maximum datasets to return (default 10, max 20).",
        },
      },
    },
  },
  {
    name: "get_opendata_dataset",
    description:
      "Get metadata for one opendata.swiss dataset by its catalogue name or UUID. " +
      "Includes the publisher, description, keywords, and a short resource summary. " +
      "Use list_opendata_resources for the full download list.",
    inputSchema: {
      type: "object",
      required: ["dataset_id"],
      properties: {
        dataset_id: {
          type: "string",
          description: "Dataset name or id (e.g. weather-station-klosters).",
        },
      },
    },
  },
  {
    name: "list_opendata_resources",
    description:
      "List downloadable resources (files and services) for an opendata.swiss dataset. " +
      "Optional format filter such as CSV, JSON, or WMS.",
    inputSchema: {
      type: "object",
      required: ["dataset_id"],
      properties: {
        dataset_id: {
          type: "string",
          description: "Dataset name or id from search_opendata.",
        },
        format: {
          type: "string",
          description: "Optional format filter (e.g. CSV, JSON, XML, WMS, ZIP).",
        },
        limit: {
          type: "number",
          description: "Maximum resources to return (default 20, max 50).",
        },
      },
    },
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveText(val: LangText | undefined | null): string {
  if (!val) return "";
  if (typeof val === "string") return val.trim();
  return (val.en || val.de || val.fr || val.it || Object.values(val).find((v) => v.trim()) || "").trim();
}

function resolveKeywords(keywords: Record<string, string[]> | undefined): string[] {
  if (!keywords) return [];
  const preferred = [keywords.en, keywords.de, keywords.fr, keywords.it].find(
    (list) => Array.isArray(list) && list.some((k) => k.trim())
  );
  const source = preferred ?? Object.values(keywords).flat();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const keyword of source) {
    const trimmed = keyword.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    out.push(trimmed);
    if (out.length >= 12) break;
  }
  return out;
}

function truncate(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  return value.slice(0, maxLen - 3) + "...";
}

function clampLimit(value: unknown, fallback: number, max: number): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(1, Math.floor(n)));
}

function requireId(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required`);
  }
  return value.trim();
}

function organizationFilter(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const slug = value.trim();
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(slug)) {
    throw new Error(
      "organization must be an opendata.swiss publisher slug (e.g. bundesamt-fur-statistik-bfs)"
    );
  }
  return `organization:${slug}`;
}

function resourceName(resource: CkanResource): string {
  const named = resolveText(resource.display_name) || resolveText(resource.name);
  if (named) return named;
  const url = resource.download_url || resource.url || "";
  const segment = url.split("?")[0]?.split("/").filter(Boolean).pop();
  return segment ? decodeURIComponent(segment) : "resource";
}

function slimResource(resource: CkanResource) {
  const url = resource.download_url || resource.url || "";
  return {
    name: resourceName(resource),
    format: (resource.format || "").trim(),
    media_type: resource.media_type || undefined,
    byte_size: resource.byte_size && resource.byte_size > 0 ? resource.byte_size : undefined,
    description: truncate(resolveText(resource.description), 180) || undefined,
    url,
  };
}

async function fetchCkan<T>(url: string, notFoundMessage: string): Promise<T> {
  try {
    return await fetchJSON<T>(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("HTTP 404")) throw new Error(notFoundMessage, { cause: error });
    throw error;
  }
}

async function loadPackage(datasetId: string): Promise<CkanPackage> {
  const url = buildUrl(`${CKAN_BASE}/package_show`, { id: datasetId });
  const data = await fetchCkan<CkanPackageResult>(url, `Dataset not found: ${datasetId}`);
  if (!data.success || !data.result) {
    throw new Error(`Dataset not found: ${datasetId}`);
  }
  return data.result;
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handleSearchOpendata(args: Record<string, unknown>): Promise<string> {
  const query = requireId(args.query, "query");
  const limit = clampLimit(args.limit, 10, 20);
  const fq = organizationFilter(args.organization);

  const url = buildUrl(`${CKAN_BASE}/package_search`, {
    q: query,
    rows: limit,
    fq,
  });
  const data = await fetchJSON<CkanSearchResult>(url);
  if (!data.success || !data.result) {
    throw new Error("opendata.swiss search failed");
  }

  const results = (data.result.results ?? []).map((pkg) => ({
    id: pkg.name,
    title: resolveText(pkg.title) || pkg.name,
    description: truncate(resolveText(pkg.notes || pkg.description), 240),
    organization: resolveText(pkg.organization?.title) || pkg.organization?.name || "",
    keywords: resolveKeywords(pkg.keywords),
    resource_count: pkg.num_resources ?? pkg.resources?.length ?? 0,
    modified: pkg.metadata_modified?.slice(0, 10) ?? "",
    url: `https://opendata.swiss/en/dataset/${pkg.name}`,
  }));

  return JSON.stringify({
    query,
    ...(fq ? { organization: fq.slice("organization:".length) } : {}),
    total_matches: data.result.count ?? results.length,
    returned: results.length,
    results,
    source: SOURCE,
  });
}

async function handleGetOpendataDataset(args: Record<string, unknown>): Promise<string> {
  const datasetId = requireId(args.dataset_id, "dataset_id");
  const pkg = await loadPackage(datasetId);
  const resources = (pkg.resources ?? []).slice(0, 8).map(slimResource);

  return JSON.stringify({
    id: pkg.name,
    uuid: pkg.id,
    title: resolveText(pkg.title) || pkg.name,
    description: truncate(resolveText(pkg.notes || pkg.description), 800),
    organization: resolveText(pkg.organization?.title) || pkg.organization?.name || "",
    organization_slug: pkg.organization?.name ?? "",
    keywords: resolveKeywords(pkg.keywords),
    issued: pkg.issued?.slice(0, 10) ?? "",
    modified: pkg.metadata_modified?.slice(0, 10) ?? "",
    resource_count: pkg.resources?.length ?? pkg.num_resources ?? resources.length,
    resources,
    source: SOURCE,
    source_url: `https://opendata.swiss/en/dataset/${pkg.name}`,
  });
}

async function handleListOpendataResources(args: Record<string, unknown>): Promise<string> {
  const datasetId = requireId(args.dataset_id, "dataset_id");
  const limit = clampLimit(args.limit, 20, 50);
  const formatFilter = typeof args.format === "string" ? args.format.trim().toLowerCase() : "";
  const pkg = await loadPackage(datasetId);

  const all = pkg.resources ?? [];
  const filtered = formatFilter
    ? all.filter((resource) => (resource.format || "").trim().toLowerCase() === formatFilter)
    : all;
  const resources = filtered.slice(0, limit).map(slimResource);

  return JSON.stringify({
    id: pkg.name,
    title: resolveText(pkg.title) || pkg.name,
    ...(formatFilter ? { format: formatFilter.toUpperCase() } : {}),
    total_resources: all.length,
    matched: filtered.length,
    returned: resources.length,
    resources,
    source: SOURCE,
    source_url: `https://opendata.swiss/en/dataset/${pkg.name}`,
  });
}

export async function handleOpendata(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "search_opendata":
      return handleSearchOpendata(args);
    case "get_opendata_dataset":
      return handleGetOpendataDataset(args);
    case "list_opendata_resources":
      return handleListOpendataResources(args);
    default:
      throw new Error(`Unknown opendata tool: ${name}`);
  }
}
