import { fetchJSON, buildUrl } from "../utils/http.js";

// ── Base URLs ─────────────────────────────────────────────────────────────────

const BS_BASE = "https://data.bs.ch/api/v2/catalog/datasets/100345/exports/json";
const USER_AGENT = "mcp-swiss/0.3.1";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BsVotingRecord {
  abst_datum?: string;
  abst_datum_text?: string;
  abst_id?: number;
  abst_titel?: string;
  abst_art?: string;
  gemein_id?: number;
  gemein_name?: string;
  wahllok_name?: string;
  result_art?: string;
  stimmr_anz?: number;
  eingel_anz?: number;
  ja_anz?: number;
  nein_anz?: number;
  anteil_ja_stimmen?: number;
}

interface VoteResult {
  title: string;
  date: string;
  type: string;
  yes_count: number;
  no_count: number;
  yes_percentage: number;
  eligible_voters: number;
  source: string;
}

interface VoteDetail {
  title: string;
  date: string;
  type: string;
  breakdown: DistrictResult[];
  totals: {
    yes_count: number;
    no_count: number;
    yes_percentage: number;
    eligible_voters: number;
  };
  source: string;
}

interface DistrictResult {
  district: string;
  eligible_voters: number;
  yes_count: number;
  no_count: number;
  yes_percentage: number;
}

// ── Tool definitions ──────────────────────────────────────────────────────────

