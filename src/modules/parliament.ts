// Swiss Parliament OData API — ws.parlament.ch
// No authentication required. OData v3, returns { d: [...] } wrapper.

const BASE = "https://ws.parlament.ch/odata.svc";
const LANG = "DE"; // Primary language filter

// ── Types ────────────────────────────────────────────────────────────────────

interface ODataResponse<T> {
  d: T[];
}

interface RawBusiness {
  ID: number;
  Language: string;
  BusinessShortNumber: string;
  BusinessType: number;
  BusinessTypeName: string;
  BusinessTypeAbbreviation: string;
  Title: string;
  SubmittedBy: string | null;
  BusinessStatus: number;
  BusinessStatusText: string;
  BusinessStatusDate: string | null;
  ResponsibleDepartmentName: string | null;
  ResponsibleDepartmentAbbreviation: string | null;
  TagNames: string | null;
  SubmissionDate: string | null;
  SubmissionCouncilName: string | null;
  SubmissionSession: number | null;
  SubmissionLegislativePeriod: number | null;
  FirstCouncil1Name: string | null;
  FirstCouncil2Name: string | null;
  [key: string]: unknown;
}

interface RawMemberCouncil {
  ID: number;
  Language: string;
  PersonNumber: number;
  Active: boolean;
  FirstName: string;
  LastName: string;
  GenderAsString: string;
  Canton: number;
  CantonName: string;
  CantonAbbreviation: string;
  Council: number;
  CouncilName: string;
  CouncilAbbreviation: string;
  ParlGroupName: string;
  ParlGroupAbbreviation: string;
  PartyName: string;
  PartyAbbreviation: string;
  BirthPlace_City: string | null;
  Nationality: string | null;
  Mandates: string | null;
  [key: string]: unknown;
}

interface RawVote {
  ID: number;
  Language: string;
  RegistrationNumber: number;
  BusinessNumber: number;
  BusinessShortNumber: string;
  BusinessTitle: string;
  BusinessAuthor: string;
  BillTitle: string;
  IdLegislativePeriod: number;
  IdSession: number;
  SessionName: string;
  Subject: string;
  MeaningYes: string;
  MeaningNo: string;
  VoteEnd: string;
  [key: string]: unknown;
}

interface RawSession {
  ID: number;
  Language: string;
  SessionNumber: number;
  SessionName: string;
  Abbreviation: string;
  StartDate: string;
  EndDate: string;
  Title: string;
  TypeName: string;
  LegislativePeriodNumber: number;
  [key: string]: unknown;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Strip __metadata and __deferred navigation props from OData response objects */
function stripOData<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === "__metadata") continue;
    if (v !== null && typeof v === "object" && "__deferred" in (v as object)) continue;
    clean[k] = v;
  }
  return clean as Partial<T>;
}

