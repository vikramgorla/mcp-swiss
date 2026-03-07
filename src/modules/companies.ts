import { fetchJSON, buildUrl } from "../utils/http.js";

const BASE = "https://www.zefix.admin.ch/ZefixREST/api/v1";

export const companiesTools = [
  {
    name: "search_companies",
    description: "Search Swiss company registry (ZEFIX) by name, canton, or legal form",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", description: "Company name or partial name to search" },
        canton: { type: "string", description: "Canton abbreviation (e.g. ZH, BE, GE, ZG)" },
        legal_form: { type: "string", description: "Legal form code (e.g. 0106=GmbH, 0101=AG)" },
        limit: { type: "number", description: "Max results (default: 20)" },
      },
    },
  },
  {
    name: "get_company",
    description: "Get full details of a Swiss company by its ZEFIX internal ID (ehraid). Use search_companies first to find the ehraid — it is returned in company search results.",
    inputSchema: {
      type: "object",
      required: ["ehraid"],
      properties: {
        ehraid: { type: "number", description: "Company internal ZEFIX ID (ehraid integer, e.g. 119283). Returned by search_companies." },
      },
    },
  },
  {
    name: "search_companies_by_address",
    description: "Search Swiss companies registered at a specific address or locality",
    inputSchema: {
      type: "object",
      required: ["address"],
      properties: {
        address: { type: "string", description: "Address or locality name" },
        limit: { type: "number", description: "Max results (default: 20)" },
      },
    },
  },
  {
    name: "list_cantons",
    description: "List all Swiss cantons with their codes",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_legal_forms",
    description: "List all Swiss company legal forms (AG, GmbH, etc.)",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

export async function handleCompanies(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "search_companies": {
      const body: Record<string, unknown> = {
        name: args.name as string,
        maxEntries: (args.limit as number) ?? 20,
        languageKey: "en",
      };
      if (args.canton) body.cantonAbbreviation = [args.canton as string];
      if (args.legal_form) body.legalFormCode = args.legal_form as string;

      const response = await fetch(`${BASE}/firm/search.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.status === 404) {
        return JSON.stringify({ companies: [], hasMoreResults: false }, null, 2);
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json() as { list?: unknown[]; hasMoreResults?: boolean; error?: unknown };
      if (data.error) return JSON.stringify({ companies: [], hasMoreResults: false }, null, 2);
      return JSON.stringify({ companies: data.list ?? [], hasMoreResults: data.hasMoreResults ?? false }, null, 2);
    }

    case "get_company": {
      // ZEFIX firm/{id}.json uses the internal ehraid integer (not CHE uid)
      const ehraid = args.ehraid as number;
      const url = `${BASE}/firm/${ehraid}.json`;
      const data = await fetchJSON<unknown>(url);
      return JSON.stringify(data, null, 2);
    }

    case "search_companies_by_address": {
      const body = {
        name: args.address as string,
        maxEntries: (args.limit as number) ?? 20,
        languageKey: "en",
      };
      const response = await fetch(`${BASE}/firm/search.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.status === 404) return JSON.stringify({ companies: [], hasMoreResults: false }, null, 2);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json() as { list?: unknown[]; hasMoreResults?: boolean; error?: unknown };
      if (data.error) return JSON.stringify({ companies: [], hasMoreResults: false }, null, 2);
      return JSON.stringify({ companies: data.list ?? [], hasMoreResults: data.hasMoreResults ?? false }, null, 2);
    }

    case "list_cantons": {
      // ZEFIX /cantons and /legalForms endpoints require authentication (403).
      // Return hardcoded authoritative list instead.
      const cantons = [
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
      return JSON.stringify(cantons, null, 2);
    }

    case "list_legal_forms": {
      // ZEFIX /legalForms requires authentication (403). Return common Swiss legal forms.
      const forms = [
        { code: "0101", name: "Einzelunternehmen", nameEn: "Sole proprietorship" },
        { code: "0103", name: "Kollektivgesellschaft", nameEn: "General partnership" },
        { code: "0104", name: "Kommanditgesellschaft", nameEn: "Limited partnership" },
        { code: "0105", name: "Aktiengesellschaft (AG)", nameEn: "Corporation (AG)" },
        { code: "0106", name: "Gesellschaft mit beschränkter Haftung (GmbH)", nameEn: "Limited liability company (GmbH)" },
        { code: "0107", name: "Genossenschaft", nameEn: "Cooperative" },
        { code: "0108", name: "Verein", nameEn: "Association" },
        { code: "0109", name: "Stiftung", nameEn: "Foundation" },
        { code: "0110", name: "Kommanditaktiengesellschaft", nameEn: "Partnership limited by shares" },
        { code: "0113", name: "Filiale ausländischer Gesellschaft", nameEn: "Branch of foreign company" },
        { code: "0114", name: "Institut des öffentlichen Rechts", nameEn: "Public law institution" },
      ];
      return JSON.stringify(forms, null, 2);
    }

    default:
      throw new Error(`Unknown companies tool: ${name}`);
  }
}
