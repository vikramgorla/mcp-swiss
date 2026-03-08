// Swiss Electricity Tariff module — powered by ElCom (Swiss Federal Electricity Commission)
// Data source: https://www.strompreis.elcom.admin.ch (official Swiss electricity price portal)
// GraphQL API: https://www.strompreis.elcom.admin.ch/api/graphql

const GRAPHQL_URL = "https://www.strompreis.elcom.admin.ch/api/graphql";
const CURRENT_YEAR = "2026";

// ── Category reference ───────────────────────────────────────────────────────
// H = Household, C = Commercial
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  H1: "Household ~1'600 kWh/year (small apartment)",
  H2: "Household ~2'500 kWh/year (2-room apartment)",
  H3: "Household ~3'500 kWh/year (3-4 room apartment)",
  H4: "Household ~4'500 kWh/year (4-5 room apartment, default)",
  H5: "Household ~7'500 kWh/year (large house)",
  H6: "Household ~25'000 kWh/year (very large house with heat pump)",
  H7: "Household ~12'500 kWh/year (house with night-storage heating)",
  H8: "Household ~7'500 kWh/year (household with heat pump)",
  C1: "Commercial ~8'000 kWh/year, low voltage",
  C2: "Commercial ~30'000 kWh/year, low voltage",
  C3: "Commercial ~150'000 kWh/year, low voltage",
  C4: "Commercial ~500'000 kWh/year, medium voltage",
  C5: "Commercial ~500'000 kWh/year, medium voltage (high usage)",
  C6: "Commercial ~1'500'000 kWh/year, medium voltage",
  C7: "Commercial ~1'500'000 kWh/year, medium voltage (high usage)",
};

// ── Types ────────────────────────────────────────────────────────────────────

interface MunicipalityResult {
  id: string;
  name: string;
}

