import { describe, it, expect, vi, afterEach } from "vitest";
import {
  handleGetVotingResults,
  handleSearchVotes,
  handleGetVoteDetails,
  votingTools,
  registerVotingTools,
} from "../../src/modules/voting.js";
import {
  mockVotingRows,
  mockVotingRowsSingle,
  mockDetailsRows,
  mockEmptyRows,
  EXPECTED_NATIONALSTRASSEN,
  EXPECTED_MIETRECHT,
} from "../fixtures/voting.js";

// ── Fetch mock helper ─────────────────────────────────────────────────────────

function mockFetch(payload: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? "OK" : "Error",
      json: () => Promise.resolve(payload),
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Tool definitions ──────────────────────────────────────────────────────────

describe("votingTools definitions", () => {
  it("exports 3 tools", () => {
    expect(votingTools).toHaveLength(3);
  });

  it("get_voting_results tool has correct name", () => {
    expect(votingTools[0].name).toBe("get_voting_results");
  });

  it("search_votes tool has correct name", () => {
    expect(votingTools[1].name).toBe("search_votes");
  });

  it("get_vote_details tool has correct name", () => {
    expect(votingTools[2].name).toBe("get_vote_details");
  });

  it("get_voting_results has year and limit params", () => {
    const props = votingTools[0].inputSchema.properties as Record<string, unknown>;
    expect(props).toHaveProperty("year");
    expect(props).toHaveProperty("limit");
  });

  it("search_votes requires query param", () => {
    expect(votingTools[1].inputSchema.required).toContain("query");
  });

  it("get_vote_details has vote_title and date params", () => {
    const props = votingTools[2].inputSchema.properties as Record<string, unknown>;
    expect(props).toHaveProperty("vote_title");
    expect(props).toHaveProperty("date");
  });
});

// ── registerVotingTools ───────────────────────────────────────────────────────

describe("registerVotingTools", () => {
  it("registers all 3 tools on the server", () => {
    const toolMock = vi.fn();
    const fakeServer = { tool: toolMock };
    registerVotingTools(fakeServer);
    expect(toolMock).toHaveBeenCalledTimes(3);
  });

  it("registers get_voting_results", () => {
    const toolMock = vi.fn();
    registerVotingTools({ tool: toolMock });
    const names = toolMock.mock.calls.map((c) => c[0]);
    expect(names).toContain("get_voting_results");
  });

  it("registers search_votes", () => {
    const toolMock = vi.fn();
    registerVotingTools({ tool: toolMock });
    const names = toolMock.mock.calls.map((c) => c[0]);
    expect(names).toContain("search_votes");
  });

  it("registers get_vote_details", () => {
    const toolMock = vi.fn();
    registerVotingTools({ tool: toolMock });
    const names = toolMock.mock.calls.map((c) => c[0]);
    expect(names).toContain("get_vote_details");
  });

  it("handlers return MCP content array", async () => {
    mockFetch(mockVotingRows);
    const toolMock = vi.fn();
    registerVotingTools({ tool: toolMock });
    // Get the handler for get_voting_results
    const handler = toolMock.mock.calls[0][3] as (
      p: Record<string, unknown>,
    ) => Promise<{ content: Array<{ type: string; text: string }> }>;
    const result = await handler({ limit: 2 });
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(typeof result.content[0].text).toBe("string");
  });
});

// ── registerVotingTools — search_votes and get_vote_details handlers ──────────

describe("registerVotingTools — additional handlers", () => {
  it("search_votes handler returns MCP content array", async () => {
    mockFetch(mockVotingRows);
    const toolMock = vi.fn();
    registerVotingTools({ tool: toolMock });
    // search_votes is the second registered tool
    const handler = toolMock.mock.calls[1][3] as (
      p: Record<string, unknown>,
    ) => Promise<{ content: Array<{ type: string; text: string }> }>;
    const result = await handler({ query: "Mietrecht" });
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
  });

  it("get_vote_details handler returns MCP content array", async () => {
    mockFetch(mockDetailsRows);
    const toolMock = vi.fn();
    registerVotingTools({ tool: toolMock });
    // get_vote_details is the third registered tool
    const handler = toolMock.mock.calls[2][3] as (
      p: Record<string, unknown>,
    ) => Promise<{ content: Array<{ type: string; text: string }> }>;
    const result = await handler({ vote_title: "Nationalstrassen" });
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
  });
});

// ── get_voting_results ────────────────────────────────────────────────────────

describe("get_voting_results", () => {
  it("returns vote list with count", async () => {
    mockFetch(mockVotingRows);
    const result = JSON.parse(await handleGetVotingResults({}));
    expect(result).toHaveProperty("count");
    expect(result.count).toBeGreaterThan(0);
  });

  it("returns votes array", async () => {
    mockFetch(mockVotingRows);
    const result = JSON.parse(await handleGetVotingResults({}));
    expect(Array.isArray(result.votes)).toBe(true);
    expect(result.votes.length).toBeGreaterThan(0);
  });

  it("each vote has title, date, type", async () => {
    mockFetch(mockVotingRows);
    const result = JSON.parse(await handleGetVotingResults({}));
    const vote = result.votes[0];
    expect(typeof vote.title).toBe("string");
    expect(typeof vote.date).toBe("string");
    expect(typeof vote.type).toBe("string");
  });

  it("each vote has yes_count, no_count", async () => {
    mockFetch(mockVotingRows);
    const result = JSON.parse(await handleGetVotingResults({}));
    const vote = result.votes[0];
    expect(typeof vote.yes_count).toBe("number");
    expect(typeof vote.no_count).toBe("number");
  });

  it("each vote has yes_percentage", async () => {
    mockFetch(mockVotingRows);
    const result = JSON.parse(await handleGetVotingResults({}));
    const vote = result.votes[0];
    expect(typeof vote.yes_percentage).toBe("number");
    expect(vote.yes_percentage).toBeGreaterThanOrEqual(0);
    expect(vote.yes_percentage).toBeLessThanOrEqual(100);
  });

  it("each vote has eligible_voters", async () => {
    mockFetch(mockVotingRows);
    const result = JSON.parse(await handleGetVotingResults({}));
    const vote = result.votes[0];
    expect(typeof vote.eligible_voters).toBe("number");
    expect(vote.eligible_voters).toBeGreaterThan(0);
  });

  it("aggregates multiple commune rows into one vote entry", async () => {
    mockFetch(mockVotingRows);
    const result = JSON.parse(await handleGetVotingResults({}));
    // mockVotingRows has 2 rows for abst_id=1 (Basel + Riehen) → should be 1 entry
    const nationalstrassen = result.votes.find((v: { title: string }) =>
      v.title.includes("Nationalstrassen"),
    );
    expect(nationalstrassen).toBeDefined();
    // yes_count should be sum of both communes
    expect(nationalstrassen.yes_count).toBe(19490 + 4535);
  });

  it("aggregates yes/no counts correctly", async () => {
    mockFetch(mockVotingRows);
    const result = JSON.parse(await handleGetVotingResults({}));
    const mietrecht = result.votes.find((v: { title: string }) =>
      v.title.includes("Mietrecht"),
    );
    expect(mietrecht).toBeDefined();
    expect(mietrecht.yes_count).toBe(17052 + 3888);
    expect(mietrecht.no_count).toBe(30080 + 3776);
  });

  it("yes_percentage is derived from yes/(yes+no)", async () => {
    mockFetch(mockVotingRowsSingle);
    const result = JSON.parse(await handleGetVotingResults({}));
    const vote = result.votes[0];
    const expectedPct = Math.round((33653 / (33653 + 9629)) * 10000) / 100;
    expect(vote.yes_percentage).toBeCloseTo(expectedPct, 1);
  });

  it("respects limit parameter", async () => {
    mockFetch(mockVotingRows);
    const result = JSON.parse(await handleGetVotingResults({ limit: 1 }));
    expect(result.votes.length).toBeLessThanOrEqual(1);
  });

  it("clamps limit to 50", async () => {
    mockFetch(mockVotingRows);
    const result = JSON.parse(await handleGetVotingResults({ limit: 999 }));
    expect(result.votes.length).toBeLessThanOrEqual(50);
  });

  it("includes source field", async () => {
    mockFetch(mockVotingRows);
    const result = JSON.parse(await handleGetVotingResults({}));
    expect(result.source).toBeDefined();
    expect(result.source).toContain("Basel");
  });

  it("includes data_url", async () => {
    mockFetch(mockVotingRows);
    const result = JSON.parse(await handleGetVotingResults({}));
    expect(result.data_url).toContain("data.bs.ch");
  });

  it("returns error message when no votes found", async () => {
    mockFetch(mockEmptyRows);
    const result = JSON.parse(await handleGetVotingResults({}));
    expect(result.error).toBeDefined();
  });

  it("sends User-Agent header", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(mockVotingRows),
    });
    vi.stubGlobal("fetch", fetchMock);
    await handleGetVotingResults({});
    const callArgs = fetchMock.mock.calls[0];
    const options = callArgs[1] as RequestInit;
    const headers = options.headers as Record<string, string>;
    expect(headers["User-Agent"]).toBe("mcp-swiss/0.3.1");
  });

  it("handles HTTP error gracefully", async () => {
    mockFetch(null, 500);
    await expect(handleGetVotingResults({})).rejects.toThrow();
  });

  it("response is under 50K chars", async () => {
    mockFetch(mockVotingRows);
    const result = await handleGetVotingResults({});
    expect(result.length).toBeLessThan(50000);
  });

  it("first vote matches expected nationalstrassen title", async () => {
    mockFetch(mockVotingRows);
    const result = JSON.parse(await handleGetVotingResults({}));
    const vote = result.votes.find((v: { title: string }) =>
      v.title.includes("Nationalstrassen"),
    );
    expect(vote.title).toBe(EXPECTED_NATIONALSTRASSEN.title);
    expect(vote.date).toBe(EXPECTED_NATIONALSTRASSEN.date);
    expect(vote.type).toBe(EXPECTED_NATIONALSTRASSEN.type);
  });

  it("handles zero yes+no counts (yes_percentage = 0)", async () => {
    const zeroRows = [
      {
        abst_datum_text: "2024-01-01",
        abst_id: 99,
        abst_titel: "«Zero Count Vote»",
        abst_art: "national",
        gemein_name: "Basel",
        wahllok_name: "Basel briefl. & elektr. Stimmende (Total)",
        stimmr_anz: 1000,
        ja_anz: 0,
        nein_anz: 0,
        anteil_ja_stimmen: 0,
        result_art: "Schlussresultat",
      },
    ];
    mockFetch(zeroRows);
    const result = JSON.parse(await handleGetVotingResults({}));
    expect(result.votes[0].yes_percentage).toBe(0);
  });

  it("falls back to 'Unknown' title when abst_titel is undefined", async () => {
    const rowsWithNull = [
      {
        abst_datum_text: "2024-01-01",
        abst_id: 77,
        abst_titel: undefined,
        abst_art: undefined,
        gemein_name: "Basel",
        wahllok_name: "Basel briefl. & elektr. Stimmende (Total)",
        stimmr_anz: 500,
        ja_anz: 300,
        nein_anz: 200,
        anteil_ja_stimmen: 0.6,
        result_art: "Schlussresultat",
      },
    ];
    mockFetch(rowsWithNull);
    const result = JSON.parse(await handleGetVotingResults({}));
    expect(result.votes[0].title).toBe("Unknown");
    expect(result.votes[0].type).toBe("unknown");
    expect(result.votes[0].date).toBe("2024-01-01");
  });

  it("falls back empty string for missing abst_datum_text", async () => {
    const rowsWithNull = [
      {
        abst_datum_text: undefined,
        abst_id: 78,
        abst_titel: "«Test Vote»",
        abst_art: "national",
        gemein_name: "Basel",
        wahllok_name: "Basel briefl. & elektr. Stimmende (Total)",
        stimmr_anz: 500,
        ja_anz: 300,
        nein_anz: 200,
        anteil_ja_stimmen: 0.6,
        result_art: "Schlussresultat",
      },
    ];
    mockFetch(rowsWithNull);
    const result = JSON.parse(await handleGetVotingResults({}));
    expect(result.votes[0].date).toBe("");
  });

  it("handles null stimmr_anz, ja_anz, nein_anz in aggregate (falls back to 0)", async () => {
    const rowsNullCounts = [
      {
        abst_datum_text: "2024-05-01",
        abst_id: 80,
        abst_titel: "«Null Count Vote»",
        abst_art: "national",
        gemein_name: "Basel",
        wahllok_name: "Basel briefl. & elektr. Stimmende (Total)",
        stimmr_anz: undefined,
        ja_anz: undefined,
        nein_anz: undefined,
        anteil_ja_stimmen: 0,
        result_art: "Schlussresultat",
      },
    ];
    mockFetch(rowsNullCounts);
    const result = JSON.parse(await handleGetVotingResults({}));
    expect(result.votes[0].eligible_voters).toBe(0);
    expect(result.votes[0].yes_count).toBe(0);
    expect(result.votes[0].no_count).toBe(0);
    expect(result.votes[0].yes_percentage).toBe(0);
  });

  it("trims to 5 votes when response would exceed 48K", async () => {
    // Build a large payload: 50 votes with very long titles (~1000 chars each)
    const bigRows = Array.from({ length: 50 }, (_, i) => ({
      abst_datum_text: `202${Math.floor(i / 10) + 1}-0${(i % 9) + 1}-01`,
      abst_id: i + 1,
      abst_titel: `«${"A".repeat(950)} Vote ${String(i).padStart(3, "0")}»`,
      abst_art: "national",
      gemein_name: "Basel",
      wahllok_name: "Basel briefl. & elektr. Stimmende (Total)",
      stimmr_anz: 50000,
      ja_anz: 25000,
      nein_anz: 25000,
      anteil_ja_stimmen: 0.5,
      result_art: "Schlussresultat",
    }));
    mockFetch(bigRows);
    const result = JSON.parse(await handleGetVotingResults({ limit: 50 }));
    // When trimmed, should have ≤5 votes
    expect(result.votes.length).toBeLessThanOrEqual(5);
  });

  it("includes year filter in URL when year provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(mockVotingRows),
    });
    vi.stubGlobal("fetch", fetchMock);
    await handleGetVotingResults({ year: 2024 });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("2024");
  });
});

