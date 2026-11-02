import { cached } from "../utils/cache.js";
import { fetchBody, fetchJSON } from "../utils/http.js";

const BASE = "https://www.zefix.admin.ch/ZefixREST/api/v1";

const CANTONS = [
  { code: "AG", name: "Aargau" }, { code: "AI", name: "Appenzell Innerrhoden" },
  { code: "AR", name: "Appenzell Ausserrhoden" }, { code: "BE", name: "Bern" },
  { code: "BL", name: "Basel-Landschaft" }, { code: "BS", name: "Basel-Stadt" },
  { code: "FR", name: "Fribourg" }, { code: "GE", name: "Geneva" },
  { code: "GL", name: "Glarus" }, { code: "GR", name: "Graubünden" },
  { code: "JU", name: "Jura" }, { code: "LU", name: "Lucerne" },
  { code: "NE", name: "Neuchâtel" }, { code: "NW", name: "Nidwalden" },
  { code: "OW", name: "Obwalden" }, { code: "SG", name: "St. Gallen" },
  { code: "SH", name: "Schaffhausen" }, { code: "SO", name: "Solothurn" },
  { code: "SZ", name: "Schwyz" }, { code: "TG", name: "Thurgau" },
  { code: "TI", name: "Ticino" }, { code: "UR", name: "Uri" },
  { code: "VD", name: "Vaud" }, { code: "VS", name: "Valais" },
  { code: "ZG", name: "Zug" }, { code: "ZH", name: "Zürich" },
];

const CANTON_CODES = CANTONS.map((c) => c.code);

export const companiesTools = [
  {
    name: "search_companies",
    description: "Search the ZEFIX commercial register by company name, optionally filtered by canton/legal form",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", description: "Full or partial name, min 3 chars; * is a wildcard" },
        canton: { type: "string", enum: CANTON_CODES, description: "Canton of the registered seat" },
        legal_form: { type: "number", description: "Legal form id, e.g. 3=AG, 4=GmbH (see list_legal_forms)" },
        limit: { type: "number", default: 20, maximum: 100 },
      },
    },
  },
  {
    name: "get_company",
    description: "Full company details by ZEFIX ehraid (from search_companies)",
    inputSchema: {
      type: "object",
      required: ["ehraid"],
      properties: {
        ehraid: { type: "number", description: "e.g. 119283" },
      },
    },
  },
  {
    name: "search_companies_by_locality",
    description: "Companies whose registered seat is in a commune/town. ZEFIX has no street-address search",
    inputSchema: {
      type: "object",
      required: ["locality"],
      properties: {
        locality: { type: "string", description: "Commune or town, e.g. Zug, Lausanne" },
        name: { type: "string", description: "Optional name filter, min 3 chars" },
        limit: { type: "number", default: 20, maximum: 100 },
      },
    },
  },
  {
    name: "list_cantons",
    description: "List cantons with codes",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_legal_forms",
    description: "List company legal forms (AG, GmbH, ...) with the ids used by search_companies",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// ── ZEFIX reference data ─────────────────────────────────────────────────────
// legalForm/registerOffice/community are small lists that change a few times a
// year. Cache them: a canton filter needs the registry-office ids of that
// canton, and a locality filter needs the community ids of that commune.

interface ZefixName { de: string; fr: string; it: string; en: string }
interface LegalForm { id: number; name: ZefixName; kurzform: ZefixName }
interface RegisterOffice { id: number; canton: string }
interface Community { id: number; name: string; canton: string; alternateNames: string[] | null }

const REFERENCE_TTL_MS = 60 * 60 * 1000; // 1 h, as in snb.ts

const legalForms = cached(REFERENCE_TTL_MS, () => fetchJSON<LegalForm[]>(`${BASE}/legalForm.json`));
const offices = cached(REFERENCE_TTL_MS, () => fetchJSON<RegisterOffice[]>(`${BASE}/registerOffice.json`));
const communities = cached(REFERENCE_TTL_MS, () => fetchJSON<Community[]>(`${BASE}/community.json`));

/** Clear the reference-data caches (for testing) */
export function clearCompaniesCache(): void {
  legalForms.clear();
  offices.clear();
  communities.clear();
}

/** Strip diacritics and case so "geneve" matches "Genève". */
function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// ── Search ───────────────────────────────────────────────────────────────────

interface CompanyShort {
  name: string;
  ehraid: number;
  uidFormatted: string;
  legalSeat: string;
  registerOfficeId: number;
  legalFormId: number;
  status: string;
  shabDate: string | null;
  deleteDate: string | null;
  cantonalExcerptWeb: string;
}

/** 100 slimmed hits is ~20 KB; more would blow the response budget. */
function maxEntries(limit: unknown): number {
  const n = Number(limit);
  return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), 100) : 20;
}

interface SearchResponse {
  list?: CompanyShort[];
  hasMoreResults?: boolean;
  error?: unknown;
}

