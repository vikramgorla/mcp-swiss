import { fetchJSON, buildUrl } from "../utils/http.js";

const BASE = "https://openholidaysapi.org";

// ── API response types ─────────────────────────────────────────────────────

interface HolidayName {
  language: string;
  text: string;
}

interface HolidaySubdivision {
  code: string;
  shortName: string;
}

interface Holiday {
  id: string;
  startDate: string;
  endDate: string;
  type: string;
  name: HolidayName[];
  regionalScope: string;
  temporalScope: string;
  nationwide: boolean;
  subdivisions?: HolidaySubdivision[];
}

// ── Tool definitions ────────────────────────────────────────────────────────

export const holidaysTools = [
  {
    name: "get_public_holidays",
    description:
      "Get Swiss public holidays for a given year, optionally filtered by canton (e.g. ZH, BE, GE). Returns national and canton-specific holidays.",
    inputSchema: {
      type: "object",
      required: ["year"],
      properties: {
        year: { type: "number", description: "Year (e.g. 2026)" },
        canton: {
          type: "string",
          description:
            "Two-letter canton code (e.g. ZH, BE, GE, BS, TI). If omitted, returns all Swiss holidays.",
        },
      },
    },
  },
  {
    name: "get_school_holidays",
    description:
      "Get Swiss school holidays for a given year, optionally filtered by canton. Returns holiday periods (start/end dates) by canton.",
    inputSchema: {
      type: "object",
      required: ["year"],
      properties: {
        year: { type: "number", description: "Year (e.g. 2026)" },
        canton: {
          type: "string",
          description:
            "Two-letter canton code (e.g. ZH, BE, GE, BS, TI). If omitted, returns school holidays for all cantons.",
        },
      },
    },
  },
  {
    name: "is_holiday_today",
    description:
      "Check whether today is a Swiss public holiday, optionally for a specific canton. Returns the holiday name if it is one.",
    inputSchema: {
      type: "object",
      properties: {
        canton: {
          type: "string",
          description:
            "Two-letter canton code (e.g. ZH, BE, GE). If omitted, checks nationwide holidays only.",
        },
      },
    },
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Extract English name from name array, fall back to first entry */
function extractName(names: HolidayName[]): string {
  return (
    names.find((n) => n.language === "EN")?.text ??
    names[0]?.text ??
    "Unknown"
  );
}

/** Convert "ZH" → "CH-ZH", already-prefixed codes pass through */
function toSubdivisionCode(canton: string): string {
  const upper = canton.trim().toUpperCase();
  return upper.startsWith("CH-") ? upper : `CH-${upper}`;
}

/** Compact a holiday record for output */
function compactHoliday(h: Holiday): Record<string, unknown> {
  const entry: Record<string, unknown> = {
    date: h.startDate === h.endDate ? h.startDate : `${h.startDate}/${h.endDate}`,
    name: extractName(h.name),
    type: h.type,
    nationwide: h.nationwide,
  };
  if (h.subdivisions && h.subdivisions.length > 0) {
    entry.cantons = h.subdivisions.map((s) => s.shortName);
  }
  return entry;
}

// ── Handler ─────────────────────────────────────────────────────────────────

export async function handleHolidays(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "get_public_holidays": {
      const year = args.year as number;
      const canton = args.canton as string | undefined;

      const params: Record<string, string> = {
        countryIsoCode: "CH",
        languageIsoCode: "EN",
        validFrom: `${year}-01-01`,
        validTo: `${year}-12-31`,
      };
      if (canton) {
        params.subdivisionCode = toSubdivisionCode(canton);
      }

      const url = buildUrl(`${BASE}/PublicHolidays`, params);
      const data = await fetchJSON<Holiday[]>(url);

      const holidays = data.map(compactHoliday);
      return JSON.stringify({
        year,
        canton: canton ?? "all",
        count: holidays.length,
        holidays,
        source: "openholidaysapi.org",
      });
    }

    case "get_school_holidays": {
      const year = args.year as number;
      const canton = args.canton as string | undefined;

      const params: Record<string, string> = {
        countryIsoCode: "CH",
        languageIsoCode: "EN",
        validFrom: `${year}-01-01`,
        validTo: `${year}-12-31`,
      };
      if (canton) {
        params.subdivisionCode = toSubdivisionCode(canton);
      }

      const url = buildUrl(`${BASE}/SchoolHolidays`, params);
      const data = await fetchJSON<Holiday[]>(url);

      const holidays = data.map(compactHoliday);
      return JSON.stringify({
        year,
        canton: canton ?? "all",
        count: holidays.length,
        holidays,
        source: "openholidaysapi.org",
      });
    }

    case "is_holiday_today": {
      const canton = args.canton as string | undefined;
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      const params: Record<string, string> = {
        countryIsoCode: "CH",
        languageIsoCode: "EN",
        validFrom: today,
        validTo: today,
      };
      if (canton) {
        params.subdivisionCode = toSubdivisionCode(canton);
      }

      const url = buildUrl(`${BASE}/PublicHolidays`, params);
      const data = await fetchJSON<Holiday[]>(url);

      if (data.length === 0) {
        return JSON.stringify({
          date: today,
          is_holiday: false,
          canton: canton ?? "all",
        });
      }

      // Return the first (or nationwide) match
      const nationwide = data.find((h) => h.nationwide);
      const match = nationwide ?? data[0];
      return JSON.stringify({
        date: today,
        is_holiday: true,
        holiday: extractName(match.name),
        type: match.type,
        nationwide: match.nationwide,
        canton: canton ?? "all",
      });
    }

    default:
      throw new Error(`Unknown holidays tool: ${name}`);
  }
}