// ── search_votes ──────────────────────────────────────────────────────────────

describe("search_votes", () => {
  it("returns matching votes for a keyword", async () => {
    mockFetch(mockVotingRows);
    const result = JSON.parse(await handleSearchVotes({ query: "Mietrecht" }));
    expect(result.count).toBeGreaterThan(0);
  });

  it("returns query field in response", async () => {
    mockFetch(mockVotingRows);
    const result = JSON.parse(
      await handleSearchVotes({ query: "Nationalstrassen" }),
    );
    expect(result.query).toBe("Nationalstrassen");
  });

  it("returns votes array", async () => {
    mockFetch(mockVotingRows);
    const result = JSON.parse(await handleSearchVotes({ query: "Initiative" }));
    expect(Array.isArray(result.votes)).toBe(true);
  });

  it("returns error for empty query", async () => {
    const result = JSON.parse(await handleSearchVotes({ query: "" }));
    expect(result.error).toBeDefined();
  });

  it("returns count 0 and empty votes when no match", async () => {
    mockFetch(mockEmptyRows);
    const result = JSON.parse(
      await handleSearchVotes({ query: "Zuckersteuer" }),
    );
    expect(result.count).toBe(0);
    expect(result.votes).toHaveLength(0);
    expect(result.hint).toBeDefined();
  });

  it("respects limit parameter", async () => {
    mockFetch(mockVotingRows);
    const result = JSON.parse(
      await handleSearchVotes({ query: "Mietrecht", limit: 1 }),
    );
    expect(result.votes.length).toBeLessThanOrEqual(1);
  });

  it("clamps limit to 20", async () => {
    mockFetch(mockVotingRows);
    const result = JSON.parse(
      await handleSearchVotes({ query: "test", limit: 999 }),
    );
    expect(result.votes.length).toBeLessThanOrEqual(20);
  });

  it("each result has title and date", async () => {
    mockFetch(mockVotingRows);
    const result = JSON.parse(await handleSearchVotes({ query: "Mietrecht" }));
    for (const v of result.votes) {
      expect(typeof v.title).toBe("string");
      expect(typeof v.date).toBe("string");
    }
  });

  it("includes keyword in the API URL query", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(mockVotingRows),
    });
    vi.stubGlobal("fetch", fetchMock);
    await handleSearchVotes({ query: "CO2" });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("CO2");
  });

  it("sends User-Agent header", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(mockVotingRows),
    });
    vi.stubGlobal("fetch", fetchMock);
    await handleSearchVotes({ query: "AHV" });
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = options.headers as Record<string, string>;
    expect(headers["User-Agent"]).toBe("mcp-swiss/0.3.1");
  });

  it("handles HTTP error", async () => {
    mockFetch(null, 404);
    await expect(handleSearchVotes({ query: "test" })).rejects.toThrow();
  });

  it("response is under 50K chars", async () => {
    mockFetch(mockVotingRows);
    const result = await handleSearchVotes({ query: "Mietrecht" });
    expect(result.length).toBeLessThan(50000);
  });

  it("mietrecht vote has correct title in fixture", async () => {
    mockFetch(mockVotingRows);
    const result = JSON.parse(await handleSearchVotes({ query: "Mietrecht" }));
    const vote = result.votes.find((v: { title: string }) =>
      v.title.includes("Mietrecht"),
    );
    expect(vote?.title).toBe(EXPECTED_MIETRECHT.title);
  });
});