async function search(body: Record<string, unknown>): Promise<string> {
  const data = await fetchBody<SearchResponse | null>(
    `${BASE}/firm/search.json`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ languageKey: "en", ...body }),
      rawStatus: true,
    },
    async (response) => {
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return response.json() as Promise<SearchResponse>;
    }
  );
  if (!data) return JSON.stringify({ companies: [], hasMoreResults: false }, null, 2);
  // ZEFIX answers "no result" and "filter too narrow" with a 200 + error body.
  if (data.error || !data.list?.length) return JSON.stringify({ companies: [], hasMoreResults: false }, null, 2);

  const [forms, regOffices] = await Promise.all([legalForms.get(), offices.get()]);
  const formById = new Map(forms.map((f) => [f.id, f]));
  const cantonByOffice = new Map(regOffices.map((o) => [o.id, o.canton]));

  const companies = data.list.map((c) => ({
    name: c.name,
    ehraid: c.ehraid,
    uid: c.uidFormatted,
    legalSeat: c.legalSeat,
    canton: cantonByOffice.get(c.registerOfficeId) ?? null,
    legalFormId: c.legalFormId,
    legalForm: formById.get(c.legalFormId)?.kurzform.de ?? null,
    status: c.status,
    shabDate: c.shabDate,
    deleteDate: c.deleteDate,
    excerpt: c.cantonalExcerptWeb,
  }));

  return JSON.stringify({ companies, hasMoreResults: data.hasMoreResults ?? false }, null, 2);
}

// ── Detail ───────────────────────────────────────────────────────────────────

/** Newest journal entries kept by get_company; the full list runs to 60 KB+. */
const MAX_SHAB_PUB = 10;

interface CompanyFull extends CompanyShort {
  shabPub?: unknown[];
}

export async function handleCompanies(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "search_companies": {
      const body: Record<string, unknown> = {
        name: args.name as string,
        maxEntries: maxEntries(args.limit),
      };

      if (args.canton !== undefined) {
        const canton = String(args.canton).toUpperCase();
        const ids = (await offices.get()).filter((o) => o.canton === canton).map((o) => o.id);
        if (ids.length === 0) {
          throw new Error(`Unknown canton "${args.canton as string}". Use list_cantons for the 26 valid codes.`);
        }
        // ZEFIX filters by registry district, and each canton runs one (VS: three).
        body.registryOffices = ids;
      }

      if (args.legal_form !== undefined) {
        const id = Number(args.legal_form);
        if (!Number.isInteger(id) || !(await legalForms.get()).some((f) => f.id === id)) {
          throw new Error(`Unknown legal_form "${String(args.legal_form)}". Use list_legal_forms for the valid ids.`);
        }
        body.legalForms = [id];
      }

      return search(body);
    }

    case "get_company": {
      // ZEFIX firm/{id}.json uses the internal ehraid integer (not the CHE uid).
      const raw = String(args.ehraid ?? "").trim();
      if (!/^\d+$/.test(raw)) {
        throw new Error(`Invalid ehraid "${raw}": expected digits only, e.g. 119283. Get it from search_companies (not the CHE-xxx.xxx.xxx uid).`);
      }

      const data = await fetchJSON<CompanyFull>(`${BASE}/firm/${raw}.json`);

      const [forms, regOffices] = await Promise.all([legalForms.get(), offices.get()]);
      const shabPub = Array.isArray(data.shabPub) ? data.shabPub : [];
      const slim = {
        ...data,
        canton: regOffices.find((o) => o.id === data.registerOfficeId)?.canton ?? null,
        legalForm: forms.find((f) => f.id === data.legalFormId)?.name.en ?? null,
        shabPub: shabPub.slice(0, MAX_SHAB_PUB),
        shabPubTotal: shabPub.length,
      };
      return JSON.stringify(slim, null, 2);
    }

    case "search_companies_by_locality": {
      const wanted = fold(String(args.locality ?? ""));
      if (!wanted) throw new Error("locality is required, e.g. Zug or Lausanne.");

      const matches = (await communities.get()).filter(
        (c) => fold(c.name) === wanted || (c.alternateNames ?? []).some((a) => fold(a) === wanted),
      );
      if (matches.length === 0) {
        throw new Error(`No Swiss commune named "${String(args.locality)}". ZEFIX indexes the registered seat by commune, so a street address will not match.`);
      }

      const body: Record<string, unknown> = {
        legalSeats: matches.map((c) => c.id),
        maxEntries: maxEntries(args.limit),
      };
      if (args.name) body.name = args.name as string;
      return search(body);
    }

    case "list_cantons":
      return JSON.stringify(CANTONS, null, 2);

    case "list_legal_forms": {
      const forms = (await legalForms.get())
        .filter((f) => f.id > 0)
        .map((f) => ({ id: f.id, abbr: f.kurzform.de, name: f.name.de, nameEn: f.name.en }));
      return JSON.stringify(forms, null, 2);
    }

    default:
      throw new Error(`Unknown companies tool: ${name}`);
  }
}