export const votingTools = [
  {
    name: "get_voting_results",
    description:
      "Get results of Swiss popular votes (Volksabstimmungen) from Basel-Stadt open data. Returns vote title, date, yes/no counts, yes percentage, and eligible voters. Covers national and cantonal votes since 2021.",
    inputSchema: {
      type: "object",
      properties: {
        year: {
          type: "number",
          description: "Filter by year (e.g. 2024). If omitted, returns most recent votes.",
        },
        limit: {
          type: "number",
          description: "Maximum number of votes to return (default: 10, max: 50).",
        },
      },
    },
  },
  {
    name: "search_votes",
    description:
      "Search Swiss popular votes by keyword in the vote title (e.g. 'Initiative', 'Klimaschutz', 'CO2', 'AHV'). Returns matching votes with yes/no results.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: {
          type: "string",
          description: "Search keyword to find in vote titles (German/French/Italian)",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 5, max: 20).",
        },
      },
    },
  },
  {
    name: "get_vote_details",
    description:
      "Get detailed breakdown of a specific Swiss popular vote, including per-district results for Basel-Stadt (Basel city, Riehen, Bettingen, and overseas voters).",
    inputSchema: {
      type: "object",
      properties: {
        vote_title: {
          type: "string",
          description: "Partial or full vote title to look up (e.g. 'CO2-Gesetz', 'AHV')",
        },
        date: {
          type: "string",
          description: "Vote date in YYYY-MM-DD format (e.g. '2024-11-24')",
        },
      },
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPct(v: number): number {
  return Math.round(v * 10000) / 100;
}

/**
 * Fetch aggregate rows per vote (one row per commune Total per vote).
 * Filters on wahllok_name LIKE '%Total%' to get commune-level totals,
 * then aggregates across communes for a canton-wide result.
 */
async function fetchVoteRows(
  extraWhere: string,
  limit: number,
): Promise<BsVotingRecord[]> {
  // We fetch more rows than `limit` to handle aggregation
  const fetchLimit = Math.min(limit * 30, 500);
  const where = `wahllok_name like "%Total%" AND result_art="Schlussresultat"${extraWhere ? " AND " + extraWhere : ""}`;

  const url = buildUrl(BS_BASE, {
    limit: fetchLimit,
    where,
    select:
      "abst_datum_text,abst_id,abst_titel,abst_art,gemein_name,stimmr_anz,ja_anz,nein_anz,anteil_ja_stimmen",
    order_by: "abst_datum_text desc",
  });

  return fetchJSON<BsVotingRecord[]>(url, {
    headers: { "User-Agent": USER_AGENT },
  });
}

/**
 * Aggregate per-commune rows into a single canton-wide vote result.
 * Groups by (abst_datum_text, abst_id) and sums stimmr_anz, ja_anz, nein_anz.
 */
function aggregateVotes(rows: BsVotingRecord[]): VoteResult[] {
  const map = new Map<
    string,
    {
      title: string;
      date: string;
      type: string;
      stimmr: number;
      ja: number;
      nein: number;
    }
  >();

  for (const r of rows) {
    const key = `${r.abst_datum_text}_${r.abst_id}`;
    if (!map.has(key)) {
      map.set(key, {
        title: r.abst_titel ?? "Unknown",
        date: r.abst_datum_text ?? "",
        type: r.abst_art ?? "unknown",
        stimmr: 0,
        ja: 0,
        nein: 0,
      });
    }
    const entry = map.get(key)!;
    entry.stimmr += r.stimmr_anz ?? 0;
    entry.ja += r.ja_anz ?? 0;
    entry.nein += r.nein_anz ?? 0;
  }

  const results: VoteResult[] = [];
  for (const v of map.values()) {
    const total = v.ja + v.nein;
    results.push({
      title: v.title,
      date: v.date,
      type: v.type,
      yes_count: v.ja,
      no_count: v.nein,
      yes_percentage: total > 0 ? formatPct(v.ja / total) : 0,
      eligible_voters: v.stimmr,
      source: "data.bs.ch (Basel-Stadt open data)",
    });
  }

  return results;
}

// ── Handlers ──────────────────────────────────────────────────────────────────

export async function handleGetVotingResults(params: {
  year?: number;
  limit?: number;
}): Promise<string> {
  const limit = Math.min(params.limit ?? 10, 50);

  let extraWhere = "";
  if (params.year) {
    const y = params.year;
    extraWhere = `abst_datum_text>="${y}-01-01" AND abst_datum_text<="${y}-12-31"`;
  }

  const rows = await fetchVoteRows(extraWhere, limit);
  const votes = aggregateVotes(rows).slice(0, limit);

  if (votes.length === 0) {
    return JSON.stringify({
      error: "No voting results found for the given parameters",
      hint: "Try without a year filter, or use a different year (available: 2021–2025)",
    });
  }

  const result = {
    count: votes.length,
    source: "Basel-Stadt open data — national & cantonal votes",
    data_url: "https://data.bs.ch/explore/dataset/100345/",
    note: "Results from Basel-Stadt (BS canton) as representative Swiss data. National votes cover the whole country.",
    votes,
  };

  const json = JSON.stringify(result);
  if (json.length > 48000) {
    const trimmed = { ...result, votes: votes.slice(0, 5) };
    return JSON.stringify(trimmed);
  }
  return json;
}

export async function handleSearchVotes(params: {
  query: string;
  limit?: number;
}): Promise<string> {
  if (!params.query?.trim()) {
    return JSON.stringify({ error: "query parameter is required" });
  }

  const limit = Math.min(params.limit ?? 5, 20);
  const keyword = params.query.trim();

  const extraWhere = `abst_titel like "%${keyword}%"`;
  const rows = await fetchVoteRows(extraWhere, limit);
  const votes = aggregateVotes(rows).slice(0, limit);

  if (votes.length === 0) {
    return JSON.stringify({
      query: keyword,
      count: 0,
      votes: [],
      hint: "Try shorter keywords. Vote titles are in German, French, or Italian.",
    });
  }

  return JSON.stringify({
    query: keyword,
    count: votes.length,
    votes,
    source: "Basel-Stadt open data",
    data_url: "https://data.bs.ch/explore/dataset/100345/",
  });
}

export async function handleGetVoteDetails(params: {
  vote_title?: string;
  date?: string;
}): Promise<string> {
  if (!params.vote_title && !params.date) {
    return JSON.stringify({
      error: "Provide at least vote_title or date",
    });
  }

  const conditions: string[] = [
    `wahllok_name like "%Total%"`,
    `result_art="Schlussresultat"`,
  ];

  if (params.vote_title) {
    conditions.push(`abst_titel like "%${params.vote_title.trim()}%"`);
  }
  if (params.date) {
    conditions.push(`abst_datum_text="${params.date.trim()}"`);
  }

  const where = conditions.join(" AND ");
  const url = buildUrl(BS_BASE, {
    limit: 100,
    where,
    select:
      "abst_datum_text,abst_id,abst_titel,abst_art,gemein_name,wahllok_name,stimmr_anz,ja_anz,nein_anz,anteil_ja_stimmen",
    order_by: "abst_datum_text desc,abst_id asc",
  });

  const rows = await fetchJSON<BsVotingRecord[]>(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!rows || rows.length === 0) {
    return JSON.stringify({
      error: "No vote found matching the given parameters",
      hint: "Try partial title (e.g. 'CO2' instead of 'CO2-Gesetz') or check the date format (YYYY-MM-DD)",
    });
  }

  // Group by (date, abst_id) — take the first match if multiple votes match
  const firstDate = rows[0].abst_datum_text;
  const firstId = rows[0].abst_id;
  const voteRows = rows.filter(
    (r) => r.abst_datum_text === firstDate && r.abst_id === firstId,
  );

  const voteTitle = voteRows[0].abst_titel ?? "Unknown";
  const voteDate = voteRows[0].abst_datum_text ?? "";
  const voteType = voteRows[0].abst_art ?? "unknown";

  // Build per-district breakdown
  const breakdown: DistrictResult[] = voteRows.map((r) => {
    const total = (r.ja_anz ?? 0) + (r.nein_anz ?? 0);
    return {
      district: r.gemein_name ?? r.wahllok_name ?? "Unknown",
      eligible_voters: r.stimmr_anz ?? 0,
      yes_count: r.ja_anz ?? 0,
      no_count: r.nein_anz ?? 0,
      yes_percentage: total > 0 ? formatPct((r.ja_anz ?? 0) / total) : 0,
    };
  });

  // Canton totals
  const totalYes = breakdown.reduce((s, d) => s + d.yes_count, 0);
  const totalNo = breakdown.reduce((s, d) => s + d.no_count, 0);
  const totalStimmr = breakdown.reduce((s, d) => s + d.eligible_voters, 0);
  const totalVotes = totalYes + totalNo;

  const detail: VoteDetail = {
    title: voteTitle,
    date: voteDate,
    type: voteType,
    breakdown,
    totals: {
      yes_count: totalYes,
      no_count: totalNo,
      yes_percentage: totalVotes > 0 ? formatPct(totalYes / totalVotes) : 0,
      eligible_voters: totalStimmr,
    },
    source: "data.bs.ch (Basel-Stadt open data)",
  };

  return JSON.stringify(detail);
}

// ── MCP registration ──────────────────────────────────────────────────────────

export function registerVotingTools(server: {
  tool: (
    name: string,
    description: string,
    schema: object,
    handler: (params: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>,
  ) => void;
}): void {
  server.tool(
    "get_voting_results",
    votingTools[0].description,
    votingTools[0].inputSchema,
    async (params) => ({
      content: [
        {
          type: "text",
          text: await handleGetVotingResults(
            params as { year?: number; limit?: number },
          ),
        },
      ],
    }),
  );

  server.tool(
    "search_votes",
    votingTools[1].description,
    votingTools[1].inputSchema,
    async (params) => ({
      content: [
        {
          type: "text",
          text: await handleSearchVotes(
            params as { query: string; limit?: number },
          ),
        },
      ],
    }),
  );

  server.tool(
    "get_vote_details",
    votingTools[2].description,
    votingTools[2].inputSchema,
    async (params) => ({
      content: [
        {
          type: "text",
          text: await handleGetVoteDetails(
            params as { vote_title?: string; date?: string },
          ),
        },
      ],
    }),
  );
}
