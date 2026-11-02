// Data source: OpenParlData.ch (CC BY 4.0)
// Swiss Parliament data — federal and cantonal affairs, members, votes, speeches

import { fetchBody } from "../utils/http.js";

const BASE = "https://api.openparldata.ch/v1";

// ── Types ────────────────────────────────────────────────────────────────────

interface OpenParlResponse<T> {
  meta: {
    offset: number;
    limit: number;
    total_records: number;
    [key: string]: unknown;
  };
  data: T[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const MAX_CHARS = 48000;

/**
 * Serialise a payload, dropping list entries until it fits the response budget.
 * Cutting the JSON text instead would hand the client something it cannot parse.
 * `build` gets the entries that survived and how many were dropped.
 */
function fit<T>(items: T[], build: (kept: T[], dropped: number) => unknown): string {
  let keep = items.length;
  for (;;) {
    const json = JSON.stringify(build(items.slice(0, keep), items.length - keep));
    if (json.length <= MAX_CHARS || keep === 0) return json;
    keep = Math.max(0, Math.floor(keep * (MAX_CHARS / json.length)) - 1);
  }
}

/** Fetch OpenParlData endpoint — follows redirects, returns typed response */
async function apiFetch<T>(url: string): Promise<OpenParlResponse<T>> {
  return fetchBody<OpenParlResponse<T>>(
    url,
    { redirect: "follow", rawStatus: true },
    async (res) => {
      if (!res.ok) {
        throw new Error(`OpenParlData API error: HTTP ${res.status} for ${url}`);
      }
      return res.json() as Promise<OpenParlResponse<T>>;
    }
  );
}

/** Build URL with query parameters, ensuring trailing slash on path */
function buildUrl(
  path: string,
  params: Record<string, string | number | boolean | undefined>
): string {
  // Ensure trailing slash on path (API returns 307 without it)
  const cleanPath = path.endsWith("/") ? path : path + "/";
  const url = new URL(`${BASE}${cleanPath}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

// ── Tools definition ─────────────────────────────────────────────────────────

export const parliamentTools = [
  {
    name: "search_parliament_business",
    description:
      "Full-text search of federal parliament affairs (bills, motions, interpellations, postulates, questions, initiatives). For cantonal parliaments use search_cantonal_affairs",
    inputSchema: {
      type: "object" as const,
      required: ["query"],
      properties: {
        query: {
          type: "string",
          description:
            "German term, e.g. Klimaschutz, AHV",
        },
        limit: {
          type: "number",
          description: "max 20",
          default: 5,
        },
      },
    },
  },
  {
    name: "get_parliament_members",
    description:
      "Federal parliament members (National Council, Council of States), filterable by canton/party",
    inputSchema: {
      type: "object" as const,
      properties: {
        canton: {
          type: "string",
          description:
            "Canton name in German, e.g. Zürich, Genf, Waadt",
        },
        party: {
          type: "string",
          description:
            "Party name/abbreviation, e.g. SVP, SP, FDP, Grüne, Mitte",
        },
        active: {
          type: "boolean",
          description: "Only currently seated members",
          default: true,
        },
        limit: {
          type: "number",
          description: "max 50",
          default: 10,
        },
      },
    },
  },
  {
    name: "get_parliament_votes",
    description:
      "Recorded votes on a parliamentary affair (Geschäft)",
    inputSchema: {
      type: "object" as const,
      required: ["affair_id"],
      properties: {
        affair_id: {
          type: "number",
          description:
            "OpenParlData affair ID (from search_parliament_business)",
        },
      },
    },
  },
  {
    name: "get_session_schedule",
    description:
      "Upcoming and recent federal parliament sessions",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "max 20",
          default: 5,
        },
      },
    },
  },
  {
    name: "search_parliament_speeches",
    description:
      "Debate speeches on a parliamentary affair",
    inputSchema: {
      type: "object" as const,
      required: ["affair_id"],
      properties: {
        affair_id: {
          type: "number",
          description:
            "OpenParlData affair ID (from search_parliament_business)",
        },
        limit: {
          type: "number",
          description: "max 20",
          default: 5,
        },
      },
    },
  },
  {
    name: "get_politician_interests",
    description:
      "Declared interests and mandates (boards, consulting roles) of a federal parliament member",
    inputSchema: {
      type: "object" as const,
      required: ["person_id"],
      properties: {
        person_id: {
          type: "number",
          description:
            "OpenParlData person ID (from get_parliament_members)",
        },
      },
    },
  },
  {
    name: "search_cantonal_affairs",
    description:
      "Search affairs in a cantonal parliament (Kantonsrat), all 26 cantons",
    inputSchema: {
      type: "object" as const,
      required: ["canton"],
      properties: {
        canton: {
          type: "string",
          description:
            "Canton code, e.g. ZH",
        },
        query: {
          type: "string",
          description: "German term, e.g. Bildung",
        },
        limit: {
          type: "number",
          description: "max 20",
          default: 5,
        },
      },
    },
  },
  {
    name: "get_parliamentary_documents",
    description:
      "Official documents (reports, committee opinions, Federal Council statements) for a parliamentary affair",
    inputSchema: {
      type: "object" as const,
      required: ["affair_id"],
      properties: {
        affair_id: {
          type: "number",
          description:
            "OpenParlData affair ID (from search_parliament_business)",
        },
        limit: {
          type: "number",
          description: "max 20",
          default: 5,
        },
      },
    },
  },
  {
    name: "get_committee_meetings",
    description:
      "Federal parliament committee meeting schedule",
    inputSchema: {
      type: "object" as const,
      properties: {
        group_id: {
          type: "number",
          description:
            "Committee group ID (omit for all)",
        },
        limit: {
          type: "number",
          description: "max 20",
          default: 5,
        },
      },
    },
  },
];

// ── Handlers ─────────────────────────────────────────────────────────────────

interface AffairRecord {
  id: number;
  title_de: string;
  number: string;
  type_name_de: string;
  type_harmonized_de: string;
  state_name_de: string;
  begin_date: string | null;
  end_date: string | null;
  url_external_de: string | null;
  body_key: string;
  [key: string]: unknown;
}

async function searchParliamentBusiness(args: {
  query: string;
  limit?: number;
}): Promise<string> {
  const limit = Math.min(args.limit ?? 5, 20);
  const url = buildUrl("/affairs/", {
    search: args.query,
    body_key: "CHE",
    lang: "de",
    lang_format: "flat",
    sort_by: "-begin_date",
    limit,
  });

  const resp = await apiFetch<AffairRecord>(url);

  const affairs = resp.data.map((a) => ({
    id: a.id,
    number: a.number,
    title: a.title_de,
    type: a.type_name_de,
    typeCategory: a.type_harmonized_de,
    status: a.state_name_de,
    date: a.begin_date ? a.begin_date.split("T")[0] : null,
    url: a.url_external_de,
  }));

  return fit(affairs, (kept, dropped) => ({
    count: kept.length,
    total: resp.meta.total_records,
    omitted: dropped || undefined,
    query: args.query,
    affairs: kept,
  }));
}

interface PersonRecord {
  id: number;
  fullname: string;
  firstname: string;
  lastname: string;
  party_de: string;
  party_harmonized_de: string;
  electoral_district_de: string;
  parliament_sector: string;
  parliamentary_group_name_de: string;
  occupation_de: string;
  active: boolean;
  gender: string;
  image_url_external: string | null;
  website_parliament_url_de: string | null;
  [key: string]: unknown;
}

async function getParliamentMembers(args: {
  canton?: string;
  party?: string;
  active?: boolean;
  limit?: number;
}): Promise<string> {
  const limit = Math.min(args.limit ?? 10, 50);
  const active = args.active !== false;

  const params: Record<string, string | number | boolean | undefined> = {
    body_key: "CHE",
    active,
    lang: "de",
    lang_format: "flat",
    limit,
  };

  // Filter by canton using electoral_district_de (German canton name)
  if (args.canton) {
    params.electoral_district_de = args.canton;
  }

  // Filter by party using search
  if (args.party) {
    params.search = args.party;
  }

  const url = buildUrl("/persons/", params);
  const resp = await apiFetch<PersonRecord>(url);

  const members = resp.data.map((p) => ({
    id: p.id,
    name: p.fullname,
    party: p.party_de,
    partyFull: p.party_harmonized_de,
    canton: p.electoral_district_de,
    council: p.parliament_sector,
    group: p.parliamentary_group_name_de,
    occupation: p.occupation_de,
    gender: p.gender,
    active: p.active,
    url: p.website_parliament_url_de,
  }));

  return fit(members, (kept, dropped) => ({
    count: kept.length,
    total: resp.meta.total_records,
    omitted: dropped || undefined,
    members: kept,
  }));
}

interface VotingRecord {
  id: number;
  affair_id: number;
  title_de: string | null;
  type_de: string | null;
  meaning_of_yes_de: string | null;
  meaning_of_no_de: string | null;
  results_yes: number | null;
  results_no: number | null;
  results_abstention: number | null;
  results_absent: number | null;
  date: string | null;
  [key: string]: unknown;
}

async function getParliamentVotes(args: {
  affair_id: number;
}): Promise<string> {
  const url = buildUrl(`/affairs/${args.affair_id}/votings`, {
    lang: "de",
    lang_format: "flat",
  });
  const resp = await apiFetch<VotingRecord>(url);

  const votes = resp.data.map((v) => ({
    id: v.id,
    affairId: v.affair_id,
    subject: v.title_de,
    type: v.type_de,
    meaningYes: v.meaning_of_yes_de,
    meaningNo: v.meaning_of_no_de,
    yes: v.results_yes,
    no: v.results_no,
    abstain: v.results_abstention,
    absent: v.results_absent,
    date: v.date ? v.date.split("T")[0] : null,
  }));

  return fit(votes, (kept, dropped) => ({
    count: kept.length,
    total: resp.meta.total_records,
    omitted: dropped || undefined,
    affairId: args.affair_id,
    votes: kept,
  }));
}

interface MeetingRecord {
  id: number;
  name_de: string;
  abbreviation: string;
  type: string;
  begin_date: string | null;
  end_date: string | null;
  url_external_de: string | null;
  state: string | null;
  group_id: number | null;
  type_external_de: string | null;
  [key: string]: unknown;
}

async function getSessionSchedule(args: {
  limit?: number;
}): Promise<string> {
  const limit = Math.min(args.limit ?? 5, 20);
  const url = buildUrl("/meetings/", {
    body_key: "CHE",
    type: "session",
    sort_by: "-begin_date",
    lang: "de",
    lang_format: "flat",
    limit,
  });
  const resp = await apiFetch<MeetingRecord>(url);

  const sessions = resp.data.map((m) => ({
    id: m.id,
    name: m.name_de,
    abbreviation: m.abbreviation,
    type: m.type_external_de,
    startDate: m.begin_date ? m.begin_date.split("T")[0] : null,
    endDate: m.end_date ? m.end_date.split("T")[0] : null,
    url: m.url_external_de,
  }));

  return fit(sessions, (kept, dropped) => ({
    count: kept.length,
    total: resp.meta.total_records,
    omitted: dropped || undefined,
    sessions: kept,
  }));
}

interface SpeechRecord {
  id: number;
  person_fullname: string;
  person_id: number;
  party_de: string;
  text_de: string;
  speech_type_de: string;
  begin_time: string | null;
  duration_seconds: number | null;
  [key: string]: unknown;
}

async function searchParliamentSpeeches(args: {
  affair_id: number;
  limit?: number;
}): Promise<string> {
  const limit = Math.min(args.limit ?? 5, 20);
  const url = buildUrl(`/affairs/${args.affair_id}/speeches`, {
    lang: "de",
    lang_format: "flat",
    limit,
  });
  const resp = await apiFetch<SpeechRecord>(url);

  const speeches = resp.data.map((s) => ({
    id: s.id,
    speaker: s.person_fullname,
    personId: s.person_id,
    party: s.party_de,
    type: s.speech_type_de,
    text: s.text_de
      ? s.text_de.length > 500
        ? s.text_de.slice(0, 500) + "…"
        : s.text_de
      : null,
    time: s.begin_time,
    durationSeconds: s.duration_seconds,
  }));

  return fit(speeches, (kept, dropped) => ({
    count: kept.length,
    total: resp.meta.total_records,
    omitted: dropped || undefined,
    affairId: args.affair_id,
    speeches: kept,
  }));
}

interface InterestRecord {
  id: number;
  name_de: string;
  type_de: string;
  role_name_de: string;
  type_payment_de: string;
  type_payment_harmonized: string;
  group_de: string;
  begin_date: string | null;
  end_date: string | null;
  url: string | null;
  [key: string]: unknown;
}

async function getPoliticianInterests(args: {
  person_id: number;
}): Promise<string> {
  const url = buildUrl(`/persons/${args.person_id}/interests`, {
    lang: "de",
    lang_format: "flat",
  });
  const resp = await apiFetch<InterestRecord>(url);

  const interests = resp.data.map((i) => ({
    id: i.id,
    name: i.name_de,
    type: i.type_de,
    role: i.role_name_de,
    payment: i.type_payment_de,
    category: i.group_de,
    url: i.url,
  }));

  return fit(interests, (kept, dropped) => ({
    count: kept.length,
    total: resp.meta.total_records,
    omitted: dropped || undefined,
    personId: args.person_id,
    interests: kept,
  }));
}

async function searchCantonalAffairs(args: {
  canton: string;
  query?: string;
  limit?: number;
}): Promise<string> {
  const limit = Math.min(args.limit ?? 5, 20);
  const params: Record<string, string | number | boolean | undefined> = {
    body_key: args.canton.toUpperCase(),
    lang: "de",
    lang_format: "flat",
    sort_by: "-begin_date",
    limit,
  };
  if (args.query) {
    params.search = args.query;
  }

  const url = buildUrl("/affairs/", params);
  const resp = await apiFetch<AffairRecord>(url);

  const affairs = resp.data.map((a) => ({
    id: a.id,
    number: a.number,
    title: a.title_de,
    type: a.type_name_de,
    typeCategory: a.type_harmonized_de,
    status: a.state_name_de,
    date: a.begin_date ? a.begin_date.split("T")[0] : null,
    canton: a.body_key,
    url: a.url_external_de,
  }));

  return fit(affairs, (kept, dropped) => ({
    count: kept.length,
    total: resp.meta.total_records,
    omitted: dropped || undefined,
    canton: args.canton.toUpperCase(),
    query: args.query || null,
    affairs: kept,
  }));
}

interface DocRecord {
  id: number;
  title_de: string;
  type_de: string;
  url_external: string | null;
  filename: string | null;
  date: string | null;
  [key: string]: unknown;
}

async function getParliamentaryDocuments(args: {
  affair_id: number;
  limit?: number;
}): Promise<string> {
  const limit = Math.min(args.limit ?? 5, 20);
  const url = buildUrl(`/affairs/${args.affair_id}/docs`, {
    lang: "de",
    lang_format: "flat",
    limit,
  });
  const resp = await apiFetch<DocRecord>(url);

  const docs = resp.data.map((d) => ({
    id: d.id,
    title: d.title_de,
    type: d.type_de,
    url: d.url_external,
    filename: d.filename,
    date: d.date ? d.date.split("T")[0] : null,
  }));

  return fit(docs, (kept, dropped) => ({
    count: kept.length,
    total: resp.meta.total_records,
    omitted: dropped || undefined,
    affairId: args.affair_id,
    documents: kept,
  }));
}

async function getCommitteeMeetings(args: {
  group_id?: number;
  limit?: number;
}): Promise<string> {
  const limit = Math.min(args.limit ?? 5, 20);
  const params: Record<string, string | number | boolean | undefined> = {
    body_key: "CHE",
    type: "meeting",
    sort_by: "-begin_date",
    lang: "de",
    lang_format: "flat",
    limit,
  };
  if (args.group_id !== undefined) {
    params.group_id = args.group_id;
  }

  const url = buildUrl("/meetings/", params);
  const resp = await apiFetch<MeetingRecord>(url);

  const meetings = resp.data.map((m) => ({
    id: m.id,
    name: m.name_de,
    date: m.begin_date ? m.begin_date.split("T")[0] : null,
    endDate: m.end_date ? m.end_date.split("T")[0] : null,
    state: m.state,
    groupId: m.group_id,
    url: m.url_external_de,
  }));

  return fit(meetings, (kept, dropped) => ({
    count: kept.length,
    total: resp.meta.total_records,
    omitted: dropped || undefined,
    meetings: kept,
  }));
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

export async function handleParliament(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "search_parliament_business":
      return searchParliamentBusiness(args as { query: string; limit?: number });
    case "get_parliament_members":
      return getParliamentMembers(
        args as {
          canton?: string;
          party?: string;
          active?: boolean;
          limit?: number;
        }
      );
    case "get_parliament_votes":
      return getParliamentVotes(args as { affair_id: number });
    case "get_session_schedule":
      return getSessionSchedule(args as { limit?: number });
    case "search_parliament_speeches":
      return searchParliamentSpeeches(
        args as { affair_id: number; limit?: number }
      );
    case "get_politician_interests":
      return getPoliticianInterests(args as { person_id: number });
    case "search_cantonal_affairs":
      return searchCantonalAffairs(
        args as { canton: string; query?: string; limit?: number }
      );
    case "get_parliamentary_documents":
      return getParliamentaryDocuments(
        args as { affair_id: number; limit?: number }
      );
    case "get_committee_meetings":
      return getCommitteeMeetings(
        args as { group_id?: number; limit?: number }
      );
    default:
      throw new Error(`Unknown parliament tool: ${name}`);
  }
}