/** Parse OData /Date(ms)/ timestamp to ISO string */
function parseODataDate(val: string | null): string | null {
  if (!val) return null;
  const m = val.match(/\/Date\((\d+)/);
  if (!m) return val;
  return new Date(parseInt(m[1], 10)).toISOString();
}

/** Fetch OData endpoint and return clean results array */
async function odataFetch<T extends Record<string, unknown>>(
  url: string
): Promise<Partial<T>[]> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Parliament API error: HTTP ${res.status} for ${url}`);
  }
  const data = (await res.json()) as ODataResponse<T>;
  if (!data.d || !Array.isArray(data.d)) return [];
  return data.d.map((item) => stripOData(item));
}

/** Encode a string value for OData $filter substringof() */
function odataStringOf(field: string, value: string): string {
  const escaped = value.replace(/'/g, "''");
  return `substringof('${escaped}',${field})`;
}

/** Truncate a string response to keep under 50K chars */
function truncate(json: string, maxBytes = 48000): string {
  if (json.length <= maxBytes) return json;
  // Parse and slice the array
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      let sliced = parsed;
      while (JSON.stringify(sliced).length > maxBytes && sliced.length > 1) {
        sliced = sliced.slice(0, Math.floor(sliced.length * 0.8));
      }
      return JSON.stringify(sliced);
    }
  } catch {
    // fall through
  }
  return json.slice(0, maxBytes) + "…";
}

// ── Tools definition ─────────────────────────────────────────────────────────

export const parliamentTools = [
  {
    name: "search_parliament_business",
    description:
      "Search Swiss Parliament bills, motions, interpellations, questions and other business items (Geschäfte). Searches the national council and council of states.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: {
          type: "string",
          description: "Search term (e.g. 'Klimaschutz', 'AHV', 'Neutralität')",
        },
        type: {
          type: "string",
          description:
            "Business type filter: 'motion', 'interpellation', 'postulate', 'initiative', 'question', 'bill' (optional)",
        },
        year: {
          type: "number",
          description: "Filter by submission year, e.g. 2024 (optional)",
        },
        limit: {
          type: "number",
          description: "Max results (default: 10, max: 50)",
        },
      },
    },
  },
  {
    name: "get_latest_votes",
    description:
      "Get the most recent parliamentary votes (roll-call votes) in the Swiss National Council or Council of States, with vote counts and outcome.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of recent votes to fetch (default: 10, max: 50)",
        },
      },
    },
  },
  {
    name: "search_councillors",
    description:
      "Search for Swiss Members of Parliament (National Council or Council of States) by name, canton, party, or council.",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: {
          type: "string",
          description: "Name or partial name of the councillor",
        },
        canton: {
          type: "string",
          description:
            "Canton abbreviation to filter by (e.g. 'ZH', 'BE', 'GE', 'VS')",
        },
        party: {
          type: "string",
          description:
            "Party abbreviation to filter by (e.g. 'SP', 'SVP', 'FDP', 'Grüne', 'Mitte')",
        },
        council: {
          type: "string",
          description:
            "Council to filter by: 'NR' for National Council (Nationalrat), 'SR' for Council of States (Ständerat)",
        },
      },
    },
  },
  {
    name: "get_sessions",
    description:
      "List Swiss parliamentary sessions (Sessionen) with dates. Returns current and past sessions.",
    inputSchema: {
      type: "object",
      properties: {
        year: {
          type: "number",
          description: "Filter by year (optional, e.g. 2025)",
        },
        limit: {
          type: "number",
          description: "Number of sessions to return (default: 10, max: 20)",
        },
      },
    },
  },
];

// ── Business type mapping ─────────────────────────────────────────────────────

const BUSINESS_TYPE_MAP: Record<string, number[]> = {
  motion: [5],       // Motion
  interpellation: [8, 9], // Interpellation, Dringliche Interpellation
  postulate: [6],    // Postulat
  initiative: [1, 3, 13], // Parlamentarische Initiative, Standesinitiative, Volksinitiative
  question: [7, 16, 17], // Anfrage, Fragestunde, Schriftliche Anfrage
  bill: [4, 10, 19], // Bundesgesetz, Bundesbeschluss, Botschaft
};

// ── Handlers ─────────────────────────────────────────────────────────────────

async function searchParliamentBusiness(args: {
  query: string;
  type?: string;
  year?: number;
  limit?: number;
}): Promise<string> {
  const limit = Math.min(args.limit ?? 10, 50);
  const filters: string[] = [`Language eq '${LANG}'`];

  // Full-text search across Title and Tags
  if (args.query) {
    filters.push(
      `(${odataStringOf("Title", args.query)} or ${odataStringOf("TagNames", args.query)})`
    );
  }

  // Business type filter: only add server-side when no text query
  // (combining substringof + BusinessType in OData causes server-side SQL timeout)
  let typeIds: number[] | undefined;
  if (args.type) {
    const typeKey = args.type.toLowerCase();
    typeIds = BUSINESS_TYPE_MAP[typeKey];
    if (typeIds && typeIds.length > 0 && !args.query) {
      const typeFilter = typeIds.map((id) => `BusinessType eq ${id}`).join(" or ");
      filters.push(`(${typeFilter})`);
    }
  }

  const filterStr = filters.join(" and ");
  // Over-fetch when we'll post-filter by type
  const fetchLimit = typeIds && args.query ? limit * 3 : limit;
  const url = `${BASE}/Business?$format=json&$top=${fetchLimit}&$orderby=SubmissionDate%20desc&$filter=${encodeURIComponent(filterStr)}`;

  const raw = await odataFetch<RawBusiness>(url);

  // Post-filter by type when combined with text search (server can't do both)
  const typeFiltered = raw.filter((b) => {
    if (!typeIds || !args.query) return true;
    return typeIds!.includes(b.BusinessType as number);
  });

  // Post-filter by year if requested (OData date year extraction is complex)
  const results = typeFiltered.filter((b) => {
    if (!args.year) return true;
    if (!b.SubmissionDate) return false;
    const d = parseODataDate(b.SubmissionDate as string);
    return d ? new Date(d).getFullYear() === args.year : false;
  }).slice(0, limit);

  const cleaned = results.map((b: Partial<RawBusiness>) => ({
    id: b.ID,
    shortNumber: b.BusinessShortNumber,
    type: b.BusinessTypeName,
    typeAbbr: b.BusinessTypeAbbreviation,
    title: b.Title,
    submittedBy: b.SubmittedBy,
    submissionDate: parseODataDate(b.SubmissionDate as string | null),
    status: b.BusinessStatusText,
    department: b.ResponsibleDepartmentAbbreviation,
    tags: b.TagNames ? (b.TagNames as string).split("|") : [],
    url: `https://www.parlament.ch/de/ratsbetrieb/suche-curia-vista/geschaeft?AffairId=${b.ID}`,
  }));

  return truncate(
    JSON.stringify({ count: cleaned.length, query: args.query, business: cleaned })
  );
}

