// Data source: OpenParlData.ch (CC BY 4.0)
// Swiss Parliament data — federal and cantonal affairs, members, votes, speeches

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

/** Truncate a string response to keep under 50K chars */
function truncate(json: string, maxBytes = 48000): string {
  if (json.length <= maxBytes) return json;
  return json.slice(0, maxBytes) + "…";
}

/** Fetch OpenParlData endpoint — follows redirects, returns typed response */
async function apiFetch<T>(url: string): Promise<OpenParlResponse<T>> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`OpenParlData API error: HTTP ${res.status} for ${url}`);
  }
  const json = (await res.json()) as OpenParlResponse<T>;
  return json;
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
      "Search Swiss Parliament political affairs — bills, motions, interpellations, postulates, questions, and initiatives. Uses OpenParlData.ch full-text search across the Federal Assembly (Bundesversammlung).",
    inputSchema: {
      type: "object" as const,
      required: ["query"],
      properties: {
        query: {
          type: "string",
          description:
            "Search term (e.g. 'Klimaschutz', 'AHV', 'Neutralität')",
        },
        limit: {
          type: "number",
          description: "Max results (default: 5, max: 20)",
        },
      },
    },
  },
  {
    name: "get_parliament_members",
    description:
      "List current or past Swiss Parliament members (National Council and Council of States). Filter by canton or party.",
    inputSchema: {
      type: "object" as const,
      properties: {
        canton: {
          type: "string",
          description:
            "Canton name in German to filter by (e.g. 'Zürich', 'Bern', 'Genf', 'Waadt')",
        },
        party: {
          type: "string",
          description:
            "Party name or abbreviation to search (e.g. 'SVP', 'SP', 'FDP', 'Grüne', 'Mitte')",
        },
        active: {
          type: "boolean",
          description: "Only active (currently seated) members (default: true)",
        },
        limit: {
          type: "number",
          description: "Max results (default: 10, max: 50)",
        },
      },
    },
  },
  {
    name: "get_parliament_votes",
    description:
      "Get voting results for a specific parliamentary affair (Geschäft). Returns all recorded votes for the given affair ID from OpenParlData.",
    inputSchema: {
      type: "object" as const,
      required: ["affair_id"],
      properties: {
        affair_id: {
          type: "number",
          description:
            "OpenParlData affair ID (get from search_parliament_business results)",
        },
      },
    },
  },
  {
    name: "get_session_schedule",
    description:
      "Get upcoming and recent Swiss parliament sessions (Sessionen). Shows session names, dates and types.",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Number of sessions to return (default: 5, max: 20)",
        },
      },
    },
  },
  {
    name: "search_parliament_speeches",
    description:
      "Get debate speeches and contributions for a specific parliamentary affair. Returns speaker info and speech details.",
    inputSchema: {
      type: "object" as const,
      required: ["affair_id"],
      properties: {
        affair_id: {
          type: "number",
          description:
            "OpenParlData affair ID (get from search_parliament_business results)",
        },
        limit: {
          type: "number",
          description: "Max speeches to return (default: 5, max: 20)",
        },
      },
    },
  },
  {
    name: "get_politician_interests",
    description:
      "Get declared interests and mandates of a Swiss parliament member — board memberships, consulting roles, organizations.",
    inputSchema: {
      type: "object" as const,
      required: ["person_id"],
      properties: {
        person_id: {
          type: "number",
          description:
            "OpenParlData person ID (get from get_parliament_members results)",
        },
      },
    },
  },
  {
    name: "search_cantonal_affairs",
    description:
      "Search political affairs across Swiss cantonal parliaments (Kantonsräte). Covers all 26 cantons via OpenParlData.",
    inputSchema: {
      type: "object" as const,
      required: ["canton"],
      properties: {
        canton: {
          type: "string",
          description:
            "Canton abbreviation: ZH, BE, LU, UR, SZ, OW, NW, GL, ZG, FR, SO, BS, BL, SH, AR, AI, SG, GR, AG, TG, TI, VD, VS, NE, GE, JU",
        },
        query: {
          type: "string",
          description: "Search term (optional, e.g. 'Bildung', 'Verkehr')",
        },
        limit: {
          type: "number",
          description: "Max results (default: 5, max: 20)",
        },
      },
    },
  },
  {
    name: "get_parliamentary_documents",
    description:
      "Get official documents for a parliamentary affair — reports, committee opinions, federal council statements.",
    inputSchema: {
      type: "object" as const,
      required: ["affair_id"],
      properties: {
        affair_id: {
          type: "number",
          description:
            "OpenParlData affair ID (get from search_parliament_business results)",
        },
        limit: {
          type: "number",
          description: "Max documents to return (default: 5, max: 20)",
        },
      },
    },
  },
  {
    name: "get_committee_meetings",
    description:
      "Get Swiss parliament committee/commission meeting schedule. Optionally filter by committee group ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        group_id: {
          type: "number",
          description:
            "Committee group ID to filter (optional — omit for all committees)",
        },
        limit: {
          type: "number",
          description: "Max meetings to return (default: 5, max: 20)",
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

  return truncate(
    JSON.stringify({
      count: affairs.length,
      total: resp.meta.total_records,
      query: args.query,
      affairs,
    })
  );
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

  return truncate(
    JSON.stringify({
      count: members.length,
      total: resp.meta.total_records,
      members,
    })
  );
}

interface VotingRecord {
  id: number;
  affair_id: number;
  meaning_yes_de: string;
  meaning_no_de: string;
  total_yes: number;
  total_no: number;
  total_abstain: number;
  total_absent: number;
  total_excused: number;
  total_president: number;
  vote_date: string | null;
  subject_de: string;
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
    subject: v.subject_de,
    meaningYes: v.meaning_yes_de,
    meaningNo: v.meaning_no_de,
    yes: v.total_yes,
    no: v.total_no,
    abstain: v.total_abstain,
    absent: v.total_absent,
    date: v.vote_date ? v.vote_date.split("T")[0] : null,
  }));

  return truncate(
    JSON.stringify({
      count: votes.length,
      affairId: args.affair_id,
      votes,
    })
  );
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

  return truncate(
    JSON.stringify({
      count: sessions.length,
      total: resp.meta.total_records,
      sessions,
    })
  );
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

  return truncate(
    JSON.stringify({
      count: speeches.length,
      total: resp.meta.total_records,
      affairId: args.affair_id,
      speeches,
    })
  );
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

  return truncate(
    JSON.stringify({
      count: interests.length,
      personId: args.person_id,
      interests,
    })
  );
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

  return truncate(
    JSON.stringify({
      count: affairs.length,
      total: resp.meta.total_records,
      canton: args.canton.toUpperCase(),
      query: args.query || null,
      affairs,
    })
  );
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

  return truncate(
    JSON.stringify({
      count: docs.length,
      total: resp.meta.total_records,
      affairId: args.affair_id,
      documents: docs,
    })
  );
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

  return truncate(
    JSON.stringify({
      count: meetings.length,
      total: resp.meta.total_records,
      meetings,
    })
  );
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