// ── get_vote_details ──────────────────────────────────────────────────────────

describe("get_vote_details", () => {
  it("returns error when neither vote_title nor date provided", async () => {
    const result = JSON.parse(await handleGetVoteDetails({}));
    expect(result.error).toBeDefined();
  });

  it("returns vote title", async () => {
    mockFetch(mockDetailsRows);
    const result = JSON.parse(
      await handleGetVoteDetails({ vote_title: "Nationalstrassen" }),
    );
    expect(result.title).toContain("Nationalstrassen");
  });

  it("returns vote date", async () => {
    mockFetch(mockDetailsRows);
    const result = JSON.parse(
      await handleGetVoteDetails({ date: "2024-11-24" }),
    );
    expect(result.date).toBe("2024-11-24");
  });

  it("returns vote type", async () => {
    mockFetch(mockDetailsRows);
    const result = JSON.parse(
      await handleGetVoteDetails({ vote_title: "Nationalstrassen" }),
    );
    expect(result.type).toBe("national");
  });

  it("returns breakdown array", async () => {
    mockFetch(mockDetailsRows);
    const result = JSON.parse(
      await handleGetVoteDetails({ vote_title: "Nationalstrassen" }),
    );
    expect(Array.isArray(result.breakdown)).toBe(true);
    expect(result.breakdown.length).toBeGreaterThan(0);
  });

  it("breakdown has 3 districts (Basel, Riehen, Bettingen)", async () => {
    mockFetch(mockDetailsRows);
    const result = JSON.parse(
      await handleGetVoteDetails({ vote_title: "Nationalstrassen" }),
    );
    expect(result.breakdown).toHaveLength(3);
  });

  it("breakdown entries have district name", async () => {
    mockFetch(mockDetailsRows);
    const result = JSON.parse(
      await handleGetVoteDetails({ vote_title: "Nationalstrassen" }),
    );
    const districts = result.breakdown.map((d: { district: string }) => d.district);
    expect(districts).toContain("Basel");
    expect(districts).toContain("Riehen");
    expect(districts).toContain("Bettingen");
  });

  it("breakdown entries have yes_count, no_count, eligible_voters", async () => {
    mockFetch(mockDetailsRows);
    const result = JSON.parse(
      await handleGetVoteDetails({ vote_title: "Nationalstrassen" }),
    );
    for (const d of result.breakdown) {
      expect(typeof d.yes_count).toBe("number");
      expect(typeof d.no_count).toBe("number");
      expect(typeof d.eligible_voters).toBe("number");
    }
  });

  it("breakdown entries have yes_percentage", async () => {
    mockFetch(mockDetailsRows);
    const result = JSON.parse(
      await handleGetVoteDetails({ vote_title: "Nationalstrassen" }),
    );
    for (const d of result.breakdown) {
      expect(d.yes_percentage).toBeGreaterThanOrEqual(0);
      expect(d.yes_percentage).toBeLessThanOrEqual(100);
    }
  });

  it("returns totals object", async () => {
    mockFetch(mockDetailsRows);
    const result = JSON.parse(
      await handleGetVoteDetails({ vote_title: "Nationalstrassen" }),
    );
    expect(result.totals).toBeDefined();
    expect(typeof result.totals.yes_count).toBe("number");
    expect(typeof result.totals.no_count).toBe("number");
    expect(typeof result.totals.yes_percentage).toBe("number");
    expect(typeof result.totals.eligible_voters).toBe("number");
  });

  it("totals.yes_count equals sum of breakdown yes counts", async () => {
    mockFetch(mockDetailsRows);
    const result = JSON.parse(
      await handleGetVoteDetails({ vote_title: "Nationalstrassen" }),
    );
    const sumYes = result.breakdown.reduce(
      (s: number, d: { yes_count: number }) => s + d.yes_count,
      0,
    );
    expect(result.totals.yes_count).toBe(sumYes);
  });

  it("totals match fixture values", async () => {
    mockFetch(mockDetailsRows);
    const result = JSON.parse(
      await handleGetVoteDetails({ vote_title: "Nationalstrassen" }),
    );
    expect(result.totals.yes_count).toBe(19490 + 4535 + 353);
    expect(result.totals.no_count).toBe(28053 + 3294 + 135);
  });

  it("returns source field", async () => {
    mockFetch(mockDetailsRows);
    const result = JSON.parse(
      await handleGetVoteDetails({ vote_title: "Nationalstrassen" }),
    );
    expect(result.source).toContain("data.bs.ch");
  });

  it("returns error for empty result", async () => {
    mockFetch(mockEmptyRows);
    const result = JSON.parse(
      await handleGetVoteDetails({ vote_title: "NonExistent Vote XYZ" }),
    );
    expect(result.error).toBeDefined();
    expect(result.hint).toBeDefined();
  });

  it("sends User-Agent header", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(mockDetailsRows),
    });
    vi.stubGlobal("fetch", fetchMock);
    await handleGetVoteDetails({ vote_title: "Nationalstrassen" });
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = options.headers as Record<string, string>;
    expect(headers["User-Agent"]).toBe("mcp-swiss/0.3.1");
  });

  it("handles HTTP error", async () => {
    mockFetch(null, 500);
    await expect(
      handleGetVoteDetails({ vote_title: "test" }),
    ).rejects.toThrow();
  });

  it("response is under 50K chars", async () => {
    mockFetch(mockDetailsRows);
    const result = await handleGetVoteDetails({ vote_title: "Nationalstrassen" });
    expect(result.length).toBeLessThan(50000);
  });

  it("includes vote_title in URL query", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(mockDetailsRows),
    });
    vi.stubGlobal("fetch", fetchMock);
    await handleGetVoteDetails({ vote_title: "CO2-Gesetz" });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("CO2");
  });

  it("includes date in URL query when date provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(mockDetailsRows),
    });
    vi.stubGlobal("fetch", fetchMock);
    await handleGetVoteDetails({ date: "2024-11-24" });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("2024-11-24");
  });

  it("handles zero ja+nein gracefully (yes_percentage = 0)", async () => {
    const zeroRows = [
      {
        abst_datum_text: "2024-01-01",
        abst_id: 99,
        abst_titel: "«Zero Vote»",
        abst_art: "national",
        gemein_name: "Basel",
        wahllok_name: "Basel briefl. & elektr. Stimmende (Total)",
        stimmr_anz: 0,
        ja_anz: 0,
        nein_anz: 0,
        anteil_ja_stimmen: 0,
        result_art: "Schlussresultat",
      },
    ];
    mockFetch(zeroRows);
    const result = JSON.parse(
      await handleGetVoteDetails({ vote_title: "Zero Vote" }),
    );
    expect(result.totals.yes_percentage).toBe(0);
    expect(result.breakdown[0].yes_percentage).toBe(0);
  });

  it("falls back to 'Unknown' when abst_titel and abst_art are undefined in details", async () => {
    const rowsNullTitle = [
      {
        abst_datum_text: "2024-02-01",
        abst_id: 55,
        abst_titel: undefined,
        abst_art: undefined,
        gemein_name: undefined,
        wahllok_name: undefined,
        stimmr_anz: undefined,
        ja_anz: undefined,
        nein_anz: undefined,
        anteil_ja_stimmen: 0,
        result_art: "Schlussresultat",
      },
    ];
    mockFetch(rowsNullTitle);
    const result = JSON.parse(
      await handleGetVoteDetails({ date: "2024-02-01" }),
    );
    expect(result.title).toBe("Unknown");
    expect(result.type).toBe("unknown");
    // date comes from abst_datum_text which is "2024-02-01" in this fixture
    expect(result.date).toBe("2024-02-01");
    expect(result.breakdown[0].district).toBe("Unknown");
    expect(result.breakdown[0].eligible_voters).toBe(0);
    expect(result.breakdown[0].yes_count).toBe(0);
    expect(result.breakdown[0].no_count).toBe(0);
  });

  it("falls back to empty string when abst_datum_text is null in details", async () => {
    const rowsNullDate = [
      {
        abst_datum_text: null as unknown as string,
        abst_id: 60,
        abst_titel: "«Null Date Vote»",
        abst_art: "national",
        gemein_name: "Basel",
        wahllok_name: "Basel briefl. & elektr. Stimmende (Total)",
        stimmr_anz: 100,
        ja_anz: 60,
        nein_anz: 40,
        anteil_ja_stimmen: 0.6,
        result_art: "Schlussresultat",
      },
    ];
    mockFetch(rowsNullDate);
    const result = JSON.parse(
      await handleGetVoteDetails({ vote_title: "Null Date" }),
    );
    expect(result.date).toBe("");
  });

  it("handles undefined ja_anz with non-zero nein_anz (yes_pct = 0)", async () => {
    const rows = [
      {
        abst_datum_text: "2024-04-01",
        abst_id: 61,
        abst_titel: "«Only No Votes»",
        abst_art: "national",
        gemein_name: "Basel",
        wahllok_name: "Basel briefl. & elektr. Stimmende (Total)",
        stimmr_anz: 1000,
        ja_anz: undefined,
        nein_anz: 500,
        anteil_ja_stimmen: 0,
        result_art: "Schlussresultat",
      },
    ];
    mockFetch(rows);
    const result = JSON.parse(
      await handleGetVoteDetails({ date: "2024-04-01" }),
    );
    expect(result.breakdown[0].yes_count).toBe(0);
    expect(result.breakdown[0].yes_percentage).toBe(0);
  });

  it("falls back to wahllok_name when gemein_name is undefined", async () => {
    const rowsNoGemein = [
      {
        abst_datum_text: "2024-03-01",
        abst_id: 56,
        abst_titel: "«Test»",
        abst_art: "national",
        gemein_name: undefined,
        wahllok_name: "Fallback Polling Station (Total)",
        stimmr_anz: 1000,
        ja_anz: 600,
        nein_anz: 400,
        anteil_ja_stimmen: 0.6,
        result_art: "Schlussresultat",
      },
    ];
    mockFetch(rowsNoGemein);
    const result = JSON.parse(
      await handleGetVoteDetails({ date: "2024-03-01" }),
    );
    expect(result.breakdown[0].district).toBe("Fallback Polling Station (Total)");
  });
});