async function getLatestVotes(args: { limit?: number }): Promise<string> {
  const limit = Math.min(args.limit ?? 10, 50);
  // Vote entity gives vote summaries (one row per vote, not per member)
  const url = `${BASE}/Vote?$format=json&$top=${limit}&$orderby=VoteEnd%20desc&$filter=Language%20eq%20'${LANG}'`;

  const raw = await odataFetch<RawVote>(url);

  const cleaned = raw.map((v) => ({
    voteId: v.ID,
    registrationNumber: v.RegistrationNumber,
    businessNumber: v.BusinessShortNumber,
    businessTitle: v.BusinessTitle,
    billTitle: v.BillTitle,
    session: v.SessionName,
    subject: v.Subject,
    meaningYes: v.MeaningYes,
    meaningNo: v.MeaningNo,
    voteEnd: parseODataDate(v.VoteEnd as string | null),
    url: `https://www.parlament.ch/de/ratsbetrieb/abstimmungen/abstimmung#key=${v.RegistrationNumber}`,
  }));

  return truncate(JSON.stringify({ count: cleaned.length, votes: cleaned }));
}

async function searchCouncillors(args: {
  name: string;
  canton?: string;
  party?: string;
  council?: string;
}): Promise<string> {
  const filters: string[] = [`Language eq '${LANG}'`, "Active eq true"];

  // Name search: try LastName first, then also FirstName
  if (args.name) {
    filters.push(
      `(${odataStringOf("LastName", args.name)} or ${odataStringOf("FirstName", args.name)})`
    );
  }

  // Canton filter
  if (args.canton) {
    const canton = args.canton.toUpperCase();
    filters.push(`CantonAbbreviation eq '${canton}'`);
  }

  // Party filter (partial match on PartyAbbreviation or ParlGroupAbbreviation)
  if (args.party) {
    const party = args.party.replace(/'/g, "''");
    filters.push(
      `(${odataStringOf("PartyAbbreviation", party)} or ${odataStringOf("ParlGroupName", party)})`
    );
  }

  // Council filter: NR = Nationalrat (1), SR = Ständerat (2)
  if (args.council) {
    const councilCode = args.council.toUpperCase();
    if (councilCode === "NR") {
      filters.push("Council eq 1");
    } else if (councilCode === "SR") {
      filters.push("Council eq 2");
    }
  }

  const filterStr = filters.join(" and ");
  const url = `${BASE}/MemberCouncil?$format=json&$top=20&$filter=${encodeURIComponent(filterStr)}`;

  const raw = await odataFetch<RawMemberCouncil>(url);

  const cleaned = raw.map((m) => ({
    id: m.ID,
    firstName: m.FirstName,
    lastName: m.LastName,
    gender: m.GenderAsString,
    canton: m.CantonAbbreviation,
    cantonName: m.CantonName,
    council: m.CouncilAbbreviation,
    councilName: m.CouncilName,
    parlGroup: m.ParlGroupAbbreviation,
    parlGroupName: m.ParlGroupName,
    party: m.PartyAbbreviation,
    partyName: m.PartyName,
    birthCity: m.BirthPlace_City,
    url: `https://www.parlament.ch/de/biografie?CouncillorId=${m.ID}`,
  }));

  return truncate(JSON.stringify({ count: cleaned.length, councillors: cleaned }));
}

async function getSessions(args: {
  year?: number;
  limit?: number;
}): Promise<string> {
  const limit = Math.min(args.limit ?? 10, 20);
  // Sessions come in multiple languages — filter to DE only
  const url = `${BASE}/Session?$format=json&$top=${limit * 4}&$orderby=StartDate%20desc&$filter=Language%20eq%20'${LANG}'`;

  const raw = await odataFetch<RawSession>(url);

  const filtered = args.year
    ? raw.filter((s) => {
        if (!s.StartDate) return false;
        const d = parseODataDate(s.StartDate as string);
        return d ? new Date(d).getFullYear() === args.year : false;
      })
    : raw;

  const cleaned = filtered.slice(0, limit).map((s) => ({
    id: s.ID,
    name: s.SessionName,
    abbreviation: s.Abbreviation,
    type: s.TypeName,
    startDate: parseODataDate(s.StartDate as string | null),
    endDate: parseODataDate(s.EndDate as string | null),
    title: s.Title,
    legislativePeriod: s.LegislativePeriodNumber,
  }));

  return truncate(JSON.stringify({ count: cleaned.length, sessions: cleaned }));
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

export async function handleParliament(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "search_parliament_business":
      return searchParliamentBusiness(
        args as { query: string; type?: string; year?: number; limit?: number }
      );
    case "get_latest_votes":
      return getLatestVotes(args as { limit?: number });
    case "search_councillors":
      return searchCouncillors(
        args as { name: string; canton?: string; party?: string; council?: string }
      );
    case "get_sessions":
      return getSessions(args as { year?: number; limit?: number });
    default:
      throw new Error(`Unknown parliament tool: ${name}`);
  }
}
