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
    description: "Get full details of a Swiss company by UID (e.g. CHE-123.456.789)",
    inputSchema: {
      type: "object",
      required: ["uid"],
      properties: {
        uid: { type: "string", description: "Company UID in format CHE-xxx.xxx.xxx" },
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

      const data = await fetchJSON<{ list: unknown[]; hasMoreResults: boolean }>(`${BASE}/firm/search.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return JSON.stringify({ companies: data.list, hasMoreResults: data.hasMoreResults }, null, 2);
    }

    case "get_company": {
      const uid = (args.uid as string).replace(/CHE-?/, "CHE-").replace(/\./g, ".");
      const url = buildUrl(`${BASE}/firm/${encodeURIComponent(uid)}.json`, {});
      const data = await fetchJSON<unknown>(url);
      return JSON.stringify(data, null, 2);
    }

    case "search_companies_by_address": {
      const body = {
        name: args.address as string,
        maxEntries: (args.limit as number) ?? 20,
        languageKey: "en",
      };
      const data = await fetchJSON<{ list: unknown[]; hasMoreResults: boolean }>(`${BASE}/firm/search.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return JSON.stringify({ companies: data.list, hasMoreResults: data.hasMoreResults }, null, 2);
    }

    case "list_cantons": {
      const data = await fetchJSON<unknown>(`${BASE}/cantons`);
      return JSON.stringify(data, null, 2);
    }

    case "list_legal_forms": {
      const data = await fetchJSON<unknown>(`${BASE}/legalForms`);
      return JSON.stringify(data, null, 2);
    }

    default:
      throw new Error(`Unknown companies tool: ${name}`);
  }
}