interface Observation {
  period: string;
  municipality: string;
  municipalityLabel: string;
  operator: string;
  operatorLabel: string;
  canton: string;
  cantonLabel: string;
  category: string;
  value: number | null;
  coverageRatio: number | null;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

// ── GraphQL helper ───────────────────────────────────────────────────────────

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "mcp-swiss/1.0.0",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText} — ElCom GraphQL`);
  }

  const json = await response.json() as GraphQLResponse<T>;

  if (json.errors?.length) {
    throw new Error(`ElCom API error: ${json.errors.map((e) => e.message).join("; ")}`);
  }

  if (!json.data) {
    throw new Error("ElCom API returned no data");
  }

  return json.data;
}

// ── Tool definitions ─────────────────────────────────────────────────────────

export const energyTools = [
  {
    name: "get_electricity_tariff",
    description:
      "Get Swiss electricity tariff (price in Rappen/kWh) for a municipality from ElCom (Swiss Federal Electricity Commission). Returns total price and price breakdown by component (energy, grid, taxes). Valid years: 2011–2026.",
    inputSchema: {
      type: "object",
      required: ["municipality"],
      properties: {
        municipality: {
          type: "string",
          description:
            "Municipality BFS number (e.g. '261' for Zürich, '351' for Bern, '6621' for Genève). Use search_municipality_energy to find the ID.",
        },
        category: {
          type: "string",
          description:
            "Electricity category. Household: H1–H8 (H4 is default, ~4500 kWh/year). Commercial: C1–C7. Default: H4.",
          enum: ["H1","H2","H3","H4","H5","H6","H7","H8","C1","C2","C3","C4","C5","C6","C7"],
        },
        year: {
          type: "string",
          description: "Tariff year (2011–2026). Default: current year (2026).",
        },
      },
    },
  },
  {
    name: "compare_electricity_tariffs",
    description:
      "Compare Swiss electricity tariffs across multiple municipalities side-by-side. Returns prices sorted from cheapest to most expensive. Useful for relocation decisions or cost analysis.",
    inputSchema: {
      type: "object",
      required: ["municipalities"],
      properties: {
        municipalities: {
          type: "array",
          items: { type: "string" },
          description:
            "Array of municipality BFS numbers to compare (e.g. ['261', '351', '6621']). Max 20. Use search_municipality_energy to find IDs.",
          minItems: 2,
          maxItems: 20,
        },
        category: {
          type: "string",
          description: "Electricity category (H1–H8, C1–C7). Default: H4.",
          enum: ["H1","H2","H3","H4","H5","H6","H7","H8","C1","C2","C3","C4","C5","C6","C7"],
        },
        year: {
          type: "string",
          description: "Tariff year (2011–2026). Default: 2026.",
        },
      },
    },
  },
  {
    name: "search_municipality_energy",
    description:
      "Search for Swiss municipality IDs needed for electricity tariff lookup. Returns BFS municipality numbers for use with get_electricity_tariff and compare_electricity_tariffs.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: {
          type: "string",
          description: "Municipality name to search (e.g. 'Zürich', 'Bern', 'Basel', 'Lausanne', 'Luzern').",
        },
      },
    },
  },
];

// ── Handlers ─────────────────────────────────────────────────────────────────

async function getTariffWithComponents(municipality: string, category: string, year: string): Promise<Record<string, unknown>> {
  // Fetch all price components via aliased query
  const query = `
    query ObservationsWithAllPriceComponents($locale: String!, $filters: ObservationFilters!) {
      observations(locale: $locale, filters: $filters) {
        period
        municipality
        municipalityLabel
        operator
        operatorLabel
        canton
        cantonLabel
        category
        total: value(priceComponent: total)
        energy: value(priceComponent: energy)
        gridusage: value(priceComponent: gridusage)
        charge: value(priceComponent: charge)
        aidfee: value(priceComponent: aidfee)
        fixcosts: value(priceComponent: fixcosts)
        meteringrate: value(priceComponent: meteringrate)
        annualmeteringcost: value(priceComponent: annualmeteringcost)
      }
    }
  `;

  const data = await gql<{ observations: Array<Record<string, unknown>> }>(query, {
    locale: "de",
    filters: {
      period: [year],
      municipality: [municipality],
      category: [category],
    },
  });

  return { observations: data.observations ?? [] };
}

// ── Tool router ──────────────────────────────────────────────────────────────

export async function handleEnergy(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "get_electricity_tariff": {
      const municipality = args.municipality as string;
      const category = (args.category as string | undefined) ?? "H4";
      const year = (args.year as string | undefined) ?? CURRENT_YEAR;

      if (!municipality?.trim()) {
        throw new Error("municipality is required. Use search_municipality_energy to find the BFS number.");
      }

      const raw = await getTariffWithComponents(municipality, category, year);
      const observations = raw.observations as Array<Record<string, unknown>>;

      if (!observations.length) {
        return JSON.stringify({
          error: "No tariff data found",
          municipality,
          category,
          year,
          hint: "Check the municipality BFS number with search_municipality_energy. Not all municipalities have tariff data for every year.",
          source: "https://www.strompreis.elcom.admin.ch",
        }, null, 2);
      }

      // If multiple operators, return all (some municipalities served by multiple operators)
      const result = observations.map((obs) => ({
        municipality: obs.municipalityLabel,
        municipalityId: obs.municipality,
        canton: obs.cantonLabel,
        operator: obs.operatorLabel,
        category,
        categoryDescription: CATEGORY_DESCRIPTIONS[category] ?? category,
        year,
        tariff: {
          total_rp_per_kwh: obs.total,
          components: {
            energy_rp_per_kwh: obs.energy,
            grid_usage_rp_per_kwh: obs.gridusage,
            municipality_charge_rp_per_kwh: obs.charge,
            federal_levy_rp_per_kwh: obs.aidfee,
            fixed_costs_rp_per_kwh: obs.fixcosts,
            metering_rate_rp_per_kwh: obs.meteringrate,
            annual_metering_cost_rp_per_kwh: obs.annualmeteringcost,
          },
        },
        coverageRatio: obs.coverageRatio,
        note: "Prices in Rappen per kWh (1 CHF = 100 Rappen)",
        source: `https://www.strompreis.elcom.admin.ch/municipality/${municipality}`,
      }));

      return JSON.stringify(result.length === 1 ? result[0] : result, null, 2);
    }

    case "compare_electricity_tariffs": {
      const municipalities = args.municipalities as string[];
      const category = (args.category as string | undefined) ?? "H4";
      const year = (args.year as string | undefined) ?? CURRENT_YEAR;

      if (!Array.isArray(municipalities) || municipalities.length < 2) {
        throw new Error("At least 2 municipality IDs are required for comparison.");
      }
      if (municipalities.length > 20) {
        throw new Error("Maximum 20 municipalities can be compared at once.");
      }

      const query = `
        query Observations($locale: String!, $priceComponent: PriceComponent!, $filters: ObservationFilters!) {
          observations(locale: $locale, filters: $filters) {
            period
            municipality
            municipalityLabel
            operator
            operatorLabel
            canton
            cantonLabel
            category
            value(priceComponent: $priceComponent)
            coverageRatio
          }
        }
      `;

      const data = await gql<{ observations: Observation[] }>(query, {
        locale: "de",
        priceComponent: "total",
        filters: {
          period: [year],
          municipality: municipalities,
          category: [category],
        },
      });

      const observations = data.observations ?? [];

      if (!observations.length) {
        return JSON.stringify({
          error: "No tariff data found for the given municipalities",
          municipalities,
          category,
          year,
          hint: "Use search_municipality_energy to verify BFS numbers.",
          source: "https://www.strompreis.elcom.admin.ch",
        }, null, 2);
      }

      // Deduplicate by municipality (keep first/cheapest operator if multiple)
      const byMunicipality = new Map<string, Observation>();
      for (const obs of observations) {
        const existing = byMunicipality.get(obs.municipality);
        if (!existing || (obs.value !== null && (existing.value === null || obs.value < existing.value))) {
          byMunicipality.set(obs.municipality, obs);
        }
      }

      // Sort by total price ascending
      const sorted = [...byMunicipality.values()].sort((a, b) => {
        if (a.value === null) return 1;
        if (b.value === null) return -1;
        return a.value - b.value;
      });

      const results = sorted.map((obs, idx) => ({
        rank: idx + 1,
        municipality: obs.municipalityLabel,
        municipalityId: obs.municipality,
        canton: obs.cantonLabel,
        operator: obs.operatorLabel,
        total_rp_per_kwh: obs.value,
        year,
        category,
      }));

      // Find municipalities not found in results
      const foundIds = new Set(observations.map((o) => o.municipality));
      const notFound = municipalities.filter((m) => !foundIds.has(m));

      const cheapest = results[0];
      const mostExpensive = results[results.length - 1];
      const spread =
        cheapest && mostExpensive && cheapest.total_rp_per_kwh !== null && mostExpensive.total_rp_per_kwh !== null
          ? +(mostExpensive.total_rp_per_kwh - cheapest.total_rp_per_kwh).toFixed(3)
          : null;

      return JSON.stringify(
        {
          comparison: results,
          summary: {
            cheapest: cheapest.municipality,
            most_expensive: mostExpensive.municipality,
            spread_rp_per_kwh: spread,
            category,
            categoryDescription: CATEGORY_DESCRIPTIONS[category] ?? category,
            year,
            note: "Prices in Rappen per kWh. Multiple operators per municipality: cheapest shown.",
          },
          notFound: notFound.length ? notFound : undefined,
          source: "https://www.strompreis.elcom.admin.ch",
        },
        null,
        2
      );
    }

    case "search_municipality_energy": {
      const nameQuery = args.name as string;

      if (!nameQuery?.trim()) {
        throw new Error("name is required");
      }

      const query = `
        query Municipalities($locale: String!, $query: String) {
          municipalities: searchMunicipalities(locale: $locale, query: $query) {
            id
            name
          }
        }
      `;

      const data = await gql<{ municipalities: MunicipalityResult[] }>(query, {
        locale: "de",
        query: nameQuery,
      });

      const municipalities = data.municipalities ?? [];

      if (!municipalities.length) {
        return JSON.stringify({
          results: [],
          message: `No municipalities found matching "${nameQuery}". Try a shorter or alternate spelling.`,
        }, null, 2);
      }

      return JSON.stringify({
        results: municipalities.map((m) => ({
          id: m.id,
          name: m.name,
          usage: `Use id "${m.id}" with get_electricity_tariff or compare_electricity_tariffs`,
        })),
        count: municipalities.length,
        note: "Use the 'id' field as the 'municipality' parameter in tariff queries.",
        source: "https://www.strompreis.elcom.admin.ch",
      }, null, 2);
    }

    default:
      throw new Error(`Unknown energy tool: ${name}`);
  }
}
